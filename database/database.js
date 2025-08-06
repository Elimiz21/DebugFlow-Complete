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
    return new Promise((resolve, reject) => {
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Error creating tables:', err.message);
          reject(err);
        } else {
          console.log('Database tables created successfully');
          resolve();
        }
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

  // Bug report methods
  async createBugReport(bugData) {
    const sql = `
      INSERT INTO bug_reports (project_id, title, description, severity, file_path, line_number, suggested_fix, ai_analysis)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      bugData.project_id,
      bugData.title,
      bugData.description,
      bugData.severity,
      bugData.file_path,
      bugData.line_number,
      bugData.suggested_fix,
      bugData.ai_analysis
    ];
    return this.run(sql, params);
  }

  async getBugReportsByProject(projectId) {
    const sql = 'SELECT * FROM bug_reports WHERE project_id = ? ORDER BY created_at DESC';
    return this.query(sql, [projectId]);
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