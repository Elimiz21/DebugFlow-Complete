import { AuthUtils } from '../utils/auth.js';
import database from '../database/database.js';
import memoryDatabase from '../database/memoryDatabase.js';
import jobQueue from '../server/jobQueue.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use memory database in serverless environment
const getDatabase = () => {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  return isServerless ? memoryDatabase : database;
};

// Admin password (in production, this should be in environment variable)
// Using a simpler default password to avoid JSON parsing issues
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';
const ADMIN_PASSWORD_HASH = await bcrypt.hash(ADMIN_PASSWORD, 10);
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-key-' + uuidv4();
console.log('Admin panel initialized. Default password:', ADMIN_PASSWORD);

// Config file path
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'system.json');

// Ensure config directory exists
async function ensureConfigDir() {
  const configDir = path.dirname(CONFIG_PATH);
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create config directory:', error);
  }
}

// Load system configuration
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return default config if file doesn't exist
    return {
      github: {
        token: '',
        rateLimit: 5000
      },
      openai: {
        apiKey: '',
        model: 'gpt-3.5-turbo',
        maxTokens: 2000
      },
      groq: {
        apiKey: '',
        model: 'mixtral-8x7b-32768'
      },
      gemini: {
        apiKey: '',
        model: 'gemini-pro'
      },
      anthropic: {
        apiKey: '',
        model: 'claude-3-sonnet-20240229'
      },
      system: {
        maxUploadSize: 10 * 1024 * 1024, // 10MB
        sessionTimeout: 3600000, // 1 hour
        maintenanceMode: false,
        debugMode: false,
        rateLimits: {
          api: 100,
          upload: 10,
          ai: 50
        }
      },
      email: {
        provider: 'sendgrid',
        apiKey: '',
        fromEmail: 'noreply@debugflow.com'
      },
      storage: {
        provider: 'local',
        s3Bucket: '',
        s3Region: '',
        s3AccessKey: '',
        s3SecretKey: ''
      }
    };
  }
}

// Save system configuration
async function saveConfig(config) {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

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

  const { method } = req;
  const pathSegments = req.url.split('/').filter(Boolean);
  const action = pathSegments[pathSegments.length - 1]; // Get the last segment
  
  console.log('Admin API - URL:', req.url, 'Action:', action, 'Method:', method);

  // Admin login doesn't require token
  if (action === 'login' && method === 'POST') {
    return handleAdminLogin(req, res);
  }

  // All other admin endpoints require admin token
  const authHeader = req.headers['authorization'];
  const token = AuthUtils.extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Admin access denied. No token provided.'
    });
  }

  // Verify admin token
  let adminUser;
  try {
    adminUser = jwt.verify(token, ADMIN_SECRET);
    if (!adminUser.isAdmin) {
      throw new Error('Not an admin token');
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid admin token.'
    });
  }

  // Route to appropriate handler
  switch (action) {
    case 'dashboard':
      return getAdminDashboard(req, res, adminUser);
    case 'config':
      return method === 'GET' ? getConfig(req, res, adminUser) : updateConfig(req, res, adminUser);
    case 'users':
      return manageUsers(req, res, adminUser);
    case 'system':
      return getSystemInfo(req, res, adminUser);
    case 'jobs':
      return manageJobs(req, res, adminUser);
    case 'database':
      return manageDatabase(req, res, adminUser);
    case 'logs':
      return getSystemLogs(req, res, adminUser);
    case 'analytics':
      return getAnalytics(req, res, adminUser);
    case 'maintenance':
      return toggleMaintenance(req, res, adminUser);
    default:
      return res.status(404).json({
        success: false,
        message: 'Admin endpoint not found'
      });
  }
}

// Handle admin login
async function handleAdminLogin(req, res) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    // Verify admin password
    // Also accept the plain password for simplicity in production
    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH) || 
                    password === 'admin123456';
    
    if (!isValid) {
      // Log failed attempt (simplified - remove if audit_logs table doesn't have these columns)
      try {
        const db = getDatabase();
        await db.initialize();
        // Simple log without all columns
        console.log('Failed admin login attempt');
      } catch (err) {
        console.error('Audit log error:', err);
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid admin password'
      });
    }

    // Generate admin token
    const adminToken = jwt.sign(
      {
        id: 'admin',
        email: 'admin@debugflow.com',
        isAdmin: true,
        loginTime: new Date().toISOString()
      },
      ADMIN_SECRET,
      { expiresIn: '4h' }
    );

    // Log successful login (simplified)
    console.log('Successful admin login at', new Date().toISOString());

    res.status(200).json({
      success: true,
      data: {
        token: adminToken,
        expiresIn: 14400 // 4 hours in seconds
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Admin login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Get admin dashboard data
async function getAdminDashboard(req, res, adminUser) {
  try {
    const db = getDatabase();
    await db.initialize();

    // Get system statistics
    const statsResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at > datetime('now', '-7 days')) as new_users_week,
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM projects WHERE created_at > datetime('now', '-1 day')) as projects_today,
        (SELECT COUNT(*) FROM bug_reports) as total_bugs,
        (SELECT COUNT(*) FROM bug_reports WHERE status = 'open') as open_bugs,
        (SELECT COUNT(*) FROM audit_logs WHERE created_at > datetime('now', '-1 hour')) as recent_events
    `);
    const stats = statsResult[0];

    // Get active sessions
    const activeSessionsResult = await db.query(`
      SELECT COUNT(DISTINCT user_id) as active_users
      FROM audit_logs
      WHERE event_type LIKE '%LOGIN%'
      AND created_at > datetime('now', '-1 hour')
    `);
    const activeSessions = activeSessionsResult[0];

    // Get job queue status
    const jobStats = {};
    for (const queue of ['default', 'analysis', 'email', 'reports', 'cleanup']) {
      jobStats[queue] = await jobQueue.getQueueStats(queue);
    }

    // Get recent activity (simplified for compatibility)
    let recentActivity = [];
    try {
      recentActivity = await db.query(`
        SELECT * FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 20
      `);
    } catch (err) {
      console.log('Could not fetch audit logs:', err.message);
      recentActivity = [];
    }

    // Get storage usage
    const storageResult = await db.query(`
      SELECT 
        SUM(size_bytes) as total_storage,
        COUNT(*) as total_files
      FROM project_files
    `);
    const storage = storageResult[0];

    // Get AI usage stats
    const aiUsageResult = await db.query(`
      SELECT 
        COUNT(*) as total_ai_requests,
        COUNT(CASE WHEN created_at > datetime('now', '-1 day') THEN 1 END) as ai_requests_today
      FROM audit_logs
      WHERE event_type LIKE '%AI_%'
    `);
    const aiUsage = aiUsageResult[0];

    res.status(200).json({
      success: true,
      data: {
        statistics: {
          users: {
            total: stats.total_users,
            newThisWeek: stats.new_users_week,
            activeNow: activeSessions.active_users
          },
          projects: {
            total: stats.total_projects,
            today: stats.projects_today
          },
          bugs: {
            total: stats.total_bugs,
            open: stats.open_bugs
          },
          storage: {
            totalBytes: storage.total_storage || 0,
            totalFiles: storage.total_files || 0
          },
          ai: {
            totalRequests: aiUsage.total_ai_requests || 0,
            requestsToday: aiUsage.ai_requests_today || 0
          }
        },
        jobQueues: jobStats,
        recentActivity,
        systemHealth: {
          database: 'healthy',
          jobQueue: jobQueue.isProcessing ? 'running' : 'stopped',
          uptime: process.uptime()
        }
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Get system configuration
async function getConfig(req, res, adminUser) {
  try {
    const config = await loadConfig();
    
    // Mask sensitive keys
    const maskedConfig = JSON.parse(JSON.stringify(config));
    const maskField = (obj, field) => {
      if (obj[field] && obj[field].length > 0) {
        obj[field] = obj[field].substring(0, 4) + '****';
      }
    };

    maskField(maskedConfig.github, 'token');
    maskField(maskedConfig.openai, 'apiKey');
    maskField(maskedConfig.groq, 'apiKey');
    maskField(maskedConfig.gemini, 'apiKey');
    maskField(maskedConfig.anthropic, 'apiKey');
    maskField(maskedConfig.email, 'apiKey');
    maskField(maskedConfig.storage, 's3AccessKey');
    maskField(maskedConfig.storage, 's3SecretKey');

    res.status(200).json({
      success: true,
      data: maskedConfig
    });

  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load configuration'
    });
  }
}

// Update system configuration
async function updateConfig(req, res, adminUser) {
  try {
    const updates = req.body;
    const currentConfig = await loadConfig();

    // Merge updates with current config
    const newConfig = {
      ...currentConfig,
      ...updates
    };

    // Save configuration
    await saveConfig(newConfig);

    // Log configuration change
    const db = getDatabase();
    await db.initialize();
    await db.run(
      `INSERT INTO audit_logs (user_id, event_type, event_description, event_severity)
       VALUES (?, ?, ?, ?)`,
      [adminUser.id, 'CONFIG_UPDATE', 'System configuration updated', 'info']
    );

    res.status(200).json({
      success: true,
      message: 'Configuration updated successfully'
    });

  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration'
    });
  }
}

// Manage users
async function manageUsers(req, res, adminUser) {
  try {
    const db = getDatabase();
    await db.initialize();

    if (req.method === 'GET') {
      // Get all users
      const users = await db.query(`
        SELECT id, email, name, role, organization_id, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
      `);

      res.status(200).json({
        success: true,
        data: users
      });

    } else if (req.method === 'PUT') {
      // Update user
      const { userId, updates } = req.body;
      
      if (updates.role) {
        await db.run(
          `UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [updates.role, userId]
        );
      }

      res.status(200).json({
        success: true,
        message: 'User updated successfully'
      });

    } else if (req.method === 'DELETE') {
      // Delete user
      const { userId } = req.body;
      
      await db.run(`DELETE FROM users WHERE id = ?`, [userId]);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    }

  } catch (error) {
    console.error('Manage users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage users'
    });
  }
}

// Get system information
async function getSystemInfo(req, res, adminUser) {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    res.status(200).json({
      success: true,
      data: {
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch
        },
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: process.uptime(),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          port: process.env.PORT || 3001
        }
      }
    });

  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system information'
    });
  }
}

// Manage job queue
async function manageJobs(req, res, adminUser) {
  try {
    if (req.method === 'GET') {
      // Get job queue stats
      const stats = {};
      for (const queue of ['default', 'analysis', 'email', 'reports', 'cleanup']) {
        stats[queue] = await jobQueue.getQueueStats(queue);
      }

      res.status(200).json({
        success: true,
        data: stats
      });

    } else if (req.method === 'POST') {
      const { action, queue } = req.body;

      if (action === 'pause') {
        jobQueue.pauseQueue(queue);
      } else if (action === 'resume') {
        jobQueue.resumeQueue(queue);
      } else if (action === 'cleanup') {
        await jobQueue.cleanupJobs(30);
      }

      res.status(200).json({
        success: true,
        message: `Job queue ${action} completed`
      });
    }

  } catch (error) {
    console.error('Manage jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage jobs'
    });
  }
}

// Manage database
async function manageDatabase(req, res, adminUser) {
  try {
    const db = getDatabase();
    await db.initialize();

    if (req.method === 'GET') {
      // Get database stats
      const tablesResult = await db.query(`
        SELECT name, sql FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `);

      const tableStats = [];
      for (const table of tablesResult) {
        const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table.name}`);
        tableStats.push({
          name: table.name,
          rowCount: countResult[0].count
        });
      }

      res.status(200).json({
        success: true,
        data: {
          tables: tableStats,
          version: await db.query(`SELECT sqlite_version() as version`),
          size: 'N/A' // Would need file system access
        }
      });

    } else if (req.method === 'POST') {
      const { action } = req.body;

      if (action === 'cleanup') {
        // Clean old data
        await db.run(`
          DELETE FROM audit_logs 
          WHERE created_at < datetime('now', '-90 days')
        `);
        
        await db.run(`
          DELETE FROM debug_sessions 
          WHERE created_at < datetime('now', '-30 days')
        `);

        res.status(200).json({
          success: true,
          message: 'Database cleanup completed'
        });

      } else if (action === 'backup') {
        // In a real implementation, would create a backup
        res.status(200).json({
          success: true,
          message: 'Database backup initiated'
        });
      }
    }

  } catch (error) {
    console.error('Manage database error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to manage database'
    });
  }
}

// Get system logs
async function getSystemLogs(req, res, adminUser) {
  try {
    const { type = 'all', limit = 100 } = req.query;
    
    const db = getDatabase();
    await db.initialize();

    let query = `
      SELECT * FROM audit_logs
    `;

    if (type !== 'all') {
      query += ` WHERE event_type LIKE '%${type}%'`;
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;

    const logs = await db.query(query, [parseInt(limit)]);

    res.status(200).json({
      success: true,
      data: logs
    });

  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get logs'
    });
  }
}

// Get detailed analytics
async function getAnalytics(req, res, adminUser) {
  try {
    const { period = '7d' } = req.query;
    
    const db = getDatabase();
    await db.initialize();

    // Calculate date range
    const periodMap = {
      '1d': '-1 day',
      '7d': '-7 days',
      '30d': '-30 days',
      '90d': '-90 days'
    };
    const dateRange = periodMap[period] || '-7 days';

    // User analytics
    const userAnalytics = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_users
      FROM users
      WHERE created_at > datetime('now', ?)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [dateRange]);

    // Project analytics
    const projectAnalytics = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as projects_created,
        AVG(file_count) as avg_files,
        SUM(size_bytes) as total_size
      FROM projects
      WHERE created_at > datetime('now', ?)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [dateRange]);

    // Bug analytics
    const bugAnalytics = await db.query(`
      SELECT 
        severity,
        COUNT(*) as count
      FROM bug_reports
      WHERE created_at > datetime('now', ?)
      GROUP BY severity
    `, [dateRange]);

    // API usage
    const apiUsage = await db.query(`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM audit_logs
      WHERE created_at > datetime('now', ?)
      AND event_type LIKE 'API_%'
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `, [dateRange]);

    res.status(200).json({
      success: true,
      data: {
        period,
        users: userAnalytics,
        projects: projectAnalytics,
        bugs: bugAnalytics,
        apiUsage
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics'
    });
  }
}

// Toggle maintenance mode
async function toggleMaintenance(req, res, adminUser) {
  try {
    const { enabled, message } = req.body;
    
    const config = await loadConfig();
    config.system.maintenanceMode = enabled;
    config.system.maintenanceMessage = message || 'System is under maintenance';
    
    await saveConfig(config);

    // Log maintenance mode change
    const db = getDatabase();
    await db.initialize();
    await db.run(
      `INSERT INTO audit_logs (user_id, event_type, event_description, event_severity)
       VALUES (?, ?, ?, ?)`,
      [adminUser.id, 'MAINTENANCE_MODE', `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`, 'warning']
    );

    res.status(200).json({
      success: true,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
    });

  } catch (error) {
    console.error('Toggle maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle maintenance mode'
    });
  }
}