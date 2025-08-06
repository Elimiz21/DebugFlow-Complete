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

    // Handle generic errors
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

  // Get server stats
  getServerStats() {
    return {
      connectedUsers: this.getConnectedUserCount(),
      activeSessions: this.getActiveSessionCount(),
      projectSubscriptions: this.projectSubscriptions.size,
      uptime: process.uptime()
    };
  }
}

// Create singleton instance
const socketServer = new SocketServer();
export default socketServer;