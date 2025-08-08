import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Square, RefreshCw, Download, Filter, Clock,
  CheckCircle, XCircle, AlertCircle, Code, FileText,
  TrendingUp, TrendingDown, Zap, Terminal, Settings,
  ChevronRight, ChevronDown, Copy, ExternalLink
} from 'lucide-react';
import testRunner from '../services/TestRunner';
import { useProjectContext } from '../contexts/ProjectContext';
import toast from 'react-hot-toast';

const TestRunner = () => {
  const { projects, currentProject } = useProjectContext();
  const [selectedProject, setSelectedProject] = useState(currentProject);
  const [framework, setFramework] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [testHistory, setTestHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestId, setCurrentTestId] = useState(null);
  const [output, setOutput] = useState('');
  const [activeTab, setActiveTab] = useState('results');
  const [testOptions, setTestOptions] = useState({
    coverage: false,
    watch: false,
    verbose: false,
    filter: ''
  });
  const [generatedTests, setGeneratedTests] = useState(null);
  const [expandedTests, setExpandedTests] = useState(new Set());
  const outputRef = useRef(null);

  useEffect(() => {
    if (selectedProject) {
      detectFramework();
      loadTestHistory();
    }
  }, [selectedProject]);

  useEffect(() => {
    // Auto-scroll output
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const detectFramework = async () => {
    try {
      const detected = await testRunner.detectFramework(selectedProject);
      setFramework(detected);
      
      if (!detected) {
        toast.error('No test framework detected. Please configure tests first.');
      }
    } catch (error) {
      console.error('Framework detection error:', error);
    }
  };

  const loadTestHistory = async () => {
    try {
      const history = await testRunner.getTestHistory(selectedProject.id);
      setTestHistory(history);
    } catch (error) {
      console.error('Load test history error:', error);
    }
  };

  const runTests = async () => {
    if (!framework) {
      toast.error('No test framework configured');
      return;
    }

    setIsRunning(true);
    setOutput('');
    setTestResults(null);

    try {
      const command = testRunner.getTestCommand(framework, testOptions);
      setOutput(`> ${command}\n\n`);

      const { testId } = await testRunner.runTests(selectedProject.id, {
        framework,
        ...testOptions
      });

      setCurrentTestId(testId);

      // Simulate real-time output
      const interval = setInterval(async () => {
        try {
          const results = await testRunner.getTestResults(testId);
          
          if (results.output) {
            setOutput(prev => prev + results.output);
          }

          if (results.status === 'completed') {
            clearInterval(interval);
            const parsed = testRunner.parseTestResults(results.output, framework);
            const formatted = testRunner.formatResults(parsed);
            setTestResults(formatted);
            setIsRunning(false);
            
            if (formatted.status === 'success') {
              toast.success('All tests passed!');
            } else {
              toast.error(`${formatted.failed} tests failed`);
            }
            
            loadTestHistory();
          } else if (results.status === 'failed') {
            clearInterval(interval);
            setIsRunning(false);
            toast.error('Test execution failed');
          }
        } catch (error) {
          clearInterval(interval);
          setIsRunning(false);
          console.error('Get test results error:', error);
        }
      }, 1000);

    } catch (error) {
      setIsRunning(false);
      toast.error('Failed to run tests');
      console.error('Run tests error:', error);
    }
  };

  const cancelTests = async () => {
    if (currentTestId) {
      try {
        await testRunner.cancelTests(currentTestId);
        setIsRunning(false);
        toast.info('Tests cancelled');
      } catch (error) {
        console.error('Cancel tests error:', error);
      }
    }
  };

  const generateTests = async () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    try {
      toast.loading('Generating tests with AI...');
      
      // Get main code file (simplified for demo)
      const mainFile = selectedProject.files?.find(f => 
        f.name.endsWith('.js') || f.name.endsWith('.py')
      );

      if (!mainFile) {
        toast.error('No code files found');
        return;
      }

      const generated = await testRunner.generateTests(
        mainFile.content,
        selectedProject.language,
        framework || 'jest'
      );

      setGeneratedTests(generated);
      setActiveTab('generated');
      toast.success('Tests generated successfully');
    } catch (error) {
      toast.error('Failed to generate tests');
      console.error('Generate tests error:', error);
    }
  };

  const toggleTestExpansion = (testName) => {
    const newExpanded = new Set(expandedTests);
    if (newExpanded.has(testName)) {
      newExpanded.delete(testName);
    } else {
      newExpanded.add(testName);
    }
    setExpandedTests(newExpanded);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const exportResults = () => {
    if (!testResults) return;

    const report = {
      project: selectedProject.name,
      framework,
      timestamp: new Date().toISOString(),
      results: testResults,
      output
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Test Runner</h1>
        <p className="text-gray-400">Execute and manage tests for your projects</p>
      </div>

      {/* Project Selector and Controls */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const project = projects.find(p => p.id === e.target.value);
                setSelectedProject(project);
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            {framework && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="text-white text-sm">{framework}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={generateTests}
              disabled={!selectedProject}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Generate Tests
            </button>

            {isRunning ? (
              <button
                onClick={cancelTests}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            ) : (
              <button
                onClick={runTests}
                disabled={!selectedProject || !framework}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Run Tests
              </button>
            )}

            <button
              onClick={exportResults}
              disabled={!testResults}
              className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Test Options */}
        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2 text-gray-400">
            <input
              type="checkbox"
              checked={testOptions.coverage}
              onChange={(e) => setTestOptions({ ...testOptions, coverage: e.target.checked })}
              className="rounded text-cyan-400 focus:ring-cyan-400"
            />
            Coverage
          </label>

          <label className="flex items-center gap-2 text-gray-400">
            <input
              type="checkbox"
              checked={testOptions.watch}
              onChange={(e) => setTestOptions({ ...testOptions, watch: e.target.checked })}
              className="rounded text-cyan-400 focus:ring-cyan-400"
            />
            Watch Mode
          </label>

          <label className="flex items-center gap-2 text-gray-400">
            <input
              type="checkbox"
              checked={testOptions.verbose}
              onChange={(e) => setTestOptions({ ...testOptions, verbose: e.target.checked })}
              className="rounded text-cyan-400 focus:ring-cyan-400"
            />
            Verbose
          </label>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter tests..."
              value={testOptions.filter}
              onChange={(e) => setTestOptions({ ...testOptions, filter: e.target.value })}
              className="px-3 py-1 bg-gray-700 text-white rounded focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Results */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex gap-4 mb-4 border-b border-gray-700">
            {['results', 'output', 'generated'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'results' && (
            <div className="bg-gray-800 rounded-lg p-6">
              {testResults ? (
                <div>
                  {/* Summary */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Test Results</h3>
                      <div className={`px-3 py-1 rounded ${
                        testResults.status === 'success'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {testResults.status === 'success' ? 'PASSED' : 'FAILED'}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-700 rounded p-3">
                        <div className="flex items-center justify-between">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <span className="text-2xl font-bold text-white">{testResults.passed}</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Passed</p>
                      </div>

                      <div className="bg-gray-700 rounded p-3">
                        <div className="flex items-center justify-between">
                          <XCircle className="w-5 h-5 text-red-400" />
                          <span className="text-2xl font-bold text-white">{testResults.failed}</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Failed</p>
                      </div>

                      <div className="bg-gray-700 rounded p-3">
                        <div className="flex items-center justify-between">
                          <AlertCircle className="w-5 h-5 text-yellow-400" />
                          <span className="text-2xl font-bold text-white">{testResults.skipped}</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Skipped</p>
                      </div>

                      <div className="bg-gray-700 rounded p-3">
                        <div className="flex items-center justify-between">
                          <Clock className="w-5 h-5 text-cyan-400" />
                          <span className="text-2xl font-bold text-white">
                            {testResults.duration?.toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Duration</p>
                      </div>
                    </div>

                    {testResults.coverageSummary && (
                      <div className="p-3 bg-gray-700 rounded">
                        <p className="text-cyan-400">{testResults.coverageSummary}</p>
                      </div>
                    )}
                  </div>

                  {/* Individual Tests */}
                  {testResults.tests && testResults.tests.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-3">Test Details</h4>
                      <div className="space-y-2">
                        {testResults.tests.map((test, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-pointer"
                            onClick={() => toggleTestExpansion(test.name)}
                          >
                            <div className="flex items-center gap-2">
                              {expandedTests.has(test.name) ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              {test.status === 'passed' ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              ) : test.status === 'failed' ? (
                                <XCircle className="w-4 h-4 text-red-400" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                              )}
                              <span className="text-white text-sm">{test.name}</span>
                            </div>
                            {test.duration && (
                              <span className="text-gray-400 text-sm">{test.duration}ms</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Terminal className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No test results yet</p>
                  <p className="text-gray-500 text-sm mt-2">Run tests to see results here</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'output' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Console Output</h3>
                <button
                  onClick={() => copyToClipboard(output)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div
                ref={outputRef}
                className="bg-black rounded p-4 h-96 overflow-y-auto font-mono text-sm"
              >
                {output ? (
                  <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>
                ) : (
                  <p className="text-gray-600">Waiting for test output...</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'generated' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">AI Generated Tests</h3>
                {generatedTests && (
                  <button
                    onClick={() => copyToClipboard(generatedTests.code)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
              {generatedTests ? (
                <div>
                  <div className="mb-4 p-3 bg-gray-700 rounded">
                    <p className="text-cyan-400 text-sm">
                      Generated {generatedTests.testCount} tests for {generatedTests.framework}
                    </p>
                  </div>
                  <pre className="bg-black rounded p-4 overflow-x-auto">
                    <code className="text-green-400 text-sm">{generatedTests.code}</code>
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Code className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No generated tests yet</p>
                  <p className="text-gray-500 text-sm mt-2">Click "Generate Tests" to create tests with AI</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Test History */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Test History</h3>
          {testHistory.length > 0 ? (
            <div className="space-y-3">
              {testHistory.map((run, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">
                      {new Date(run.timestamp).toLocaleDateString()}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      run.status === 'success' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      {run.passed}/{run.total} passed
                    </span>
                    <span className="text-gray-400">{run.duration}s</span>
                  </div>
                  {run.successRate < 100 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-600 rounded-full h-1">
                        <div
                          className="bg-green-400 h-1 rounded-full"
                          style={{ width: `${run.successRate}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center">No test history available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestRunner;
