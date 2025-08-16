import { AuthUtils, authenticateToken } from '../utils/auth.js';
import database from '../database/database.js';
import memoryDatabase from '../database/memoryDatabase.js';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

// Use memory database in serverless environment (Vercel), regular database locally
const getDatabase = () => {
  // Check if we're in Vercel serverless environment
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  return isServerless ? memoryDatabase : database;
};

// Validation schemas
const createProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
  type: Joi.string().valid('web-app', 'api', 'script', 'library').required(),
  language: Joi.string().max(50).optional(),
  codebase_url: Joi.string().uri().optional(),
  deployment_url: Joi.string().uri().optional()
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Initialize database connection
  const db = getDatabase();
  try {
    await db.initialize();
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  const { method } = req;

  // All endpoints require authentication
  const authHeader = req.headers['authorization'];
  const token = AuthUtils.extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const user = AuthUtils.verifyToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }

  req.user = user; // Add user to request

  switch (method) {
    case 'GET':
      return handleGetProjects(req, res);
    case 'POST':
      return handleCreateProject(req, res);
    case 'PUT':
      return handleUpdateProject(req, res);
    case 'DELETE':
      return handleDeleteProject(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({
        success: false,
        message: `Method ${method} not allowed`
      });
  }
}

async function handleGetProjects(req, res) {
  try {
    const { id } = req.query;
    
    if (id) {
      // Get specific project
      const db = getDatabase();
      const project = await db.getProjectById(id);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Check if user owns the project
      if (project.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this project.'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: { project }
      });
    } else {
      // Get all projects for user
      const db = getDatabase();
      const projects = await db.getProjectsByUserId(req.user.id);
      
      return res.status(200).json({
        success: true,
        projects: projects,
        count: projects.length,
        message: projects.length === 0 ? 'No projects found. Upload your first project to get started.' : ''
      });
    }
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function handleCreateProject(req, res) {
  try {
    // Validate input
    const { error, value } = createProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    // Generate unique project ID
    const projectId = uuidv4();

    // Create project data
    const projectData = {
      id: projectId,
      user_id: req.user.id,
      ...value
    };

    // Save to database
    const db = getDatabase();
    await db.createProject(projectData);

    // Fetch the created project
    const project = await db.getProjectById(projectId);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project }
    });

  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function handleUpdateProject(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    // Check if project exists and user owns it
    const db = getDatabase();
    const existingProject = await db.getProjectById(id);
    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (existingProject.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this project.'
      });
    }

    // Validate updates (allow partial updates)
    const allowedFields = ['name', 'description', 'status', 'bugs_found', 'bugs_fixed', 'deployment_url'];
    const updates = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Update project
    const db = getDatabase();
    await db.updateProject(id, updates);

    // Fetch updated project
    const project = await db.getProjectById(id);

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: { project }
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

async function handleDeleteProject(req, res) {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    // Check if project exists and user owns it
    const db = getDatabase();
    const project = await db.getProjectById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (project.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this project.'
      });
    }

    // Delete project (CASCADE will handle related records)
    const db = getDatabase();
    await db.run('DELETE FROM projects WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
