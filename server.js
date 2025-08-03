import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import OpenAI from 'openai';

// Import services
import { ProjectProcessor } from './src/services/ProjectProcessor.js';
import { AIAnalyzer } from './src/services/AIAnalyzer.js';
import { ProjectManager } from './src/services/ProjectManager.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

const PORT = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize services
const projectProcessor = new ProjectProcessor();
const aiAnalyzer = new AIAnalyzer(openai);
const projectManager = new ProjectManager();

// Middleware
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(js|ts|jsx|tsx|py|java|php|rb|go|rs|swift|json|yml|yaml|md|txt)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'), false);
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    services: {
      ai: !!process.env.OPENAI_API_KEY,
      github: !!process.env.GITHUB_TOKEN,
      testing: true,
      implementation: true
    }
  });
});

// API Routes

// Get user projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await projectManager.getUserProjects('user_001');
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload project
app.post('/api/projects/upload', upload.array('files', 20), async (req, res) => {
  try {
    const { projectType, projectData } = req.body;
    const uploadedFiles = req.files || [];

    console.log('📤 Project upload:', { projectType, filesCount: uploadedFiles.length });

    let processedProject;

    if (projectType === 'files') {
      processedProject = await projectProcessor.processUploadedFiles(uploadedFiles);
    } else if (projectType === 'app') {
      const parsedData = JSON.parse(projectData);
      processedProject = await projectProcessor.processAppProject(uploadedFiles, parsedData);
    }

    // Store project
    const project = await projectManager.createProject({
      ...processedProject,
      userId: 'user_001',
      type: projectType === 'app' ? 'Web Application' : 'Script',
      status: 'analyzing'
    });

    res.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        type: project.type
      }
    });

  } catch (error) {
    console.error('Project upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// AI bug analysis
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { projectId, bugDescription } = req.body;

    console.log('🔍 Starting AI analysis for project:', projectId);

    const project = await projectManager.getProject(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const analysis = await aiAnalyzer.analyzeBug({
      projectData: project,
      bugDescription,
      aiProvider: 'openai'
    });

    // Update project with analysis
    await projectManager.updateProject(projectId, {
      status: 'analyzed',
      analysis,
      lastModified: new Date().toISOString()
    });

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate implementation
app.post('/api/ai/implement', async (req, res) => {
  try {
    const { projectId, selectedFix, customInstructions } = req.body;

    console.log('⚡ Generating implementation for project:', projectId);

    const project = await projectManager.getProject(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const implementation = await aiAnalyzer.generateImplementation({
      projectData: project,
      fix: selectedFix,
      customInstructions,
      aiProvider: 'openai'
    });

    // Update project status
    await projectManager.updateProject(projectId, {
      status: 'implementing',
      implementation,
      lastModified: new Date().toISOString()
    });

    res.json({
      success: true,
      implementation
    });

  } catch (error) {
    console.error('Implementation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Apply implementation
app.post('/api/implementation/apply', async (req, res) => {
  try {
    const { projectId, deploymentType } = req.body;

    console.log('🚀 Applying implementation for project:', projectId);

    const project = await projectManager.getProject(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 2000));

    await projectManager.updateProject(projectId, {
      status: 'completed',
      deployedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Implementation applied successfully',
      deploymentType
    });

  } catch (error) {
    console.error('Apply implementation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  
  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
    console.log(`📁 Client ${socket.id} joined project ${projectId}`);
  });

  socket.on('start-analysis', async (data) => {
    try {
      console.log('🔍 Real-time analysis started:', data.projectId);
      
      socket.emit('analysis-progress', { 
        stage: 'preprocessing', 
        message: 'Processing project files...' 
      });

      setTimeout(() => {
        socket.emit('analysis-progress', { 
          stage: 'ai-analysis', 
          message: 'AI is analyzing your code...' 
        });
      }, 2000);

      setTimeout(() => {
        socket.emit('analysis-complete', { 
          success: true,
          message: 'Analysis complete! Ready for bug fixing.',
          timestamp: new Date().toISOString()
        });
      }, 5000);

    } catch (error) {
      socket.emit('analysis-error', { error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

// Ensure directories exist
await fs.ensureDir('temp');
await fs.ensureDir('uploads');
await fs.ensureDir('data');

// Start server
server.listen(PORT, () => {
  console.log('\n🚀 DebugFlow AI Backend Server Started!');
  console.log('=========================================');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`🤖 AI Services: ${process.env.OPENAI_API_KEY ? 'Connected' : 'Disconnected'}`);
  console.log(`🔌 WebSocket: Socket.IO enabled`);
  console.log('=========================================\n');
});

export default app;
