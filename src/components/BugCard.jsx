import React, { useState } from 'react';
import { 
  AlertCircle, 
  Bug, 
  Clock, 
  User, 
  FileText, 
  MessageSquare, 
  Paperclip, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Edit3,
  Trash2,
  CheckCircle,
  Circle,
  AlertTriangle,
  Zap
} from 'lucide-react';

const BugCard = ({ 
  bug, 
  onStatusChange, 
  onEdit, 
  onDelete, 
  onViewDetails,
  isSelected,
  onSelect,
  showCheckbox = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <Zap className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Bug className="w-4 h-4 text-blue-500" />;
      default:
        return <Bug className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'normal':
        return 'text-blue-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTags = (tags) => {
    if (!tags || tags.length === 0) return [];
    try {
      return typeof tags === 'string' ? JSON.parse(tags) : tags;
    } catch {
      return [];
    }
  };

  const handleStatusClick = (newStatus) => {
    if (onStatusChange) {
      onStatusChange(bug.id, newStatus);
    }
  };

  return (
    <div className={`
      bg-white border-l-4 ${getSeverityColor(bug.severity)} rounded-lg shadow-sm hover:shadow-md 
      transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500' : ''}
    `}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {showCheckbox && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelect(bug.id, e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                {getSeverityIcon(bug.severity)}
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  #{bug.id} {bug.title}
                </h3>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bug.status)}`}>
                  {bug.status.replace('-', ' ').toUpperCase()}
                </span>
                
                <span className={`font-medium ${getPriorityColor(bug.priority)}`}>
                  {bug.priority?.toUpperCase() || 'NORMAL'}
                </span>
                
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatDate(bug.created_at)}
                </span>
              </div>

              {/* Description */}
              {bug.description && (
                <p className={`text-gray-700 text-sm ${!isExpanded && 'line-clamp-2'}`}>
                  {bug.description}
                </p>
              )}

              {/* File and Line Info */}
              {bug.file_path && (
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4 mr-1" />
                  <span className="font-mono">{bug.file_path}</span>
                  {bug.line_number && (
                    <span className="ml-2 px-1.5 py-0.5 bg-gray-200 rounded text-xs">
                      Line {bug.line_number}
                    </span>
                  )}
                </div>
              )}

              {/* Tags */}
              {formatTags(bug.tags).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formatTags(bug.tags).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* AI Confidence Score */}
              {bug.ai_confidence_score > 0 && (
                <div className="flex items-center mt-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">AI Confidence:</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            bug.ai_confidence_score > 0.8 ? 'bg-green-500' :
                            bug.ai_confidence_score > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${bug.ai_confidence_score * 100}%` }}
                        />
                      </div>
                      <span className="ml-2 text-xs font-medium">
                        {Math.round(bug.ai_confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 ml-4">
            {/* Status Quick Actions */}
            <div className="flex items-center space-x-1">
              {bug.status === 'open' && (
                <button
                  onClick={() => handleStatusClick('in-progress')}
                  className="p-1 text-yellow-600 hover:bg-yellow-100 rounded"
                  title="Start Progress"
                >
                  <Circle className="w-4 h-4" />
                </button>
              )}
              {bug.status === 'in-progress' && (
                <button
                  onClick={() => handleStatusClick('resolved')}
                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                  title="Mark Resolved"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* More Actions */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onEdit && onEdit(bug)}
              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
              title="Edit"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onViewDetails && onViewDetails(bug)}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              title="View Details"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDelete && onDelete(bug)}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assignee & Reporter */}
              <div className="space-y-2">
                {bug.assignee_name && (
                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Assigned to:</span>
                    <span className="ml-2 font-medium">{bug.assignee_name}</span>
                  </div>
                )}
                {bug.reporter_name && (
                  <div className="flex items-center text-sm">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Reported by:</span>
                    <span className="ml-2 font-medium">{bug.reporter_name}</span>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                {bug.estimated_fix_time > 0 && (
                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">Est. fix time:</span>
                    <span className="ml-2 font-medium">
                      {bug.estimated_fix_time > 60 
                        ? `${Math.round(bug.estimated_fix_time / 60)}h`
                        : `${bug.estimated_fix_time}m`
                      }
                    </span>
                  </div>
                )}
                
                <div className="flex items-center text-sm">
                  <span className="text-gray-600">Category:</span>
                  <span className="ml-2 font-medium capitalize">{bug.category || 'General'}</span>
                </div>
              </div>
            </div>

            {/* AI Analysis Preview */}
            {bug.ai_analysis && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <h4 className="text-sm font-medium text-blue-900">AI Analysis</h4>
                </div>
                <p className="text-sm text-blue-800 line-clamp-3">
                  {typeof bug.ai_analysis === 'string' 
                    ? JSON.parse(bug.ai_analysis)?.description || bug.ai_analysis
                    : bug.ai_analysis?.description || 'AI analysis available'
                  }
                </p>
              </div>
            )}

            {/* Comments & Attachments Count */}
            {(bug.comments?.length > 0 || bug.attachments?.length > 0) && (
              <div className="flex items-center space-x-4 mt-4 pt-2 border-t border-gray-100">
                {bug.comments?.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    <span>{bug.comments.length} comment{bug.comments.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                {bug.attachments?.length > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Paperclip className="w-4 h-4 mr-1" />
                    <span>{bug.attachments.length} attachment{bug.attachments.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BugCard;