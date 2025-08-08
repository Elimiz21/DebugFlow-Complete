// Test Runner Service
// Executes tests for multiple frameworks and provides real-time feedback

class TestRunnerService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    this.supportedFrameworks = {
      javascript: ['jest', 'mocha', 'jasmine', 'vitest'],
      python: ['pytest', 'unittest', 'nose'],
      php: ['phpunit', 'codeception'],
      go: ['go test'],
      java: ['junit', 'testng'],
      csharp: ['nunit', 'xunit', 'mstest']
    };
    this.runningTests = new Map();
  }

  // Detect test framework from project
  async detectFramework(projectData) {
    const { language, files, packageJson } = projectData;
    
    if (language === 'javascript' || language === 'typescript') {
      // Check package.json for test dependencies
      if (packageJson) {
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        if (deps.jest) return 'jest';
        if (deps.vitest) return 'vitest';
        if (deps.mocha) return 'mocha';
        if (deps.jasmine) return 'jasmine';
      }
      
      // Check for test configuration files
      if (files.some(f => f.name === 'jest.config.js')) return 'jest';
      if (files.some(f => f.name === 'vitest.config.js')) return 'vitest';
      if (files.some(f => f.name === '.mocharc.json')) return 'mocha';
    }
    
    if (language === 'python') {
      // Check for pytest.ini or setup.cfg
      if (files.some(f => f.name === 'pytest.ini')) return 'pytest';
      if (files.some(f => f.name === 'setup.cfg' && f.content?.includes('[tool:pytest]'))) return 'pytest';
      
      // Check for test files
      const testFiles = files.filter(f => f.name.startsWith('test_') || f.name.endsWith('_test.py'));
      if (testFiles.length > 0) return 'pytest';
    }
    
    if (language === 'php') {
      if (files.some(f => f.name === 'phpunit.xml')) return 'phpunit';
      if (files.some(f => f.name === 'codeception.yml')) return 'codeception';
    }
    
    if (language === 'go') {
      if (files.some(f => f.name.endsWith('_test.go'))) return 'go test';
    }
    
    return null;
  }

  // Generate test command based on framework
  getTestCommand(framework, options = {}) {
    const { coverage, watch, filter, verbose } = options;
    let command = '';
    
    switch (framework) {
      case 'jest':
        command = 'npx jest';
        if (coverage) command += ' --coverage';
        if (watch) command += ' --watch';
        if (filter) command += ` --testNamePattern="${filter}"`;
        if (verbose) command += ' --verbose';
        break;
        
      case 'vitest':
        command = 'npx vitest';
        if (coverage) command += ' --coverage';
        if (watch) command += ' --watch';
        if (filter) command += ` --grep "${filter}"`;
        break;
        
      case 'mocha':
        command = 'npx mocha';
        if (filter) command += ` --grep "${filter}"`;
        if (verbose) command += ' --reporter spec';
        break;
        
      case 'pytest':
        command = 'pytest';
        if (coverage) command += ' --cov';
        if (verbose) command += ' -v';
        if (filter) command += ` -k "${filter}"`;
        break;
        
      case 'phpunit':
        command = 'vendor/bin/phpunit';
        if (coverage) command += ' --coverage-html coverage';
        if (filter) command += ` --filter "${filter}"`;
        if (verbose) command += ' --verbose';
        break;
        
      case 'go test':
        command = 'go test';
        if (coverage) command += ' -cover';
        if (verbose) command += ' -v';
        if (filter) command += ` -run "${filter}"`;
        command += ' ./...';
        break;
        
      default:
        command = framework;
    }
    
    return command;
  }

  // Run tests for a project
  async runTests(projectId, options = {}) {
    const testId = `${projectId}-${Date.now()}`;
    
    try {
      const response = await fetch(`${this.baseURL}/test-runner/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          projectId,
          testId,
          ...options
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start tests: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Store running test info
      this.runningTests.set(testId, {
        projectId,
        startTime: Date.now(),
        status: 'running'
      });
      
      return {
        testId,
        ...result
      };
    } catch (error) {
      console.error('Run tests error:', error);
      throw error;
    }
  }

  // Get test results
  async getTestResults(testId) {
    try {
      const response = await fetch(`${this.baseURL}/test-runner/results/${testId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get test results: ${response.statusText}`);
      }
      
      const results = await response.json();
      
      // Update running test status
      if (this.runningTests.has(testId)) {
        this.runningTests.set(testId, {
          ...this.runningTests.get(testId),
          status: results.status,
          endTime: results.status === 'completed' ? Date.now() : undefined
        });
      }
      
      return results;
    } catch (error) {
      console.error('Get test results error:', error);
      throw error;
    }
  }

  // Generate tests using AI
  async generateTests(code, language, framework) {
    try {
      const response = await fetch(`${this.baseURL}/test-runner/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          code,
          language,
          framework
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate tests: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Generate tests error:', error);
      throw error;
    }
  }

  // Parse test results based on framework
  parseTestResults(output, framework) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      tests: [],
      coverage: null
    };
    
    switch (framework) {
      case 'jest':
      case 'vitest':
        return this.parseJestOutput(output);
        
      case 'pytest':
        return this.parsePytestOutput(output);
        
      case 'phpunit':
        return this.parsePhpUnitOutput(output);
        
      case 'go test':
        return this.parseGoTestOutput(output);
        
      default:
        return this.parseGenericOutput(output);
    }
  }

  // Parse Jest/Vitest output
  parseJestOutput(output) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      tests: [],
      coverage: null
    };
    
    // Parse test results
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    const skipMatch = output.match(/(\d+) skipped/);
    const totalMatch = output.match(/(\d+) total/);
    const timeMatch = output.match(/Time:\s+([\d.]+)s/);
    
    if (passMatch) results.passed = parseInt(passMatch[1]);
    if (failMatch) results.failed = parseInt(failMatch[1]);
    if (skipMatch) results.skipped = parseInt(skipMatch[1]);
    if (totalMatch) results.total = parseInt(totalMatch[1]);
    if (timeMatch) results.duration = parseFloat(timeMatch[1]);
    
    // Parse individual test results
    const testRegex = /\s*(✓|✕|○)\s+(.+?)(?:\s+\((\d+)\s*ms\))?$/gm;
    let match;
    
    while ((match = testRegex.exec(output)) !== null) {
      const status = match[1] === '✓' ? 'passed' : match[1] === '✕' ? 'failed' : 'skipped';
      results.tests.push({
        name: match[2].trim(),
        status,
        duration: match[3] ? parseInt(match[3]) : null
      });
    }
    
    // Parse coverage if present
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      results.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }
    
    return results;
  }

  // Parse pytest output
  parsePytestOutput(output) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      tests: [],
      coverage: null
    };
    
    // Parse summary line
    const summaryMatch = output.match(/=+\s*(\d+)\s+passed(?:,\s*(\d+)\s+failed)?(?:,\s*(\d+)\s+skipped)?.*in\s+([\d.]+)s/);
    
    if (summaryMatch) {
      results.passed = parseInt(summaryMatch[1] || 0);
      results.failed = parseInt(summaryMatch[2] || 0);
      results.skipped = parseInt(summaryMatch[3] || 0);
      results.duration = parseFloat(summaryMatch[4]);
      results.total = results.passed + results.failed + results.skipped;
    }
    
    // Parse individual test results
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('PASSED')) {
        const match = line.match(/(.+?)::\w+\s+PASSED/);
        if (match) {
          results.tests.push({
            name: match[1].trim(),
            status: 'passed'
          });
        }
      } else if (line.includes('FAILED')) {
        const match = line.match(/(.+?)::\w+\s+FAILED/);
        if (match) {
          results.tests.push({
            name: match[1].trim(),
            status: 'failed'
          });
        }
      }
    }
    
    // Parse coverage if present
    const coverageMatch = output.match(/TOTAL\s+\d+\s+\d+\s+([\d.]+)%/);
    if (coverageMatch) {
      results.coverage = {
        lines: parseFloat(coverageMatch[1])
      };
    }
    
    return results;
  }

  // Parse PHPUnit output
  parsePhpUnitOutput(output) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      tests: [],
      coverage: null
    };
    
    // Parse summary
    const summaryMatch = output.match(/OK \((\d+) tests?, (\d+) assertions?\)|FAILURES!\s+Tests: (\d+), Assertions: \d+, Failures: (\d+)/);
    
    if (summaryMatch) {
      if (summaryMatch[1]) {
        // Success case
        results.total = parseInt(summaryMatch[1]);
        results.passed = results.total;
      } else {
        // Failure case
        results.total = parseInt(summaryMatch[3]);
        results.failed = parseInt(summaryMatch[4]);
        results.passed = results.total - results.failed;
      }
    }
    
    // Parse duration
    const timeMatch = output.match(/Time: ([\d.]+) seconds?/);
    if (timeMatch) {
      results.duration = parseFloat(timeMatch[1]);
    }
    
    return results;
  }

  // Parse Go test output
  parseGoTestOutput(output) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      tests: [],
      coverage: null
    };
    
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('--- PASS:')) {
        results.passed++;
        const match = line.match(/--- PASS: (\S+) \(([\d.]+)s\)/);
        if (match) {
          results.tests.push({
            name: match[1],
            status: 'passed',
            duration: parseFloat(match[2]) * 1000
          });
        }
      } else if (line.startsWith('--- FAIL:')) {
        results.failed++;
        const match = line.match(/--- FAIL: (\S+) \(([\d.]+)s\)/);
        if (match) {
          results.tests.push({
            name: match[1],
            status: 'failed',
            duration: parseFloat(match[2]) * 1000
          });
        }
      } else if (line.includes('coverage:')) {
        const match = line.match(/coverage: ([\d.]+)%/);
        if (match) {
          results.coverage = {
            lines: parseFloat(match[1])
          };
        }
      }
    }
    
    results.total = results.passed + results.failed;
    
    return results;
  }

  // Parse generic test output
  parseGenericOutput(output) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      tests: [],
      coverage: null,
      raw: output
    };
    
    // Try to find common patterns
    const passPatterns = [/(\d+) passed?/i, /(\d+) success/i, /✓/g];
    const failPatterns = [/(\d+) failed?/i, /(\d+) error/i, /✕/g, /✗/g];
    
    for (const pattern of passPatterns) {
      const match = output.match(pattern);
      if (match) {
        results.passed = typeof match[1] === 'string' ? parseInt(match[1]) : match.length;
        break;
      }
    }
    
    for (const pattern of failPatterns) {
      const match = output.match(pattern);
      if (match) {
        results.failed = typeof match[1] === 'string' ? parseInt(match[1]) : match.length;
        break;
      }
    }
    
    results.total = results.passed + results.failed;
    
    return results;
  }

  // Format test results for display
  formatResults(results) {
    const { passed, failed, skipped, total, duration, coverage } = results;
    
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    const status = failed === 0 ? 'success' : 'failure';
    
    let summary = `Tests: ${passed}/${total} passed`;
    if (failed > 0) summary += `, ${failed} failed`;
    if (skipped > 0) summary += `, ${skipped} skipped`;
    if (duration) summary += ` (${duration.toFixed(2)}s)`;
    
    let coverageSummary = '';
    if (coverage) {
      if (coverage.lines) {
        coverageSummary = `Coverage: ${coverage.lines}%`;
      } else if (coverage.statements) {
        coverageSummary = `Coverage: ${coverage.statements}% statements, ${coverage.branches}% branches`;
      }
    }
    
    return {
      status,
      successRate,
      summary,
      coverageSummary,
      ...results
    };
  }

  // Get test history for a project
  async getTestHistory(projectId, limit = 10) {
    try {
      const response = await fetch(
        `${this.baseURL}/test-runner/history/${projectId}?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to get test history: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get test history error:', error);
      throw error;
    }
  }

  // Cancel running tests
  async cancelTests(testId) {
    try {
      const response = await fetch(`${this.baseURL}/test-runner/cancel/${testId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to cancel tests: ${response.statusText}`);
      }
      
      // Update local state
      if (this.runningTests.has(testId)) {
        this.runningTests.set(testId, {
          ...this.runningTests.get(testId),
          status: 'cancelled',
          endTime: Date.now()
        });
      }
      
      return await response.json();
    } catch (error) {
      console.error('Cancel tests error:', error);
      throw error;
    }
  }
}

// Export singleton instance
const testRunner = new TestRunnerService();
export default testRunner;