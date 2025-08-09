import { Server } from 'socket.io';
import { AuthUtils } from '../utils/auth.js';
import database from '../database/database.js';
import { v4 as uuidv4 } from 'uuid';

// Collaboration session management
class CollaborationServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.sessions = new Map(); // sessionId -> session data
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> userId
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }
        
        // Allow mock token in development
        if (process.env.NODE_ENV !== 'production' && token === 'mock-jwt-token-for-development') {
          socket.userId = 'test-user-1';
          socket.user = { id: 'test-user-1', name: 'Test User', email: 'test@debugflow.com' };
        } else {
          const user = AuthUtils.verifyToken(token);
          if (!user) {
            return next(new Error('Invalid token'));
          }
          socket.userId = user.id;
          socket.user = user;
        }
        
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`);
      
      // Track user connection
      this.userSockets.set(socket.userId, socket.id);
      this.socketUsers.set(socket.id, socket.userId);
      
      // Session handlers
      socket.on('create-session', (data, callback) => this.handleCreateSession(socket, data, callback));
      socket.on('join-session', (data, callback) => this.handleJoinSession(socket, data, callback));
      socket.on('leave-session', (data, callback) => this.handleLeaveSession(socket, data, callback));
      socket.on('get-session-info', (data, callback) => this.handleGetSessionInfo(socket, data, callback));
      
      // Collaboration events
      socket.on('cursor-move', (data) => this.handleCursorMove(socket, data));
      socket.on('selection-change', (data) => this.handleSelectionChange(socket, data));
      socket.on('code-change', (data) => this.handleCodeChange(socket, data));
      socket.on('file-open', (data) => this.handleFileOpen(socket, data));
      socket.on('file-close', (data) => this.handleFileClose(socket, data));
      
      // Chat and communication
      socket.on('send-message', (data) => this.handleSendMessage(socket, data));
      socket.on('typing-start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing-stop', (data) => this.handleTypingStop(socket, data));
      
      // Annotations and comments
      socket.on('add-annotation', (data) => this.handleAddAnnotation(socket, data));
      socket.on('update-annotation', (data) => this.handleUpdateAnnotation(socket, data));
      socket.on('delete-annotation', (data) => this.handleDeleteAnnotation(socket, data));
      
      // Breakpoints
      socket.on('toggle-breakpoint', (data) => this.handleToggleBreakpoint(socket, data));
      socket.on('get-breakpoints', (data, callback) => this.handleGetBreakpoints(socket, data, callback));
      
      // Disconnection
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  // Create a new collaboration session
  async handleCreateSession(socket, data, callback) {
    try {
      const { projectId, title, description } = data;
      const sessionId = uuidv4();
      const sessionCode = this.generateSessionCode();
      
      const session = {
        id: sessionId,
        code: sessionCode,
        projectId,
        title,
        description,
        hostId: socket.userId,
        participants: new Map([[socket.userId, {
          id: socket.userId,
          name: socket.user.name,
          email: socket.user.email,
          role: 'host',
          socketId: socket.id,
          status: 'online',
          cursor: null,
          selection: null,
          currentFile: null
        }]]),
        files: new Map(),
        annotations: [],
        breakpoints: [],
        chat: [],
        createdAt: new Date().toISOString()
      };
      
      this.sessions.set(sessionId, session);
      
      // Join socket to session room
      socket.join(sessionId);
      socket.sessionId = sessionId;
      
      // Store in database
      try {
        await database.createCollaborativeSession({
          id: sessionId,
          project_id: projectId,
          session_type: 'debugging',
          title,
          description,
          creator_id: socket.userId,
          participants: Array.from(session.participants.values()),
          session_config: { code: sessionCode }
        });
      } catch (dbError) {
        console.error('Failed to store session in database:', dbError);
      }
      
      callback({
        success: true,
        sessionId,
        sessionCode,
        session: this.sanitizeSession(session)
      });
    } catch (error) {
      console.error('Create session error:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  }

  // Join an existing session
  async handleJoinSession(socket, data, callback) {
    try {
      const { sessionId, sessionCode } = data;
      
      // Find session by ID or code
      let session;
      if (sessionId) {
        session = this.sessions.get(sessionId);
      } else if (sessionCode) {
        session = Array.from(this.sessions.values()).find(s => s.code === sessionCode);
      }
      
      if (!session) {
        return callback({
          success: false,
          error: 'Session not found'
        });
      }
      
      // Add participant
      if (!session.participants.has(socket.userId)) {
        session.participants.set(socket.userId, {
          id: socket.userId,
          name: socket.user.name,
          email: socket.user.email,
          role: 'participant',
          socketId: socket.id,
          status: 'online',
          cursor: null,
          selection: null,
          currentFile: null
        });
        
        // Notify other participants
        socket.to(session.id).emit('participant-joined', {
          participant: session.participants.get(socket.userId)
        });
      } else {
        // Update existing participant
        const participant = session.participants.get(socket.userId);
        participant.socketId = socket.id;
        participant.status = 'online';
      }
      
      // Join socket to session room
      socket.join(session.id);
      socket.sessionId = session.id;
      
      // Store participant in database
      try {
        await database.addSessionParticipant({
          session_id: session.id,
          user_id: socket.userId,
          role: session.participants.get(socket.userId).role,
          permissions: ['read', 'write', 'comment'],
          is_online: true
        });
      } catch (dbError) {
        console.error('Failed to store participant:', dbError);
      }
      
      callback({
        success: true,
        session: this.sanitizeSession(session)
      });
    } catch (error) {
      console.error('Join session error:', error);
      callback({
        success: false,
        error: error.message
      });
    }
  }

  // Leave session
  async handleLeaveSession(socket, data, callback) {
    try {
      const sessionId = socket.sessionId || data.sessionId;
      const session = this.sessions.get(sessionId);
      
      if (!session) {
        return callback({ success: false, error: 'Session not found' });
      }
      
      // Update participant status
      const participant = session.participants.get(socket.userId);
      if (participant) {
        participant.status = 'offline';
        
        // Notify others
        socket.to(sessionId).emit('participant-left', {
          userId: socket.userId
        });
      }
      
      // Leave socket room
      socket.leave(sessionId);
      socket.sessionId = null;
      
      // Update database
      try {
        await database.updateParticipantStatus(sessionId, socket.userId, {
          is_online: false,
          last_activity: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('Failed to update participant status:', dbError);
      }
      
      callback({ success: true });
    } catch (error) {
      console.error('Leave session error:', error);
      callback({ success: false, error: error.message });
    }
  }

  // Get session info
  handleGetSessionInfo(socket, data, callback) {
    const sessionId = socket.sessionId || data.sessionId;
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return callback({ success: false, error: 'Session not found' });
    }
    
    callback({
      success: true,
      session: this.sanitizeSession(session)
    });
  }

  // Handle cursor movement
  handleCursorMove(socket, data) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) return;
    
    const participant = session.participants.get(socket.userId);
    if (participant) {
      participant.cursor = data.cursor;
      
      // Broadcast to other participants
      socket.to(socket.sessionId).emit('cursor-moved', {
        userId: socket.userId,
        cursor: data.cursor,
        file: data.file
      });
    }
  }

  // Handle selection change
  handleSelectionChange(socket, data) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) return;
    
    const participant = session.participants.get(socket.userId);
    if (participant) {
      participant.selection = data.selection;
      
      // Broadcast to other participants
      socket.to(socket.sessionId).emit('selection-changed', {
        userId: socket.userId,
        selection: data.selection,
        file: data.file
      });
    }
  }

  // Handle code changes
  async handleCodeChange(socket, data) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) return;
    
    const { file, changes, version } = data;
    
    // Store file state
    if (!session.files.has(file)) {
      session.files.set(file, {
        content: '',
        version: 0,
        lastEditBy: null,
        lastEditAt: null
      });
    }
    
    const fileState = session.files.get(file);
    fileState.content = changes.content;
    fileState.version = version;
    fileState.lastEditBy = socket.userId;
    fileState.lastEditAt = new Date().toISOString();
    
    // Broadcast to other participants
    socket.to(socket.sessionId).emit('code-changed', {
      userId: socket.userId,
      file,
      changes,
      version
    });
    
    // Store event in database
    try {
      await database.addSessionEvent({
        session_id: socket.sessionId,
        user_id: socket.userId,
        event_type: 'code-change',
        event_data: { file, changes, version },
        file_path: file,
        sequence_number: Date.now()
      });
    } catch (dbError) {
      console.error('Failed to store code change event:', dbError);
    }
  }

  // Handle file open
  handleFileOpen(socket, data) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) return;
    
    const participant = session.participants.get(socket.userId);
    if (participant) {
      participant.currentFile = data.file;
      
      // Broadcast to other participants
      socket.to(socket.sessionId).emit('file-opened', {
        userId: socket.userId,
        file: data.file
      });
    }
  }

  // Handle file close
  handleFileClose(socket, data) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) return;
    
    const participant = session.participants.get(socket.userId);
    if (participant && participant.currentFile === data.file) {
      participant.currentFile = null;
      
      // Broadcast to other participants
      socket.to(socket.sessionId).emit('file-closed', {
        userId: socket.userId,
        file: data.file
      });
    }
  }

  // Handle chat messages
  async handleSendMessage(socket, data) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) return;
    
    const message = {
      id: uuidv4(),
      userId: socket.userId,
      userName: socket.user.name,
      text: data.text,
      timestamp: new Date().toISOString()
    };
    
    session.chat.push(message);
    
    // Broadcast to all participants
    this.io.to(socket.sessionId).emit('message-received', message);
    
    // Store in database
    try {
      await database.addSessionEvent({
        session_id: socket.sessionId,
        user_id: socket.userId,
        event_type: 'chat-message',
        event_data: message,
        sequence_number: Date.now()
      });
    } catch (dbError) {
      console.error('Failed to store chat message:', dbError);
    }
  }

  // Handle typing indicators
  handleTypingStart(socket, data) {
    socket.to(socket.sessionId).emit('user-typing', {
      userId: socket.userId,
      userName: socket.user.name
    });
  }

  handleTypingStop(socket, data) {
    socket.to(socket.sessionId).emit('user-stopped-typing', {
      userId: socket.userId
    });
  }

  // Handle annotations
  async handleAddAnnotation(socket, data) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) return;
    
    const annotation = {
      id: uuidv4(),
      userId: socket.userId,
      userName: socket.user.name,
      file: data.file,
      line: data.line,
      column: data.column,
      type: data.type || 'comment',
      content: data.content,
      createdAt: new Date().toISOString()
    };
    
    session.annotations.push(annotation);
    
    // Broadcast to all participants
    this.io.to(socket.sessionId).emit('annotation-added', annotation);
    
    // Store in database
    try {
      await database.createSessionAnnotation({
        session_id: socket.sessionId,
        user_id: socket.userId,
        file_path: data.file,
        line_number: data.line,
        column_number: data.column,
        annotation_type: data.type,
        content: data.content
      });
    } catch (dbError) {
      console.error('Failed to store annotation:', dbError);
    }
  }

  // Handle annotation updates
  async handleUpdateAnnotation(socket, data) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) return;
    
    const annotationIndex = session.annotations.findIndex(a => a.id === data.id);
    if (annotationIndex !== -1) {
      session.annotations[annotationIndex] = {
        ...session.annotations[annotationIndex],
        ...data.updates,
        updatedAt: new Date().toISOString()
      };
      
      // Broadcast to all participants
      this.io.to(socket.sessionId).emit('annotation-updated', {
        id: data.id,
        updates: data.updates
      });
    }
  }

  // Handle annotation deletion
  handleDeleteAnnotation(socket, data) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) return;
    
    session.annotations = session.annotations.filter(a => a.id !== data.id);
    
    // Broadcast to all participants
    this.io.to(socket.sessionId).emit('annotation-deleted', {
      id: data.id
    });
  }

  // Handle breakpoints
  async handleToggleBreakpoint(socket, data) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) return;
    
    const { file, line } = data;
    const breakpointIndex = session.breakpoints.findIndex(
      b => b.file === file && b.line === line
    );
    
    if (breakpointIndex !== -1) {
      // Remove breakpoint
      session.breakpoints.splice(breakpointIndex, 1);
      
      this.io.to(socket.sessionId).emit('breakpoint-removed', {
        file,
        line
      });
    } else {
      // Add breakpoint
      const breakpoint = {
        id: uuidv4(),
        file,
        line,
        userId: socket.userId,
        createdAt: new Date().toISOString()
      };
      
      session.breakpoints.push(breakpoint);
      
      this.io.to(socket.sessionId).emit('breakpoint-added', breakpoint);
    }
    
    // Store in database
    try {
      await database.toggleSessionBreakpoint(
        socket.sessionId,
        file,
        line,
        socket.userId
      );
    } catch (dbError) {
      console.error('Failed to toggle breakpoint:', dbError);
    }
  }

  // Get breakpoints
  handleGetBreakpoints(socket, data, callback) {
    const session = this.sessions.get(socket.sessionId);
    if (!session) {
      return callback({ success: false, error: 'Session not found' });
    }
    
    const breakpoints = data.file 
      ? session.breakpoints.filter(b => b.file === data.file)
      : session.breakpoints;
    
    callback({
      success: true,
      breakpoints
    });
  }

  // Handle disconnection
  async handleDisconnect(socket) {
    console.log(`User ${socket.userId} disconnected`);
    
    // Remove from tracking
    this.userSockets.delete(socket.userId);
    this.socketUsers.delete(socket.id);
    
    // Update session if in one
    if (socket.sessionId) {
      const session = this.sessions.get(socket.sessionId);
      if (session) {
        const participant = session.participants.get(socket.userId);
        if (participant) {
          participant.status = 'offline';
          
          // Notify others
          socket.to(socket.sessionId).emit('participant-disconnected', {
            userId: socket.userId
          });
        }
        
        // Update database
        try {
          await database.updateParticipantStatus(socket.sessionId, socket.userId, {
            is_online: false,
            last_activity: new Date().toISOString()
          });
        } catch (dbError) {
          console.error('Failed to update participant status:', dbError);
        }
      }
    }
  }

  // Generate unique session code
  generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // Sanitize session data for client
  sanitizeSession(session) {
    return {
      id: session.id,
      code: session.code,
      projectId: session.projectId,
      title: session.title,
      description: session.description,
      hostId: session.hostId,
      participants: Array.from(session.participants.values()),
      files: Array.from(session.files.entries()),
      annotations: session.annotations,
      breakpoints: session.breakpoints,
      chat: session.chat.slice(-50), // Last 50 messages
      createdAt: session.createdAt
    };
  }
}

export default CollaborationServer;