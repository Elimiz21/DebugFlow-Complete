import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Target,
  Clock,
  TrendingUp,
  Shield,
  Zap,
  Brain,
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Calendar,
  BarChart3
} from 'lucide-react';
import { bugPredictionEngine } from '../services/BugPredictionEngine';

/**
 * BugPredictionView - Intelligent bug prediction and prevention dashboard
 * Shows predicted bugs, risk assessment, and prevention strategies
 */
const BugPredictionView = ({ projectData, user, onPredictionComplete }) => {
  const [prediction, setPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('predictions');
  const [expandedPredictions, setExpandedPredictions] = useState(new Set());

  useEffect(() => {
    if (projectData && projectData.files?.length > 0) {
      performBugPrediction();
    }
  }, [projectData]);

  const performBugPrediction = async () => {
    try {
      setIsPredicting(true);
      setError(null);

      console.log('🔮 Starting bug prediction for project:', projectData.name);
      
      const result = await bugPredictionEngine.predictBugs(projectData, {
        includePreventionStrategies: true,
        includeTimelineAnalysis: true,
        includeRiskAssessment: true,
        includeHistoricalLearning: true
      });

      if (result.success) {
        setPrediction(result);
        if (onPredictionComplete) {
          onPredictionComplete(result);
        }
      } else {
        setError(result.error || 'Prediction failed');
      }
    } catch (error) {
      console.error('Bug prediction failed:', error);
      setError(error.message);
    } finally {
      setIsPredicting(false);
    }
  };

  const togglePrediction = (predictionIndex) => {
    const newExpanded = new Set(expandedPredictions);
    if (newExpanded.has(predictionIndex)) {
      newExpanded.delete(predictionIndex);
    } else {
      newExpanded.add(predictionIndex);
    }
    setExpandedPredictions(newExpanded);
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'HIGH':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'LOW':
        return <AlertTriangle className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'urgent':
        return 'text-red-600 bg-red-100 animate-pulse';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatProbability = (probability) => {
    return `${Math.round(probability * 100)}%`;
  };

  if (isPredicting) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="animate-spin">
            <Target className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Predicting Potential Bugs</h3>
            <p className="text-gray-600">Analyzing patterns and predicting future issues...</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <span>Analyzing code patterns and historical data</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <span>Calculating complexity and change impact risks</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
            <span>Detecting temporal patterns and cross-file risks</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
            <span>Generating prevention strategies and recommendations</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <XCircle className="w-6 h-6 text-red-500 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-red-900">Prediction Failed</h3>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={performBugPrediction}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md font-medium"
            >
              Retry Prediction
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Target className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bug Predictions Available</h3>
        <p className="text-gray-600 mb-6">
          Analyze your codebase to predict potential bugs and get prevention strategies.
        </p>
        <button
          onClick={performBugPrediction}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
        >
          Start Bug Prediction
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'predictions', label: 'Bug Predictions', icon: Target },
    { id: 'risk-assessment', label: 'Risk Assessment', icon: BarChart3 },
    { id: 'prevention', label: 'Prevention Strategies', icon: Shield },
    { id: 'timeline', label: 'Timeline Analysis', icon: Calendar }
  ];

  return (
    <div className="space-y-6">
      {/* Prediction Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Target className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-gray-900">Intelligent Bug Prediction</h2>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                Predictive
              </span>
            </div>
            <p className="text-gray-600">
              AI-powered prediction of potential bugs and prevention strategies
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">Overall Confidence</div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(prediction.results.confidence_score * 100)}%
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <Target className="w-6 h-6 text-purple-600" />
              <span className="text-2xl font-bold text-purple-900">
                {prediction.results.predicted_bug_count}
              </span>
            </div>
            <div className="text-purple-700 font-medium mt-1">Predicted Bugs</div>
          </div>

          <div className={`p-4 rounded-lg ${getRiskLevelColor(prediction.results.risk_assessment?.risk_level)}`}>
            <div className="flex items-center justify-between">
              <Activity className="w-6 h-6" />
              <span className="text-2xl font-bold capitalize">
                {prediction.results.risk_assessment?.risk_level}
              </span>
            </div>
            <div className="font-medium mt-1">Risk Level</div>
          </div>

          <div className={`p-4 rounded-lg ${getUrgencyColor(prediction.results.prevention_urgency)}`}>
            <div className="flex items-center justify-between">
              <Clock className="w-6 h-6" />
              <span className="text-2xl font-bold capitalize">
                {prediction.results.prevention_urgency}
              </span>
            </div>
            <div className="font-medium mt-1">Urgency</div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <FileText className="w-6 h-6 text-blue-600" />
              <span className="text-2xl font-bold text-blue-900">
                {prediction.results.high_risk_areas?.length || 0}
              </span>
            </div>
            <div className="text-blue-700 font-medium mt-1">High Risk Areas</div>
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
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Bug Predictions Tab */}
          {activeTab === 'predictions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Predicted Bug Issues</h3>
                <button
                  onClick={performBugPrediction}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>

              {prediction.results.predictions.length > 0 ? (
                <div className="space-y-3">
                  {prediction.results.predictions.map((pred, index) => (
                    <div key={index} className={`border rounded-lg ${getSeverityColor(pred.severity)}`}>
                      <button
                        onClick={() => togglePrediction(index)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-opacity-50"
                      >
                        <div className="flex items-start space-x-3">
                          {getSeverityIcon(pred.severity)}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{pred.description}</h4>
                            <div className="flex items-center space-x-4 mt-1 text-sm">
                              <span className="flex items-center">
                                <FileText className="w-3 h-3 mr-1" />
                                {pred.file_path}
                                {pred.line_number && `:${pred.line_number}`}
                              </span>
                              <span className="flex items-center">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {formatProbability(pred.probability)} probability
                              </span>
                              <span className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs">
                                {pred.predicted_bug_type}
                              </span>
                            </div>
                          </div>
                        </div>
                        {expandedPredictions.has(index) ? 
                          <ChevronUp className="w-5 h-5" /> :
                          <ChevronDown className="w-5 h-5" />
                        }
                      </button>

                      {expandedPredictions.has(index) && (
                        <div className="px-4 pb-4 border-t bg-white bg-opacity-30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <h5 className="font-medium text-gray-900 mb-2">Details</h5>
                              <div className="space-y-1 text-sm">
                                <div>
                                  <span className="text-gray-600">Type:</span>
                                  <span className="ml-2 font-medium">{pred.type}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Confidence:</span>
                                  <span className="ml-2 font-medium">{formatProbability(pred.confidence)}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Prevention Difficulty:</span>
                                  <span className="ml-2 font-medium capitalize">{pred.prevention_difficulty}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Detection Method:</span>
                                  <span className="ml-2 font-medium">{pred.detection_method}</span>
                                </div>
                              </div>
                            </div>

                            {pred.recommended_actions && (
                              <div>
                                <h5 className="font-medium text-gray-900 mb-2">Recommended Actions</h5>
                                <ul className="text-sm space-y-1">
                                  {pred.recommended_actions.map((action, actionIndex) => (
                                    <li key={actionIndex} className="flex items-start">
                                      <CheckCircle className="w-3 h-3 text-green-600 mt-1 mr-2 flex-shrink-0" />
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {(pred.function_name || pred.class_name) && (
                            <div className="mt-4 p-3 bg-white bg-opacity-50 rounded">
                              <h5 className="font-medium text-gray-900 mb-2">Code Context</h5>
                              {pred.function_name && (
                                <div className="text-sm">
                                  <span className="text-gray-600">Function:</span>
                                  <span className="ml-2 font-mono font-medium">{pred.function_name}</span>
                                </div>
                              )}
                              {pred.class_name && (
                                <div className="text-sm">
                                  <span className="text-gray-600">Class:</span>
                                  <span className="ml-2 font-mono font-medium">{pred.class_name}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <h3 className="text-lg font-medium text-gray-900">Great Code Quality!</h3>
                  <p>No high-probability bugs predicted</p>
                </div>
              )}
            </div>
          )}

          {/* Risk Assessment Tab */}
          {activeTab === 'risk-assessment' && prediction.results.risk_assessment && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Risk Assessment Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Overall Risk Score</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(prediction.results.risk_assessment.overall_risk_score * 100)}/100
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        prediction.results.risk_assessment.overall_risk_score > 0.7 ? 'bg-red-500' :
                        prediction.results.risk_assessment.overall_risk_score > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${prediction.results.risk_assessment.overall_risk_score * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Predicted Bugs per File</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {prediction.results.risk_assessment.predicted_bugs_per_file.toFixed(2)}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Average Bug Probability</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatProbability(prediction.results.risk_assessment.average_bug_probability)}
                  </div>
                </div>
              </div>

              {prediction.results.high_risk_areas?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">High Risk Areas</h4>
                  <div className="space-y-2">
                    {prediction.results.high_risk_areas.map((area, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-red-600" />
                          <span className="font-medium text-red-900">{area.file}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-red-800">
                            Risk Score: {area.risk_score.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prevention Strategies Tab */}
          {activeTab === 'prevention' && prediction.results.prevention_strategies && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Prevention Strategies</h3>
              
              {prediction.results.prevention_strategies.length > 0 ? (
                <div className="space-y-4">
                  {prediction.results.prevention_strategies.map((strategy, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-5 h-5 text-green-600" />
                          <h4 className="text-lg font-semibold text-gray-900 capitalize">
                            {strategy.bug_type} Prevention
                          </h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            strategy.priority === 'high' ? 'bg-red-100 text-red-800' :
                            strategy.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {strategy.priority} priority
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-900">Strategies:</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {strategy.strategies.map((item, itemIndex) => (
                            <li key={itemIndex}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                        <div>Impact Score: {strategy.impact_score.toFixed(2)}</div>
                        <div>Estimated Effort: {strategy.estimated_effort}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <h3 className="text-lg font-medium text-gray-900">No Specific Strategies Needed</h3>
                  <p>Your code shows good practices with low bug risk</p>
                </div>
              )}
            </div>
          )}

          {/* Timeline Analysis Tab */}
          {activeTab === 'timeline' && prediction.results.timeline_analysis && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Bug Risk Timeline</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {prediction.results.timeline_analysis.immediate_risk}
                  </div>
                  <div className="text-sm font-medium text-red-800">Immediate Risk</div>
                  <div className="text-xs text-red-600 mt-1">Next 1-7 days</div>
                </div>
                
                <div className="text-center p-6 bg-yellow-50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {prediction.results.timeline_analysis.short_term_risk}
                  </div>
                  <div className="text-sm font-medium text-yellow-800">Short Term Risk</div>
                  <div className="text-xs text-yellow-600 mt-1">Next 1-4 weeks</div>
                </div>
                
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {prediction.results.timeline_analysis.long_term_risk}
                  </div>
                  <div className="text-sm font-medium text-blue-800">Long Term Risk</div>
                  <div className="text-xs text-blue-600 mt-1">Next 1-6 months</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Recommendation Timeline</h4>
                <div className="space-y-3">
                  {prediction.results.timeline_analysis.immediate_risk > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-red-100 rounded-lg">
                      <Clock className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium text-red-900">Immediate Action Required</div>
                        <div className="text-sm text-red-700">Address high-probability bugs within 1 week</div>
                      </div>
                    </div>
                  )}
                  
                  {prediction.results.timeline_analysis.short_term_risk > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-yellow-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-medium text-yellow-900">Plan Prevention Measures</div>
                        <div className="text-sm text-yellow-700">Implement prevention strategies within 1 month</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3 p-3 bg-blue-100 rounded-lg">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900">Monitor and Review</div>
                      <div className="text-sm text-blue-700">Regular code quality reviews and pattern updates</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BugPredictionView;