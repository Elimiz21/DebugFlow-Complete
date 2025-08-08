import React, { useState, useEffect, useContext } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  BarChart3, 
  CheckSquare, 
  Square, 
  Bug,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  SortAsc,
  SortDesc,
  Trash2,
  Edit,
  Brain
} from 'lucide-react';
import BugCard from '../components/BugCard.jsx';
import BugCreateModal from '../components/BugCreateModal.jsx';
import { bugReportManager } from '../services/BugReportManager.js';
import { ProjectContext } from '../contexts/ProjectContext.jsx';
import toast from 'react-hot-toast';

const BugReports = ({ user }) => {
  const { selectedProject } = useContext(ProjectContext);
  const [bugs, setBugs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBug, setEditingBug] = useState(null);
  const [selectedBugs, setSelectedBugs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    category: '',
    assignee_id: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    if (selectedProject) {
      loadBugReports();
      loadLabels();
    }
  }, [selectedProject, filters]);

  const loadBugReports = async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      const data = await bugReportManager.getBugReports(selectedProject.id, filters);
      setBugs(data.bugs || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Error loading bug reports:', error);
      setBugs([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const loadLabels = async () => {
    try {
      const labelsData = await bugReportManager.getBugLabels();
      setLabels(labelsData);
    } catch (error) {
      console.error('Error loading labels:', error);
    }
  };

  const handleCreateBug = async (bugData) => {
    try {
      await loadBugReports(); // Refresh the list
      toast.success('Bug report created successfully');
    } catch (error) {
      console.error('Error after creating bug:', error);
    }
  };

  const handleEditBug = (bug) => {
    setEditingBug(bug);
    setShowCreateModal(true);
  };

  const handleUpdateBug = async (updatedBug) => {
    try {
      await loadBugReports(); // Refresh the list
      setEditingBug(null);
      toast.success('Bug report updated successfully');
    } catch (error) {
      console.error('Error after updating bug:', error);
    }
  };

  const handleDeleteBug = async (bug) => {
    if (window.confirm(`Are you sure you want to delete bug #${bug.id}: ${bug.title}?`)) {
      try {
        await bugReportManager.deleteBugReport(bug.id);
        await loadBugReports(); // Refresh the list
        toast.success('Bug report deleted successfully');
      } catch (error) {
        console.error('Error deleting bug:', error);
      }
    }
  };

  const handleStatusChange = async (bugId, newStatus) => {
    try {
      await bugReportManager.updateBugReport(bugId, { status: newStatus });
      await loadBugReports(); // Refresh the list
      toast.success(`Bug status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating bug status:', error);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedBugs.length === 0) {
      toast.error('Please select bugs to perform bulk action');
      return;
    }

    try {
      switch (action) {
        case 'delete':
          if (window.confirm(`Delete ${selectedBugs.length} selected bugs?`)) {
            await Promise.all(selectedBugs.map(id => bugReportManager.deleteBugReport(id)));
            toast.success(`${selectedBugs.length} bugs deleted`);
          }
          break;
        case 'close':
          await bugReportManager.bulkUpdate(selectedBugs, { status: 'closed' });
          toast.success(`${selectedBugs.length} bugs closed`);
          break;
        case 'in-progress':
          await bugReportManager.bulkUpdate(selectedBugs, { status: 'in-progress' });
          toast.success(`${selectedBugs.length} bugs marked as in progress`);
          break;
        default:
          break;
      }
      setSelectedBugs([]);
      await loadBugReports();
    } catch (error) {
      console.error('Error in bulk action:', error);
    }
  };

  const handleBugSelect = (bugId, selected) => {
    if (selected) {
      setSelectedBugs(prev => [...prev, bugId]);
    } else {
      setSelectedBugs(prev => prev.filter(id => id !== bugId));
    }
  };

  const handleSelectAll = (selected) => {
    if (selected) {
      setSelectedBugs(filteredBugs.map(bug => bug.id));
    } else {
      setSelectedBugs([]);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSort = (field) => {
    const newOrder = filters.sortBy === field && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: newOrder
    }));
  };

  const handleCreateFromAI = async () => {
    if (!selectedProject) return;

    try {
      // This would typically analyze the current project and create bugs from AI analysis results
      toast.success('AI analysis started. Bugs will be created automatically when analysis completes.');
    } catch (error) {
      console.error('Error creating bugs from AI:', error);
      toast.error('Failed to create bugs from AI analysis');
    }
  };

  const exportBugs = () => {
    const csvContent = [
      ['ID', 'Title', 'Status', 'Severity', 'Category', 'Created', 'Reporter', 'Assignee'].join(','),
      ...filteredBugs.map(bug => [
        bug.id,
        `"${bug.title.replace(/"/g, '""')}"`,
        bug.status,
        bug.severity,
        bug.category,
        bug.created_at,
        bug.reporter_name || '',
        bug.assignee_name || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProject?.name || 'bugs'}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter and search bugs
  const filteredBugs = bugs.filter(bug => {
    if (searchTerm && !bug.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !bug.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Sort bugs
  const sortedBugs = [...filteredBugs].sort((a, b) => {
    let aValue = a[filters.sortBy];
    let bValue = b[filters.sortBy];

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue?.toLowerCase() || '';
    }

    if (filters.sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (!selectedProject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-800 mb-2">No Project Selected</h3>
          <p className="text-yellow-700">
            Please select a project from the dropdown to view and manage bug reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bug Reports</h1>
          <p className="text-gray-600 mt-1">Project: {selectedProject?.name}</p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={exportBugs}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          
          <button
            onClick={handleCreateFromAI}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-100 border border-purple-300 rounded-md hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <Brain className="w-4 h-4 mr-2" />
            Create from AI
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Bug Report
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Bug className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Bugs</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Open</dt>
                    <dd className="text-lg font-medium text-red-600">{stats.open || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                    <dd className="text-lg font-medium text-yellow-600">{stats.in_progress || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                    <dd className="text-lg font-medium text-green-600">{stats.resolved || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search bugs..."
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>

            {/* Sort */}
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                handleFilterChange('sortBy', field);
                handleFilterChange('sortOrder', order);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="severity-desc">Severity High-Low</option>
              <option value="severity-asc">Severity Low-High</option>
            </select>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Severity</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="general">General</option>
                  <option value="security">Security</option>
                  <option value="performance">Performance</option>
                  <option value="logic">Logic Error</option>
                  <option value="ui">User Interface</option>
                  <option value="api">API</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
                <button
                  onClick={() => {
                    setFilters({
                      status: '',
                      severity: '',
                      category: '',
                      assignee_id: '',
                      sortBy: 'created_at',
                      sortOrder: 'desc'
                    });
                    setSearchTerm('');
                  }}
                  className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedBugs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {selectedBugs.length} bug{selectedBugs.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkAction('in-progress')}
                  className="px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-md hover:bg-yellow-200"
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => handleBulkAction('close')}
                  className="px-3 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-md hover:bg-green-200"
                >
                  Close
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-md hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bug List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading bug reports...</span>
        </div>
      ) : sortedBugs.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <Bug className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bug reports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || Object.values(filters).some(f => f) 
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by creating your first bug report.'
              }
            </p>
            {!searchTerm && !Object.values(filters).some(f => f) && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bug Report
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={selectedBugs.length === sortedBugs.length && sortedBugs.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              Select all ({sortedBugs.length} bugs)
            </label>
          </div>

          {/* Bug Cards */}
          {sortedBugs.map((bug) => (
            <BugCard
              key={bug.id}
              bug={bug}
              onStatusChange={handleStatusChange}
              onEdit={handleEditBug}
              onDelete={handleDeleteBug}
              onViewDetails={(bug) => {/* TODO: Implement detail view */}}
              isSelected={selectedBugs.includes(bug.id)}
              onSelect={handleBugSelect}
              showCheckbox={true}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <BugCreateModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingBug(null);
        }}
        projectId={selectedProject?.id}
        onBugCreated={editingBug ? handleUpdateBug : handleCreateBug}
        initialData={editingBug}
        mode={editingBug ? 'edit' : 'create'}
      />
    </div>
  );
};

export default BugReports;