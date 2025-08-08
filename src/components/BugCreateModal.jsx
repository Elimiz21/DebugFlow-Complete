import React, { useState, useEffect } from 'react';
import { X, Plus, Upload, Brain, AlertCircle, Bug } from 'lucide-react';
import { bugReportManager } from '../services/BugReportManager.js';
import toast from 'react-hot-toast';

const BugCreateModal = ({ 
  isOpen, 
  onClose, 
  projectId, 
  onBugCreated,
  initialData = null,
  mode = 'create' // 'create' or 'edit'
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
    priority: 'normal',
    category: 'general',
    file_path: '',
    line_number: '',
    assignee_id: '',
    tags: [],
    estimated_fix_time: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [similarBugs, setSimilarBugs] = useState([]);
  const [showSimilarBugs, setShowSimilarBugs] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        severity: initialData.severity || 'medium',
        priority: initialData.priority || 'normal',
        category: initialData.category || 'general',
        file_path: initialData.file_path || '',
        line_number: initialData.line_number || '',
        assignee_id: initialData.assignee_id || '',
        tags: initialData.tags || [],
        estimated_fix_time: initialData.estimated_fix_time || 0
      });
    }
  }, [initialData]);

  // Check for similar bugs when title or description changes
  useEffect(() => {
    if (formData.title.length > 10 && mode === 'create') {
      const debounceTimer = setTimeout(async () => {
        try {
          const similar = await bugReportManager.findSimilarBugs(
            projectId, 
            formData.title, 
            formData.description
          );
          setSimilarBugs(similar);
          setShowSimilarBugs(similar.length > 0);
        } catch (error) {
          console.error('Error finding similar bugs:', error);
        }
      }, 1000);

      return () => clearTimeout(debounceTimer);
    }
  }, [formData.title, formData.description, projectId, mode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'line_number' || name === 'estimated_fix_time' ? 
        (value ? parseInt(value) : '') : value
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAIAnalysis = async () => {
    if (!formData.description.trim()) {
      toast.error('Please provide a description for AI analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Simple AI analysis to suggest category, severity, and tags
      const analysisPrompt = `
        Analyze this bug description and suggest:
        1. Appropriate category (security, performance, logic, ui, api, general)
        2. Severity level (low, medium, high, critical)
        3. Estimated fix time in minutes
        4. Relevant tags
        
        Bug Title: ${formData.title}
        Description: ${formData.description}
        File: ${formData.file_path}
      `;

      // This would integrate with your AI service
      // For now, implementing a simple heuristic analysis
      const suggestions = await analyzeWithHeuristics(formData);
      
      setFormData(prev => ({
        ...prev,
        ...suggestions
      }));

      toast.success('AI analysis applied to bug report');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to perform AI analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeWithHeuristics = async (data) => {
    const description = data.description.toLowerCase();
    const title = data.title.toLowerCase();
    const combined = `${title} ${description}`;

    let suggestions = {
      category: 'general',
      severity: 'medium',
      estimated_fix_time: 60,
      tags: [...data.tags]
    };

    // Category detection
    if (combined.includes('security') || combined.includes('vulnerability') || combined.includes('exploit')) {
      suggestions.category = 'security';
      suggestions.severity = 'high';
    } else if (combined.includes('performance') || combined.includes('slow') || combined.includes('timeout')) {
      suggestions.category = 'performance';
    } else if (combined.includes('ui') || combined.includes('interface') || combined.includes('display')) {
      suggestions.category = 'ui';
    } else if (combined.includes('api') || combined.includes('endpoint') || combined.includes('request')) {
      suggestions.category = 'api';
    } else if (combined.includes('crash') || combined.includes('error') || combined.includes('exception')) {
      suggestions.category = 'logic';
      suggestions.severity = 'high';
    }

    // Severity detection
    if (combined.includes('crash') || combined.includes('critical') || combined.includes('urgent')) {
      suggestions.severity = 'critical';
      suggestions.estimated_fix_time = 180;
    } else if (combined.includes('error') || combined.includes('fail') || combined.includes('broken')) {
      suggestions.severity = 'high';
      suggestions.estimated_fix_time = 120;
    } else if (combined.includes('minor') || combined.includes('cosmetic') || combined.includes('typo')) {
      suggestions.severity = 'low';
      suggestions.estimated_fix_time = 30;
    }

    // Tag suggestions
    const possibleTags = ['frontend', 'backend', 'database', 'mobile', 'desktop', 'cross-browser', 'accessibility'];
    possibleTags.forEach(tag => {
      if (combined.includes(tag) && !suggestions.tags.includes(tag)) {
        suggestions.tags.push(tag);
      }
    });

    return suggestions;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const bugData = {
        ...formData,
        project_id: projectId,
        line_number: formData.line_number || null,
        estimated_fix_time: formData.estimated_fix_time || 0
      };

      let result;
      if (mode === 'create') {
        result = await bugReportManager.createBugReport(bugData);
      } else {
        await bugReportManager.updateBugReport(initialData.id, bugData);
        result = { ...initialData, ...bugData };
      }

      onBugCreated(result);
      onClose();
      
      setFormData({
        title: '',
        description: '',
        severity: 'medium',
        priority: 'normal',
        category: 'general',
        file_path: '',
        line_number: '',
        assignee_id: '',
        tags: [],
        estimated_fix_time: 0
      });
    } catch (error) {
      console.error('Error saving bug report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Bug className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">
                {mode === 'create' ? 'Create Bug Report' : 'Edit Bug Report'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Similar Bugs Warning */}
          {showSimilarBugs && similarBugs.length > 0 && mode === 'create' && (
            <div className="px-6 py-3 bg-yellow-50 border-l-4 border-yellow-400">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Similar bugs found</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Found {similarBugs.length} similar bug{similarBugs.length !== 1 ? 's' : ''}. 
                    Please check if this is a duplicate.
                  </p>
                  <div className="mt-2 space-y-1">
                    {similarBugs.slice(0, 2).map(bug => (
                      <p key={bug.id} className="text-xs text-yellow-700">
                        #{bug.id}: {bug.title}
                      </p>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowSimilarBugs(false)}
                  className="ml-auto text-yellow-600 hover:text-yellow-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the bug"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Detailed description of the bug, steps to reproduce, expected vs actual behavior..."
                  />
                </div>

                {/* File Path and Line Number */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File Path
                    </label>
                    <input
                      type="text"
                      name="file_path"
                      value={formData.file_path}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="src/components/Example.jsx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Line Number
                    </label>
                    <input
                      type="number"
                      name="line_number"
                      value={formData.line_number}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="42"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add a tag"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Severity and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Severity
                    </label>
                    <select
                      name="severity"
                      value={formData.severity}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="security">Security</option>
                    <option value="performance">Performance</option>
                    <option value="logic">Logic Error</option>
                    <option value="ui">User Interface</option>
                    <option value="api">API</option>
                  </select>
                </div>

                {/* Estimated Fix Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Fix Time (minutes)
                  </label>
                  <input
                    type="number"
                    name="estimated_fix_time"
                    value={formData.estimated_fix_time}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="60"
                    min="0"
                  />
                </div>

                {/* AI Analysis Button */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">AI Assistant</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Let AI help categorize and analyze this bug report
                  </p>
                  <button
                    type="button"
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || !formData.description.trim()}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Create Bug Report' : 'Update Bug Report')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BugCreateModal;