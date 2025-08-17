import { AuthUtils } from '../utils/auth.js';
import database from '../database/database.js';
import memoryDatabase from '../database/memoryDatabase.js';
import { v4 as uuidv4 } from 'uuid';
import { aiHandler } from '../server/aiHandler.js';

// Use memory database in serverless environment
const getDatabase = () => {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  return isServerless ? memoryDatabase : database;
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Initialize database
  const db = getDatabase();
  try {
    await db.initialize();
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database initialization failed'
    });
  }

  // Authentication required
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

  const { method, query } = req;
  const pathSegments = req.url.split('/').filter(Boolean);
  const action = pathSegments[2]; // /api/bugs/[action]

  switch (method) {
    case 'GET':
      if (action === 'project') {
        return getBugsByProject(req, res, user, query.projectId);
      } else if (action) {
        return getBug(req, res, user, action);
      } else {
        return getAllBugs(req, res, user);
      }

    case 'POST':
      if (action === 'analyze') {
        return analyzeBugs(req, res, user);
      } else {
        return createBug(req, res, user);
      }

    case 'PUT':
      return updateBug(req, res, user, action);

    case 'DELETE':
      return deleteBug(req, res, user, action);

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({
        success: false,
        message: `Method ${method} not allowed`
      });
  }
}

// Analyze code for bugs
async function analyzeBugs(req, res, user) {
  try {
    const { projectId, code, filename, language, provider = 'openai' } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code is required for analysis'
      });
    }

    // Detect language if not provided
    const detectedLanguage = language || detectLanguage(filename || 'unknown.js');

    // Analyze for bugs using AI
    const bugs = await analyzeCodeForBugs(code, detectedLanguage, filename);

    // Store bugs if project ID is provided
    if (projectId) {
      const db = getDatabase();
      for (const bug of bugs) {
        await db.createBugReport({
          id: uuidv4(),
          project_id: projectId,
          title: bug.title,
          description: bug.description,
          severity: bug.severity,
          file_path: filename || 'unknown',
          line_number: bug.line,
          suggested_fix: bug.fix,
          ai_analysis: JSON.stringify({
            confidence: bug.confidence,
            category: bug.category,
            provider: 'static-analysis'
          })
        });
      }
    }

    res.status(200).json({
      success: true,
      bugs,
      language: detectedLanguage,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bug analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze code for bugs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Get all bugs for user
async function getAllBugs(req, res, user) {
  try {
    const db = getDatabase();
    const bugs = await db.query(
      `SELECT b.*, p.name as project_name 
       FROM bug_reports b
       JOIN projects p ON b.project_id = p.id
       WHERE p.user_id = ?
       ORDER BY b.created_at DESC`,
      [user.id]
    );

    res.status(200).json({
      success: true,
      data: bugs
    });

  } catch (error) {
    console.error('Get bugs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bugs'
    });
  }
}

// Get bugs by project
async function getBugsByProject(req, res, user, projectId) {
  try {
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    const db = getDatabase();
    
    // Verify project ownership
    const project = await db.getProject(projectId);
    if (!project || project.user_id !== user.id) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const bugs = await db.query(
      `SELECT * FROM bug_reports 
       WHERE project_id = ?
       ORDER BY severity DESC, created_at DESC`,
      [projectId]
    );

    res.status(200).json({
      success: true,
      data: bugs
    });

  } catch (error) {
    console.error('Get project bugs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project bugs'
    });
  }
}

// Get single bug
async function getBug(req, res, user, bugId) {
  try {
    const db = getDatabase();
    const bugResult = await db.query(
      `SELECT b.*, p.name as project_name, p.user_id
       FROM bug_reports b
       JOIN projects p ON b.project_id = p.id
       WHERE b.id = ? AND p.user_id = ?`,
      [bugId, user.id]
    );
    const bug = bugResult[0];

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found'
      });
    }

    res.status(200).json({
      success: true,
      data: bug
    });

  } catch (error) {
    console.error('Get bug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bug'
    });
  }
}

// Create new bug
async function createBug(req, res, user) {
  try {
    const { projectId, title, description, severity, file_path, line_number } = req.body;

    if (!projectId || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Project ID, title, and description are required'
      });
    }

    const db = getDatabase();
    
    // Verify project ownership
    const project = await db.getProject(projectId);
    if (!project || project.user_id !== user.id) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const bugId = uuidv4();
    await db.createBugReport({
      id: bugId,
      project_id: projectId,
      title,
      description,
      severity: severity || 'medium',
      file_path: file_path || null,
      line_number: line_number || null,
      status: 'open'
    });

    res.status(201).json({
      success: true,
      data: { id: bugId }
    });

  } catch (error) {
    console.error('Create bug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bug'
    });
  }
}

// Update bug
async function updateBug(req, res, user, bugId) {
  try {
    const { status, severity, suggested_fix } = req.body;

    const db = getDatabase();
    
    // Verify ownership
    const bugResult = await db.query(
      `SELECT b.*, p.user_id
       FROM bug_reports b
       JOIN projects p ON b.project_id = p.id
       WHERE b.id = ? AND p.user_id = ?`,
      [bugId, user.id]
    );
    const bug = bugResult[0];

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found'
      });
    }

    // Update fields
    const updates = [];
    const values = [];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (severity) {
      updates.push('severity = ?');
      values.push(severity);
    }
    if (suggested_fix !== undefined) {
      updates.push('suggested_fix = ?');
      values.push(suggested_fix);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(bugId);
    await db.run(
      `UPDATE bug_reports SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.status(200).json({
      success: true,
      message: 'Bug updated successfully'
    });

  } catch (error) {
    console.error('Update bug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bug'
    });
  }
}

// Delete bug
async function deleteBug(req, res, user, bugId) {
  try {
    const db = getDatabase();
    
    // Verify ownership
    const bugResult = await db.query(
      `SELECT b.*, p.user_id
       FROM bug_reports b
       JOIN projects p ON b.project_id = p.id
       WHERE b.id = ? AND p.user_id = ?`,
      [bugId, user.id]
    );
    const bug = bugResult[0];

    if (!bug) {
      return res.status(404).json({
        success: false,
        message: 'Bug not found'
      });
    }

    await db.run('DELETE FROM bug_reports WHERE id = ?', [bugId]);

    res.status(200).json({
      success: true,
      message: 'Bug deleted successfully'
    });

  } catch (error) {
    console.error('Delete bug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bug'
    });
  }
}

// Analyze code for bugs
function analyzeCodeForBugs(code, language, filename) {
  const bugs = [];
  const lines = code.split('\n');

  // Language-specific patterns
  const patterns = {
    javascript: [
      { regex: /console\.(log|debug|info)/g, title: 'Debug statement', severity: 'low', category: 'code-quality' },
      { regex: /eval\(/g, title: 'Dangerous eval() usage', severity: 'high', category: 'security' },
      { regex: /==(?!=)/g, title: 'Loose equality comparison', severity: 'medium', category: 'code-quality' },
      { regex: /document\.write/g, title: 'document.write() usage', severity: 'medium', category: 'performance' },
      { regex: /innerHTML\s*=(?!=)/g, title: 'Direct innerHTML assignment', severity: 'medium', category: 'security' },
      { regex: /TODO|FIXME|HACK/g, title: 'Unresolved TODO/FIXME', severity: 'low', category: 'maintenance' },
      { regex: /\.\s*length\s*;\s*i\+\+/g, title: 'Inefficient loop', severity: 'low', category: 'performance' },
      { regex: /catch\s*\(\s*\w*\s*\)\s*\{[\s]*\}/g, title: 'Empty catch block', severity: 'medium', category: 'error-handling' }
    ],
    python: [
      { regex: /print\(/g, title: 'Debug print statement', severity: 'low', category: 'code-quality' },
      { regex: /except\s*:/g, title: 'Bare except clause', severity: 'medium', category: 'error-handling' },
      { regex: /exec\(/g, title: 'Dangerous exec() usage', severity: 'high', category: 'security' },
      { regex: /eval\(/g, title: 'Dangerous eval() usage', severity: 'high', category: 'security' },
      { regex: /TODO|FIXME|HACK/g, title: 'Unresolved TODO/FIXME', severity: 'low', category: 'maintenance' },
      { regex: /import\s+\*/g, title: 'Wildcard import', severity: 'low', category: 'code-quality' },
      { regex: /pass\s*$/gm, title: 'Empty code block', severity: 'low', category: 'code-quality' }
    ],
    java: [
      { regex: /System\.out\.print/g, title: 'Debug print statement', severity: 'low', category: 'code-quality' },
      { regex: /catch\s*\([^)]+\)\s*\{[\s]*\}/g, title: 'Empty catch block', severity: 'medium', category: 'error-handling' },
      { regex: /TODO|FIXME|HACK/g, title: 'Unresolved TODO/FIXME', severity: 'low', category: 'maintenance' },
      { regex: /==\s*null/g, title: 'Null comparison without proper check', severity: 'medium', category: 'null-safety' },
      { regex: /\bthrows\s+Exception\b/g, title: 'Generic Exception thrown', severity: 'medium', category: 'error-handling' }
    ]
  };

  // Normalize language
  const normalizedLang = language.toLowerCase().replace(/\+/g, 'plus');
  const langPatterns = patterns[normalizedLang] || patterns.javascript;

  // Check each line
  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Check for long lines
    if (line.length > 120) {
      bugs.push({
        title: 'Long line detected',
        description: `Line ${lineNumber} is ${line.length} characters long. Consider breaking it up for better readability.`,
        severity: 'low',
        category: 'code-quality',
        line: lineNumber,
        confidence: 0.9,
        fix: 'Break the line into multiple lines'
      });
    }

    // Check language-specific patterns
    langPatterns.forEach(pattern => {
      if (pattern.regex.test(line)) {
        bugs.push({
          title: pattern.title,
          description: `${pattern.title} found on line ${lineNumber}`,
          severity: pattern.severity,
          category: pattern.category,
          line: lineNumber,
          confidence: 0.8,
          fix: getFixSuggestion(pattern.title, language)
        });
      }
    });

    // Check for potential null/undefined errors
    if (normalizedLang === 'javascript') {
      if (/\.\w+\s*\(\)/.test(line) && !line.includes('?')) {
        const match = line.match(/(\w+)\.\w+\s*\(\)/);
        if (match && !['console', 'Math', 'Date', 'JSON', 'Object', 'Array'].includes(match[1])) {
          bugs.push({
            title: 'Potential null reference',
            description: `Possible null/undefined reference on line ${lineNumber}. Consider using optional chaining (?.)`,
            severity: 'medium',
            category: 'null-safety',
            line: lineNumber,
            confidence: 0.6,
            fix: 'Use optional chaining: object?.method()'
          });
        }
      }
    }
  });

  // Limit to top 10 most important bugs
  return bugs
    .sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return (severityOrder[b.severity] - severityOrder[a.severity]) || 
             (b.confidence - a.confidence);
    })
    .slice(0, 10);
}

// Get fix suggestion
function getFixSuggestion(issue, language) {
  const suggestions = {
    'Debug statement': 'Remove debug statements or use a proper logging library',
    'Dangerous eval() usage': 'Avoid eval(). Use JSON.parse() for JSON or find a safer alternative',
    'Loose equality comparison': 'Use strict equality (===) instead of loose equality (==)',
    'document.write() usage': 'Use DOM manipulation methods instead of document.write()',
    'Direct innerHTML assignment': 'Use textContent or createElement for safer DOM manipulation',
    'Unresolved TODO/FIXME': 'Complete the TODO item or remove if no longer needed',
    'Inefficient loop': 'Cache array length before the loop: const len = array.length',
    'Empty catch block': 'Handle the error properly or at least log it',
    'Bare except clause': 'Specify the exception type you want to catch',
    'Wildcard import': 'Import only what you need explicitly',
    'Empty code block': 'Implement the logic or remove if not needed',
    'Generic Exception thrown': 'Throw more specific exception types'
  };

  return suggestions[issue] || 'Review and fix this issue';
}

// Detect language from filename
function detectLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'javascript',
    'tsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'sh': 'bash',
    'ps1': 'powershell'
  };

  return langMap[ext] || 'unknown';
}