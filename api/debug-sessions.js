// Debug Sessions API
// Handles debug session management, breakpoints, and execution control

import express from 'express';
import database from '../database/database.js';
import { requireAuth } from './middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { aiHandler } from '../server/aiHandler.js';

const router = express.Router();

// Create new debug session
router.post('/create', requireAuth, async (req, res) => {
  try {
    const { projectId, bugId, name, description } = req.body;
    
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }
    
    const sessionId = uuidv4();
    
    await database.run(
      `INSERT INTO debug_sessions (
        id, project_id, bug_id, user_id, name, description,
        status, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        sessionId,
        projectId,
        bugId || null,
        req.user.id,
        name || 'Debug Session',
        description || '',
        new Date().toISOString()
      ]
    );
    
    res.json({
      success: true,
      sessionId,
      message: 'Debug session created successfully'
    });
    
  } catch (error) {
    console.error('Create debug session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create debug session'
    });
  }
});

// Get active debug sessions
router.get('/active', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.query;
    
    let query = `
      SELECT ds.*, u.username, p.name as project_name
      FROM debug_sessions ds
      JOIN users u ON ds.user_id = u.id
      JOIN projects p ON ds.project_id = p.id
      WHERE ds.status = 'active'
    `;
    const params = [];
    
    if (projectId) {
      query += ' AND ds.project_id = ?';
      params.push(projectId);
    }
    
    query += ' ORDER BY ds.started_at DESC';
    
    const sessions = await database.all(query, params);
    
    res.json(sessions);
    
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active sessions'
    });
  }
});

// Get session details
router.get('/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await database.get(
      `SELECT ds.*, u.username, p.name as project_name
       FROM debug_sessions ds
       JOIN users u ON ds.user_id = u.id
       JOIN projects p ON ds.project_id = p.id
       WHERE ds.id = ?`,
      [sessionId]
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Debug session not found'
      });
    }
    
    // Get breakpoints
    const breakpoints = await database.all(
      'SELECT * FROM debug_breakpoints WHERE session_id = ? ORDER BY line_number',
      [sessionId]
    );
    
    // Get watch variables
    const watchVariables = await database.all(
      'SELECT * FROM debug_watch_variables WHERE session_id = ?',
      [sessionId]
    );
    
    // Get session logs
    const logs = await database.all(
      'SELECT * FROM debug_logs WHERE session_id = ? ORDER BY timestamp DESC LIMIT 100',
      [sessionId]
    );
    
    res.json({
      ...session,
      breakpoints: breakpoints || [],
      watchVariables: watchVariables || [],
      logs: logs || []
    });
    
  } catch (error) {
    console.error('Get session details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session details'
    });
  }
});

// Update session status
router.put('/:sessionId/status', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['active', 'paused', 'completed', 'terminated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const updateData = { status };
    if (status === 'completed' || status === 'terminated') {
      updateData.ended_at = new Date().toISOString();
    }
    
    await database.run(
      `UPDATE debug_sessions 
       SET status = ?, ended_at = ?
       WHERE id = ?`,
      [updateData.status, updateData.ended_at || null, sessionId]
    );
    
    res.json({
      success: true,
      message: 'Session status updated'
    });
    
  } catch (error) {
    console.error('Update session status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session status'
    });
  }
});

// Add breakpoint
router.post('/:sessionId/breakpoints', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { file, lineNumber, condition, enabled = true } = req.body;
    
    const breakpointId = uuidv4();
    
    await database.run(
      `INSERT INTO debug_breakpoints (
        id, session_id, file_path, line_number, 
        condition, enabled, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        breakpointId,
        sessionId,
        file,
        lineNumber,
        condition || null,
        enabled ? 1 : 0,
        new Date().toISOString()
      ]
    );
    
    res.json({
      success: true,
      breakpointId,
      message: 'Breakpoint added'
    });
    
  } catch (error) {
    console.error('Add breakpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add breakpoint'
    });
  }
});

// Remove breakpoint
router.delete('/:sessionId/breakpoints/:breakpointId', requireAuth, async (req, res) => {
  try {
    const { sessionId, breakpointId } = req.params;
    
    await database.run(
      'DELETE FROM debug_breakpoints WHERE id = ? AND session_id = ?',
      [breakpointId, sessionId]
    );
    
    res.json({
      success: true,
      message: 'Breakpoint removed'
    });
    
  } catch (error) {
    console.error('Remove breakpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove breakpoint'
    });
  }
});

// Add watch variable
router.post('/:sessionId/watch', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name, expression, scope } = req.body;
    
    const watchId = uuidv4();
    
    await database.run(
      `INSERT INTO debug_watch_variables (
        id, session_id, name, expression, scope, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        watchId,
        sessionId,
        name,
        expression,
        scope || 'local',
        new Date().toISOString()
      ]
    );
    
    res.json({
      success: true,
      watchId,
      message: 'Watch variable added'
    });
    
  } catch (error) {
    console.error('Add watch variable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add watch variable'
    });
  }
});

// Log debug event
router.post('/:sessionId/log', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { type, message, data, stackTrace } = req.body;
    
    await database.run(
      `INSERT INTO debug_logs (
        session_id, type, message, data, stack_trace, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        type || 'info',
        message,
        data ? JSON.stringify(data) : null,
        stackTrace || null,
        new Date().toISOString()
      ]
    );
    
    res.json({
      success: true,
      message: 'Debug event logged'
    });
    
  } catch (error) {
    console.error('Log debug event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log debug event'
    });
  }
});

// Get AI debugging suggestions
router.post('/:sessionId/ai-suggest', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code, error, context } = req.body;
    
    // Get session details
    const session = await database.get(
      'SELECT * FROM debug_sessions WHERE id = ?',
      [sessionId]
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Generate AI suggestions
    const prompt = `Analyze this debugging session and provide helpful suggestions:
    
Error: ${error || 'No specific error'}
Code Context:
\`\`\`
${code}
\`\`\`

Additional Context: ${context || 'None'}

Provide:
1. Root cause analysis
2. Potential fixes
3. Debugging steps to follow
4. Code suggestions`;

    const aiResponse = await aiHandler.processAnalysis({
      providerId: 'openai',
      analysisPrompt: prompt,
      options: {
        maxTokens: 1000,
        temperature: 0.3
      }
    });
    
    res.json({
      success: true,
      suggestions: aiResponse.content,
      confidence: aiResponse.confidence || 0.85
    });
    
  } catch (error) {
    console.error('AI suggest error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI suggestions'
    });
  }
});

// Get session history
router.get('/history/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 10 } = req.query;
    
    const history = await database.all(
      `SELECT ds.*, u.username
       FROM debug_sessions ds
       JOIN users u ON ds.user_id = u.id
       WHERE ds.project_id = ?
       ORDER BY ds.started_at DESC
       LIMIT ?`,
      [projectId, parseInt(limit)]
    );
    
    res.json(history);
    
  } catch (error) {
    console.error('Get session history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session history'
    });
  }
});

// Initialize debug tables when database is ready
function initializeDebugTables() {
  if (database && database.db) {
    Promise.all([
      database.run(`
        CREATE TABLE IF NOT EXISTS debug_sessions (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          bug_id TEXT,
          user_id INTEGER NOT NULL,
          name TEXT,
          description TEXT,
          status TEXT DEFAULT 'active',
          started_at DATETIME,
          ended_at DATETIME,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id),
          FOREIGN KEY (bug_id) REFERENCES bug_reports(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `),
      
      database.run(`
        CREATE TABLE IF NOT EXISTS debug_breakpoints (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          file_path TEXT NOT NULL,
          line_number INTEGER NOT NULL,
          condition TEXT,
          enabled INTEGER DEFAULT 1,
          hit_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES debug_sessions(id) ON DELETE CASCADE
        )
      `),
      
      database.run(`
        CREATE TABLE IF NOT EXISTS debug_watch_variables (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          name TEXT NOT NULL,
          expression TEXT,
          value TEXT,
          scope TEXT DEFAULT 'local',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES debug_sessions(id) ON DELETE CASCADE
        )
      `),
      
      database.run(`
        CREATE TABLE IF NOT EXISTS debug_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          message TEXT,
          data TEXT,
          stack_trace TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES debug_sessions(id) ON DELETE CASCADE
        )
      `)
    ]).catch(console.error);
  } else {
    // Retry after a short delay if database is not ready
    setTimeout(initializeDebugTables, 1000);
  }
}

// Initialize tables when this module is loaded
initializeDebugTables();

export default router;