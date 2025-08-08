import React, { useState, useEffect } from 'react';
import {
  Brain,
  Code,
  GitBranch,
  Layers,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Zap,
  BarChart3,
  Network,
  Bug,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { advancedCodeAnalyzer } from '../services/AdvancedCodeAnalyzer';

/**
 * SemanticAnalysisView - Advanced code understanding and analysis visualization
 * Displays semantic analysis results, code relationships, and intelligent insights
 */
const SemanticAnalysisView = ({ projectData, user, onAnalysisComplete }) => {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState(new Set(['overview']));

  useEffect(() => {
    if (projectData && projectData.files?.length > 0) {
      performSemanticAnalysis();
    }
  }, [projectData]);

  const performSemanticAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);

      console.log('🧠 Starting semantic analysis for project:', projectData.name);
      
      const result = await advancedCodeAnalyzer.performSemanticAnalysis(projectData, {
        includeRelationships: true,
        includePatterns: true,
        includeMetrics: true,
        includeSuggestions: true
      });

      if (result.success) {
        setAnalysis(result);
        if (onAnalysisComplete) {
          onAnalysisComplete(result);
        }
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Semantic analysis failed:', error);
      setError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSection = (sectionId) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getComplexityColor = (complexity) => {
    if (complexity <= 3) return 'text-green-600 bg-green-100';
    if (complexity <= 6) return 'text-yellow-600 bg-yellow-100';
    if (complexity <= 10) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getSeverityIcon = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  if (isAnalyzing) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin">
            <Brain className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Performing Semantic Analysis</h3>
            <p className="text-gray-600">Understanding code structure and relationships...</p>
          </div>
        </div>
        
        <div className="mt-6 space-y-3">
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Analyzing code structure and semantic elements</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <span>Building relationship maps and dependency graphs</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
            <span>Detecting patterns and calculating advanced metrics</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
            <span>Generating intelligent suggestions and insights</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-red-900">Analysis Failed</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={performSemanticAnalysis}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md font-medium"
            >
              Retry Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Brain className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Semantic Analysis Available</h3>
        <p className="text-gray-600 mb-6">
          Perform semantic analysis to understand code structure and relationships.
        </p>
        <button
          onClick={performSemanticAnalysis}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Start Semantic Analysis
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'structure', label: 'Code Structure', icon: Layers },
    { id: 'relationships', label: 'Relationships', icon: Network },
    { id: 'patterns', label: 'Patterns', icon: Target },
    { id: 'quality', label: 'Quality Issues', icon: Bug },
    { id: 'suggestions', label: 'Suggestions', icon: Lightbulb }
  ];

  return (
    <div className="space-y-6">
      {/* Analysis Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Brain className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Semantic Code Analysis</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Advanced
              </span>
            </div>
            <p className="text-gray-600">
              Deep understanding of code structure, relationships, and patterns
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">Confidence Score</div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(analysis.results.confidence_score * 100)}%
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <FileText className="w-6 h-6 text-blue-600" />
              <span className="text-2xl font-bold text-blue-900">
                {analysis.results.metrics?.total_files || 0}
              </span>
            </div>
            <div className="text-blue-700 font-medium mt-1">Files Analyzed</div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <Code className="w-6 h-6 text-green-600" />
              <span className="text-2xl font-bold text-green-900">
                {analysis.results.metrics?.total_functions || 0}
              </span>
            </div>
            <div className="text-green-700 font-medium mt-1">Functions</div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <GitBranch className="w-6 h-6 text-purple-600" />
              <span className="text-2xl font-bold text-purple-900">
                {analysis.results.relationships?.length || 0}
              </span>
            </div>
            <div className="text-purple-700 font-medium mt-1">Relationships</div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-6 h-6 text-orange-600" />
              <span className="text-2xl font-bold text-orange-900">
                {analysis.results.metrics?.average_function_complexity?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="text-orange-700 font-medium mt-1">Avg Complexity</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b border-gray-200">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 px-6 py-4 font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metrics Overview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Code Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Lines of Code</div>
                    <div className="text-xl font-bold text-gray-900">
                      {analysis.results.metrics?.total_lines_of_code?.toLocaleString() || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Cyclomatic Complexity</div>
                    <div className="text-xl font-bold text-gray-900">
                      {analysis.results.metrics?.cyclomatic_complexity || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Maintainability Index</div>
                    <div className="text-xl font-bold text-gray-900">
                      {analysis.results.metrics?.maintainability_index?.toFixed(1) || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Est. Test Coverage</div>
                    <div className="text-xl font-bold text-gray-900">
                      {analysis.results.metrics?.estimated_test_coverage || 0}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Technical Debt Ratio</div>
                    <div className="text-xl font-bold text-gray-900">
                      {analysis.results.metrics?.technical_debt_ratio?.toFixed(1) || 0}%
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Code Duplication</div>
                    <div className="text-xl font-bold text-gray-900">
                      {analysis.results.metrics?.code_duplication_ratio || 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Issues */}
              {analysis.results.code_smells?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Code Issues</h3>
                  <div className="space-y-3">
                    {analysis.results.code_smells.slice(0, 5).map((smell, index) => (
                      <div key={index} className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                        {getSeverityIcon(smell.severity)}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{smell.description}</div>
                          <div className="text-sm text-gray-600 mt-1">{smell.suggestion}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {smell.file}:{smell.line}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          smell.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                          smell.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {smell.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Code Structure Tab */}
          {activeTab === 'structure' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Code Structure Analysis</h3>
              
              {analysis.results.semantic_map && Object.keys(analysis.results.semantic_map).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(analysis.results.semantic_map).map(([fileName, fileData]) => (
                    <div key={fileName} className="border rounded-lg">
                      <button
                        onClick={() => toggleSection(`file-${fileName}`)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <span className="font-medium text-gray-900">{fileName}</span>
                          <span className="text-sm text-gray-500">
                            ({fileData.elements?.functions?.length || 0} functions, {fileData.elements?.classes?.length || 0} classes)
                          </span>
                        </div>
                        {expandedSections.has(`file-${fileName}`) ? 
                          <ChevronUp className="w-5 h-5 text-gray-500" /> :
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        }
                      </button>
                      
                      {expandedSections.has(`file-${fileName}`) && (
                        <div className="px-4 pb-4 border-t bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {/* Functions */}
                            {fileData.elements?.functions?.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Functions</h4>
                                <div className="space-y-2">
                                  {fileData.elements.functions.map((func, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                                      <span className="font-mono text-sm">{func.name}</span>
                                      <span className="text-xs text-gray-500">Line {func.line}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Classes */}
                            {fileData.elements?.classes?.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Classes</h4>
                                <div className="space-y-2">
                                  {fileData.elements.classes.map((cls, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                                      <span className="font-mono text-sm">{cls.name}</span>
                                      <span className="text-xs text-gray-500">Line {cls.line}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* File Metrics */}
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-2 bg-white rounded">
                              <div className="text-sm font-medium text-gray-900">{fileData.metrics?.lines_of_code || 0}</div>
                              <div className="text-xs text-gray-500">Lines of Code</div>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                              <div className={`text-sm font-medium px-2 py-1 rounded ${getComplexityColor(fileData.complexity || 0)}`}>
                                {fileData.complexity?.toFixed(1) || '0.0'}
                              </div>
                              <div className="text-xs text-gray-500">Complexity</div>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                              <div className="text-sm font-medium text-gray-900">{fileData.language || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">Language</div>
                            </div>
                            <div className="text-center p-2 bg-white rounded">
                              <div className="text-sm font-medium text-gray-900">{fileData.role || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">Role</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No structural data available</p>
                </div>
              )}
            </div>
          )}

          {/* Other tabs would be implemented similarly */}
          {activeTab === 'relationships' && (
            <div className="text-center py-12 text-gray-500">
              <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Relationship Analysis</h3>
              <p>Code relationship visualization coming soon</p>
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="text-center py-12 text-gray-500">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Pattern Detection</h3>
              <p>Design pattern analysis coming soon</p>
            </div>
          )}

          {activeTab === 'quality' && analysis.results.code_smells && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Code Quality Issues</h3>
              
              {analysis.results.code_smells.length > 0 ? (
                <div className="space-y-3">
                  {analysis.results.code_smells.map((smell, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {getSeverityIcon(smell.severity)}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{smell.description}</h4>
                            <p className="text-sm text-gray-600 mt-1">{smell.suggestion}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>{smell.file}:{smell.line}</span>
                              <span className="px-2 py-1 bg-gray-100 rounded">{smell.type}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          smell.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                          smell.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {smell.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <h3 className="text-lg font-medium text-gray-900">Great Code Quality!</h3>
                  <p>No major quality issues detected</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'suggestions' && analysis.results.suggestions && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Intelligent Suggestions</h3>
              
              {analysis.results.suggestions.length > 0 ? (
                <div className="space-y-4">
                  {analysis.results.suggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Lightbulb className="w-6 h-6 text-blue-600" />
                          <h4 className="text-lg font-semibold text-gray-900">{suggestion.title}</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            suggestion.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                            suggestion.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {suggestion.priority}
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {suggestion.category}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mb-4">{suggestion.description}</p>
                      
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-900">Recommended Actions:</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                          {suggestion.actions.map((action, actionIndex) => (
                            <li key={actionIndex}>{action}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>Estimated effort: {suggestion.estimated_effort}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <h3 className="text-lg font-medium text-gray-900">Code Looks Great!</h3>
                  <p>No immediate suggestions for improvement</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SemanticAnalysisView;