import io from 'socket.io-client';

/**
 * CollaborativeManager - Service for managing collaborative debugging sessions
 * Handles real-time communication, session management, and collaborative features
 */
class CollaborativeManager {
  constructor() {
    this.socket = null;
    this.currentSession = null;
    this.participants = new Map();
    this.cursors = new Map();
    this.annotations = new Map();
    this.breakpoints = new Map();
    this.eventHandlers = new Map();
    this.isConnected = false;
  }

  /**
   * Initialize socket connection with authentication
   */
  async initialize(token) {
    if (this.socket) {
      return this.socket;
    }

    return new Promise((resolve, reject) => {
      this.socket = io(`${window.location.origin}`, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('Connected to collaborative server');
        this.isConnected = true;
        this._setupEventHandlers();
        resolve(this.socket);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Collaborative connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from collaborative server');
        this.isConnected = false;
      });
    });
  }

  /**
   * Setup all collaborative event handlers
   */
  _setupEventHandlers() {
    if (!this.socket) return;

    // Session events
    this.socket.on('session:collaborative-joined', (data) => {
      this.currentSession = data.session;
      this.participants.clear();
      this.cursors.clear();
      
      data.participants.forEach(participant => {
        this.participants.set(participant.userId, participant);
      });
      
      data.cursors.forEach(cursor => {
        this.cursors.set(cursor.userId, cursor);
      });

      this._emit('session:joined', data);
    });

    this.socket.on('session:participant-joined', (participant) => {
      this.participants.set(participant.userId, participant);
      this._emit('participant:joined', participant);
    });

    this.socket.on('session:participant-left', (data) => {
      this.participants.delete(data.userId);
      this.cursors.delete(data.userId);
      this._emit('participant:left', data);
    });

    // Cursor and selection events
    this.socket.on('session:cursor-updated', (data) => {
      this.cursors.set(data.userId, data);
      this._emit('cursor:updated', data);
    });

    this.socket.on('session:selection-changed', (data) => {
      this._emit('selection:changed', data);
    });

    // Annotation events
    this.socket.on('session:annotation-added', (annotation) => {
      const key = `${annotation.filePath}:${annotation.lineNumber}`;
      if (!this.annotations.has(key)) {
        this.annotations.set(key, []);
      }
      this.annotations.get(key).push(annotation);
      this._emit('annotation:added', annotation);
    });

    // Breakpoint events
    this.socket.on('session:breakpoint-toggled', (breakpoint) => {
      const key = `${breakpoint.filePath}:${breakpoint.lineNumber}`;
      if (breakpoint.active) {
        this.breakpoints.set(key, breakpoint);
      } else {
        this.breakpoints.delete(key);
      }
      this._emit('breakpoint:toggled', breakpoint);
    });

    // File and code events
    this.socket.on('session:file-focused', (data) => {
      this._emit('file:focused', data);
    });

    this.socket.on('session:code-changed', (data) => {
      this._emit('code:changed', data);
    });

    // State sync events
    this.socket.on('session:state-synced', (data) => {
      this._emit('state:synced', data);
    });

    // Permission events
    this.socket.on('session:permissions-updated', (data) => {
      const participant = this.participants.get(data.targetUserId);
      if (participant) {
        participant.role = data.newRole;
        participant.permissions = data.newPermissions;
      }
      this._emit('permissions:updated', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Collaborative session error:', error);
      this._emit('error', error);
    });
  }

  /**
   * Create a new collaborative session
   */
  async createSession(sessionData) {
    try {
      const token = localStorage.getItem('debugflow_token');
      const response = await fetch('/api/collaborative-sessions?action=create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionData)
      });

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to create collaborative session:', error);
      throw error;
    }
  }

  /**
   * Join an existing collaborative session
   */
  async joinSession(sessionId, role = 'participant') {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('session:join-collaborative', { sessionId, role });
      
      // Listen for success response
      const onJoined = (data) => {
        this.socket.off('session:collaborative-joined', onJoined);
        this.socket.off('error', onError);
        resolve(data);
      };

      const onError = (error) => {
        this.socket.off('session:collaborative-joined', onJoined);
        this.socket.off('error', onError);
        reject(error);
      };

      this.socket.on('session:collaborative-joined', onJoined);
      this.socket.on('error', onError);
    });
  }

  /**
   * Leave the current collaborative session
   */
  leaveSession() {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('session:leave-collaborative', {
      sessionId: this.currentSession.id
    });

    this.currentSession = null;
    this.participants.clear();
    this.cursors.clear();
    this.annotations.clear();
    this.breakpoints.clear();
  }

  /**
   * Update cursor position and selection
   */
  updateCursor(position, filePath, selection = null) {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('session:cursor-update', {
      sessionId: this.currentSession.id,
      position,
      filePath,
      selection
    });
  }

  /**
   * Update code selection
   */
  updateSelection(selection, filePath) {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('session:selection-change', {
      sessionId: this.currentSession.id,
      selection,
      filePath
    });
  }

  /**
   * Add annotation to code
   */
  async addAnnotation(annotationData) {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('session:add-annotation', {
      sessionId: this.currentSession.id,
      ...annotationData
    });
  }

  /**
   * Toggle breakpoint
   */
  async toggleBreakpoint(filePath, lineNumber, breakpointType = 'line', conditionExpression = null) {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('session:breakpoint-toggle', {
      sessionId: this.currentSession.id,
      filePath,
      lineNumber,
      breakpointType,
      conditionExpression
    });
  }

  /**
   * Focus on a specific file
   */
  focusFile(filePath) {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('session:file-focus', {
      sessionId: this.currentSession.id,
      filePath
    });
  }

  /**
   * Send code changes
   */
  sendCodeChange(changeData) {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('session:code-change', {
      sessionId: this.currentSession.id,
      ...changeData
    });
  }

  /**
   * Request full state sync
   */
  syncState() {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('session:state-sync', {
      sessionId: this.currentSession.id
    });
  }

  /**
   * Get sessions for a project
   */
  async getProjectSessions(projectId) {
    try {
      const token = localStorage.getItem('debugflow_token');
      const response = await fetch(`/api/collaborative-sessions?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to get project sessions:', error);
      throw error;
    }
  }

  /**
   * Get session details
   */
  async getSession(sessionId) {
    try {
      const token = localStorage.getItem('debugflow_token');
      const response = await fetch(`/api/collaborative-sessions?session_id=${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Failed to get session details:', error);
      throw error;
    }
  }

  /**
   * Update session permissions
   */
  async updatePermissions(targetUserId, newRole, newPermissions) {
    if (!this.socket || !this.currentSession) return;

    this.socket.emit('session:permissions-update', {
      sessionId: this.currentSession.id,
      targetUserId,
      newRole,
      newPermissions
    });
  }

  /**
   * Event handler management
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  _emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.currentSession = null;
    this.participants.clear();
    this.cursors.clear();
    this.annotations.clear();
    this.breakpoints.clear();
    this.eventHandlers.clear();
  }

  // Getters for current state
  getCurrentSession() {
    return this.currentSession;
  }

  getParticipants() {
    return Array.from(this.participants.values());
  }

  getCursors() {
    return Array.from(this.cursors.values());
  }

  getAnnotations(filePath = null) {
    if (filePath) {
      return Array.from(this.annotations.entries())
        .filter(([key]) => key.startsWith(filePath))
        .flatMap(([, annotations]) => annotations);
    }
    return Array.from(this.annotations.values()).flat();
  }

  getBreakpoints(filePath = null) {
    if (filePath) {
      return Array.from(this.breakpoints.entries())
        .filter(([key]) => key.startsWith(filePath))
        .map(([, breakpoint]) => breakpoint);
    }
    return Array.from(this.breakpoints.values());
  }

  isSessionActive() {
    return this.currentSession !== null && this.isConnected;
  }
}

// Export singleton instance
export default new CollaborativeManager();