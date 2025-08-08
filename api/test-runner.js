// Test Runner API
// Handles test execution, results, and test generation

import express from 'express';
import { spawn } from 'child_process';
import database from '../database/database.js';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './middleware/auth.js';
import { aiHandler } from '../server/aiHandler.js';
import jobQueue from '../server/jobQueue.js';

const router = express.Router();

// Store running test processes
const runningTests = new Map();

// Run tests for a project
router.post('/run', requireAuth, async (req, res) => {
  try {
    const { projectId, testId, framework, coverage, watch, verbose, filter } = req.body;
    
    // Get project details
    const project = await database.get(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    );
    
    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }
    
    // Create test run record
    const runId = testId || uuidv4();
    await database.run(
      `INSERT INTO test_runs (
        id, project_id, user_id, framework, status, 
        started_at, options
      ) VALUES (?, ?, ?, ?, 'running', ?, ?)`,
      [
        runId,
        projectId,
        req.user.id,
        framework,
        new Date().toISOString(),
        JSON.stringify({ coverage, watch, verbose, filter })
      ]
    );
    
    // Queue test execution job
    await jobQueue.addJob('test-execution', {
      runId,
      projectId,
      framework,
      projectPath: project.path,
      options: { coverage, watch, verbose, filter }
    }, {
      queue: 'analysis',
      priority: 5
    });
    
    res.json({
      success: true,
      testId: runId,
      message: 'Test execution started'
    });
    
  } catch (error) {
    console.error('Run tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start test execution'
    });
  }
});

// Get test results
router.get('/results/:testId', requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    
    const testRun = await database.get(
      `SELECT * FROM test_runs WHERE id = ?`,
      [testId]
    );
    
    if (!testRun) {
      return res.status(404).json({
        success: false,
        message: 'Test run not found'
      });
    }
    
    // Parse stored data
    const response = {
      id: testRun.id,
      status: testRun.status,
      output: testRun.output || '',
      results: testRun.results ? JSON.parse(testRun.results) : null,
      startedAt: testRun.started_at,
      completedAt: testRun.completed_at,
      error: testRun.error
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Get test results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test results'
    });
  }
});

// Generate tests using AI
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { code, language, framework } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({
        success: false,
        message: 'Code and language are required'
      });
    }
    
    // Create test generation prompt
    const prompt = `Generate comprehensive unit tests for the following ${language} code using ${framework || 'the appropriate testing framework'}:

\`\`\`${language}
${code}
\`\`\`

Generate tests that:
1. Cover all functions/methods
2. Test edge cases and error conditions
3. Include positive and negative test cases
4. Follow best practices for ${framework || language} testing
5. Include setup and teardown if needed

Return only the test code without explanations.`;
    
    // Use AI to generate tests
    const generatedTests = await aiHandler.processAnalysis({
      providerId: 'openai',
      systemPrompt: 'You are an expert test engineer. Generate comprehensive, production-ready unit tests.',
      analysisPrompt: prompt,
      options: {
        maxTokens: 2000,
        temperature: 0.3
      }
    });
    
    res.json({
      success: true,
      code: generatedTests.content,
      framework: framework || `${language}-default`,
      testCount: (generatedTests.content.match(/test\(|it\(|describe\(/g) || []).length
    });
    
  } catch (error) {
    console.error('Generate tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate tests'
    });
  }
});

// Get test history for a project
router.get('/history/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 10 } = req.query;
    
    const history = await database.all(
      `SELECT 
        id,
        status,
        framework,
        started_at as timestamp,
        completed_at,
        JSON_EXTRACT(results, '$.passed') as passed,
        JSON_EXTRACT(results, '$.failed') as failed,
        JSON_EXTRACT(results, '$.total') as total,
        JSON_EXTRACT(results, '$.duration') as duration
      FROM test_runs
      WHERE project_id = ?
      ORDER BY started_at DESC
      LIMIT ?`,
      [projectId, parseInt(limit)]
    );
    
    // Calculate success rate for each run
    const formattedHistory = history.map(run => ({
      ...run,
      successRate: run.total > 0 ? ((run.passed / run.total) * 100).toFixed(1) : 0,
      status: run.failed === 0 ? 'success' : 'failure'
    }));
    
    res.json(formattedHistory);
    
  } catch (error) {
    console.error('Get test history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test history'
    });
  }
});

// Cancel running tests
router.post('/cancel/:testId', requireAuth, async (req, res) => {
  try {
    const { testId } = req.params;
    
    // Check if test is running
    const testRun = await database.get(
      'SELECT * FROM test_runs WHERE id = ? AND status = "running"',
      [testId]
    );
    
    if (!testRun) {
      return res.status(404).json({
        success: false,
        message: 'Running test not found'
      });
    }
    
    // Update test status
    await database.run(
      `UPDATE test_runs 
       SET status = 'cancelled', 
           completed_at = ?,
           error = 'Cancelled by user'
       WHERE id = ?`,
      [new Date().toISOString(), testId]
    );
    
    // Kill process if exists
    if (runningTests.has(testId)) {
      const process = runningTests.get(testId);
      process.kill('SIGTERM');
      runningTests.delete(testId);
    }
    
    res.json({
      success: true,
      message: 'Test execution cancelled'
    });
    
  } catch (error) {
    console.error('Cancel tests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel test execution'
    });
  }
});

// Register test execution job handler
if (jobQueue.registerHandler) {
  jobQueue.registerHandler('test-execution', async (payload) => {
    const { runId, projectPath, framework, options } = payload;
    
    try {
      // Build test command based on framework
      let command, args;
      
      switch (framework) {
        case 'jest':
          command = 'npx';
          args = ['jest'];
          if (options.coverage) args.push('--coverage');
          if (options.verbose) args.push('--verbose');
          break;
          
        case 'pytest':
          command = 'pytest';
          args = [];
          if (options.coverage) args.push('--cov');
          if (options.verbose) args.push('-v');
          break;
          
        case 'go test':
          command = 'go';
          args = ['test'];
          if (options.coverage) args.push('-cover');
          if (options.verbose) args.push('-v');
          args.push('./...');
          break;
          
        default:
          command = 'npm';
          args = ['test'];
      }
      
      // Execute tests
      const testProcess = spawn(command, args, {
        cwd: projectPath,
        env: { ...process.env, CI: 'true' }
      });
      
      runningTests.set(runId, testProcess);
      
      let output = '';
      let errorOutput = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
        // Update output in real-time
        database.run(
          'UPDATE test_runs SET output = ? WHERE id = ?',
          [output, runId]
        );
      });
      
      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      return new Promise((resolve, reject) => {
        testProcess.on('close', async (code) => {
          runningTests.delete(runId);
          
          // Parse results based on output
          const results = parseTestOutput(output, framework);
          
          // Update test run record
          await database.run(
            `UPDATE test_runs 
             SET status = ?, 
                 output = ?,
                 results = ?,
                 completed_at = ?,
                 error = ?
             WHERE id = ?`,
            [
              code === 0 ? 'completed' : 'failed',
              output + errorOutput,
              JSON.stringify(results),
              new Date().toISOString(),
              code !== 0 ? errorOutput : null,
              runId
            ]
          );
          
          if (code === 0) {
            resolve(results);
          } else {
            reject(new Error(`Test execution failed with code ${code}`));
          }
        });
      });
      
    } catch (error) {
      // Update test run with error
      await database.run(
        `UPDATE test_runs 
         SET status = 'failed',
             error = ?,
             completed_at = ?
         WHERE id = ?`,
        [error.message, new Date().toISOString(), runId]
      );
      
      throw error;
    }
  });
}

// Helper function to parse test output
function parseTestOutput(output, framework) {
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    duration: 0,
    tests: []
  };
  
  // Basic parsing for common patterns
  const passMatch = output.match(/(\d+) (?:passed|passing)/i);
  const failMatch = output.match(/(\d+) (?:failed|failing)/i);
  const skipMatch = output.match(/(\d+) (?:skipped|pending)/i);
  const timeMatch = output.match(/Time:\s+([\d.]+)s|(\d+\.\d+)s/i);
  
  if (passMatch) results.passed = parseInt(passMatch[1]);
  if (failMatch) results.failed = parseInt(failMatch[1]);
  if (skipMatch) results.skipped = parseInt(skipMatch[1]);
  if (timeMatch) results.duration = parseFloat(timeMatch[1] || timeMatch[2]);
  
  results.total = results.passed + results.failed + results.skipped;
  
  return results;
}

// Initialize test_runs table when database is ready
function initializeTestRunnerTables() {
  if (database && database.db) {
    database.run(`
      CREATE TABLE IF NOT EXISTS test_runs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        framework TEXT,
        status TEXT DEFAULT 'pending',
        output TEXT,
        results TEXT,
        options TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `).catch(console.error);
  } else {
    // Retry after a short delay if database is not ready
    setTimeout(initializeTestRunnerTables, 1000);
  }
}

// Initialize tables when this module is loaded
initializeTestRunnerTables();

export default router;