import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      // Create database directory if it doesn't exist
      const dbDir = join(__dirname, '../data');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const dbPath = join(dbDir, 'debugflow.sqlite');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise(async (resolve, reject) => {
      try {
        // Create base schema
        const schemaPath = join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        await this.execPromise(schema);
        console.log('Database tables created successfully');

        // Apply migrations
        await this.runMigrations();
        resolve();
      } catch (err) {
        console.error('Error creating tables:', err.message);
        reject(err);
      }
    });
  }

  async runMigrations() {
    try {
      const migrationsDir = join(__dirname, 'migrations');
      
      // Check if migrations directory exists
      if (fs.existsSync(migrationsDir)) {
        const migrationFiles = fs.readdirSync(migrationsDir)
          .filter(file => file.endsWith('.sql'))
          .sort();

        for (const file of migrationFiles) {
          const migrationPath = join(migrationsDir, file);
          const migration = fs.readFileSync(migrationPath, 'utf8');
          
          // Check if migration has already been applied
          const versionCheck = await this.query(
            'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table" AND name="schema_version"'
          ).catch(() => [{ count: 0 }]);

          if (versionCheck[0].count > 0) {
            const applied = await this.query(
              'SELECT COUNT(*) as count FROM schema_version WHERE version = ?',
              [file.replace('.sql', '')]
            );

            if (applied[0].count > 0) {
              console.log(`Migration ${file} already applied, skipping`);
              continue;
            }
          }

          await this.execPromise(migration);
          console.log(`Applied migration: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error running migrations:', error.message);
      throw error;
    }
  }

  async execPromise(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Generic query method
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database query error:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Generic run method for INSERT, UPDATE, DELETE
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database run error:', err.message);
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  // User methods
  async createUser(userData) {
    const sql = `
      INSERT INTO users (email, name, password_hash, company, timezone)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      userData.email,
      userData.name,
      userData.password_hash,
      userData.company || null,
      userData.timezone || 'UTC'
    ];
    return this.run(sql, params);
  }

  async getUserByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const rows = await this.query(sql, [email]);
    return rows[0] || null;
  }

  async getUserById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const rows = await this.query(sql, [id]);
    return rows[0] || null;
  }

  // Project methods
  async createProject(projectData) {
    const sql = `
      INSERT INTO projects (id, user_id, name, description, type, language, codebase_url, deployment_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      projectData.id,
      projectData.user_id,
      projectData.name,
      projectData.description,
      projectData.type,
      projectData.language,
      projectData.codebase_url,
      projectData.deployment_url
    ];
    return this.run(sql, params);
  }

  async getProjectsByUserId(userId) {
    const sql = 'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC';
    return this.query(sql, [userId]);
  }

  async getProjectById(id) {
    const sql = 'SELECT * FROM projects WHERE id = ?';
    const rows = await this.query(sql, [id]);
    return rows[0] || null;
  }

  async updateProject(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const sql = `
      UPDATE projects 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    return this.run(sql, [...values, id]);
  }

  // Project file methods
  async createProjectFile(fileData) {
    const sql = `
      INSERT INTO project_files (project_id, filename, filepath, content, size_bytes, language)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      fileData.project_id,
      fileData.filename,
      fileData.filepath,
      fileData.content,
      fileData.size_bytes,
      fileData.language
    ];
    return this.run(sql, params);
  }

  async getProjectFiles(projectId) {
    const sql = 'SELECT * FROM project_files WHERE project_id = ?';
    return this.query(sql, [projectId]);
  }

  // Enhanced Bug report methods
  async createBugReport(bugData) {
    const sql = `
      INSERT INTO bug_reports (
        project_id, title, description, severity, status, file_path, line_number, 
        suggested_fix, ai_analysis, ai_confidence_score, estimated_fix_time, 
        category, priority, assignee_id, reporter_id, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      bugData.project_id,
      bugData.title,
      bugData.description || '',
      bugData.severity || 'medium',
      bugData.status || 'open',
      bugData.file_path || null,
      bugData.line_number || null,
      bugData.suggested_fix || null,
      bugData.ai_analysis || null,
      bugData.ai_confidence_score || 0.0,
      bugData.estimated_fix_time || 0,
      bugData.category || 'general',
      bugData.priority || 'normal',
      bugData.assignee_id || null,
      bugData.reporter_id,
      JSON.stringify(bugData.tags || [])
    ];
    return this.run(sql, params);
  }

  async getBugReportsByProject(projectId, filters = {}) {
    let sql = `
      SELECT br.*, 
             u1.name as reporter_name,
             u2.name as assignee_name
      FROM bug_reports br
      LEFT JOIN users u1 ON br.reporter_id = u1.id
      LEFT JOIN users u2 ON br.assignee_id = u2.id
      WHERE br.project_id = ?
    `;
    const params = [projectId];

    // Add filtering
    if (filters.status) {
      sql += ' AND br.status = ?';
      params.push(filters.status);
    }
    if (filters.severity) {
      sql += ' AND br.severity = ?';
      params.push(filters.severity);
    }
    if (filters.category) {
      sql += ' AND br.category = ?';
      params.push(filters.category);
    }
    if (filters.assignee_id) {
      sql += ' AND br.assignee_id = ?';
      params.push(filters.assignee_id);
    }

    sql += ' ORDER BY br.created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    return this.query(sql, params);
  }

  async getBugReportById(bugId) {
    const sql = `
      SELECT br.*, 
             u1.name as reporter_name,
             u2.name as assignee_name
      FROM bug_reports br
      LEFT JOIN users u1 ON br.reporter_id = u1.id
      LEFT JOIN users u2 ON br.assignee_id = u2.id
      WHERE br.id = ?
    `;
    const rows = await this.query(sql, [bugId]);
    return rows[0] || null;
  }

  async updateBugReport(bugId, updateData) {
    const allowedFields = [
      'title', 'description', 'severity', 'status', 'file_path', 'line_number',
      'suggested_fix', 'ai_analysis', 'ai_confidence_score', 'estimated_fix_time',
      'category', 'priority', 'assignee_id', 'fix_verification', 'resolution_notes'
    ];
    
    const updateFields = [];
    const params = [];
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(bugId);

    const sql = `UPDATE bug_reports SET ${updateFields.join(', ')} WHERE id = ?`;
    return this.run(sql, params);
  }

  async deleteBugReport(bugId) {
    const sql = 'DELETE FROM bug_reports WHERE id = ?';
    return this.run(sql, [bugId]);
  }

  // Bug comments methods
  async createBugComment(commentData) {
    const sql = `
      INSERT INTO bug_comments (bug_report_id, user_id, comment, comment_type, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      commentData.bug_report_id,
      commentData.user_id,
      commentData.comment,
      commentData.comment_type || 'comment',
      commentData.metadata ? JSON.stringify(commentData.metadata) : null
    ];
    return this.run(sql, params);
  }

  async getBugComments(bugReportId) {
    const sql = `
      SELECT bc.*, u.name as user_name
      FROM bug_comments bc
      JOIN users u ON bc.user_id = u.id
      WHERE bc.bug_report_id = ?
      ORDER BY bc.created_at ASC
    `;
    return this.query(sql, [bugReportId]);
  }

  // Bug attachments methods
  async createBugAttachment(attachmentData) {
    const sql = `
      INSERT INTO bug_attachments (bug_report_id, filename, file_path, file_type, file_size, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      attachmentData.bug_report_id,
      attachmentData.filename,
      attachmentData.file_path,
      attachmentData.file_type,
      attachmentData.file_size,
      attachmentData.uploaded_by
    ];
    return this.run(sql, params);
  }

  async getBugAttachments(bugReportId) {
    const sql = `
      SELECT ba.*, u.name as uploaded_by_name
      FROM bug_attachments ba
      JOIN users u ON ba.uploaded_by = u.id
      WHERE ba.bug_report_id = ?
      ORDER BY ba.created_at DESC
    `;
    return this.query(sql, [bugReportId]);
  }

  // Bug labels methods
  async getBugLabels() {
    const sql = 'SELECT * FROM bug_labels ORDER BY name ASC';
    return this.query(sql);
  }

  async createBugLabel(labelData) {
    const sql = `
      INSERT INTO bug_labels (name, color, description)
      VALUES (?, ?, ?)
    `;
    const params = [labelData.name, labelData.color, labelData.description || null];
    return this.run(sql, params);
  }

  async assignBugLabels(bugReportId, labelIds) {
    // First, clear existing labels
    await this.run('DELETE FROM bug_report_labels WHERE bug_report_id = ?', [bugReportId]);
    
    // Then assign new labels
    if (labelIds.length > 0) {
      const placeholders = labelIds.map(() => '(?, ?)').join(', ');
      const sql = `INSERT INTO bug_report_labels (bug_report_id, label_id) VALUES ${placeholders}`;
      const params = labelIds.flatMap(labelId => [bugReportId, labelId]);
      return this.run(sql, params);
    }
  }

  async getBugLabelsForReport(bugReportId) {
    const sql = `
      SELECT bl.*
      FROM bug_labels bl
      JOIN bug_report_labels brl ON bl.id = brl.label_id
      WHERE brl.bug_report_id = ?
      ORDER BY bl.name ASC
    `;
    return this.query(sql, [bugReportId]);
  }

  // Bug analytics methods
  async getBugStatsByProject(projectId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low,
        AVG(ai_confidence_score) as avg_confidence
      FROM bug_reports 
      WHERE project_id = ?
    `;
    const rows = await this.query(sql, [projectId]);
    return rows[0] || {};
  }

  // Session methods
  async createSession(sessionId, userId, expiresAt) {
    const sql = 'INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, ?)';
    return this.run(sql, [sessionId, userId, expiresAt]);
  }

  async getSession(sessionId) {
    const sql = 'SELECT * FROM user_sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP';
    const rows = await this.query(sql, [sessionId]);
    return rows[0] || null;
  }

  async deleteSession(sessionId) {
    const sql = 'DELETE FROM user_sessions WHERE id = ?';
    return this.run(sql, [sessionId]);
  }

  // API key methods (encrypted storage)
  async storeApiKey(userId, service, keyHash) {
    const sql = `
      INSERT OR REPLACE INTO user_api_keys (user_id, service, key_hash, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;
    return this.run(sql, [userId, service, keyHash]);
  }

  async getApiKey(userId, service) {
    const sql = 'SELECT key_hash FROM user_api_keys WHERE user_id = ? AND service = ? AND is_active = 1';
    const rows = await this.query(sql, [userId, service]);
    return rows[0]?.key_hash || null;
  }

  // ==========================================
  // PHASE 5: COLLABORATIVE FEATURES METHODS
  // ==========================================

  // Collaborative sessions methods
  async createCollaborativeSession(sessionData) {
    const sql = `
      INSERT INTO collaborative_sessions 
      (id, project_id, session_type, title, description, creator_id, participants, session_config)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      sessionData.id,
      sessionData.project_id,
      sessionData.session_type || 'debugging',
      sessionData.title,
      sessionData.description || '',
      sessionData.creator_id,
      JSON.stringify(sessionData.participants || []),
      JSON.stringify(sessionData.session_config || {})
    ];
    return this.run(sql, params);
  }

  async getCollaborativeSession(sessionId) {
    const sql = `
      SELECT cs.*, u.name as creator_name
      FROM collaborative_sessions cs
      JOIN users u ON cs.creator_id = u.id
      WHERE cs.id = ?
    `;
    const rows = await this.query(sql, [sessionId]);
    return rows[0] || null;
  }

  async getCollaborativeSessionsByProject(projectId, userId = null) {
    let sql = `
      SELECT cs.*, u.name as creator_name,
             COUNT(sp.user_id) as participant_count
      FROM collaborative_sessions cs
      JOIN users u ON cs.creator_id = u.id
      LEFT JOIN session_participants sp ON cs.id = sp.session_id
      WHERE cs.project_id = ?
    `;
    const params = [projectId];

    if (userId) {
      sql += ` AND (cs.creator_id = ? OR sp.user_id = ?)`;
      params.push(userId, userId);
    }

    sql += ` GROUP BY cs.id ORDER BY cs.created_at DESC`;
    return this.query(sql, params);
  }

  async updateCollaborativeSession(sessionId, updates) {
    const allowedFields = ['title', 'description', 'participants', 'active_file', 'session_state', 'session_config', 'status'];
    const updateFields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        // JSON stringify for object fields
        if (['participants', 'session_state', 'session_config'].includes(key)) {
          params.push(JSON.stringify(updates[key]));
        } else {
          params.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(sessionId);

    const sql = `UPDATE collaborative_sessions SET ${updateFields.join(', ')} WHERE id = ?`;
    return this.run(sql, params);
  }

  // Session participants methods
  async addSessionParticipant(participantData) {
    const sql = `
      INSERT OR REPLACE INTO session_participants 
      (session_id, user_id, role, permissions, is_online)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      participantData.session_id,
      participantData.user_id,
      participantData.role || 'participant',
      JSON.stringify(participantData.permissions || []),
      participantData.is_online !== undefined ? participantData.is_online : true
    ];
    return this.run(sql, params);
  }

  async getSessionParticipants(sessionId) {
    const sql = `
      SELECT sp.*, u.name as user_name, u.email as user_email
      FROM session_participants sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.session_id = ?
      ORDER BY sp.joined_at ASC
    `;
    return this.query(sql, [sessionId]);
  }

  async updateParticipantStatus(sessionId, userId, updates) {
    const allowedFields = ['is_online', 'last_activity', 'cursor_position', 'current_selection'];
    const updateFields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        if (['cursor_position', 'current_selection'].includes(key)) {
          params.push(JSON.stringify(updates[key]));
        } else {
          params.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) return;

    params.push(sessionId, userId);
    const sql = `UPDATE session_participants SET ${updateFields.join(', ')} WHERE session_id = ? AND user_id = ?`;
    return this.run(sql, params);
  }

  // Session events methods
  async addSessionEvent(eventData) {
    const sql = `
      INSERT INTO session_events 
      (session_id, user_id, event_type, event_data, file_path, sequence_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      eventData.session_id,
      eventData.user_id,
      eventData.event_type,
      JSON.stringify(eventData.event_data),
      eventData.file_path || null,
      eventData.sequence_number || Date.now()
    ];
    return this.run(sql, params);
  }

  async getSessionEvents(sessionId, options = {}) {
    let sql = `
      SELECT se.*, u.name as user_name
      FROM session_events se
      JOIN users u ON se.user_id = u.id
      WHERE se.session_id = ?
    `;
    const params = [sessionId];

    if (options.event_type) {
      sql += ' AND se.event_type = ?';
      params.push(options.event_type);
    }

    if (options.since_timestamp) {
      sql += ' AND se.timestamp > ?';
      params.push(options.since_timestamp);
    }

    sql += ' ORDER BY se.sequence_number ASC';

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    return this.query(sql, params);
  }

  // Session annotations methods
  async createSessionAnnotation(annotationData) {
    const sql = `
      INSERT INTO session_annotations 
      (session_id, user_id, file_path, line_number, column_number, annotation_type, content, metadata, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      annotationData.session_id,
      annotationData.user_id,
      annotationData.file_path,
      annotationData.line_number,
      annotationData.column_number || 0,
      annotationData.annotation_type || 'comment',
      annotationData.content,
      annotationData.metadata ? JSON.stringify(annotationData.metadata) : null,
      annotationData.parent_id || null
    ];
    return this.run(sql, params);
  }

  async getSessionAnnotations(sessionId, filePath = null) {
    let sql = `
      SELECT sa.*, u.name as user_name,
             COUNT(replies.id) as reply_count
      FROM session_annotations sa
      JOIN users u ON sa.user_id = u.id
      LEFT JOIN session_annotations replies ON sa.id = replies.parent_id
      WHERE sa.session_id = ?
    `;
    const params = [sessionId];

    if (filePath) {
      sql += ' AND sa.file_path = ?';
      params.push(filePath);
    }

    sql += ' GROUP BY sa.id ORDER BY sa.created_at ASC';
    return this.query(sql, params);
  }

  async updateSessionAnnotation(annotationId, updates) {
    const allowedFields = ['content', 'metadata', 'resolved', 'upvotes'];
    const updateFields = [];
    const params = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        if (key === 'metadata') {
          params.push(JSON.stringify(updates[key]));
        } else {
          params.push(updates[key]);
        }
      }
    });

    if (updates.resolved && updates.resolved_by) {
      updateFields.push('resolved_by = ?', 'resolved_at = CURRENT_TIMESTAMP');
      params.push(updates.resolved_by);
    }

    if (updateFields.length === 0) return;

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(annotationId);

    const sql = `UPDATE session_annotations SET ${updateFields.join(', ')} WHERE id = ?`;
    return this.run(sql, params);
  }

  // Session breakpoints methods
  async createSessionBreakpoint(breakpointData) {
    const sql = `
      INSERT OR REPLACE INTO session_breakpoints 
      (session_id, user_id, file_path, line_number, breakpoint_type, condition_expression, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      breakpointData.session_id,
      breakpointData.user_id,
      breakpointData.file_path,
      breakpointData.line_number,
      breakpointData.breakpoint_type || 'line',
      breakpointData.condition_expression || null,
      breakpointData.is_active !== undefined ? breakpointData.is_active : true
    ];
    return this.run(sql, params);
  }

  async getSessionBreakpoints(sessionId, filePath = null) {
    let sql = `
      SELECT sb.*, u.name as user_name
      FROM session_breakpoints sb
      JOIN users u ON sb.user_id = u.id
      WHERE sb.session_id = ? AND sb.is_active = 1
    `;
    const params = [sessionId];

    if (filePath) {
      sql += ' AND sb.file_path = ?';
      params.push(filePath);
    }

    sql += ' ORDER BY sb.file_path, sb.line_number';
    return this.query(sql, params);
  }

  async toggleSessionBreakpoint(sessionId, filePath, lineNumber, userId) {
    // Check if breakpoint exists
    const existing = await this.query(`
      SELECT * FROM session_breakpoints 
      WHERE session_id = ? AND file_path = ? AND line_number = ?
    `, [sessionId, filePath, lineNumber]);

    if (existing.length > 0) {
      // Toggle existing breakpoint
      const sql = `UPDATE session_breakpoints SET is_active = NOT is_active WHERE id = ?`;
      return this.run(sql, [existing[0].id]);
    } else {
      // Create new breakpoint
      return this.createSessionBreakpoint({
        session_id: sessionId,
        user_id: userId,
        file_path: filePath,
        line_number: lineNumber
      });
    }
  }

  // Close database connection
  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed');
        }
        resolve();
      });
    });
  }
}

// Create singleton instance
const database = new Database();

export default database;