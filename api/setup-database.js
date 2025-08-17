import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting database setup...');
    
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        company TEXT,
        timezone TEXT DEFAULT 'UTC',
        is_verified BOOLEAN DEFAULT FALSE,
        role TEXT DEFAULT 'user',
        organization_id INTEGER DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create projects table
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        language TEXT,
        status TEXT DEFAULT 'analyzing',
        codebase_url TEXT,
        deployment_url TEXT,
        bugs_found INTEGER DEFAULT 0,
        bugs_fixed INTEGER DEFAULT 0,
        file_count INTEGER DEFAULT 0,
        size_bytes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // Create project_files table
    await sql`
      CREATE TABLE IF NOT EXISTS project_files (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        content TEXT,
        size_bytes INTEGER,
        language TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `;

    // Create bug_reports table
    await sql`
      CREATE TABLE IF NOT EXISTS bug_reports (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        severity TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'open',
        file_path TEXT,
        line_number INTEGER,
        suggested_fix TEXT,
        ai_analysis TEXT,
        ai_confidence_score FLOAT DEFAULT 0.0,
        estimated_fix_time INTEGER DEFAULT 0,
        duplicate_of INTEGER,
        category TEXT DEFAULT 'general',
        priority TEXT DEFAULT 'normal',
        assignee_id INTEGER,
        reporter_id INTEGER NOT NULL DEFAULT 0,
        fix_verification TEXT,
        tags TEXT DEFAULT '[]',
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `;

    // Create ai_analyses table
    await sql`
      CREATE TABLE IF NOT EXISTS ai_analyses (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        bug_report_id INTEGER,
        provider TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        input_data TEXT NOT NULL,
        result TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        cost_usd DECIMAL(10, 4) DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (bug_report_id) REFERENCES bug_reports(id) ON DELETE CASCADE
      )
    `;

    // Create user_api_keys table
    await sql`
      CREATE TABLE IF NOT EXISTS user_api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        service TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, service)
      )
    `;

    // Create user_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // Create debug_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS debug_sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        creator_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        participants TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;

    // Create test_runs table
    await sql`
      CREATE TABLE IF NOT EXISTS test_runs (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        framework TEXT NOT NULL,
        status TEXT DEFAULT 'running',
        total_tests INTEGER DEFAULT 0,
        passed_tests INTEGER DEFAULT 0,
        failed_tests INTEGER DEFAULT 0,
        coverage_percent DECIMAL(5, 2),
        duration_ms INTEGER DEFAULT 0,
        output TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `;

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bug_reports_project_id ON bug_reports(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;

    // Create a demo admin user
    const adminPassword = 'admin123456';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    
    // Check if admin exists
    const existingAdmin = await sql`
      SELECT id FROM users WHERE email = 'admin@debugflow.com'
    `;

    if (existingAdmin.rows.length === 0) {
      await sql`
        INSERT INTO users (email, name, password_hash, role, is_verified)
        VALUES ('admin@debugflow.com', 'Admin User', ${adminHash}, 'admin', true)
      `;
      console.log('Admin user created');
    }

    // Return success with nice HTML page
    const successHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Database Setup Complete</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            text-align: center;
          }
          h1 {
            color: #2d3748;
            margin-bottom: 1rem;
          }
          .success {
            color: #48bb78;
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          .info {
            background: #f7fafc;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1.5rem 0;
            text-align: left;
          }
          .info h3 {
            margin-top: 0;
            color: #4a5568;
          }
          .info p {
            margin: 0.5rem 0;
            color: #718096;
          }
          .info code {
            background: #edf2f7;
            padding: 2px 6px;
            border-radius: 4px;
            color: #e53e3e;
          }
          a {
            display: inline-block;
            margin-top: 1.5rem;
            padding: 0.75rem 2rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            transition: all 0.3s;
          }
          a:hover {
            background: #5a67d8;
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅</div>
          <h1>Database Setup Complete!</h1>
          <p>Your Vercel Postgres database has been initialized successfully.</p>
          
          <div class="info">
            <h3>Admin Account Created:</h3>
            <p>Email: <code>admin@debugflow.com</code></p>
            <p>Password: <code>admin123456</code></p>
          </div>
          
          <div class="info">
            <h3>Next Steps:</h3>
            <p>1. Go to the registration page</p>
            <p>2. Create your personal account</p>
            <p>3. Start using DebugFlow!</p>
          </div>
          
          <a href="/register">Create Your Account →</a>
        </div>
      </body>
      </html>
    `;

    res.status(200).setHeader('Content-Type', 'text/html').send(successHTML);

  } catch (error) {
    console.error('Database setup error:', error);
    
    // Check if it's a connection error
    if (error.message && error.message.includes('POSTGRES_URL')) {
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'Please add Vercel Postgres to your project first.',
        instructions: 'Go to Vercel Dashboard → Storage → Create Database → Choose Postgres'
      });
    }
    
    return res.status(500).json({ 
      error: 'Setup failed', 
      details: error.message 
    });
  }
}