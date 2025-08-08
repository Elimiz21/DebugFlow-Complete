import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock,
  Play,
  Pause,
  Square,
  User,
  Crown,
  Shield,
  Eye,
  Calendar,
  MapPin,
  Settings,
  Trash2,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import CollaborativeManager from '../services/CollaborativeManager';

/**
 * SessionsList - Component for listing and managing collaborative debugging sessions
 * Shows active, paused, and ended sessions with filtering and management options
 */
const SessionsList = ({ projectId, user, onSessionSelect, onSessionCreate }) => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'paused', 'ended'
  const [sortBy, setSortBy] = useState('created_at'); // 'created_at', 'updated_at', 'participants'

  useEffect(() => {
    if (projectId) {
      loadSessions();
    }
  }, [projectId]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const projectSessions = await CollaborativeManager.getProjectSessions(projectId);
      setSessions(projectSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'ended':
        return <Square className="w-4 h-4 text-gray-500" />;
      default:
        return <Play className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'debugging':
        return '🐛';
      case 'code-review':
        return '👁️';
      case 'analysis':
        return '🧠';
      default:
        return '🔧';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'moderator':
        return <Shield className="w-3 h-3 text-blue-500" />;
      case 'participant':
        return <User className="w-3 h-3 text-green-500" />;
      case 'observer':
        return <Eye className="w-3 h-3 text-gray-500" />;
      default:
        return <User className="w-3 h-3 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const filteredSessions = sessions
    .filter(session => {
      if (filter === 'all') return true;
      return session.status === filter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'updated_at':
          return new Date(b.updated_at) - new Date(a.updated_at);
        case 'participants':
          return (b.participant_count || 0) - (a.participant_count || 0);
        case 'created_at':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

  const copySessionLink = (sessionId) => {
    const link = `${window.location.origin}/debug-session/${sessionId}`;
    navigator.clipboard.writeText(link);
    // TODO: Show toast notification
  };

  const deleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      const token = localStorage.getItem('debugflow_token');
      await fetch(`/api/collaborative-sessions?session_id=${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Reload sessions
      loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading sessions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error loading sessions</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={loadSessions}
            className="ml-3 p-2 bg-red-100 hover:bg-red-200 rounded text-red-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Collaborative Sessions ({sessions.length})
          </h3>
          
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Sessions</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="ended">Ended</option>
          </select>
          
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="created_at">Latest First</option>
            <option value="updated_at">Recently Updated</option>
            <option value="participants">Most Participants</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadSessions}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={onSessionCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Create Session
          </button>
        </div>
      </div>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No sessions yet' : `No ${filter} sessions`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? 'Create your first collaborative debugging session'
              : `There are no ${filter} sessions for this project`
            }
          </p>
          {filter === 'all' && (
            <button
              onClick={onSessionCreate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Create First Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSessionSelect && onSessionSelect(session)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-lg">{getTypeIcon(session.session_type)}</span>
                    <h4 className="text-lg font-semibold text-gray-900">{session.title}</h4>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {getStatusIcon(session.status)}
                      <span className="ml-1 capitalize">{session.status}</span>
                    </span>
                  </div>

                  {/* Description */}
                  {session.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {session.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      <span>{session.creator_name}</span>
                      <Crown className="w-3 h-3 ml-1 text-yellow-500" />
                    </div>
                    
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{session.participant_count || 0} participant{(session.participant_count || 0) !== 1 ? 's' : ''}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{formatDate(session.created_at)}</span>
                    </div>

                    {session.active_file && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="font-mono text-xs">
                          {session.active_file.split('/').pop()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => copySessionLink(session.id)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Copy session link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => window.open(`/debug-session/${session.id}`, '_blank')}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  {/* Only show delete for session creator */}
                  {session.creator_id === user?.id && (
                    <>
                      <button
                        onClick={() => {/* TODO: Open session settings */}}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Session settings"
                      >
                        <Settings className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteSession(session.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded"
                        title="Delete session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Join Button */}
              {session.status === 'active' && (
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSessionSelect && onSessionSelect(session);
                    }}
                    className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors"
                  >
                    Join Session
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionsList;