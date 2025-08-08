import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar,
  User,
  Settings,
  Shield,
  Database,
  Code,
  Users,
  AlertCircle,
  Download,
  Eye,
  ChevronDown,
  Clock,
  Activity,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import organizationService from '../../services/OrganizationService.js';
import toast from 'react-hot-toast';

const AuditLogs = ({ organizationId, currentUserRole }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    action_type: '',
    user_id: '',
    date_from: '',
    date_to: '',
    severity: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Available filter options
  const actionTypes = [
    { value: 'user.login', label: 'User Login', icon: User },
    { value: 'user.logout', label: 'User Logout', icon: User },
    { value: 'user.created', label: 'User Created', icon: UserPlus },
    { value: 'user.updated', label: 'User Updated', icon: Edit },
    { value: 'user.deleted', label: 'User Deleted', icon: UserMinus },
    { value: 'organization.created', label: 'Organization Created', icon: Plus },
    { value: 'organization.updated', label: 'Organization Updated', icon: Settings },
    { value: 'team.created', label: 'Team Created', icon: Users },
    { value: 'team.updated', label: 'Team Updated', icon: Users },
    { value: 'team.deleted', label: 'Team Deleted', icon: Trash2 },
    { value: 'project.created', label: 'Project Created', icon: Code },
    { value: 'project.updated', label: 'Project Updated', icon: Code },
    { value: 'project.deleted', label: 'Project Deleted', icon: Code },
    { value: 'security.policy_updated', label: 'Security Policy Updated', icon: Shield },
    { value: 'security.api_key_created', label: 'API Key Created', icon: Lock },
    { value: 'security.api_key_revoked', label: 'API Key Revoked', icon: Unlock },
    { value: 'security.login_failed', label: 'Login Failed', icon: AlertCircle },
    { value: 'data.export', label: 'Data Export', icon: Download },
    { value: 'data.import', label: 'Data Import', icon: Database }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'text-green-400' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
    { value: 'high', label: 'High', color: 'text-orange-400' },
    { value: 'critical', label: 'Critical', color: 'text-red-400' }
  ];

  useEffect(() => {
    if (organizationId) {
      fetchLogs();
    }
  }, [organizationId, currentPage, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = {
        page: currentPage,
        limit: 20,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== '')
        )
      };

      const data = await organizationService.getAuditLogs(organizationId, queryParams);
      setLogs(data.logs || []);
      setTotalPages(Math.ceil((data.total || 0) / 20));
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = async () => {
    setIsExporting(true);
    try {
      const exportData = await organizationService.getAuditLogs(organizationId, {
        ...filters,
        format: 'csv',
        limit: 10000 // Export more records
      });
      
      // Create CSV content
      const headers = ['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'User Agent', 'Severity'];
      const csvContent = [
        headers.join(','),
        ...exportData.logs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.user_name || 'System',
          log.action_type,
          log.resource || '',
          log.ip_address || '',
          log.user_agent || '',
          log.severity || 'medium'
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Audit logs exported successfully');
    } catch (error) {
      toast.error('Failed to export audit logs');
    } finally {
      setIsExporting(false);
    }
  };

  const getActionIcon = (actionType) => {
    const action = actionTypes.find(a => a.value === actionType);
    return action ? action.icon : Activity;
  };

  const getSeverityColor = (severity) => {
    const level = severityLevels.find(s => s.value === severity);
    return level ? level.color : 'text-gray-400';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  const canViewAuditLogs = organizationService.canViewAuditLogs(currentUserRole);

  if (!canViewAuditLogs) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Access Restricted</h3>
          <p className="text-gray-400">
            You need admin or owner permissions to view audit logs.
          </p>
        </div>
      </div>
    );
  }

  if (loading && currentPage === 1) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-700 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-gray-700 rounded w-16"></div>
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
          <h3 className="text-lg font-medium text-white mb-2">Failed to Load Audit Logs</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchLogs}
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
            <FileText className="w-6 h-6 text-blue-400 mr-2" />
            <h2 className="text-xl font-semibold text-white">Audit Logs</h2>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            <button
              onClick={handleExportLogs}
              disabled={isExporting}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs by user, action, or resource..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-700 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Action Type
                </label>
                <select
                  value={filters.action_type}
                  onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Actions</option>
                  {actionTypes.map(action => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Severity
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Levels</option>
                  {severityLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setFilters({
                    action_type: '',
                    user_id: '',
                    date_from: '',
                    date_to: '',
                    severity: ''
                  });
                  setCurrentPage(1);
                }}
                className="px-3 py-1 text-sm text-gray-300 bg-gray-600 rounded hover:bg-gray-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Logs List */}
      <div className="p-6">
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No Audit Logs</h3>
            <p className="text-gray-500">
              {searchTerm || Object.values(filters).some(f => f !== '')
                ? 'No logs match your current filters'
                : 'No audit logs have been recorded yet'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {logs.filter(log => 
                !searchTerm || 
                log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.resource?.toLowerCase().includes(searchTerm.toLowerCase())
              ).map((log) => {
                const ActionIcon = getActionIcon(log.action_type);
                
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedLog(log);
                      setShowLogModal(true);
                    }}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`p-2 rounded-lg bg-gray-600 ${getSeverityColor(log.severity)}`}>
                        <ActionIcon className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-white truncate">
                            {actionTypes.find(a => a.value === log.action_type)?.label || log.action_type}
                          </h3>
                          {log.severity && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              log.severity === 'critical' ? 'bg-red-900 text-red-300' :
                              log.severity === 'high' ? 'bg-orange-900 text-orange-300' :
                              log.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-green-900 text-green-300'
                            }`}>
                              {log.severity}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-400">
                          <span className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {log.user_name || 'System'}
                            </span>
                            {log.resource && (
                              <span>
                                Resource: {log.resource}
                              </span>
                            )}
                            {log.ip_address && (
                              <span>
                                IP: {log.ip_address}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {getRelativeTime(log.timestamp)}
                      </span>
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-600 text-gray-300 rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-gray-600 text-gray-300 rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Details Modal */}
      {showLogModal && selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowLogModal(false)}></div>

            <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                <h3 className="text-lg font-medium text-white">
                  Audit Log Details
                </h3>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-medium text-white mb-3">Basic Information</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-400">Action:</span>
                        <span className="ml-2 text-white font-medium">
                          {actionTypes.find(a => a.value === selectedLog.action_type)?.label || selectedLog.action_type}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">User:</span>
                        <span className="ml-2 text-white">{selectedLog.user_name || 'System'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Timestamp:</span>
                        <span className="ml-2 text-white">{formatTimestamp(selectedLog.timestamp)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Severity:</span>
                        <span className={`ml-2 font-medium capitalize ${getSeverityColor(selectedLog.severity)}`}>
                          {selectedLog.severity || 'Medium'}
                        </span>
                      </div>
                      {selectedLog.resource && (
                        <div>
                          <span className="text-gray-400">Resource:</span>
                          <span className="ml-2 text-white">{selectedLog.resource}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-white mb-3">Session Information</h4>
                    <div className="space-y-3 text-sm">
                      {selectedLog.ip_address && (
                        <div>
                          <span className="text-gray-400">IP Address:</span>
                          <span className="ml-2 text-white font-mono">{selectedLog.ip_address}</span>
                        </div>
                      )}
                      {selectedLog.user_agent && (
                        <div>
                          <span className="text-gray-400">User Agent:</span>
                          <span className="ml-2 text-white text-xs">{selectedLog.user_agent}</span>
                        </div>
                      )}
                      {selectedLog.session_id && (
                        <div>
                          <span className="text-gray-400">Session ID:</span>
                          <span className="ml-2 text-white font-mono text-xs">{selectedLog.session_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedLog.details && (
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-white mb-3">Additional Details</h4>
                    <div className="bg-gray-900 p-4 rounded-lg">
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                        {typeof selectedLog.details === 'string' 
                          ? selectedLog.details 
                          : JSON.stringify(selectedLog.details, null, 2)
                        }
                      </pre>
                    </div>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div className="mt-6">
                    <h4 className="text-md font-medium text-white mb-3">Metadata</h4>
                    <div className="bg-gray-900 p-4 rounded-lg">
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;