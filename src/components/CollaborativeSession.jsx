import React, { useState, useEffect, useRef } from 'react';
import {
  Users, 
  MessageSquare, 
  MapPin, 
  Settings, 
  Share2, 
  Eye, 
  EyeOff,
  Crown,
  Shield,
  User,
  Volume2,
  VolumeX,
  Monitor,
  MonitorOff,
  Copy,
  ExternalLink,
  X,
  Circle
} from 'lucide-react';
import CollaborativeManager from '../services/CollaborativeManager';

/**
 * CollaborativeSession - Main collaborative debugging session component
 * Manages real-time collaboration, participants, cursors, annotations
 */
const CollaborativeSession = ({ sessionId, projectId, onClose, user }) => {
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [cursors, setCursors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // UI State
  const [showParticipants, setShowParticipants] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Refs
  const sessionRef = useRef(null);
  const cursorsRef = useRef(new Map());

  useEffect(() => {
    initializeSession();
    
    return () => {
      if (CollaborativeManager.isSessionActive()) {
        CollaborativeManager.leaveSession();
      }
    };
  }, [sessionId]);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize collaborative manager
      const token = localStorage.getItem('debugflow_token');
      await CollaborativeManager.initialize(token);

      // Setup event handlers
      setupEventHandlers();

      // Join the session
      const sessionData = await CollaborativeManager.joinSession(sessionId);
      setSession(sessionData.session);
      setParticipants(CollaborativeManager.getParticipants());
      setCursors(CollaborativeManager.getCursors());
      setIsConnected(true);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize collaborative session:', error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  const setupEventHandlers = () => {
    // Session events
    CollaborativeManager.on('session:joined', (data) => {
      setSession(data.session);
      setParticipants(CollaborativeManager.getParticipants());
      setCursors(CollaborativeManager.getCursors());
    });

    CollaborativeManager.on('participant:joined', (participant) => {
      setParticipants(CollaborativeManager.getParticipants());
    });

    CollaborativeManager.on('participant:left', (data) => {
      setParticipants(CollaborativeManager.getParticipants());
      setCursors(prev => prev.filter(cursor => cursor.userId !== data.userId));
    });

    // Cursor events
    CollaborativeManager.on('cursor:updated', (data) => {
      setCursors(CollaborativeManager.getCursors());
    });

    CollaborativeManager.on('selection:changed', (data) => {
      // Handle selection changes in the code editor
      console.log('Selection changed:', data);
    });

    // Annotation events
    CollaborativeManager.on('annotation:added', (annotation) => {
      // Handle new annotations
      console.log('Annotation added:', annotation);
    });

    // Breakpoint events
    CollaborativeManager.on('breakpoint:toggled', (breakpoint) => {
      // Handle breakpoint changes
      console.log('Breakpoint toggled:', breakpoint);
    });

    // Error handling
    CollaborativeManager.on('error', (error) => {
      setError(error.message);
    });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="w-4 h-4 text-blue-500" />;
      case 'participant':
        return <User className="w-4 h-4 text-green-500" />;
      case 'observer':
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'moderator':
        return 'bg-blue-100 text-blue-800';
      case 'participant':
        return 'bg-green-100 text-green-800';
      case 'observer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}/debug-session/${sessionId}`;
    navigator.clipboard.writeText(link);
    // Show toast notification
    console.log('Session link copied to clipboard');
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    // Implement screen sharing logic
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Implement audio muting logic
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Connecting to session...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Failed to connect to collaborative session
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={initializeSession}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border h-full flex flex-col">
      {/* Session Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <h2 className="text-lg font-semibold text-gray-900">
            {session?.title || 'Collaborative Session'}
          </h2>
          <span className="text-sm text-gray-500">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Session Controls */}
          <button
            onClick={copySessionLink}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Copy session link"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`p-2 rounded ${showParticipants ? 'text-blue-600 bg-blue-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            title="Toggle participants panel"
          >
            <Users className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className={`p-2 rounded ${showAnnotations ? 'text-green-600 bg-green-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            title="Toggle annotations"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-2 rounded ${isScreenSharing ? 'text-purple-600 bg-purple-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            title={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
          >
            {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleMute}
            className={`p-2 rounded ${isMuted ? 'text-red-600 bg-red-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Leave session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor Area (would integrate with Monaco/CodeMirror) */}
        <div className="flex-1 relative">
          <div className="h-full bg-gray-50 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Monitor className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Code Editor Integration</h3>
              <p className="text-sm">
                This area would contain the collaborative code editor<br />
                with real-time cursor sharing and code synchronization
              </p>
            </div>
          </div>

          {/* Cursor Overlays */}
          {cursors.map((cursor) => (
            cursor.userId !== user.id && (
              <div
                key={cursor.userId}
                className="absolute pointer-events-none z-10"
                style={{
                  top: cursor.position?.line ? `${cursor.position.line * 20}px` : '0px',
                  left: cursor.position?.character ? `${cursor.position.character * 8}px` : '0px',
                }}
              >
                <div className={`w-0.5 h-5 bg-${cursor.user?.name ? 'blue' : 'gray'}-500`}></div>
                <div className={`absolute -top-6 left-0 px-2 py-1 text-xs bg-${cursor.user?.name ? 'blue' : 'gray'}-500 text-white rounded whitespace-nowrap`}>
                  {cursor.user?.name || 'Anonymous'}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Right Sidebar */}
        {(showParticipants || showAnnotations) && (
          <div className="w-80 border-l bg-gray-50 flex flex-col">
            {/* Participants Panel */}
            {showParticipants && (
              <div className="border-b bg-white">
                <div className="p-3 border-b">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Participants ({participants.length})
                  </h3>
                </div>
                <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                  {participants.map((participant) => (
                    <div key={participant.userId} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                      <div className="relative">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {participant.user?.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        {participant.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {participant.user?.name || 'Anonymous'}
                          </p>
                          {getRoleIcon(participant.role)}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(participant.role)}`}>
                          {participant.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Annotations Panel */}
            {showAnnotations && (
              <div className="flex-1 bg-white">
                <div className="p-3 border-b">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Annotations
                  </h3>
                </div>
                <div className="p-3 space-y-2 overflow-y-auto">
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No annotations yet</p>
                    <p className="text-xs mt-1">Click on code lines to add comments</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Status Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-t text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Circle className={`w-2 h-2 mr-2 ${isConnected ? 'text-green-500' : 'text-red-500'} fill-current`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          
          {session?.active_file && (
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {session.active_file.split('/').pop()}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button className="text-blue-600 hover:text-blue-800">
            <Settings className="w-4 h-4" />
          </button>
          <button className="text-blue-600 hover:text-blue-800">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeSession;