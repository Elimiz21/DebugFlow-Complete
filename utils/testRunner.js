import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

/**
 * Real test runner that executes tests in projects
 */
export class TestRunner {
  constructor() {
    this.runningTests = new Map();
  }

  /**
   * Run tests for a project
   */
  async runTests(projectId, projectPath, framework, options = {}) {
    const testId = uuidv4();
    const startTime = Date.now();

    try {
      console.log(`Starting test execution for project ${projectId} with framework ${framework}`);

      // Determine test command based on framework
      const testCommand = this.getTestCommand(framework, options);
      
      if (!testCommand) {
        throw new Error(`Unsupported test framework: ${framework}`);
      }

      // Create test results object
      const results = {
        id: testId,
        projectId,
        framework,
        status: 'running',
        startedAt: new Date().toISOString(),
        command: testCommand.command,
        args: testCommand.args,
        output: [],
        errors: [],
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0
      };

      // Store running test
      this.runningTests.set(testId, results);

      // Execute test command
      const testResults = await this.executeTestCommand(
        testCommand.command,
        testCommand.args,
        projectPath || process.cwd(),
        options
      );

      // Parse test results based on framework
      const parsedResults = this.parseTestResults(testResults.output, framework);

      // Update results
      results.output = testResults.output;
      results.errors = testResults.errors;
      results.exitCode = testResults.exitCode;
      results.passed = parsedResults.passed;
      results.failed = parsedResults.failed;
      results.skipped = parsedResults.skipped;
      results.total = parsedResults.total;
      results.duration = Date.now() - startTime;
      results.completedAt = new Date().toISOString();
      results.status = testResults.exitCode === 0 ? 'passed' : 'failed';

      // Parse coverage if requested
      if (options.coverage) {
        results.coverage = this.parseCoverage(testResults.output, framework);
      }

      // Clean up
      this.runningTests.delete(testId);

      return results;

    } catch (error) {
      console.error('Test execution error:', error);
      
      const errorResults = {
        id: testId,
        projectId,
        framework,
        status: 'error',
        error: error.message,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: Date.now() - startTime
      };

      this.runningTests.delete(testId);
      return errorResults;
    }
  }

  /**
   * Get test command based on framework
   */
  getTestCommand(framework, options) {
    const commands = {
      'jest': {
        command: 'npx',
        args: ['jest', '--json', '--outputFile=test-results.json']
      },
      'mocha': {
        command: 'npx',
        args: ['mocha', '--reporter', 'json']
      },
      'vitest': {
        command: 'npx',
        args: ['vitest', 'run', '--reporter=json']
      },
      'pytest': {
        command: 'python',
        args: ['-m', 'pytest', '--json-report', '--json-report-file=test-results.json']
      },
      'junit': {
        command: 'mvn',
        args: ['test']
      },
      'go-test': {
        command: 'go',
        args: ['test', '-json', './...']
      },
      'rspec': {
        command: 'bundle',
        args: ['exec', 'rspec', '--format', 'json']
      },
      'phpunit': {
        command: 'vendor/bin/phpunit',
        args: ['--log-json', 'test-results.json']
      },
      'npm-test': {
        command: 'npm',
        args: ['test']
      },
      'custom': {
        command: options.customCommand || 'npm',
        args: options.customArgs || ['test']
      }
    };

    const baseCommand = commands[framework] || commands['npm-test'];

    // Add coverage flag if requested
    if (options.coverage && framework !== 'custom') {
      if (framework === 'jest') {
        baseCommand.args.push('--coverage');
      } else if (framework === 'pytest') {
        baseCommand.args.push('--cov');
      } else if (framework === 'vitest') {
        baseCommand.args.push('--coverage');
      }
    }

    // Add watch flag if requested
    if (options.watch && framework !== 'custom') {
      if (['jest', 'vitest'].includes(framework)) {
        baseCommand.args.push('--watch');
      }
    }

    // Add filter if provided
    if (options.filter) {
      if (framework === 'jest') {
        baseCommand.args.push('-t', options.filter);
      } else if (framework === 'pytest') {
        baseCommand.args.push('-k', options.filter);
      } else if (framework === 'vitest') {
        baseCommand.args.push('--grep', options.filter);
      }
    }

    return baseCommand;
  }

  /**
   * Execute test command
   */
  async executeTestCommand(command, args, cwd, options) {
    return new Promise((resolve) => {
      const output = [];
      const errors = [];

      console.log(`Executing: ${command} ${args.join(' ')} in ${cwd}`);

      const testProcess = spawn(command, args, {
        cwd,
        env: { ...process.env, CI: 'true' },
        shell: true
      });

      testProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output.push(text);
        console.log('Test output:', text);
      });

      testProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errors.push(text);
        console.error('Test error:', text);
      });

      testProcess.on('close', (code) => {
        console.log(`Test process exited with code ${code}`);
        resolve({
          exitCode: code,
          output: output.join(''),
          errors: errors.join('')
        });
      });

      testProcess.on('error', (error) => {
        console.error('Failed to start test process:', error);
        resolve({
          exitCode: 1,
          output: output.join(''),
          errors: error.message
        });
      });

      // Set timeout
      if (options.timeout) {
        setTimeout(() => {
          testProcess.kill();
          resolve({
            exitCode: 1,
            output: output.join(''),
            errors: 'Test execution timed out'
          });
        }, options.timeout);
      }
    });
  }

  /**
   * Parse test results based on framework output
   */
  parseTestResults(output, framework) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };

    try {
      // Try to parse JSON output first
      if (output.includes('{') && output.includes('}')) {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          
          // Jest/Vitest format
          if (jsonData.numPassedTests !== undefined) {
            results.passed = jsonData.numPassedTests || 0;
            results.failed = jsonData.numFailedTests || 0;
            results.skipped = jsonData.numPendingTests || 0;
            results.total = jsonData.numTotalTests || 0;
            return results;
          }

          // Mocha format
          if (jsonData.stats) {
            results.passed = jsonData.stats.passes || 0;
            results.failed = jsonData.stats.failures || 0;
            results.skipped = jsonData.stats.pending || 0;
            results.total = jsonData.stats.tests || 0;
            return results;
          }
        }
      }

      // Fall back to regex parsing
      const patterns = {
        // Jest/Vitest patterns
        jest: {
          passed: /(\d+) passed/i,
          failed: /(\d+) failed/i,
          skipped: /(\d+) skipped/i,
          total: /(\d+) total/i
        },
        // Mocha patterns
        mocha: {
          passed: /(\d+) passing/i,
          failed: /(\d+) failing/i,
          skipped: /(\d+) pending/i
        },
        // Pytest patterns
        pytest: {
          passed: /(\d+) passed/i,
          failed: /(\d+) failed/i,
          skipped: /(\d+) skipped/i
        },
        // Generic patterns
        generic: {
          passed: /pass(?:ed)?\s*[:=]\s*(\d+)/i,
          failed: /fail(?:ed)?\s*[:=]\s*(\d+)/i,
          total: /total\s*[:=]\s*(\d+)/i
        }
      };

      // Try framework-specific patterns
      const frameworkPatterns = patterns[framework] || patterns.generic;
      
      for (const [key, pattern] of Object.entries(frameworkPatterns)) {
        const match = output.match(pattern);
        if (match) {
          results[key] = parseInt(match[1]) || 0;
        }
      }

      // Calculate total if not found
      if (results.total === 0) {
        results.total = results.passed + results.failed + results.skipped;
      }

    } catch (error) {
      console.error('Error parsing test results:', error);
    }

    return results;
  }

  /**
   * Parse coverage information
   */
  parseCoverage(output, framework) {
    const coverage = {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    };

    try {
      // Look for coverage summary
      const coverageMatch = output.match(/Coverage summary[\s\S]*?Lines\s*:\s*([\d.]+)%/i);
      if (coverageMatch) {
        coverage.lines = parseFloat(coverageMatch[1]) || 0;
      }

      // Jest/Vitest coverage format
      const stmtMatch = output.match(/Statements\s*:\s*([\d.]+)%/i);
      const branchMatch = output.match(/Branches\s*:\s*([\d.]+)%/i);
      const funcMatch = output.match(/Functions\s*:\s*([\d.]+)%/i);
      const lineMatch = output.match(/Lines\s*:\s*([\d.]+)%/i);

      if (stmtMatch) coverage.statements = parseFloat(stmtMatch[1]) || 0;
      if (branchMatch) coverage.branches = parseFloat(branchMatch[1]) || 0;
      if (funcMatch) coverage.functions = parseFloat(funcMatch[1]) || 0;
      if (lineMatch) coverage.lines = parseFloat(lineMatch[1]) || 0;

    } catch (error) {
      console.error('Error parsing coverage:', error);
    }

    return coverage;
  }

  /**
   * Get status of running test
   */
  getTestStatus(testId) {
    return this.runningTests.get(testId) || null;
  }

  /**
   * Stop running test
   */
  stopTest(testId) {
    const test = this.runningTests.get(testId);
    if (test) {
      test.status = 'cancelled';
      this.runningTests.delete(testId);
      return true;
    }
    return false;
  }

  /**
   * Generate test code using AI
   */
  async generateTests(code, language, framework, aiHandler) {
    const prompt = `Generate comprehensive unit tests for the following ${language} code using ${framework} framework:

\`\`\`${language}
${code}
\`\`\`

Requirements:
1. Cover all functions and methods
2. Include edge cases and error scenarios
3. Use proper ${framework} syntax and best practices
4. Add descriptive test names
5. Include setup and teardown if needed

Generate only the test code, no explanations.`;

    try {
      const result = await aiHandler.executeAnalysis({
        provider: 'openai',
        model: 'gpt-3.5-turbo'
      }, prompt, {
        maxTokens: 2000,
        temperature: 0.3
      });

      return {
        success: true,
        code: result.content,
        framework
      };
    } catch (error) {
      console.error('Test generation error:', error);
      
      // Return a basic test template as fallback
      return {
        success: false,
        code: this.getTestTemplate(language, framework),
        framework,
        error: error.message
      };
    }
  }

  /**
   * Get basic test template
   */
  getTestTemplate(language, framework) {
    const templates = {
      'javascript-jest': `describe('Test Suite', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  test('should pass basic test', () => {
    expect(true).toBe(true);
  });

  test('should handle edge cases', () => {
    // Add test implementation
  });
});`,
      'python-pytest': `import pytest

class TestSuite:
    def setup_method(self):
        """Setup test fixtures"""
        pass
    
    def teardown_method(self):
        """Cleanup after test"""
        pass
    
    def test_basic_functionality(self):
        """Test basic functionality"""
        assert True == True
    
    def test_edge_cases(self):
        """Test edge cases"""
        # Add test implementation
        pass`,
      'default': `// Add your test implementation here
// Framework: ${framework}
// Language: ${language}`
    };

    const key = `${language.toLowerCase()}-${framework.toLowerCase()}`;
    return templates[key] || templates.default;
  }
}

export default new TestRunner();