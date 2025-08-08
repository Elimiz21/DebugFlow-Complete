// Job Queue System
// Handles background processing and async tasks

import EventEmitter from 'events';
import database from '../database/database.js';
import { v4 as uuidv4 } from 'uuid';

class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.queues = new Map();
    this.workers = new Map();
    this.isProcessing = false;
    this.processingInterval = null;
    this.retryDelays = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m
  }

  // Initialize the job queue system
  async initialize() {
    try {
      // Create jobs table if it doesn't exist
      await this.createJobsTable();
      
      // Register default queues
      this.registerQueue('default', { concurrency: 5 });
      this.registerQueue('analysis', { concurrency: 3 });
      this.registerQueue('email', { concurrency: 10 });
      this.registerQueue('reports', { concurrency: 2 });
      this.registerQueue('cleanup', { concurrency: 1 });
      
      // Start processing
      this.startProcessing();
      
      console.log('Job queue system initialized');
    } catch (error) {
      console.error('Failed to initialize job queue:', error);
      throw error;
    }
  }

  // Create jobs table in database
  async createJobsTable() {
    await database.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        queue TEXT NOT NULL DEFAULT 'default',
        type TEXT NOT NULL,
        payload TEXT,
        priority INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        error TEXT,
        result TEXT,
        scheduled_at DATETIME,
        started_at DATETIME,
        completed_at DATETIME,
        failed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await database.run(`CREATE INDEX IF NOT EXISTS idx_jobs_queue_status ON jobs(queue, status)`);
    await database.run(`CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_at)`);
    await database.run(`CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC)`);
  }

  // Register a queue with configuration
  registerQueue(name, config = {}) {
    this.queues.set(name, {
      name,
      concurrency: config.concurrency || 5,
      processing: 0,
      paused: false,
      ...config
    });
  }

  // Register a job handler
  registerHandler(jobType, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Handler for ${jobType} must be a function`);
    }
    this.workers.set(jobType, handler);
  }

  // Add a job to the queue
  async addJob(jobType, payload = {}, options = {}) {
    const {
      queue = 'default',
      priority = 0,
      delay = 0,
      maxAttempts = 3,
      unique = false
    } = options;

    const jobId = unique ? `${jobType}-${JSON.stringify(payload)}` : uuidv4();
    
    // Check if unique job already exists
    if (unique) {
      const existingResult = await database.query(
        `SELECT id FROM jobs WHERE id = ? AND status IN ('pending', 'processing')`,
        [jobId]
      );
      const existing = existingResult[0];
      
      if (existing) {
        return existing.id;
      }
    }

    const scheduledAt = delay > 0 
      ? new Date(Date.now() + delay).toISOString()
      : new Date().toISOString();

    await database.run(
      `INSERT INTO jobs (
        id, queue, type, payload, priority, max_attempts, scheduled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        jobId,
        queue,
        jobType,
        JSON.stringify(payload),
        priority,
        maxAttempts,
        scheduledAt
      ]
    );

    this.emit('job:created', { id: jobId, type: jobType, queue });
    
    // Trigger immediate processing if not delayed
    if (delay === 0) {
      this.processQueue(queue);
    }

    return jobId;
  }

  // Start processing jobs
  startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    // Process jobs every second
    this.processingInterval = setInterval(() => {
      this.processAllQueues();
    }, 1000);
    
    // Process immediately
    this.processAllQueues();
  }

  // Stop processing jobs
  stopProcessing() {
    this.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  // Process all queues
  async processAllQueues() {
    for (const [queueName, queue] of this.queues) {
      if (!queue.paused) {
        await this.processQueue(queueName);
      }
    }
  }

  // Process jobs in a specific queue
  async processQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue || queue.paused) return;
    
    // Check if we have capacity
    if (queue.processing >= queue.concurrency) return;
    
    const availableSlots = queue.concurrency - queue.processing;
    
    // Get pending jobs
    const jobs = await database.query(
      `SELECT * FROM jobs 
       WHERE queue = ? 
       AND status = 'pending' 
       AND scheduled_at <= datetime('now')
       ORDER BY priority DESC, created_at ASC
       LIMIT ?`,
      [queueName, availableSlots]
    );
    
    // Process each job
    for (const job of jobs) {
      this.processJob(job, queue);
    }
  }

  // Process a single job
  async processJob(job, queue) {
    const handler = this.workers.get(job.type);
    
    if (!handler) {
      console.error(`No handler registered for job type: ${job.type}`);
      await this.failJob(job.id, `No handler for job type: ${job.type}`);
      return;
    }
    
    queue.processing++;
    
    try {
      // Mark job as processing
      await database.run(
        `UPDATE jobs 
         SET status = 'processing', 
             started_at = CURRENT_TIMESTAMP,
             attempts = attempts + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [job.id]
      );
      
      this.emit('job:started', { id: job.id, type: job.type });
      
      // Parse payload
      const payload = job.payload ? JSON.parse(job.payload) : {};
      
      // Execute handler with timeout
      const timeout = queue.timeout || 30000; // 30 seconds default
      const result = await this.executeWithTimeout(
        handler(payload, job),
        timeout
      );
      
      // Mark job as completed
      await database.run(
        `UPDATE jobs 
         SET status = 'completed',
             completed_at = CURRENT_TIMESTAMP,
             result = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [JSON.stringify(result), job.id]
      );
      
      this.emit('job:completed', { id: job.id, type: job.type, result });
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      
      // Check if we should retry
      if (job.attempts < job.max_attempts) {
        await this.retryJob(job, error.message);
      } else {
        await this.failJob(job.id, error.message);
      }
    } finally {
      queue.processing--;
    }
  }

  // Execute function with timeout
  async executeWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Job timed out')), timeout)
      )
    ]);
  }

  // Retry a failed job
  async retryJob(job, errorMessage) {
    const retryDelay = this.retryDelays[job.attempts - 1] || this.retryDelays[this.retryDelays.length - 1];
    const nextRun = new Date(Date.now() + retryDelay).toISOString();
    
    await database.run(
      `UPDATE jobs 
       SET status = 'pending',
           scheduled_at = ?,
           error = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextRun, errorMessage, job.id]
    );
    
    this.emit('job:retry', { 
      id: job.id, 
      type: job.type, 
      attempt: job.attempts,
      nextRun 
    });
  }

  // Mark job as failed
  async failJob(jobId, errorMessage) {
    await database.run(
      `UPDATE jobs 
       SET status = 'failed',
           failed_at = CURRENT_TIMESTAMP,
           error = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [errorMessage, jobId]
    );
    
    this.emit('job:failed', { id: jobId, error: errorMessage });
  }

  // Pause a queue
  pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.paused = true;
      this.emit('queue:paused', queueName);
    }
  }

  // Resume a queue
  resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.paused = false;
      this.emit('queue:resumed', queueName);
      this.processQueue(queueName);
    }
  }

  // Get job status
  async getJob(jobId) {
    const result = await database.query(`SELECT * FROM jobs WHERE id = ?`, [jobId]);
    return result[0];
  }

  // Get queue statistics
  async getQueueStats(queueName) {
    const statsResult = await database.query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        AVG(CASE 
          WHEN completed_at IS NOT NULL 
          THEN (julianday(completed_at) - julianday(started_at)) * 86400000
        END) as avg_processing_time
      FROM jobs
      WHERE queue = ?
      AND created_at > datetime('now', '-24 hours')
    `, [queueName]);
    const stats = statsResult[0];
    
    const queue = this.queues.get(queueName);
    
    return {
      ...stats,
      concurrency: queue?.concurrency || 0,
      processing: queue?.processing || 0,
      paused: queue?.paused || false
    };
  }

  // Clean up old jobs
  async cleanupJobs(olderThanDays = 30) {
    const result = await database.run(
      `DELETE FROM jobs 
       WHERE status IN ('completed', 'failed')
       AND created_at < datetime('now', '-' || ? || ' days')`,
      [olderThanDays]
    );
    
    console.log(`Cleaned up ${result.changes} old jobs`);
    return result.changes;
  }

  // Register default job handlers
  registerDefaultHandlers() {
    // Analysis job handler
    this.registerHandler('analysis', async (payload) => {
      const { projectId, analysisType } = payload;
      console.log(`Running ${analysisType} analysis for project ${projectId}`);
      
      // Simulate analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        projectId,
        analysisType,
        timestamp: new Date().toISOString()
      };
    });
    
    // Email job handler
    this.registerHandler('email', async (payload) => {
      const { to, subject, body } = payload;
      console.log(`Sending email to ${to}: ${subject}`);
      
      // In production, integrate with email service
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        to,
        subject,
        sentAt: new Date().toISOString()
      };
    });
    
    // Report generation handler
    this.registerHandler('report', async (payload) => {
      const { reportType, organizationId, dateRange } = payload;
      console.log(`Generating ${reportType} report for org ${organizationId}`);
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return {
        success: true,
        reportType,
        organizationId,
        url: `/reports/${uuidv4()}.pdf`
      };
    });
    
    // Cleanup handler
    this.registerHandler('cleanup', async (payload) => {
      const { type, olderThanDays } = payload;
      console.log(`Running cleanup for ${type}`);
      
      let cleaned = 0;
      
      switch (type) {
        case 'jobs':
          cleaned = await this.cleanupJobs(olderThanDays);
          break;
        case 'logs':
          // Clean up old logs
          const result = await database.run(
            `DELETE FROM audit_logs 
             WHERE created_at < datetime('now', '-' || ? || ' days')
             AND event_severity != 'critical'`,
            [olderThanDays || 90]
          );
          cleaned = result.changes;
          break;
        default:
          throw new Error(`Unknown cleanup type: ${type}`);
      }
      
      return {
        success: true,
        type,
        cleaned
      };
    });
  }

  // Schedule recurring jobs
  scheduleRecurringJobs() {
    // Daily cleanup job
    this.addJob('cleanup', 
      { type: 'jobs', olderThanDays: 30 },
      { queue: 'cleanup', delay: 24 * 60 * 60 * 1000 }
    );
    
    // Weekly log cleanup
    this.addJob('cleanup',
      { type: 'logs', olderThanDays: 90 },
      { queue: 'cleanup', delay: 7 * 24 * 60 * 60 * 1000 }
    );
  }
}

// Export singleton instance
const jobQueue = new JobQueue();
export default jobQueue;