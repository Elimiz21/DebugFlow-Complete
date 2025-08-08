import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Activity, Code, Bug, AlertTriangle,
  Clock, CheckCircle, XCircle, BarChart3, LineChart,
  PieChart, Calendar, Download, Filter, RefreshCw,
  Zap, Target, TrendingDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Analytics data state
  const [metrics, setMetrics] = useState({
    totalBugs: 0,
    resolvedBugs: 0,
    avgResolutionTime: 0,
    criticalBugs: 0,
    activeProjects: 0,
    totalAnalyses: 0,
    aiAccuracy: 0,
    userActivity: 0
  });

  const [chartData, setChartData] = useState({
    bugTrend: null,
    resolutionTime: null,
    severityDistribution: null,
    projectActivity: null,
    aiPerformance: null,
    userEngagement: null
  });

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // Simulate loading analytics data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate sample metrics
      setMetrics({
        totalBugs: 247,
        resolvedBugs: 189,
        avgResolutionTime: 4.2,
        criticalBugs: 12,
        activeProjects: 8,
        totalAnalyses: 1456,
        aiAccuracy: 92.5,
        userActivity: 156
      });

      // Generate chart data
      generateChartData();
      
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = () => {
    const labels = getTimeLabels();
    
    setChartData({
      bugTrend: {
        labels,
        datasets: [
          {
            label: 'New Bugs',
            data: generateRandomData(labels.length, 10, 30),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.3
          },
          {
            label: 'Resolved Bugs',
            data: generateRandomData(labels.length, 8, 25),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.3
          }
        ]
      },
      resolutionTime: {
        labels: ['< 1 day', '1-3 days', '3-7 days', '> 7 days'],
        datasets: [{
          data: [45, 30, 18, 7],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ]
        }]
      },
      severityDistribution: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          label: 'Bug Severity',
          data: [12, 35, 89, 111],
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(34, 197, 94, 0.8)'
          ],
          borderWidth: 2,
          borderColor: '#1f2937'
        }]
      },
      projectActivity: {
        labels,
        datasets: [{
          label: 'Active Projects',
          data: generateRandomData(labels.length, 5, 12),
          backgroundColor: 'rgba(6, 182, 212, 0.8)',
          borderColor: 'rgb(6, 182, 212)',
          borderWidth: 2
        }]
      },
      aiPerformance: {
        labels: ['Accuracy', 'Speed', 'Coverage', 'Reliability', 'Efficiency'],
        datasets: [{
          label: 'Current',
          data: [92, 88, 78, 95, 85],
          backgroundColor: 'rgba(168, 85, 247, 0.2)',
          borderColor: 'rgb(168, 85, 247)',
          borderWidth: 2
        },
        {
          label: 'Target',
          data: [95, 90, 85, 98, 90],
          backgroundColor: 'rgba(6, 182, 212, 0.2)',
          borderColor: 'rgb(6, 182, 212)',
          borderWidth: 2
        }]
      },
      userEngagement: {
        labels,
        datasets: [{
          label: 'Daily Active Users',
          data: generateRandomData(labels.length, 20, 50),
          borderColor: 'rgb(251, 191, 36)',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          fill: true,
          tension: 0.4
        }]
      }
    });
  };

  const getTimeLabels = () => {
    switch (timeRange) {
      case '24h':
        return Array.from({ length: 24 }, (_, i) => `${i}:00`);
      case '7d':
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      case '30d':
        return Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
      case '90d':
        return Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`);
      default:
        return [];
    }
  };

  const generateRandomData = (length, min, max) => {
    return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting analytics data...');
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9ca3af'
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#fff',
        bodyColor: '#9ca3af'
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        },
        ticks: {
          color: '#9ca3af'
        }
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        },
        ticks: {
          color: '#9ca3af'
        }
      }
    }
  };

  const radarOptions = {
    ...chartOptions,
    scales: {
      r: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        },
        ticks: {
          color: '#9ca3af',
          backdropColor: 'transparent'
        },
        pointLabels: {
          color: '#9ca3af'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-gray-400 mt-2">Monitor your debugging performance and AI insights</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-400"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Bug className="w-8 h-8 text-red-400" />
              <span className="text-sm text-green-400 flex items-center">
                <ArrowUp className="w-3 h-3 mr-1" />
                12%
              </span>
            </div>
            <div className="text-2xl font-bold text-white">{metrics.totalBugs}</div>
            <div className="text-gray-400 text-sm">Total Bugs</div>
            <div className="mt-2 text-xs text-gray-500">
              {metrics.criticalBugs} critical issues
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <span className="text-sm text-green-400 flex items-center">
                <ArrowUp className="w-3 h-3 mr-1" />
                8%
              </span>
            </div>
            <div className="text-2xl font-bold text-white">{metrics.resolvedBugs}</div>
            <div className="text-gray-400 text-sm">Resolved Bugs</div>
            <div className="mt-2">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-400 h-2 rounded-full"
                  style={{ width: `${(metrics.resolvedBugs / metrics.totalBugs) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-yellow-400" />
              <span className="text-sm text-red-400 flex items-center">
                <ArrowDown className="w-3 h-3 mr-1" />
                5%
              </span>
            </div>
            <div className="text-2xl font-bold text-white">{metrics.avgResolutionTime}d</div>
            <div className="text-gray-400 text-sm">Avg Resolution Time</div>
            <div className="mt-2 text-xs text-gray-500">
              Target: 3 days
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 text-purple-400" />
              <span className="text-sm text-green-400 flex items-center">
                <ArrowUp className="w-3 h-3 mr-1" />
                3%
              </span>
            </div>
            <div className="text-2xl font-bold text-white">{metrics.aiAccuracy}%</div>
            <div className="text-gray-400 text-sm">AI Accuracy</div>
            <div className="mt-2 text-xs text-gray-500">
              {metrics.totalAnalyses} analyses
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-700">
          {['overview', 'bugs', 'performance', 'ai-insights'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 text-sm font-medium capitalize transition-colors
                ${activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-white'
                }
              `}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bug Trend Chart */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-cyan-400" />
              Bug Trend
            </h3>
            <div className="h-64">
              {chartData.bugTrend && (
                <Line data={chartData.bugTrend} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Resolution Time Distribution */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-green-400" />
              Resolution Time Distribution
            </h3>
            <div className="h-64">
              {chartData.resolutionTime && (
                <Doughnut data={chartData.resolutionTime} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Project Activity */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Project Activity
            </h3>
            <div className="h-64">
              {chartData.projectActivity && (
                <Bar data={chartData.projectActivity} options={chartOptions} />
              )}
            </div>
          </div>

          {/* User Engagement */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-400" />
              User Engagement
            </h3>
            <div className="h-64">
              {chartData.userEngagement && (
                <Line data={chartData.userEngagement} options={chartOptions} />
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bugs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Severity Distribution */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Bug Severity Distribution</h3>
            <div className="h-64">
              {chartData.severityDistribution && (
                <Doughnut data={chartData.severityDistribution} options={chartOptions} />
              )}
            </div>
          </div>

          {/* Bug Statistics */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Bug Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Open Bugs</span>
                <span className="text-white font-semibold">58</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">In Progress</span>
                <span className="text-white font-semibold">23</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Ready for Testing</span>
                <span className="text-white font-semibold">15</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Closed This Week</span>
                <span className="text-white font-semibold">42</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Reopened</span>
                <span className="text-white font-semibold">7</span>
              </div>
            </div>
          </div>

          {/* Top Bug Categories */}
          <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">Top Bug Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'UI/UX', count: 67, color: 'bg-blue-500' },
                { name: 'Backend', count: 54, color: 'bg-green-500' },
                { name: 'Performance', count: 43, color: 'bg-yellow-500' },
                { name: 'Security', count: 28, color: 'bg-red-500' },
                { name: 'Database', count: 21, color: 'bg-purple-500' },
                { name: 'API', count: 19, color: 'bg-pink-500' },
                { name: 'Mobile', count: 12, color: 'bg-indigo-500' },
                { name: 'Other', count: 8, color: 'bg-gray-500' }
              ].map(category => (
                <div key={category.name} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">{category.name}</span>
                    <span className="text-white font-semibold">{category.count}</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className={`${category.color} h-2 rounded-full`}
                      style={{ width: `${(category.count / 67) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Performance Radar */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">AI Performance Metrics</h3>
            <div className="h-64">
              {chartData.aiPerformance && (
                <Radar data={chartData.aiPerformance} options={radarOptions} />
              )}
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">System Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">API Response Time</span>
                  <span className="text-white">145ms</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Analysis Speed</span>
                  <span className="text-white">2.3s</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '70%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">System Uptime</span>
                  <span className="text-white">99.98%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-cyan-400 h-2 rounded-full" style={{ width: '99.98%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Memory Usage</span>
                  <span className="text-white">4.2GB / 8GB</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-400 h-2 rounded-full" style={{ width: '52.5%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Performance Events */}
          <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Performance Events</h3>
            <div className="space-y-3">
              {[
                { time: '2 hours ago', event: 'API latency spike detected', status: 'resolved', severity: 'warning' },
                { time: '5 hours ago', event: 'Database optimization completed', status: 'success', severity: 'info' },
                { time: '1 day ago', event: 'Memory usage exceeded threshold', status: 'monitoring', severity: 'warning' },
                { time: '2 days ago', event: 'System update deployed', status: 'success', severity: 'info' },
                { time: '3 days ago', event: 'AI model retrained', status: 'success', severity: 'info' }
              ].map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.severity === 'warning' ? 'bg-yellow-400' : 
                      event.severity === 'error' ? 'bg-red-400' : 'bg-green-400'
                    }`} />
                    <div>
                      <p className="text-white">{event.event}</p>
                      <p className="text-gray-400 text-sm">{event.time}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    event.status === 'resolved' ? 'bg-green-900/30 text-green-400' :
                    event.status === 'monitoring' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-cyan-900/30 text-cyan-400'
                  }`}>
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai-insights' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Insights Summary */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">AI Analysis Insights</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyan-400">Pattern Detection</span>
                  <Target className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-gray-300 text-sm">
                  Identified 23 recurring bug patterns across 5 projects
                </p>
              </div>
              
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-purple-400">Code Quality Trends</span>
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-gray-300 text-sm">
                  15% improvement in code quality metrics this month
                </p>
              </div>
              
              <div className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-400">Prediction Accuracy</span>
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-gray-300 text-sm">
                  Bug prediction accuracy improved to 87.3%
                </p>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">AI Recommendations</h3>
            <div className="space-y-3">
              {[
                { priority: 'high', title: 'Refactor authentication module', reason: 'High complexity detected' },
                { priority: 'medium', title: 'Add unit tests to API endpoints', reason: 'Low test coverage' },
                { priority: 'high', title: 'Optimize database queries', reason: 'Performance bottleneck identified' },
                { priority: 'low', title: 'Update documentation', reason: 'Outdated API docs detected' },
                { priority: 'medium', title: 'Review security dependencies', reason: '3 vulnerabilities found' }
              ].map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    rec.priority === 'high' ? 'bg-red-400' :
                    rec.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{rec.title}</p>
                    <p className="text-gray-400 text-xs mt-1">{rec.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Model Performance */}
          <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">AI Model Performance by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Bug Detection', accuracy: 92, improvement: '+5%' },
                { name: 'Code Analysis', accuracy: 88, improvement: '+3%' },
                { name: 'Pattern Recognition', accuracy: 85, improvement: '+7%' },
                { name: 'Risk Assessment', accuracy: 90, improvement: '+2%' },
                { name: 'Auto-Fix Suggestions', accuracy: 78, improvement: '+10%' },
                { name: 'Performance Analysis', accuracy: 83, improvement: '+4%' },
                { name: 'Security Scanning', accuracy: 95, improvement: '+1%' },
                { name: 'Documentation Gen', accuracy: 72, improvement: '+8%' }
              ].map(model => (
                <div key={model.name} className="bg-gray-700 rounded-lg p-4">
                  <h4 className="text-white text-sm font-medium mb-2">{model.name}</h4>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold text-white">{model.accuracy}%</div>
                      <div className="text-green-400 text-xs">{model.improvement}</div>
                    </div>
                    <div className="w-16 h-16">
                      <div className="relative">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-gray-600"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${2 * Math.PI * 28 * (1 - model.accuracy / 100)}`}
                            className="text-cyan-400"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;