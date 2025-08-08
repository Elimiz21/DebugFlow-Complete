import React, { useState, useEffect } from 'react';
import { Zap, Users, Plus, FolderOpen } from 'lucide-react';
import { useProjectContext } from '../contexts/ProjectContext.jsx';
import CollaborativeSession from '../components/CollaborativeSession';
import CreateSessionModal from '../components/CreateSessionModal';
import SessionsList from '../components/SessionsList';

const DebugSession = ({ user }) => {
  const { projects, selectedProject } = useProjectContext();
  const [currentView, setCurrentView] = useState('list'); // 'list', 'session', 'create'
  const [selectedSession, setSelectedSession] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(selectedProject?.id || null);

  useEffect(() => {
    if (selectedProject && selectedProject.id !== currentProjectId) {
      setCurrentProjectId(selectedProject.id);
      setCurrentView('list');
      setSelectedSession(null);
    }
  }, [selectedProject]);

  const handleSessionSelect = (session) => {
    setSelectedSession(session);
    setCurrentView('session');
  };

  const handleSessionCreated = (session) => {
    setSelectedSession(session);
    setCurrentView('session');
    setShowCreateModal(false);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedSession(null);
  };

  const handleCreateSession = () => {
    if (!currentProjectId) {
      // Show project selection if no project is selected
      return;
    }
    setShowCreateModal(true);
  };

  // Project Selection UI
  if (!currentProjectId || !selectedProject) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Debug Sessions</h1>
          <p className="text-gray-600">Collaborative real-time debugging with your team</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FolderOpen className="mx-auto h-16 w-16 text-blue-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
          <p className="text-gray-500 mb-6">
            Choose a project to start or join collaborative debugging sessions
          </p>
          
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setCurrentProjectId(project.id)}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <h4 className="font-semibold text-gray-900">{project.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{project.language}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              No projects found. Upload a project first to enable collaborative debugging.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Debug Sessions</h1>
          <p className="text-gray-600">
            Collaborative real-time debugging for <span className="font-medium">{selectedProject?.name}</span>
          </p>
        </div>

        {currentView === 'list' && (
          <button
            onClick={handleCreateSession}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="min-h-[600px]">
        {currentView === 'list' && (
          <SessionsList
            projectId={currentProjectId}
            user={user}
            onSessionSelect={handleSessionSelect}
            onSessionCreate={handleCreateSession}
          />
        )}

        {currentView === 'session' && selectedSession && (
          <div className="space-y-4">
            {/* Session Navigation */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button
                onClick={handleBackToList}
                className="hover:text-gray-900 hover:underline"
              >
                Debug Sessions
              </button>
              <span>/</span>
              <span className="text-gray-900 font-medium">{selectedSession.title}</span>
            </div>

            {/* Collaborative Session Component */}
            <div className="h-[700px]">
              <CollaborativeSession
                sessionId={selectedSession.id}
                projectId={currentProjectId}
                onClose={handleBackToList}
                user={user}
              />
            </div>
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSessionCreated={handleSessionCreated}
          projectId={currentProjectId}
          user={user}
        />
      )}

      {/* Welcome/Feature Introduction */}
      {currentView === 'list' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Real-Time Collaborative Debugging
              </h3>
              <p className="text-blue-800 mb-4">
                Debug code together with your team in real-time. Share cursors, annotations, 
                breakpoints, and collaborate on fixing issues faster than ever.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center text-blue-700">
                  <Zap className="w-4 h-4 mr-2" />
                  Live cursor sharing
                </div>
                <div className="flex items-center text-blue-700">
                  <Users className="w-4 h-4 mr-2" />
                  Multi-user sessions
                </div>
                <div className="flex items-center text-blue-700">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Code annotations
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugSession;
