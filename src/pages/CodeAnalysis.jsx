import React, { useState, useContext, useEffect } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import { Code, Play, AlertCircle, Brain, Settings, Target, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiAnalyzer } from '../services/AIAnalyzer.js';

const CodeAnalysis = ({ user }) => {
  const { socket } = useContext(SocketContext);
  const [code, setCode] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [analysisType, setAnalysisType] = useState('single-file');
  const [userInstructions, setUserInstructions] = useState('');
  const [availableTypes, setAvailableTypes] = useState({});

  useEffect(() => {
    // Load available analysis types
    const types = aiAnalyzer.getAvailableAnalysisTypes();
    setAvailableTypes(types);
    
    // Load saved preferences
    const preferences = localStorage.getItem('debugflow_analysis_preferences');
    if (preferences) {
      try {
        const parsed = JSON.parse(preferences);
        setAnalysisType(parsed.defaultAnalysisType || 'single-file');
        setUserInstructions(parsed.customInstructions || '');
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    }
  }, []);

  const analyzeCode = async () => {
    if (!code.trim()) {
      toast.error('Please enter some code to analyze');
      return;
    }

    if (!user?.id) {
      toast.error('Please log in to use AI analysis');
      return;
    }

    setIsAnalyzing(true);
    setResults(null);
    
    const toastId = toast.loading('Starting AI analysis...');

    try {
      // Get user API keys from localStorage
      const userApiKeys = {
        openai: localStorage.getItem('debugflow_openai_key') || '',
        claude: localStorage.getItem('debugflow_claude_key') || '',
        gemini: localStorage.getItem('debugflow_gemini_key') || ''
      };

      // Create project data structure
      const projectData = {
        id: 'code-analysis-' + Date.now(),
        name: 'Code Analysis Session',
        files: [{
          filename: selectedFile || 'analysis.js',
          content: code,
          size: code.length
        }]
      };

      // Create file data for single file analysis
      const fileData = analysisType === 'single-file' ? {
        filename: selectedFile || 'analysis.js',
        content: code
      } : null;

      toast.loading('Running AI analysis...', { id: toastId });

      // Perform AI analysis
      const analysisResult = await aiAnalyzer.performAnalysis({
        analysisType,
        projectData,
        fileData,
        userId: user.id,
        userApiKeys,
        userInstructions,
        useCache: true
      });

      if (analysisResult.success) {
        setResults(analysisResult);
        toast.success(`Analysis complete! Found ${analysisResult.results.total_issues} issues.`, { id: toastId });
        
        // Emit to socket for real-time updates
        if (socket) {
          socket.emit('analysis-complete', {
            analysisId: analysisResult.analysisId,
            results: analysisResult.results,
            metadata: analysisResult.metadata
          });
        }
      } else {
        throw new Error(analysisResult.error || 'Analysis failed');
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error(`Analysis failed: ${error.message}`, { id: toastId });
      
      // Show fallback results if available
      if (error.fallback) {
        setResults({
          success: false,
          results: error.fallback,
          error: error.message
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderAnalysisResults = () => {
    if (!results) return null;

    const { success, results: data, error, metadata } = results;

    return (
      <div className="space-y-4">
        {/* Analysis Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-medium ${success ? 'text-green-700' : 'text-red-700'}`}>
              {success ? 'Analysis Complete' : 'Analysis Failed'}
            </span>
          </div>
          {metadata && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {Math.round(metadata.duration / 1000)}s
              </span>
              {metadata.tokenUsage && (
                <span>{metadata.tokenUsage.total_tokens} tokens</span>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Analysis Summary */}
        {data.analysis_summary && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Summary</h4>
            <p className="text-blue-800 text-sm">{data.analysis_summary}</p>
            {data.confidence_score && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700">Confidence Score</span>
                  <span className="font-medium">{Math.round(data.confidence_score * 100)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${data.confidence_score * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Issue Statistics */}
        {data.total_issues > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-900">{data.total_issues}</div>
              <div className="text-sm text-gray-600">Total Issues</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-600">{data.critical_issues || 0}</div>
              <div className="text-sm text-red-700">Critical</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-yellow-600">
                {data.recommendations?.filter(r => r.severity === 'HIGH').length || 0}
              </div>
              <div className="text-sm text-yellow-700">High</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600">
                {data.recommendations?.filter(r => ['MEDIUM', 'LOW'].includes(r.severity)).length || 0}
              </div>
              <div className="text-sm text-blue-700">Medium/Low</div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Recommendations</h4>
            {data.recommendations.map((rec, index) => (
              <div key={rec.id || index} className={`border rounded-lg p-4 ${
                rec.severity === 'CRITICAL' ? 'border-red-300 bg-red-50' :
                rec.severity === 'HIGH' ? 'border-orange-300 bg-orange-50' :
                rec.severity === 'MEDIUM' ? 'border-yellow-300 bg-yellow-50' :
                'border-blue-300 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{rec.title}</h5>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    rec.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    rec.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    rec.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {rec.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{rec.description}</p>
                {rec.code_snippet && (
                  <pre className="bg-gray-800 text-gray-100 p-2 rounded text-xs overflow-x-auto mb-2">
                    {rec.code_snippet}
                  </pre>
                )}
                {rec.solution && (
                  <div className="bg-white rounded p-3 border">
                    <h6 className="font-medium text-green-900 mb-1">Solution:</h6>
                    <p className="text-sm text-green-800">{rec.solution}</p>
                  </div>
                )}
                {rec.impact && (
                  <p className="text-xs text-gray-600 mt-2">
                    <strong>Impact:</strong> {rec.impact}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Metrics */}
        {data.metrics && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Analysis Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {data.metrics.lines_of_code && (
                <div>
                  <span className="text-gray-600">Lines of Code:</span>
                  <span className="ml-2 font-medium">{data.metrics.lines_of_code}</span>
                </div>
              )}
              {data.metrics.complexity_score && (
                <div>
                  <span className="text-gray-600">Complexity Score:</span>
                  <span className="ml-2 font-medium">{data.metrics.complexity_score}</span>
                </div>
              )}
              {data.metrics.estimated_fix_time && (
                <div>
                  <span className="text-gray-600">Est. Fix Time:</span>
                  <span className="ml-2 font-medium">{data.metrics.estimated_fix_time}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Code Analysis</h1>
        <p className="text-gray-600">Analyze your code with advanced AI for bugs, security issues, and optimizations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analysis Configuration */}
        <div className="space-y-6">
          {/* Analysis Type Selection */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Target className="h-5 w-5 text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold">Analysis Type</h2>
            </div>
            
            <div className="space-y-3">
              {Object.entries(availableTypes).map(([type, info]) => (
                <label key={type} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="analysisType"
                    value={type}
                    checked={analysisType === type}
                    onChange={(e) => setAnalysisType(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{info.name}</div>
                    <div className="text-sm text-gray-600">{info.description}</div>
                    <div className="text-xs text-gray-500">
                      Est. time: {info.estimatedTime} • Best for: {info.bestFor}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Code Input */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Code className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold">Code Input</h2>
              </div>
              {selectedFile && (
                <span className="text-sm text-gray-600">File: {selectedFile}</span>
              )}
            </div>
            
            <div className="mb-3">
              <input
                type="text"
                value={selectedFile || ''}
                onChange={(e) => setSelectedFile(e.target.value)}
                placeholder="Optional: Enter filename (e.g., app.js, component.jsx)"
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here for AI analysis..."
              className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Instructions (Optional)
              </label>
              <input
                type="text"
                value={userInstructions}
                onChange={(e) => setUserInstructions(e.target.value)}
                placeholder="e.g., Focus on security issues, or Check React performance"
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={analyzeCode}
              disabled={isAnalyzing}
              className="mt-4 flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Brain className="h-4 w-4 mr-2" />
              {isAnalyzing ? 'Analyzing with AI...' : 'Analyze with AI'}
            </button>
          </div>
        </div>

        {/* Analysis Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
            <h2 className="text-lg font-semibold">Analysis Results</h2>
          </div>
          
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">AI is analyzing your code...</span>
            </div>
          ) : results ? (
            renderAnalysisResults()
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>AI analysis results will appear here</p>
              <p className="text-sm mt-2">Select an analysis type and paste your code to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeAnalysis;