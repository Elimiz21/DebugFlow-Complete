import { AuthUtils } from '../utils/auth.js';
import jobQueue from '../server/jobQueue.js';
import database from '../database/database.js';
import memoryDatabase from '../database/memoryDatabase.js';

// Use memory database in serverless environment
const getDatabase = () => {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  return isServerless ? memoryDatabase : database;
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
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

  const { method } = req;
  const pathSegments = req.url.split('/').filter(Boolean);
  const action = pathSegments[2]; // /api/jobs/[action]

  switch (method) {
    case 'GET':
      if (action === 'stats') {
        return getJobStats(req, res, user);
      } else if (action === 'queue') {
        return getQueueStatus(req, res, user, req.query.queue);
      } else if (action) {
        return getJob(req, res, user, action);
      } else {
        return getUserJobs(req, res, user);
      }

    case 'POST':
      if (action === 'add') {
        return addJob(req, res, user);
      } else if (action === 'pause') {
        return pauseQueue(req, res, user);
      } else if (action === 'resume') {
        return resumeQueue(req, res, user);
      }
      break;

    case 'DELETE':
      if (action === 'cleanup') {
        return cleanupJobs(req, res, user);
      } else if (action) {
        return cancelJob(req, res, user, action);
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({
        success: false,
        message: `Method ${method} not allowed`
      });
  }
}

// Get job statistics
async function getJobStats(req, res, user) {
  try {
    // Initialize job queue if needed
    if (!jobQueue.isProcessing || jobQueue.queues.size === 0) {
      await jobQueue.initialize();
      jobQueue.registerDefaultHandlers();
    }

    const stats = {};
    
    // Get stats for each queue
    for (const [queueName] of jobQueue.queues) {
      stats[queueName] = await jobQueue.getQueueStats(queueName);
    }

    // Get overall statistics
    const db = getDatabase();
    await db.initialize();
    
    const overallResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM jobs
      WHERE created_at > datetime('now', '-24 hours')
    `);
    const overall = overallResult[0];

    res.status(200).json({
      success: true,
      data: {
        queues: stats,
        overall,
        isProcessing: jobQueue.isProcessing,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get job stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Get specific queue status
async function getQueueStatus(req, res, user, queueName) {
  try {
    if (!queueName) {
      return res.status(400).json({
        success: false,
        message: 'Queue name is required'
      });
    }

    const stats = await jobQueue.getQueueStats(queueName);

    // Get recent jobs in this queue
    const db = getDatabase();
    const recentJobs = await db.query(`
      SELECT id, type, status, priority, created_at, started_at, completed_at
      FROM jobs
      WHERE queue = ?
      ORDER BY created_at DESC
      LIMIT 20
    `, [queueName]);

    res.status(200).json({
      success: true,
      data: {
        queueName,
        stats,
        recentJobs
      }
    });

  } catch (error) {
    console.error('Get queue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queue status'
    });
  }
}

// Get specific job
async function getJob(req, res, user, jobId) {
  try {
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job'
    });
  }
}

// Get user's jobs
async function getUserJobs(req, res, user) {
  try {
    const { status, limit = 50 } = req.query;

    const db = getDatabase();
    await db.initialize();

    let query = `
      SELECT j.*
      FROM jobs j
      WHERE j.payload LIKE ?
    `;
    const params = [`%"userId":"${user.id}"%`];

    if (status) {
      query += ' AND j.status = ?';
      params.push(status);
    }

    query += ' ORDER BY j.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const jobs = await db.query(query, params);

    res.status(200).json({
      success: true,
      data: jobs
    });

  } catch (error) {
    console.error('Get user jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user jobs'
    });
  }
}

// Add a new job
async function addJob(req, res, user) {
  try {
    const { type, payload, options = {} } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Job type is required'
      });
    }

    // Add user ID to payload
    const enrichedPayload = {
      ...payload,
      userId: user.id,
      userEmail: user.email
    };

    const jobId = await jobQueue.addJob(type, enrichedPayload, options);

    res.status(201).json({
      success: true,
      data: {
        jobId,
        type,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Add job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add job',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Pause a queue
async function pauseQueue(req, res, user) {
  try {
    const { queue } = req.body;

    if (!queue) {
      return res.status(400).json({
        success: false,
        message: 'Queue name is required'
      });
    }

    jobQueue.pauseQueue(queue);

    res.status(200).json({
      success: true,
      message: `Queue ${queue} paused`
    });

  } catch (error) {
    console.error('Pause queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause queue'
    });
  }
}

// Resume a queue
async function resumeQueue(req, res, user) {
  try {
    const { queue } = req.body;

    if (!queue) {
      return res.status(400).json({
        success: false,
        message: 'Queue name is required'
      });
    }

    jobQueue.resumeQueue(queue);

    res.status(200).json({
      success: true,
      message: `Queue ${queue} resumed`
    });

  } catch (error) {
    console.error('Resume queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume queue'
    });
  }
}

// Cancel a job
async function cancelJob(req, res, user, jobId) {
  try {
    const job = await jobQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if user owns the job
    const payload = JSON.parse(job.payload || '{}');
    if (payload.userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this job'
      });
    }

    // Mark job as cancelled
    const db = getDatabase();
    await db.run(
      `UPDATE jobs SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [jobId]
    );

    res.status(200).json({
      success: true,
      message: 'Job cancelled'
    });

  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel job'
    });
  }
}

// Cleanup old jobs
async function cleanupJobs(req, res, user) {
  try {
    const { olderThanDays = 30 } = req.body;

    const cleaned = await jobQueue.cleanupJobs(olderThanDays);

    res.status(200).json({
      success: true,
      message: `Cleaned up ${cleaned} old jobs`
    });

  } catch (error) {
    console.error('Cleanup jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup jobs'
    });
  }
}