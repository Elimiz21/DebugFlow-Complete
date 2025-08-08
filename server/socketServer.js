import { Server as SocketIOServer } from 'socket.io';
import { AuthUtils } from '../utils/auth.js';
import database from '../database/database.js';
import { v4 as uuidv4 } from 'uuid';

export class SocketServer {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket mapping
    this.debugSessions = new Map(); // sessionId -> session data
    this.projectSubscriptions = new Map(); // projectId -> Set of userIds
    
    // Phase 5: Collaborative features
    this.collaborativeSessions = new Map(); // sessionId -> collaborative session data
    this.sessionParticipants = new Map(); // sessionId -> Map(userId -> participant data)
    this.cursorPositions = new Map(); // sessionId -> Map(userId -> cursor data)
    this.sessionEvents = new Map(); // sessionId -> Array of events
  }

  initialize(httpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const user = AuthUtils.verifyToken(token);
        if (!user) {
          return next(new Error('Invalid authentication token'));
        }

        // Get fresh user data from database
        const userData = await database.getUserById(user.id);
        if (!userData) {
          return next(new Error('User not found'));
        }

        socket.user = {
          id: userData.id,
          name: userData.name,
          email: userData.email
        };

        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('Socket.io server initialized successfully');
    return this.io;
  }

  handleConnection(socket) {
    const userId = socket.user.id;
    console.log(`User ${socket.user.name} (${userId}) connected via socket ${socket.id}`);

    // Store user connection
    this.connectedUsers.set(userId, socket);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to DebugFlow real-time server',
      user: socket.user,
      timestamp: new Date().toISOString()
    });

    // Handle project subscription
    socket.on('subscribe:project', async (data) => {
      await this.handleProjectSubscription(socket, data);
    });

    // Handle project unsubscription
    socket.on('unsubscribe:project', (data) => {
      this.handleProjectUnsubscription(socket, data);
    });

    // Handle debug session creation
    socket.on('debug:create-session', async (data) => {
      await this.handleCreateDebugSession(socket, data);
    });

    // Handle joining debug session
    socket.on('debug:join-session', async (data) => {
      await this.handleJoinDebugSession(socket, data);
    });

    // Handle leaving debug session
    socket.on('debug:leave-session', (data) => {
      this.handleLeaveDebugSession(socket, data);
    });

    // Handle debug session messages
    socket.on('debug:message', (data) => {
      this.handleDebugMessage(socket, data);
    });

    // Handle analysis progress updates
    socket.on('analysis:subscribe', (data) => {
      this.handleAnalysisSubscription(socket, data);
    });

    // Handle file upload progress
    socket.on('upload:progress', (data) => {
      this.handleUploadProgress(socket, data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // PHASE 5: Collaborative debugging event handlers
    
    // Handle joining collaborative session
    socket.on('session:join-collaborative', async (data) => {
      await this.handleJoinCollaborativeSession(socket, data);
    });

    // Handle leaving collaborative session
    socket.on('session:leave-collaborative', (data) => {
      this.handleLeaveCollaborativeSession(socket, data);
    });

    // Handle cursor position updates
    socket.on('session:cursor-update', (data) => {
      this.handleCursorUpdate(socket, data);
    });

    // Handle code selection changes
    socket.on('session:selection-change', (data) => {
      this.handleSelectionChange(socket, data);
    });

    // Handle adding annotations
    socket.on('session:add-annotation', async (data) => {
      await this.handleAddAnnotation(socket, data);
    });

    // Handle breakpoint toggles
    socket.on('session:breakpoint-toggle', async (data) => {
      await this.handleBreakpointToggle(socket, data);
    });

    // Handle file focus changes
    socket.on('session:file-focus', (data) => {
      this.handleFileFocus(socket, data);
    });

    // Handle code changes
    socket.on('session:code-change', async (data) => {
      await this.handleCodeChange(socket, data);
    });

    // Handle full session state sync
    socket.on('session:state-sync', (data) => {
      this.handleStateSync(socket, data);
    });

    // Handle permissions updates
    socket.on('session:permissions-update', async (data) => {
      await this.handlePermissionsUpdate(socket, data);
    });

    // Generic socket errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
      socket.emit('error', { message: 'Socket error occurred' });
    });
  }

  async handleProjectSubscription(socket, data) {
    try {
      const { projectId } = data;
      
      if (!projectId) {
        return socket.emit('error', { message: 'Project ID required' });
      }

      // Verify user has access to project
      const project = await database.getProjectById(projectId);
      if (!project) {
        return socket.emit('error', { message: 'Project not found' });
      }

      if (project.user_id !== socket.user.id) {
        return socket.emit('error', { message: 'Access denied to this project' });
      }

      // Subscribe to project updates
      socket.join(`project:${projectId}`);
      
      // Track subscription
      if (!this.projectSubscriptions.has(projectId)) {
        this.projectSubscriptions.set(projectId, new Set());
      }
      this.projectSubscriptions.get(projectId).add(socket.user.id);

      socket.emit('project:subscribed', {
        projectId,
        message: 'Subscribed to project updates'
      });

      console.log(`User ${socket.user.id} subscribed to project ${projectId}`);

    } catch (error) {
      console.error('Project subscription error:', error);
      socket.emit('error', { message: 'Failed to subscribe to project' });
    }
  }

  handleProjectUnsubscription(socket, data) {
    const { projectId } = data;
    
    if (projectId) {
      socket.leave(`project:${projectId}`);
      
      // Remove from tracking
      if (this.projectSubscriptions.has(projectId)) {
        this.projectSubscriptions.get(projectId).delete(socket.user.id);
        if (this.projectSubscriptions.get(projectId).size === 0) {
          this.projectSubscriptions.delete(projectId);
        }
      }

      socket.emit('project:unsubscribed', { projectId });
      console.log(`User ${socket.user.id} unsubscribed from project ${projectId}`);
    }
  }

  async handleCreateDebugSession(socket, data) {
    try {
      const { projectId, title } = data;

      if (!projectId || !title) {
        return socket.emit('error', { message: 'Project ID and title required' });
      }

      // Verify project access
      const project = await database.getProjectById(projectId);
      if (!project || project.user_id !== socket.user.id) {
        return socket.emit('error', { message: 'Project not found or access denied' });
      }

      // Create debug session
      const sessionId = uuidv4();
      const sessionData = {
        id: sessionId,
        projectId,
        title,
        creator: socket.user,
        participants: [socket.user],
        status: 'active',
        createdAt: new Date().toISOString(),
        messages: []
      };

      // Store in memory and database
      this.debugSessions.set(sessionId, sessionData);
      
      await database.run(`
        INSERT INTO debug_sessions (id, project_id, creator_id, title, participants)
        VALUES (?, ?, ?, ?, ?)
      `, [sessionId, projectId, socket.user.id, title, JSON.stringify([socket.user.id])]);

      // Join session room
      socket.join(`debug:${sessionId}`);

      socket.emit('debug:session-created', {
        sessionId,
        session: sessionData
      });

      // Notify project subscribers
      socket.to(`project:${projectId}`).emit('debug:session-available', {
        sessionId,
        title,
        creator: socket.user.name
      });

      console.log(`Debug session ${sessionId} created by user ${socket.user.id}`);

    } catch (error) {
      console.error('Create debug session error:', error);
      socket.emit('error', { message: 'Failed to create debug session' });
    }
  }

  async handleJoinDebugSession(socket, data) {
    try {
      const { sessionId } = data;

      const session = this.debugSessions.get(sessionId);
      if (!session) {
        return socket.emit('error', { message: 'Debug session not found' });
      }

      // Check if user is already in session
      const isAlreadyInSession = session.participants.some(p => p.id === socket.user.id);
      if (!isAlreadyInSession) {
        session.participants.push(socket.user);
        
        // Update database
        await database.run(`
          UPDATE debug_sessions 
          SET participants = ? 
          WHERE id = ?
        `, [JSON.stringify(session.participants.map(p => p.id)), sessionId]);
      }

      // Join session room
      socket.join(`debug:${sessionId}`);

      socket.emit('debug:session-joined', {
        sessionId,
        session
      });

      // Notify other participants
      socket.to(`debug:${sessionId}`).emit('debug:participant-joined', {
        user: socket.user,
        sessionId
      });

      console.log(`User ${socket.user.id} joined debug session ${sessionId}`);

    } catch (error) {
      console.error('Join debug session error:', error);
      socket.emit('error', { message: 'Failed to join debug session' });
    }
  }

  handleLeaveDebugSession(socket, data) {
    const { sessionId } = data;
    
    const session = this.debugSessions.get(sessionId);
    if (session) {
      // Remove user from participants
      session.participants = session.participants.filter(p => p.id !== socket.user.id);
      
      socket.leave(`debug:${sessionId}`);
      
      // Notify other participants
      socket.to(`debug:${sessionId}`).emit('debug:participant-left', {
        user: socket.user,
        sessionId
      });

      // If no participants left, end session
      if (session.participants.length === 0) {
        this.debugSessions.delete(sessionId);
        // Update database
        database.run('UPDATE debug_sessions SET status = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?', 
          ['ended', sessionId]).catch(console.error);
      }

      socket.emit('debug:session-left', { sessionId });
      console.log(`User ${socket.user.id} left debug session ${sessionId}`);
    }
  }

  handleDebugMessage(socket, data) {
    const { sessionId, message, type } = data;
    
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      return socket.emit('error', { message: 'Debug session not found' });
    }

    const messageData = {
      id: uuidv4(),
      user: socket.user,
      message,
      type: type || 'message',
      timestamp: new Date().toISOString()
    };

    // Store message in session
    session.messages.push(messageData);

    // Broadcast to all session participants
    this.io.to(`debug:${sessionId}`).emit('debug:message', messageData);

    console.log(`Debug message in session ${sessionId} from user ${socket.user.id}`);
  }

  handleAnalysisSubscription(socket, data) {
    const { projectId } = data;
    socket.join(`analysis:${projectId}`);
    socket.emit('analysis:subscribed', { projectId });
  }

  handleUploadProgress(socket, data) {
    const { projectId, progress } = data;
    socket.emit('upload:progress-update', { projectId, progress });
  }

  handleDisconnection(socket) {
    const userId = socket.user.id;
    console.log(`User ${socket.user.name} (${userId}) disconnected`);

    // Remove from connected users
    this.connectedUsers.delete(userId);

    // Leave all debug sessions
    for (const [sessionId, session] of this.debugSessions) {
      if (session.participants.some(p => p.id === userId)) {
        this.handleLeaveDebugSession(socket, { sessionId });
      }
    }

    // Clean up project subscriptions
    for (const [projectId, subscribers] of this.projectSubscriptions) {
      subscribers.delete(userId);
      if (subscribers.size === 0) {
        this.projectSubscriptions.delete(projectId);
      }
    }
  }

  // Emit to specific project subscribers
  emitToProject(projectId, event, data) {
    this.io.to(`project:${projectId}`).emit(event, data);
  }

  // Emit analysis updates
  emitAnalysisUpdate(projectId, analysisData) {
    this.io.to(`analysis:${projectId}`).emit('analysis:update', analysisData);
    this.io.to(`project:${projectId}`).emit('project:analysis-update', analysisData);
  }

  // Emit upload progress
  emitUploadProgress(projectId, progress) {
    this.io.to(`project:${projectId}`).emit('upload:progress', { projectId, progress });
  }

  // Get connected user count
  getConnectedUserCount() {
    return this.connectedUsers.size;
  }

  // Get active debug sessions count
  getActiveSessionCount() {
    return this.debugSessions.size;
  }

  // PHASE 5: Collaborative debugging session handlers

  async handleJoinCollaborativeSession(socket, data) {
    try {
      const { sessionId, role = 'participant' } = data;
      const userId = socket.user.id;

      if (!sessionId) {
        return socket.emit('error', { message: 'Session ID required' });
      }

      // Get session from database
      const session = await database.getCollaborativeSession(sessionId);
      if (!session) {
        return socket.emit('error', { message: 'Collaborative session not found' });
      }

      // Verify user has access to project
      const project = await database.getProjectById(session.project_id);
      if (!project) {
        return socket.emit('error', { message: 'Project not found' });
      }

      // Join session room
      socket.join(`collaborative:${sessionId}`);

      // Initialize session data structures if not exist
      if (!this.sessionParticipants.has(sessionId)) {
        this.sessionParticipants.set(sessionId, new Map());
        this.cursorPositions.set(sessionId, new Map());
        this.sessionEvents.set(sessionId, []);
      }

      // Add/update participant
      const participantData = {
        userId,
        user: socket.user,
        role,
        socketId: socket.id,
        joinedAt: new Date().toISOString(),
        isOnline: true,
        lastActivity: new Date().toISOString()
      };

      this.sessionParticipants.get(sessionId).set(userId, participantData);

      // Update database
      await database.addSessionParticipant({
        session_id: sessionId,
        user_id: userId,
        role,
        permissions: this.getPermissionsForRole(role),
        is_online: true
      });

      // Send current session state to joining user
      const currentParticipants = Array.from(this.sessionParticipants.get(sessionId).values());
      const currentCursors = Array.from(this.cursorPositions.get(sessionId).entries())
        .map(([uid, cursor]) => ({ userId: uid, ...cursor }));

      socket.emit('session:collaborative-joined', {
        sessionId,
        session,
        participants: currentParticipants,
        cursors: currentCursors
      });

      // Notify other participants
      socket.to(`collaborative:${sessionId}`).emit('session:participant-joined', participantData);

      // Log session event
      await this.logSessionEvent(sessionId, userId, 'participant_joined', { role });

      console.log(`User ${userId} joined collaborative session ${sessionId}`);

    } catch (error) {
      console.error('Join collaborative session error:', error);
      socket.emit('error', { message: 'Failed to join collaborative session' });
    }
  }

  handleLeaveCollaborativeSession(socket, data) {
    try {
      const { sessionId } = data;
      const userId = socket.user.id;

      if (!sessionId || !this.sessionParticipants.has(sessionId)) {
        return socket.emit('error', { message: 'Session not found' });
      }

      // Leave session room
      socket.leave(`collaborative:${sessionId}`);

      // Remove participant
      this.sessionParticipants.get(sessionId).delete(userId);
      this.cursorPositions.get(sessionId).delete(userId);

      // Update database
      database.updateParticipantStatus(sessionId, userId, {
        is_online: false
      }).catch(console.error);

      // Notify other participants
      socket.to(`collaborative:${sessionId}`).emit('session:participant-left', {
        userId,
        sessionId
      });

      // Log event
      this.logSessionEvent(sessionId, userId, 'participant_left', {}).catch(console.error);

      socket.emit('session:collaborative-left', { sessionId });
      console.log(`User ${userId} left collaborative session ${sessionId}`);

    } catch (error) {
      console.error('Leave collaborative session error:', error);
    }
  }

  handleCursorUpdate(socket, data) {
    try {
      const { sessionId, position, filePath, selection } = data;
      const userId = socket.user.id;

      if (!sessionId || !this.cursorPositions.has(sessionId)) {
        return socket.emit('error', { message: 'Session not found' });
      }

      // Update cursor position
      const cursorData = {
        position,
        filePath,
        selection,
        timestamp: new Date().toISOString(),
        user: socket.user
      };

      this.cursorPositions.get(sessionId).set(userId, cursorData);

      // Broadcast to other participants (exclude sender)
      socket.to(`collaborative:${sessionId}`).emit('session:cursor-updated', {
        userId,
        ...cursorData
      });

      // Update last activity in database
      database.updateParticipantStatus(sessionId, userId, {
        cursor_position: { position, filePath, selection },
        last_activity: new Date().toISOString()
      }).catch(console.error);

    } catch (error) {
      console.error('Cursor update error:', error);
    }
  }

  handleSelectionChange(socket, data) {
    try {
      const { sessionId, selection, filePath } = data;
      const userId = socket.user.id;

      // Broadcast selection change to other participants
      socket.to(`collaborative:${sessionId}`).emit('session:selection-changed', {
        userId,
        user: socket.user,
        selection,
        filePath,
        timestamp: new Date().toISOString()
      });

      // Update database
      database.updateParticipantStatus(sessionId, userId, {
        current_selection: { selection, filePath }
      }).catch(console.error);

    } catch (error) {
      console.error('Selection change error:', error);
    }
  }

  async handleAddAnnotation(socket, data) {
    try {
      const { sessionId, filePath, lineNumber, columnNumber, annotationType, content, metadata } = data;
      const userId = socket.user.id;

      // Create annotation in database
      const result = await database.createSessionAnnotation({
        session_id: sessionId,
        user_id: userId,
        file_path: filePath,
        line_number: lineNumber,
        column_number: columnNumber || 0,
        annotation_type: annotationType || 'comment',
        content,
        metadata
      });

      const annotationData = {
        id: result.lastID,
        sessionId,
        userId,
        user: socket.user,
        filePath,
        lineNumber,
        columnNumber,
        annotationType,
        content,
        metadata,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all participants
      this.io.to(`collaborative:${sessionId}`).emit('session:annotation-added', annotationData);

      // Log event
      await this.logSessionEvent(sessionId, userId, 'annotation_added', {
        filePath,
        lineNumber,
        annotationType
      });

      console.log(`Annotation added to session ${sessionId} by user ${userId}`);

    } catch (error) {
      console.error('Add annotation error:', error);
      socket.emit('error', { message: 'Failed to add annotation' });
    }
  }

  async handleBreakpointToggle(socket, data) {
    try {
      const { sessionId, filePath, lineNumber, breakpointType, conditionExpression } = data;
      const userId = socket.user.id;

      // Toggle breakpoint in database
      const result = await database.toggleSessionBreakpoint(sessionId, filePath, lineNumber, userId);

      const breakpointData = {
        sessionId,
        userId,
        user: socket.user,
        filePath,
        lineNumber,
        breakpointType: breakpointType || 'line',
        conditionExpression,
        timestamp: new Date().toISOString(),
        active: true // This would need to be determined from the toggle result
      };

      // Broadcast to all participants
      this.io.to(`collaborative:${sessionId}`).emit('session:breakpoint-toggled', breakpointData);

      // Log event
      await this.logSessionEvent(sessionId, userId, 'breakpoint_toggle', {
        filePath,
        lineNumber,
        breakpointType
      });

    } catch (error) {
      console.error('Breakpoint toggle error:', error);
      socket.emit('error', { message: 'Failed to toggle breakpoint' });
    }
  }

  handleFileFocus(socket, data) {
    try {
      const { sessionId, filePath } = data;
      const userId = socket.user.id;

      // Update session's active file
      database.updateCollaborativeSession(sessionId, {
        active_file: filePath
      }).catch(console.error);

      // Broadcast to other participants
      socket.to(`collaborative:${sessionId}`).emit('session:file-focused', {
        userId,
        user: socket.user,
        filePath,
        timestamp: new Date().toISOString()
      });

      // Log event
      this.logSessionEvent(sessionId, userId, 'file_focus', { filePath }).catch(console.error);

    } catch (error) {
      console.error('File focus error:', error);
    }
  }

  async handleCodeChange(socket, data) {
    try {
      const { sessionId, filePath, changeType, lineStart, lineEnd, contentBefore, contentAfter } = data;
      const userId = socket.user.id;

      // Check if user has edit permissions
      const participants = await database.getSessionParticipants(sessionId);
      const userParticipant = participants.find(p => p.user_id === userId);
      
      if (!userParticipant || !this.hasPermission(userParticipant.permissions, 'edit_code')) {
        return socket.emit('error', { message: 'No permission to edit code' });
      }

      // Store code change in database (for review/approval if needed)
      const changeData = {
        session_id: sessionId,
        user_id: userId,
        file_path: filePath,
        change_type: changeType,
        line_start: lineStart,
        line_end: lineEnd,
        content_before: contentBefore,
        content_after: contentAfter,
        change_metadata: JSON.stringify(data.metadata || {})
      };

      await database.run(`
        INSERT INTO session_code_changes 
        (session_id, user_id, file_path, change_type, line_start, line_end, content_before, content_after, change_metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        changeData.session_id,
        changeData.user_id,
        changeData.file_path,
        changeData.change_type,
        changeData.line_start,
        changeData.line_end,
        changeData.content_before,
        changeData.content_after,
        changeData.change_metadata
      ]);

      const broadcastData = {
        sessionId,
        userId,
        user: socket.user,
        filePath,
        changeType,
        lineStart,
        lineEnd,
        contentBefore,
        contentAfter,
        timestamp: new Date().toISOString()
      };

      // Broadcast to other participants
      socket.to(`collaborative:${sessionId}`).emit('session:code-changed', broadcastData);

      // Log event
      await this.logSessionEvent(sessionId, userId, 'code_change', {
        filePath,
        changeType,
        lineStart,
        lineEnd
      });

    } catch (error) {
      console.error('Code change error:', error);
      socket.emit('error', { message: 'Failed to process code change' });
    }
  }

  handleStateSync(socket, data) {
    try {
      const { sessionId } = data;
      const userId = socket.user.id;

      if (!this.sessionParticipants.has(sessionId)) {
        return socket.emit('error', { message: 'Session not found' });
      }

      // Send current session state
      const participants = Array.from(this.sessionParticipants.get(sessionId).values());
      const cursors = Array.from(this.cursorPositions.get(sessionId).entries())
        .map(([uid, cursor]) => ({ userId: uid, ...cursor }));
      const recentEvents = this.sessionEvents.get(sessionId).slice(-50); // Last 50 events

      socket.emit('session:state-synced', {
        sessionId,
        participants,
        cursors,
        recentEvents
      });

    } catch (error) {
      console.error('State sync error:', error);
    }
  }

  async handlePermissionsUpdate(socket, data) {
    try {
      const { sessionId, targetUserId, newRole, newPermissions } = data;
      const userId = socket.user.id;

      // Verify user has permission to update permissions
      const participants = await database.getSessionParticipants(sessionId);
      const userParticipant = participants.find(p => p.user_id === userId);
      
      if (!userParticipant || !['owner', 'moderator'].includes(userParticipant.role)) {
        return socket.emit('error', { message: 'No permission to update permissions' });
      }

      // Update participant permissions
      await database.run(`
        UPDATE session_participants 
        SET role = ?, permissions = ?
        WHERE session_id = ? AND user_id = ?
      `, [newRole, JSON.stringify(newPermissions), sessionId, targetUserId]);

      // Update in-memory data
      const participant = this.sessionParticipants.get(sessionId)?.get(targetUserId);
      if (participant) {
        participant.role = newRole;
        participant.permissions = newPermissions;
      }

      // Broadcast update
      this.io.to(`collaborative:${sessionId}`).emit('session:permissions-updated', {
        sessionId,
        targetUserId,
        newRole,
        newPermissions,
        updatedBy: userId
      });

      // Log event
      await this.logSessionEvent(sessionId, userId, 'permissions_updated', {
        targetUserId,
        newRole
      });

    } catch (error) {
      console.error('Permissions update error:', error);
      socket.emit('error', { message: 'Failed to update permissions' });
    }
  }

  // Helper methods for collaborative features
  async logSessionEvent(sessionId, userId, eventType, eventData) {
    try {
      await database.addSessionEvent({
        session_id: sessionId,
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        sequence_number: Date.now()
      });

      // Keep in memory for quick access (last 100 events)
      if (!this.sessionEvents.has(sessionId)) {
        this.sessionEvents.set(sessionId, []);
      }
      
      const events = this.sessionEvents.get(sessionId);
      events.push({
        userId,
        eventType,
        eventData,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100 events in memory
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
    } catch (error) {
      console.error('Failed to log session event:', error);
    }
  }

  getPermissionsForRole(role) {
    const permissions = {
      owner: [
        'edit_code', 'add_annotations', 'manage_breakpoints', 
        'invite_users', 'end_session', 'moderate_session'
      ],
      moderator: [
        'edit_code', 'add_annotations', 'manage_breakpoints', 
        'invite_users', 'moderate_session'
      ],
      participant: [
        'edit_code', 'add_annotations', 'manage_breakpoints'
      ],
      observer: [
        'add_annotations'
      ]
    };

    return permissions[role] || permissions.observer;
  }

  hasPermission(userPermissions, requiredPermission) {
    try {
      const permissions = typeof userPermissions === 'string' 
        ? JSON.parse(userPermissions) 
        : userPermissions;
      
      return Array.isArray(permissions) && permissions.includes(requiredPermission);
    } catch {
      return false;
    }
  }

  // Get server stats
  getServerStats() {
    return {
      connectedUsers: this.getConnectedUserCount(),
      activeSessions: this.getActiveSessionCount(),
      collaborativeSessions: this.collaborativeSessions.size,
      projectSubscriptions: this.projectSubscriptions.size,
      uptime: process.uptime()
    };
  }
}

// Create singleton instance
const socketServer = new SocketServer();
export default socketServer;