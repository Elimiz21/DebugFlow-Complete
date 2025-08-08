import database from '../database/database.js';
import { verifyToken } from '../utils/auth.js';
import Joi from 'joi';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads (attachments)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../data/bug-attachments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/json'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, text, and JSON files are allowed.'));
    }
  }
});

// Validation schemas
const bugReportSchema = Joi.object({
  project_id: Joi.string().required(),
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(2000).allow(''),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  status: Joi.string().valid('open', 'in-progress', 'resolved', 'closed').default('open'),
  file_path: Joi.string().max(500).allow(null),
  line_number: Joi.number().integer().min(1).allow(null),
  suggested_fix: Joi.string().max(2000).allow(null),
  ai_analysis: Joi.string().allow(null),
  ai_confidence_score: Joi.number().min(0).max(1).default(0),
  estimated_fix_time: Joi.number().integer().min(0).default(0),
  category: Joi.string().valid('general', 'security', 'performance', 'logic', 'ui', 'api').default('general'),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  assignee_id: Joi.number().integer().allow(null),
  tags: Joi.array().items(Joi.string()).default([])
});

const bugUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(255),
  description: Joi.string().max(2000).allow(''),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
  status: Joi.string().valid('open', 'in-progress', 'resolved', 'closed'),
  file_path: Joi.string().max(500).allow(null),
  line_number: Joi.number().integer().min(1).allow(null),
  suggested_fix: Joi.string().max(2000).allow(null),
  ai_analysis: Joi.string().allow(null),
  ai_confidence_score: Joi.number().min(0).max(1),
  estimated_fix_time: Joi.number().integer().min(0),
  category: Joi.string().valid('general', 'security', 'performance', 'logic', 'ui', 'api'),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
  assignee_id: Joi.number().integer().allow(null),
  fix_verification: Joi.string().valid('pending', 'verified', 'failed').allow(null),
  resolution_notes: Joi.string().max(2000).allow(null)
});

const commentSchema = Joi.object({
  comment: Joi.string().min(1).max(2000).required(),
  comment_type: Joi.string().valid('comment', 'status_change', 'fix_attempt').default('comment'),
  metadata: Joi.object().allow(null)
});

/**
 * Bug Reports API Handler
 * Comprehensive bug management system with AI integration
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

    const userId = decoded.id;

    // Route handling
    if (req.method === 'GET') {
      return await handleGetRequest(req, res, userId);
    } else if (req.method === 'POST') {
      return await handlePostRequest(req, res, userId);
    } else if (req.method === 'PUT') {
      return await handlePutRequest(req, res, userId);
    } else if (req.method === 'DELETE') {
      return await handleDeleteRequest(req, res, userId);
    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Bug Reports API Error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

async function handleGetRequest(req, res, userId) {
  const { project_id, bug_id, action } = req.query;

  if (bug_id) {
    // Get specific bug report
    const bug = await database.getBugReportById(bug_id);
    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug report not found'
      });
    }

    // Verify user has access to this project
    const project = await database.getProjectById(bug.project_id);
    if (!project || project.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Parse tags if they exist
    if (bug.tags) {
      try {
        bug.tags = JSON.parse(bug.tags);
      } catch (e) {
        bug.tags = [];
      }
    }

    // Get additional data based on action
    if (action === 'full') {
      const [comments, attachments, labels] = await Promise.all([
        database.getBugComments(bug_id),
        database.getBugAttachments(bug_id),
        database.getBugLabelsForReport(bug_id)
      ]);
      
      bug.comments = comments;
      bug.attachments = attachments;
      bug.labels = labels;
    }

    return res.json({
      success: true,
      data: bug
    });
  }

  if (project_id) {
    // Get bug reports for project
    const project = await database.getProjectById(project_id);
    if (!project || project.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Parse filters
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.severity) filters.severity = req.query.severity;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.assignee_id) filters.assignee_id = parseInt(req.query.assignee_id);
    if (req.query.limit) filters.limit = parseInt(req.query.limit);

    const bugs = await database.getBugReportsByProject(project_id, filters);
    
    // Parse tags for each bug
    bugs.forEach(bug => {
      if (bug.tags) {
        try {
          bug.tags = JSON.parse(bug.tags);
        } catch (e) {
          bug.tags = [];
        }
      }
    });

    // Get project statistics if requested
    let stats = null;
    if (req.query.include_stats === 'true') {
      stats = await database.getBugStatsByProject(project_id);
    }

    return res.json({
      success: true,
      data: {
        bugs,
        stats,
        total: bugs.length
      }
    });
  }

  if (action === 'labels') {
    // Get all available labels
    const labels = await database.getBugLabels();
    return res.json({
      success: true,
      data: labels
    });
  }

  return res.status(400).json({
    success: false,
    message: 'project_id or bug_id parameter required'
  });
}

async function handlePostRequest(req, res, userId) {
  const { action } = req.query;

  if (action === 'create') {
    // Create new bug report
    const { error, value } = bugReportSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    // Verify user owns the project
    const project = await database.getProjectById(value.project_id);
    if (!project || project.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Set reporter
    value.reporter_id = userId;

    const result = await database.createBugReport(value);
    
    // Update project bug count
    await database.run(
      'UPDATE projects SET bugs_found = bugs_found + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [value.project_id]
    );

    return res.status(201).json({
      success: true,
      data: { id: result.lastID, ...value },
      message: 'Bug report created successfully'
    });
  }

  if (action === 'comment') {
    // Add comment to bug report
    const { bug_id } = req.query;
    if (!bug_id) {
      return res.status(400).json({
        success: false,
        message: 'bug_id parameter required'
      });
    }

    const { error, value } = commentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    // Verify user has access to this bug
    const bug = await database.getBugReportById(bug_id);
    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug report not found'
      });
    }

    const project = await database.getProjectById(bug.project_id);
    if (!project || project.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    value.bug_report_id = bug_id;
    value.user_id = userId;

    const result = await database.createBugComment(value);

    return res.status(201).json({
      success: true,
      data: { id: result.lastID, ...value },
      message: 'Comment added successfully'
    });
  }

  if (action === 'upload') {
    // Handle file upload
    return new Promise((resolve) => {
      upload.single('attachment')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }

        const { bug_id } = req.query;
        if (!bug_id || !req.file) {
          return res.status(400).json({
            success: false,
            message: 'bug_id and file are required'
          });
        }

        try {
          // Verify user has access to this bug
          const bug = await database.getBugReportById(bug_id);
          if (!bug) {
            return res.status(404).json({
              success: false,
              message: 'Bug report not found'
            });
          }

          const project = await database.getProjectById(bug.project_id);
          if (!project || project.user_id !== userId) {
            return res.status(403).json({
              success: false,
              message: 'Access denied'
            });
          }

          const attachmentData = {
            bug_report_id: bug_id,
            filename: req.file.originalname,
            file_path: req.file.path,
            file_type: req.file.mimetype.startsWith('image/') ? 'image' : 'document',
            file_size: req.file.size,
            uploaded_by: userId
          };

          const result = await database.createBugAttachment(attachmentData);

          return res.status(201).json({
            success: true,
            data: { id: result.lastID, ...attachmentData },
            message: 'File uploaded successfully'
          });
        } catch (error) {
          console.error('Upload error:', error);
          return res.status(500).json({
            success: false,
            message: 'Upload failed',
            error: error.message
          });
        }
      });
    });
  }

  return res.status(400).json({
    success: false,
    message: 'Invalid action parameter'
  });
}

async function handlePutRequest(req, res, userId) {
  const { bug_id } = req.query;
  
  if (!bug_id) {
    return res.status(400).json({
      success: false,
      message: 'bug_id parameter required'
    });
  }

  // Verify bug exists and user has access
  const bug = await database.getBugReportById(bug_id);
  if (!bug) {
    return res.status(404).json({
      success: false,
      message: 'Bug report not found'
    });
  }

  const project = await database.getProjectById(bug.project_id);
  if (!project || project.user_id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Validate update data
  const { error, value } = bugUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details[0].message
    });
  }

  // Track status changes for comments
  if (value.status && value.status !== bug.status) {
    await database.createBugComment({
      bug_report_id: bug_id,
      user_id: userId,
      comment: `Status changed from ${bug.status} to ${value.status}`,
      comment_type: 'status_change',
      metadata: { old_status: bug.status, new_status: value.status }
    });
  }

  // Update the bug report
  await database.updateBugReport(bug_id, value);

  return res.json({
    success: true,
    message: 'Bug report updated successfully'
  });
}

async function handleDeleteRequest(req, res, userId) {
  const { bug_id } = req.query;
  
  if (!bug_id) {
    return res.status(400).json({
      success: false,
      message: 'bug_id parameter required'
    });
  }

  // Verify bug exists and user has access
  const bug = await database.getBugReportById(bug_id);
  if (!bug) {
    return res.status(404).json({
      success: false,
      message: 'Bug report not found'
    });
  }

  const project = await database.getProjectById(bug.project_id);
  if (!project || project.user_id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Delete the bug report (cascade will handle related records)
  await database.deleteBugReport(bug_id);

  // Update project bug count
  await database.run(
    'UPDATE projects SET bugs_found = bugs_found - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [bug.project_id]
  );

  return res.json({
    success: true,
    message: 'Bug report deleted successfully'
  });
}