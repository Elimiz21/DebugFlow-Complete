import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import socketServer from './socketServer.js';
import database from '../database/database.js';
import { aiHandler } from './aiHandler.js';
import { verifyToken } from '../utils/auth.js';

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

// AI Analysis endpoint
app.post('/api/ai/analyze', async (req, res) => {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const {
      providerId,
      systemPrompt,
      analysisPrompt,
      options,
      userApiKeys
    } = req.body;

    // Process AI analysis on server
    const result = await aiHandler.processAnalysis({
      providerId,
      systemPrompt,
      analysisPrompt,
      options,
      userApiKeys
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Analysis failed'
    });
  }
});

// Validate API key endpoint
app.post('/api/ai/validate-key', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    
    const result = await aiHandler.validateApiKey(provider, apiKey);
    
    res.json({
      success: result.valid,
      data: result
    });
    
  } catch (error) {
    console.error('API Key Validation Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Validation failed'
    });
  }
});

// Initialize database and Socket.io
async function startServer() {
  try {
    // Initialize database
    await database.initialize();
    console.log('Database initialized successfully');

    // Initialize Socket.io server
    socketServer.initialize(httpServer);
    console.log('Socket.io server initialized successfully');

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`🚀 DebugFlow Socket.io server running on port ${PORT}`);
      console.log(`🌐 Health check available at http://localhost:${PORT}/socket-health`);
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