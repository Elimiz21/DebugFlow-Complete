import React, { useState, useEffect } from 'react';
import { X, Users, Settings, Zap, Eye, Crown, Shield } from 'lucide-react';
import CollaborativeManager from '../services/CollaborativeManager';

/**
 * CreateSessionModal - Modal for creating new collaborative debugging sessions
 * Handles session configuration, permissions, and initial participant setup
 */
const CreateSessionModal = ({ isOpen, onClose, onSessionCreated, projectId, user }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    session_type: 'debugging',
    participants: [],
    session_config: {
      allow_code_editing: true,
      allow_annotations: true,
      allow_breakpoints: true,
      require_approval_for_changes: false,
      max_participants: 10,
      session_timeout: 240 // minutes
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        title: '',
        description: '',
        session_type: 'debugging',
        participants: [],
        session_config: {
          allow_code_editing: true,
          allow_annotations: true,
          allow_breakpoints: true,
          require_approval_for_changes: false,
          max_participants: 10,
          session_timeout: 240
        }
      });
      setCurrentStep(1);
      setError(null);
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfigChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      session_config: {
        ...prev.session_config,
        [field]: value
      }
    }));
  };

  const addParticipant = () => {
    const email = document.getElementById('participant-email').value.trim();
    const role = document.getElementById('participant-role').value;
    
    if (!email) return;

    // Check if participant already exists
    if (formData.participants.some(p => p.email === email)) {
      setError('Participant already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      participants: [
        ...prev.participants,
        { email, role, user_id: null } // user_id will be resolved on server
      ]
    }));

    // Clear inputs
    document.getElementById('participant-email').value = '';
    document.getElementById('participant-role').value = 'participant';
    setError(null);
  };

  const removeParticipant = (index) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Session title is required');
      }

      const sessionData = {
        ...formData,
        project_id: projectId,
        title: formData.title.trim(),
        description: formData.description.trim()
      };

      const createdSession = await CollaborativeManager.createSession(sessionData);
      
      if (onSessionCreated) {
        onSessionCreated(createdSession);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to create session:', error);
      setError(error.message || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'participant':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'observer':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const sessionTypes = [
    { value: 'debugging', label: 'Debug Session', description: 'Interactive debugging with breakpoints and variable inspection' },
    { value: 'code-review', label: 'Code Review', description: 'Collaborative code review with annotations and discussions' },
    { value: 'analysis', label: 'Code Analysis', description: 'AI-assisted code analysis and optimization session' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Collaborative Session</h2>
            <p className="text-sm text-gray-600 mt-1">
              Set up a real-time collaborative debugging session
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step Indicators */}
          <div className="flex items-center space-x-4 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-0.5 mx-2 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Session Details</h3>
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Bug Fix Session - Authentication Module"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe what you'll be working on in this session..."
                />
              </div>

              {/* Session Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Type
                </label>
                <div className="space-y-2">
                  {sessionTypes.map((type) => (
                    <label key={type.value} className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="session_type"
                        value={type.value}
                        checked={formData.session_type === type.value}
                        onChange={(e) => handleInputChange('session_type', e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-600">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Participants */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Invite Participants</h3>
              
              {/* Add Participant */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex space-x-3">
                  <input
                    type="email"
                    id="participant-email"
                    placeholder="Email address"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <select
                    id="participant-role"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="participant">Participant</option>
                    <option value="moderator">Moderator</option>
                    <option value="observer">Observer</option>
                  </select>
                  <button
                    type="button"
                    onClick={addParticipant}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Participants List */}
              <div className="space-y-2">
                {/* Current User (Owner) */}
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{user?.name} (You)</span>
                    <span className="text-sm text-gray-600">{user?.email}</span>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                    Owner
                  </span>
                </div>

                {/* Added Participants */}
                {formData.participants.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getRoleIcon(participant.role)}
                      <span className="font-medium">{participant.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium capitalize">
                        {participant.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeParticipant(index)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {formData.participants.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No participants added yet</p>
                  <p className="text-xs">Add team members to collaborate with you</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Settings */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Session Settings</h3>
              
              <div className="space-y-4">
                {/* Permissions */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Participant Permissions</h4>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.session_config.allow_code_editing}
                        onChange={(e) => handleConfigChange('allow_code_editing', e.target.checked)}
                        className="rounded"
                      />
                      <span>Allow code editing</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.session_config.allow_annotations}
                        onChange={(e) => handleConfigChange('allow_annotations', e.target.checked)}
                        className="rounded"
                      />
                      <span>Allow annotations and comments</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.session_config.allow_breakpoints}
                        onChange={(e) => handleConfigChange('allow_breakpoints', e.target.checked)}
                        className="rounded"
                      />
                      <span>Allow breakpoint management</span>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.session_config.require_approval_for_changes}
                        onChange={(e) => handleConfigChange('require_approval_for_changes', e.target.checked)}
                        className="rounded"
                      />
                      <span>Require approval for code changes</span>
                    </label>
                  </div>
                </div>

                {/* Limits */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Session Limits</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Participants
                      </label>
                      <input
                        type="number"
                        value={formData.session_config.max_participants}
                        onChange={(e) => handleConfigChange('max_participants', parseInt(e.target.value))}
                        min={1}
                        max={20}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        value={formData.session_config.session_timeout}
                        onChange={(e) => handleConfigChange('session_timeout', parseInt(e.target.value))}
                        min={30}
                        max={480}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              className={`px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${
                currentStep === 1 ? 'invisible' : ''
              }`}
            >
              Previous
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Create Session
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSessionModal;