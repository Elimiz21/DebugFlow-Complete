// Health Check and Monitoring Service
// Provides health status and metrics for the application

import os from 'os';
import database from '../database/database.js';
import jobQueue from './jobQueue.js';

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      startTime: Date.now()
    };
    
    this.registerDefaultChecks();
  }

  // Register a health check
  registerCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      name,
      fn: checkFn,
      critical: options.critical || false,
      timeout: options.timeout || 5000,
      ...options
    });
  }

  // Register default health checks
  registerDefaultChecks() {
    // Database health check
    this.registerCheck('database', async () => {
      try {
        const result = await database.query('SELECT 1 as test');
        return {
          status: 'healthy',
          message: 'Database connection is active',
          responseTime: Date.now()
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          message: `Database error: ${error.message}`,
          error: error.message
        };
      }
    }, { critical: true });

    // Memory health check
    this.registerCheck('memory', async () => {
      const usage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      const status = memoryUsagePercent > 90 ? 'degraded' : 'healthy';
      
      return {
        status,
        message: `Memory usage: ${memoryUsagePercent.toFixed(2)}%`,
        details: {
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
          rss: Math.round(usage.rss / 1024 / 1024),
          external: Math.round(usage.external / 1024 / 1024),
          systemTotal: Math.round(totalMemory / 1024 / 1024),
          systemFree: Math.round(freeMemory / 1024 / 1024),
          percentage: memoryUsagePercent.toFixed(2)
        }
      };
    });

    // CPU health check
    this.registerCheck('cpu', async () => {
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      const cpuCount = cpus.length;
      
      // Calculate CPU usage
      const loads = loadAvg.map(load => (load / cpuCount) * 100);
      const status = loads[0] > 80 ? 'degraded' : 'healthy';
      
      return {
        status,
        message: `CPU load: ${loads[0].toFixed(2)}%`,
        details: {
          cores: cpuCount,
          model: cpus[0].model,
          loadAverage: {
            '1min': loads[0].toFixed(2),
            '5min': loads[1].toFixed(2),
            '15min': loads[2].toFixed(2)
          }
        }
      };
    });

    // Disk space health check
    this.registerCheck('disk', async () => {
      // This would need a proper disk space library in production
      // For now, we'll simulate it
      const diskUsagePercent = 65; // Simulated
      
      return {
        status: diskUsagePercent > 90 ? 'unhealthy' : 'healthy',
        message: `Disk usage: ${diskUsagePercent}%`,
        details: {
          used: diskUsagePercent,
          free: 100 - diskUsagePercent
        }
      };
    });

    // Job queue health check
    this.registerCheck('jobQueue', async () => {
      try {
        const stats = await jobQueue.getQueueStats('default');
        const status = stats.failed > 100 ? 'degraded' : 'healthy';
        
        return {
          status,
          message: `Job queue operational`,
          details: {
            pending: stats.pending,
            processing: stats.processing,
            completed: stats.completed,
            failed: stats.failed,
            avgProcessingTime: stats.avg_processing_time
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          message: 'Job queue not responding',
          error: error.message
        };
      }
    });

    // Socket.io health check
    this.registerCheck('socketio', async () => {
      // Check if Socket.io server is running
      const io = global.io;
      
      if (!io) {
        return {
          status: 'unhealthy',
          message: 'Socket.io server not initialized'
        };
      }
      
      const sockets = await io.fetchSockets();
      
      return {
        status: 'healthy',
        message: 'Socket.io server is running',
        details: {
          connectedClients: sockets.length,
          rooms: io.sockets.adapter.rooms.size
        }
      };
    });

    // External services health check
    this.registerCheck('externalServices', async () => {
      const services = [];
      
      // Check AI providers
      const aiProviders = ['openai', 'groq', 'gemini', 'claude'];
      for (const provider of aiProviders) {
        const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
        services.push({
          name: provider,
          status: apiKey ? 'configured' : 'not_configured'
        });
      }
      
      const configuredCount = services.filter(s => s.status === 'configured').length;
      
      return {
        status: configuredCount > 0 ? 'healthy' : 'degraded',
        message: `${configuredCount}/${services.length} AI services configured`,
        details: { services }
      };
    });
  }

  // Run a single health check
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      return {
        name,
        status: 'unknown',
        message: 'Check not found'
      };
    }

    const startTime = Date.now();
    
    try {
      // Run check with timeout
      const result = await Promise.race([
        check.fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Check timed out')), check.timeout)
        )
      ]);
      
      const duration = Date.now() - startTime;
      
      return {
        name: check.name,
        ...result,
        duration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: check.name,
        status: 'unhealthy',
        message: error.message,
        error: error.stack,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Run all health checks
  async runAllChecks() {
    const results = {};
    const promises = [];
    
    for (const [name, check] of this.checks) {
      promises.push(
        this.runCheck(name).then(result => {
          results[name] = result;
        })
      );
    }
    
    await Promise.all(promises);
    
    // Determine overall status
    const statuses = Object.values(results).map(r => r.status);
    let overallStatus = 'healthy';
    
    if (statuses.includes('unhealthy')) {
      // Check if any critical checks failed
      const criticalFailed = Object.entries(results).some(
        ([name, result]) => 
          this.checks.get(name).critical && result.status === 'unhealthy'
      );
      
      overallStatus = criticalFailed ? 'unhealthy' : 'degraded';
    } else if (statuses.includes('degraded')) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      checks: results
    };
  }

  // Get basic health status (fast check)
  async getBasicHealth() {
    try {
      // Quick database check
      await database.query('SELECT 1');
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: this.getUptime()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        error: error.message
      };
    }
  }

  // Get system metrics
  async getMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Calculate average response time
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;
    
    // Database metrics
    let dbMetrics = {};
    try {
      const dbStatsResult = await database.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as users,
          (SELECT COUNT(*) FROM projects) as projects,
          (SELECT COUNT(*) FROM bug_reports) as bugs,
          (SELECT COUNT(*) FROM ai_analyses) as analyses,
          (SELECT COUNT(*) FROM jobs WHERE status = 'pending') as pending_jobs
      `);
      dbMetrics = dbStatsResult[0];
    } catch (error) {
      dbMetrics = { error: error.message };
    }
    
    return {
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        pid: process.pid
      },
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        systemTotal: Math.round(os.totalmem() / 1024 / 1024),
        systemFree: Math.round(os.freemem() / 1024 / 1024)
      },
      cpu: {
        cores: cpus.length,
        model: cpus[0].model,
        speed: cpus[0].speed,
        loadAverage: {
          '1min': loadAvg[0].toFixed(2),
          '5min': loadAvg[1].toFixed(2),
          '15min': loadAvg[2].toFixed(2)
        }
      },
      requests: {
        total: this.metrics.requests,
        errors: this.metrics.errors,
        errorRate: this.metrics.requests > 0 
          ? (this.metrics.errors / this.metrics.requests).toFixed(4)
          : 0,
        avgResponseTime: Math.round(avgResponseTime)
      },
      database: dbMetrics
    };
  }

  // Track request metrics
  trackRequest(responseTime, isError = false) {
    this.metrics.requests++;
    
    if (isError) {
      this.metrics.errors++;
    }
    
    // Keep only last 1000 response times
    this.metrics.responseTime.push(responseTime);
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift();
    }
  }

  // Get uptime in seconds
  getUptime() {
    return Math.floor((Date.now() - this.metrics.startTime) / 1000);
  }

  // Format uptime for display
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    
    return parts.join(' ');
  }

  // Express middleware for tracking requests
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track response
      const originalSend = res.send;
      res.send = function(data) {
        const responseTime = Date.now() - startTime;
        const isError = res.statusCode >= 400;
        
        this.trackRequest(responseTime, isError);
        
        return originalSend.call(res, data);
      }.bind(this);
      
      next();
    };
  }
}

// Export singleton instance
const healthCheck = new HealthCheckService();
export default healthCheck;