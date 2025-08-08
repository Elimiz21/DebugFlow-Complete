// Analytics API
// Provides analytics data and metrics for the dashboard

import express from 'express';
import database from '../database/database.js';
import { requireAuth, requireOrgRole } from './middleware/auth.js';

const router = express.Router();

// Get overview metrics
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const { organizationId, projectId, timeRange = '7d' } = req.query;
    const userId = req.user.id;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Build query conditions
    let conditions = ['1=1'];
    const params = [];
    
    if (organizationId) {
      conditions.push('p.organization_id = ?');
      params.push(organizationId);
    } else {
      conditions.push('(p.owner_id = ? OR pp.user_id = ?)');
      params.push(userId, userId);
    }
    
    if (projectId) {
      conditions.push('p.id = ?');
      params.push(projectId);
    }
    
    // Get bug metrics
    const bugMetrics = await database.get(`
      SELECT 
        COUNT(DISTINCT br.id) as totalBugs,
        COUNT(DISTINCT CASE WHEN br.status = 'resolved' THEN br.id END) as resolvedBugs,
        COUNT(DISTINCT CASE WHEN br.severity = 'critical' THEN br.id END) as criticalBugs,
        AVG(CASE 
          WHEN br.status = 'resolved' AND br.resolved_at IS NOT NULL 
          THEN (julianday(br.resolved_at) - julianday(br.created_at))
        END) as avgResolutionTime
      FROM projects p
      LEFT JOIN project_permissions pp ON p.id = pp.project_id
      LEFT JOIN bug_reports br ON p.id = br.project_id
      WHERE ${conditions.join(' AND ')}
      AND br.created_at >= ?
    `, [...params, startDate.toISOString()]);
    
    // Get project metrics
    const projectMetrics = await database.get(`
      SELECT 
        COUNT(DISTINCT p.id) as activeProjects,
        COUNT(DISTINCT ar.id) as totalAnalyses,
        COUNT(DISTINCT ds.id) as debugSessions
      FROM projects p
      LEFT JOIN project_permissions pp ON p.id = pp.project_id
      LEFT JOIN analysis_results ar ON p.id = ar.project_id
      LEFT JOIN debug_sessions ds ON p.id = ds.project_id
      WHERE ${conditions.join(' AND ')}
      AND (
        ar.created_at >= ? OR
        ds.started_at >= ?
      )
    `, [...params, startDate.toISOString(), startDate.toISOString()]);
    
    // Get AI metrics
    const aiMetrics = await database.get(`
      SELECT 
        COUNT(*) as totalAIRequests,
        AVG(CASE WHEN confidence_score IS NOT NULL THEN confidence_score END) as aiAccuracy,
        COUNT(DISTINCT provider_id) as providersUsed
      FROM analysis_results ar
      JOIN projects p ON ar.project_id = p.id
      LEFT JOIN project_permissions pp ON p.id = pp.project_id
      WHERE ${conditions.join(' AND ')}
      AND ar.created_at >= ?
    `, [...params, startDate.toISOString()]);
    
    // Get user activity
    const userActivity = await database.get(`
      SELECT COUNT(DISTINCT user_id) as activeUsers
      FROM (
        SELECT br.reported_by as user_id FROM bug_reports br
        JOIN projects p ON br.project_id = p.id
        LEFT JOIN project_permissions pp ON p.id = pp.project_id
        WHERE ${conditions.join(' AND ')} AND br.created_at >= ?
        UNION
        SELECT ds.user_id FROM debug_sessions ds
        JOIN projects p ON ds.project_id = p.id
        LEFT JOIN project_permissions pp ON p.id = pp.project_id
        WHERE ${conditions.join(' AND ')} AND ds.started_at >= ?
      )
    `, [...params, startDate.toISOString(), ...params, startDate.toISOString()]);
    
    res.json({
      metrics: {
        totalBugs: bugMetrics.totalBugs || 0,
        resolvedBugs: bugMetrics.resolvedBugs || 0,
        avgResolutionTime: bugMetrics.avgResolutionTime ? 
          parseFloat(bugMetrics.avgResolutionTime.toFixed(1)) : 0,
        criticalBugs: bugMetrics.criticalBugs || 0,
        activeProjects: projectMetrics.activeProjects || 0,
        totalAnalyses: projectMetrics.totalAnalyses || 0,
        aiAccuracy: aiMetrics.aiAccuracy ? 
          parseFloat((aiMetrics.aiAccuracy * 100).toFixed(1)) : 0,
        userActivity: userActivity.activeUsers || 0
      },
      timeRange,
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    });
    
  } catch (error) {
    console.error('Get overview metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
});

// Get bug trend data
router.get('/bug-trend', requireAuth, async (req, res) => {
  try {
    const { organizationId, projectId, timeRange = '7d' } = req.query;
    
    // Calculate date range and interval
    const now = new Date();
    let startDate, interval, format;
    
    switch (timeRange) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        interval = 'hour';
        format = '%H:00';
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        interval = 'day';
        format = '%Y-%m-%d';
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        interval = 'day';
        format = '%Y-%m-%d';
        break;
      case '90d':
        startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        interval = 'week';
        format = '%Y-W%W';
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        interval = 'day';
        format = '%Y-%m-%d';
    }
    
    // Build conditions
    let conditions = ['br.created_at >= ?'];
    const params = [startDate.toISOString()];
    
    if (organizationId) {
      conditions.push('p.organization_id = ?');
      params.push(organizationId);
    }
    
    if (projectId) {
      conditions.push('br.project_id = ?');
      params.push(projectId);
    }
    
    // Get bug creation trend
    const newBugs = await database.all(`
      SELECT 
        strftime('${format}', br.created_at) as period,
        COUNT(*) as count
      FROM bug_reports br
      JOIN projects p ON br.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY period
      ORDER BY period
    `, params);
    
    // Get bug resolution trend
    const resolvedBugs = await database.all(`
      SELECT 
        strftime('${format}', br.resolved_at) as period,
        COUNT(*) as count
      FROM bug_reports br
      JOIN projects p ON br.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      AND br.status = 'resolved'
      AND br.resolved_at IS NOT NULL
      GROUP BY period
      ORDER BY period
    `, params);
    
    res.json({
      newBugs,
      resolvedBugs,
      interval,
      timeRange
    });
    
  } catch (error) {
    console.error('Get bug trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bug trend data'
    });
  }
});

// Get severity distribution
router.get('/severity-distribution', requireAuth, async (req, res) => {
  try {
    const { organizationId, projectId } = req.query;
    
    let conditions = ['1=1'];
    const params = [];
    
    if (organizationId) {
      conditions.push('p.organization_id = ?');
      params.push(organizationId);
    }
    
    if (projectId) {
      conditions.push('br.project_id = ?');
      params.push(projectId);
    }
    
    const distribution = await database.all(`
      SELECT 
        br.severity,
        COUNT(*) as count
      FROM bug_reports br
      JOIN projects p ON br.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      AND br.status != 'resolved'
      GROUP BY br.severity
    `, params);
    
    res.json(distribution);
    
  } catch (error) {
    console.error('Get severity distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch severity distribution'
    });
  }
});

// Get AI performance metrics
router.get('/ai-performance', requireAuth, async (req, res) => {
  try {
    const { organizationId, timeRange = '7d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
    
    let conditions = ['ar.created_at >= ?'];
    const params = [startDate.toISOString()];
    
    if (organizationId) {
      conditions.push('p.organization_id = ?');
      params.push(organizationId);
    }
    
    // Get performance by provider
    const providerPerformance = await database.all(`
      SELECT 
        ar.provider_id,
        COUNT(*) as requests,
        AVG(ar.confidence_score) as accuracy,
        AVG(ar.processing_time) as avgTime,
        COUNT(CASE WHEN ar.error IS NOT NULL THEN 1 END) as errors
      FROM analysis_results ar
      JOIN projects p ON ar.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY ar.provider_id
    `, params);
    
    // Get performance by analysis type
    const typePerformance = await database.all(`
      SELECT 
        ar.analysis_type,
        COUNT(*) as requests,
        AVG(ar.confidence_score) as accuracy,
        AVG(ar.processing_time) as avgTime
      FROM analysis_results ar
      JOIN projects p ON ar.project_id = p.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY ar.analysis_type
    `, params);
    
    res.json({
      byProvider: providerPerformance,
      byType: typePerformance,
      timeRange
    });
    
  } catch (error) {
    console.error('Get AI performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI performance metrics'
    });
  }
});

// Get project activity
router.get('/project-activity', requireAuth, async (req, res) => {
  try {
    const { organizationId, limit = 10 } = req.query;
    const userId = req.user.id;
    
    let conditions = ['1=1'];
    const params = [];
    
    if (organizationId) {
      conditions.push('p.organization_id = ?');
      params.push(organizationId);
    } else {
      conditions.push('(p.owner_id = ? OR pp.user_id = ?)');
      params.push(userId, userId);
    }
    
    params.push(parseInt(limit));
    
    const activity = await database.all(`
      SELECT 
        p.id,
        p.name,
        p.language,
        p.updated_at,
        COUNT(DISTINCT br.id) as bugCount,
        COUNT(DISTINCT ar.id) as analysisCount,
        MAX(ar.created_at) as lastAnalysis,
        MAX(br.created_at) as lastBug
      FROM projects p
      LEFT JOIN project_permissions pp ON p.id = pp.project_id
      LEFT JOIN bug_reports br ON p.id = br.project_id
      LEFT JOIN analysis_results ar ON p.id = ar.project_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id
      ORDER BY p.updated_at DESC
      LIMIT ?
    `, params);
    
    res.json(activity);
    
  } catch (error) {
    console.error('Get project activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project activity'
    });
  }
});

// Get user engagement metrics
router.get('/user-engagement', requireAuth, async (req, res) => {
  try {
    const { organizationId, timeRange = '7d' } = req.query;
    
    const now = new Date();
    let startDate, format;
    
    switch (timeRange) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        format = '%H:00';
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        format = '%Y-%m-%d';
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        format = '%Y-%m-%d';
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        format = '%Y-%m-%d';
    }
    
    let conditions = [];
    const params = [];
    
    if (organizationId) {
      // Get organization member activity
      const engagement = await database.all(`
        SELECT 
          strftime('${format}', al.created_at) as period,
          COUNT(DISTINCT al.user_id) as activeUsers,
          COUNT(*) as actions
        FROM audit_logs al
        WHERE al.organization_id = ?
        AND al.created_at >= ?
        GROUP BY period
        ORDER BY period
      `, [organizationId, startDate.toISOString()]);
      
      res.json(engagement);
    } else {
      // Get general user activity
      const engagement = await database.all(`
        SELECT 
          strftime('${format}', created_at) as period,
          COUNT(DISTINCT user_id) as activeUsers,
          COUNT(*) as actions
        FROM (
          SELECT user_id, created_at FROM sessions WHERE created_at >= ?
          UNION ALL
          SELECT reported_by as user_id, created_at FROM bug_reports WHERE created_at >= ?
          UNION ALL
          SELECT user_id, started_at as created_at FROM debug_sessions WHERE started_at >= ?
        )
        GROUP BY period
        ORDER BY period
      `, [startDate.toISOString(), startDate.toISOString(), startDate.toISOString()]);
      
      res.json(engagement);
    }
    
  } catch (error) {
    console.error('Get user engagement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user engagement metrics'
    });
  }
});

// Record analytics event
router.post('/event', requireAuth, async (req, res) => {
  try {
    const {
      event_name,
      event_category,
      event_properties,
      numeric_value,
      duration_ms
    } = req.body;
    
    await database.run(
      `INSERT INTO analytics_events (
        organization_id,
        user_id,
        event_name,
        event_category,
        event_properties,
        numeric_value,
        duration_ms,
        session_id,
        page_url,
        referrer,
        browser,
        os,
        device_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.organizationId || null,
        req.user.id,
        event_name,
        event_category,
        JSON.stringify(event_properties),
        numeric_value,
        duration_ms,
        req.sessionId || null,
        req.body.page_url || null,
        req.body.referrer || null,
        req.body.browser || null,
        req.body.os || null,
        req.body.device_type || null
      ]
    );
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Record analytics event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record analytics event'
    });
  }
});

export default router;