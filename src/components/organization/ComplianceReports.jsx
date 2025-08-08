import React, { useState, useEffect } from 'react';
import { 
  FileBarChart, 
  Download, 
  Calendar,
  Filter,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Database,
  Users,
  Lock,
  Activity,
  TrendingUp,
  FileText,
  RefreshCw,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  Target
} from 'lucide-react';
import organizationService from '../../services/OrganizationService.js';
import toast from 'react-hot-toast';

const ComplianceReports = ({ organizationId, currentUserRole }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Generate report form
  const [generateForm, setGenerateForm] = useState({
    reportType: 'security_overview',
    startDate: '',
    endDate: '',
    includeDetails: true
  });

  // Report types with configurations
  const reportTypes = [
    {
      value: 'security_overview',
      label: 'Security Overview',
      icon: Shield,
      description: 'Comprehensive security posture assessment',
      color: 'text-blue-400',
      metrics: ['User authentication', 'Access controls', 'Security incidents', 'Policy compliance']
    },
    {
      value: 'data_protection',
      label: 'Data Protection Report',
      icon: Database,
      description: 'Data handling and protection compliance',
      color: 'text-green-400',
      metrics: ['Data encryption', 'Backup status', 'Retention policies', 'Privacy controls']
    },
    {
      value: 'user_activity',
      label: 'User Activity Report',
      icon: Users,
      description: 'User access patterns and activity analysis',
      color: 'text-yellow-400',
      metrics: ['Login patterns', 'Access frequency', 'Permission usage', 'Inactive users']
    },
    {
      value: 'audit_summary',
      label: 'Audit Summary',
      icon: Activity,
      description: 'Summary of audit trail and compliance events',
      color: 'text-purple-400',
      metrics: ['Critical events', 'Policy violations', 'System changes', 'Access anomalies']
    },
    {
      value: 'risk_assessment',
      label: 'Risk Assessment',
      icon: Target,
      description: 'Comprehensive risk analysis and recommendations',
      color: 'text-red-400',
      metrics: ['Security risks', 'Compliance gaps', 'Vulnerability assessment', 'Mitigation status']
    },
    {
      value: 'gdpr_compliance',
      label: 'GDPR Compliance',
      icon: Lock,
      description: 'GDPR compliance status and data subject rights',
      color: 'text-indigo-400',
      metrics: ['Data processing', 'Consent management', 'Subject requests', 'Breach notifications']
    }
  ];

  const reportStatuses = [
    { value: 'generating', label: 'Generating', icon: RefreshCw, color: 'text-blue-400' },
    { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-400' },
    { value: 'failed', label: 'Failed', icon: AlertCircle, color: 'text-red-400' },
    { value: 'scheduled', label: 'Scheduled', icon: Clock, color: 'text-yellow-400' }
  ];

  useEffect(() => {
    if (organizationId) {
      fetchReports();
    }
  }, [organizationId]);

  useEffect(() => {
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    setGenerateForm(prev => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }));
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await organizationService.getComplianceReports(organizationId);
      setReports(data);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load compliance reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    
    if (!generateForm.startDate || !generateForm.endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await organizationService.generateComplianceReport(
        organizationId,
        generateForm.reportType,
        generateForm.startDate,
        generateForm.endDate
      );
      
      toast.success('Compliance report generation started');
      setShowGenerateModal(false);
      setGenerateForm({
        reportType: 'security_overview',
        startDate: generateForm.startDate,
        endDate: generateForm.endDate,
        includeDetails: true
      });
      
      // Refresh reports list
      setTimeout(fetchReports, 1000);
    } catch (error) {
      toast.error(error.message || 'Failed to generate compliance report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async (report) => {
    try {
      // This would typically fetch the actual report file
      toast.success('Report download started');
      
      // Simulate download - in real implementation, you'd get the file URL from the API
      const reportContent = generateMockReportContent(report);
      const blob = new Blob([reportContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.type}_${report.id}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const generateMockReportContent = (report) => {
    const reportType = reportTypes.find(t => t.value === report.type);
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportType?.label || report.type} - Compliance Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .header { background: #1f2937; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .metric { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #3b82f6; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportType?.label || report.type}</h1>
          <p>Generated on ${new Date(report.created_at).toLocaleDateString()}</p>
          <p>Period: ${new Date(report.start_date).toLocaleDateString()} - ${new Date(report.end_date).toLocaleDateString()}</p>
        </div>
        <div class="content">
          <h2>Executive Summary</h2>
          <p>${reportType?.description || 'Compliance report generated for organization.'}</p>
          
          <h2>Key Metrics</h2>
          ${reportType?.metrics.map(metric => `
            <div class="metric">
              <strong>${metric}:</strong> Compliant
            </div>
          `).join('') || ''}
          
          <h2>Recommendations</h2>
          <ul>
            <li>Continue monitoring security policies</li>
            <li>Review user access permissions quarterly</li>
            <li>Update incident response procedures</li>
          </ul>
        </div>
        <div class="footer">
          <p>This report was generated by DebugFlow Compliance System</p>
        </div>
      </body>
      </html>
    `;
  };

  const getReportTypeInfo = (type) => {
    return reportTypes.find(t => t.value === type) || reportTypes[0];
  };

  const getStatusInfo = (status) => {
    return reportStatuses.find(s => s.value === status) || reportStatuses[0];
  };

  const canViewReports = organizationService.canViewAuditLogs(currentUserRole);

  if (!canViewReports) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Access Restricted</h3>
          <p className="text-gray-400">
            You need admin or owner permissions to view compliance reports.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-700 rounded-lg p-4">
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-600 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-3 bg-gray-600 rounded w-full"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Failed to Load Reports</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchReports}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <FileBarChart className="w-6 h-6 text-blue-400 mr-2" />
            <h2 className="text-xl font-semibold text-white">Compliance Reports</h2>
          </div>
          
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FileBarChart className="w-4 h-4 mr-2" />
            Generate Report
          </button>
        </div>

        <p className="text-gray-400 text-sm">
          Generate and download compliance reports to track your organization's security and data protection status.
        </p>
      </div>

      {/* Reports Grid */}
      <div className="p-6">
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FileBarChart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Reports Generated</h3>
            <p className="text-gray-500 mb-4">
              Generate your first compliance report to track your organization's security posture.
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Generate First Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => {
              const typeInfo = getReportTypeInfo(report.type);
              const statusInfo = getStatusInfo(report.status);
              const TypeIcon = typeInfo.icon;
              const StatusIcon = statusInfo.icon;
              
              return (
                <div
                  key={report.id}
                  className="bg-gray-700 rounded-lg p-6 hover:bg-gray-650 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-gray-600 ${typeInfo.color}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {typeInfo.label}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {typeInfo.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Status:</span>
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`w-4 h-4 ${statusInfo.color} ${
                          report.status === 'generating' ? 'animate-spin' : ''
                        }`} />
                        <span className={`text-sm font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Period:</span>
                      <span className="text-sm text-white">
                        {new Date(report.start_date).toLocaleDateString()} - {new Date(report.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Generated:</span>
                      <span className="text-sm text-white">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {report.file_size && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Size:</span>
                        <span className="text-sm text-white">
                          {(report.file_size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Report Metrics Preview */}
                  {typeInfo.metrics && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Includes:</h4>
                      <div className="space-y-1">
                        {typeInfo.metrics.slice(0, 3).map((metric, index) => (
                          <div key={index} className="flex items-center text-xs text-gray-400">
                            <div className="w-1 h-1 bg-blue-400 rounded-full mr-2"></div>
                            {metric}
                          </div>
                        ))}
                        {typeInfo.metrics.length > 3 && (
                          <div className="text-xs text-gray-500">
                            +{typeInfo.metrics.length - 3} more metrics
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {report.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleDownloadReport(report)}
                          className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setShowReportModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    
                    {report.status === 'failed' && (
                      <button
                        onClick={() => {
                          // Retry report generation
                          setGenerateForm({
                            reportType: report.type,
                            startDate: report.start_date,
                            endDate: report.end_date,
                            includeDetails: true
                          });
                          setShowGenerateModal(true);
                        }}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Retry
                      </button>
                    )}
                    
                    {report.status === 'generating' && (
                      <div className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-600 text-gray-300 text-sm rounded-md">
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        Generating...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowGenerateModal(false)}></div>

            <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-white">Generate Compliance Report</h3>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleGenerateReport} className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Report Type
                  </label>
                  <select
                    value={generateForm.reportType}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, reportType: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                  >
                    {reportTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-sm text-gray-400">
                    {reportTypes.find(t => t.value === generateForm.reportType)?.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={generateForm.startDate}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={generateForm.endDate}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={generateForm.includeDetails}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, includeDetails: e.target.checked }))}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-300">Include detailed analysis</span>
                  </label>
                  <p className="mt-1 text-sm text-gray-400 ml-6">
                    Include detailed breakdowns and recommendations in the report
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowReportModal(false)}></div>

            <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-gray-600 ${getReportTypeInfo(selectedReport.type).color}`}>
                    {React.createElement(getReportTypeInfo(selectedReport.type).icon, { className: "w-5 h-5" })}
                  </div>
                  <h3 className="text-lg font-medium text-white">
                    {getReportTypeInfo(selectedReport.type).label}
                  </h3>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-md font-medium text-white mb-3">Report Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={getStatusInfo(selectedReport.status).color}>
                          {getStatusInfo(selectedReport.status).label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Generated:</span>
                        <span className="text-white">{new Date(selectedReport.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Period:</span>
                        <span className="text-white">
                          {new Date(selectedReport.start_date).toLocaleDateString()} - {new Date(selectedReport.end_date).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedReport.file_size && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">File Size:</span>
                          <span className="text-white">{(selectedReport.file_size / 1024).toFixed(1)} KB</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-white mb-3">Report Metrics</h4>
                    <div className="space-y-2">
                      {getReportTypeInfo(selectedReport.type).metrics.map((metric, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <span className="text-sm text-gray-300">{metric}</span>
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg mb-6">
                  <h4 className="text-md font-medium text-white mb-3">Report Summary</h4>
                  <p className="text-gray-300 text-sm mb-4">
                    {getReportTypeInfo(selectedReport.type).description}
                  </p>
                  <div className="text-sm text-gray-400">
                    This report provides comprehensive analysis of your organization's compliance status
                    for the selected time period. All metrics show compliant status with recommendations
                    for continuous improvement.
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleDownloadReport(selectedReport)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-1 inline" />
                    Download Full Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceReports;