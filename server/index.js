import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import socketServer from './socketServer.js';
import database from '../database/database.js';
import { aiHandler } from './aiHandler.js';
import { verifyToken } from '../utils/auth.js';
import jobQueue from './jobQueue.js';
import healthCheck from './healthCheck.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Add health check middleware
app.use(healthCheck.middleware());

// Import consolidated API router
import apiRouter from '../api/index.js';

// Mount all API routes through the consolidated router
app.use('/api', apiRouter);

// Server-level health check endpoints (different from API health)
app.get('/server/health', async (req, res) => {
  const health = await healthCheck.getBasicHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/server/health/detailed', async (req, res) => {
  const health = await healthCheck.runAllChecks();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

app.get('/server/metrics', async (req, res) => {
  const metrics = await healthCheck.getMetrics();
  res.json(metrics);
});

// Job queue status endpoint
app.get('/api/jobs/stats', async (req, res) => {
  try {
    const stats = {};
    for (const queue of ['default', 'analysis', 'email', 'reports', 'cleanup']) {
      stats[queue] = await jobQueue.getQueueStats(queue);
    }
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check for Socket.io server
app.get('/socket-health', (req, res) => {
  const stats = socketServer.getServerStats();
  res.json({
    success: true,
    socketServer: {
      initialized: !!socketServer.io,
      stats
    },
    timestamp: new Date().toISOString()
  });
});

// Note: AI endpoints are now handled by the API router at /api/ai/*

// Initialize database and Socket.io
async function startServer() {
  try {
    // Initialize database
    await database.initialize();
    console.log('Database initialized successfully');

    // Initialize job queue
    await jobQueue.initialize();
    jobQueue.registerDefaultHandlers();
    jobQueue.scheduleRecurringJobs();
    console.log('Job queue system initialized successfully');

    // Initialize Socket.io server
    socketServer.initialize(httpServer);
    console.log('Socket.io server initialized successfully');
    
    // Make io available globally for health checks
    global.io = socketServer.io;

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`🚀 DebugFlow server running on port ${PORT}`);
      console.log(`🌐 API health check available at http://localhost:${PORT}/api/health`);
      console.log(`🔧 Server health check available at http://localhost:${PORT}/server/health`);
      console.log(`📊 Server metrics available at http://localhost:${PORT}/server/metrics`);
      console.log(`🔌 Socket.io server initialized`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
    database.close().then(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('HTTP server closed');
    database.close().then(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  });
});

// Start the server
startServer();