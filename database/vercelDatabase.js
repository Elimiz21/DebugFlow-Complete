// Vercel Postgres Database Adapter
// Automatically used when POSTGRES_URL is available

import { sql } from '@vercel/postgres';

class VercelDatabase {
  constructor() {
    this.isAvailable = !!process.env.POSTGRES_URL;
  }

  // Simple wrapper to match SQLite interface
  async run(query, params = []) {
    try {
      // Convert SQLite-style placeholders (?) to Postgres-style ($1, $2, etc.)
      let postgresQuery = query;
      let paramIndex = 1;
      while (postgresQuery.includes('?')) {
        postgresQuery = postgresQuery.replace('?', `$${paramIndex}`);
        paramIndex++;
      }

      // Execute query with parameters
      if (params.length > 0) {
        const result = await sql.query(postgresQuery, params);
        return result;
      } else {
        // Use template literal for queries without parameters
        const result = await sql.query(postgresQuery);
        return result;
      }
    } catch (error) {
      console.error('Vercel Postgres query error:', error);
      throw error;
    }
  }

  async get(query, params = []) {
    const result = await this.run(query, params);
    return result.rows[0] || null;
  }

  async all(query, params = []) {
    const result = await this.run(query, params);
    return result.rows || [];
  }

  // Initialize tables (called from API endpoints)
  async initialize() {
    console.log('Using Vercel Postgres database');
    
    // Create tables if they don't exist
    try {
      await this.createTables();
    } catch (error) {
      console.log('Tables might already exist:', error.message);
    }
    
    return true;
  }

  async createTables() {
    // Create users table
    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash TEXT NOT NULL,
        company VARCHAR(255),
        timezone VARCHAR(100) DEFAULT 'UTC',
        role VARCHAR(50) DEFAULT 'user',
        organization_id INTEGER,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create projects table
    await this.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        language VARCHAR(50),
        status VARCHAR(50) DEFAULT 'analyzing',
        codebase_url TEXT,
        deployment_url TEXT,
        bugs_found INTEGER DEFAULT 0,
        bugs_fixed INTEGER DEFAULT 0,
        file_count INTEGER DEFAULT 0,
        size_bytes BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Vercel Postgres tables created successfully');
  }

  // User-specific methods
  async getUserByEmail(email) {
    return await this.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  async getUserById(id) {
    return await this.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async createUser(userData) {
    const { name, email, password_hash, company, timezone } = userData;
    const result = await this.run(
      `INSERT INTO users (name, email, password_hash, company, timezone) 
       VALUES (?, ?, ?, ?, ?) 
       RETURNING id`,
      [name, email, password_hash, company, timezone || 'UTC']
    );
    return { lastID: result.rows[0].id };
  }

  async updateUser(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
    return await this.run(query, [id, ...values]);
  }

  // Project-specific methods
  async createProject(projectData) {
    const fields = Object.keys(projectData);
    const placeholders = fields.map((_, index) => `?`).join(', ');
    const values = Object.values(projectData);
    
    const query = `INSERT INTO projects (${fields.join(', ')}) VALUES (${placeholders}) RETURNING id`;
    const result = await this.run(query, values);
    return { id: result.rows[0].id };
  }

  async getProjectById(id) {
    return await this.get('SELECT * FROM projects WHERE id = ?', [id]);
  }

  async getProjectsByUserId(userId) {
    return await this.all('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  async updateProject(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `UPDATE projects SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`;
    return await this.run(query, [id, ...values]);
  }

  async deleteProject(id) {
    return await this.run('DELETE FROM projects WHERE id = ?', [id]);
  }
}

export default new VercelDatabase();