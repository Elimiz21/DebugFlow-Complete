-- DebugFlow Database Schema
-- SQLite Database for Development

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    company TEXT,
    timezone TEXT DEFAULT 'UTC',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'web-app', 'api', 'script', 'library'
    language TEXT,
    status TEXT DEFAULT 'analyzing', -- 'analyzing', 'completed', 'failed', 'in-progress'
    codebase_url TEXT,
    deployment_url TEXT,
    bugs_found INTEGER DEFAULT 0,
    bugs_fixed INTEGER DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    size_bytes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Project files table
CREATE TABLE IF NOT EXISTS project_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    content TEXT,
    size_bytes INTEGER,
    language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Enhanced Bug reports table (Phase 4.1)
CREATE TABLE IF NOT EXISTS bug_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'open', -- 'open', 'in-progress', 'resolved', 'closed'
    file_path TEXT,
    line_number INTEGER,
    suggested_fix TEXT,
    ai_analysis TEXT,
    -- Phase 4.1 enhancements
    ai_confidence_score FLOAT DEFAULT 0.0,
    estimated_fix_time INTEGER DEFAULT 0, -- in minutes
    duplicate_of INTEGER,
    category TEXT DEFAULT 'general', -- 'security', 'performance', 'logic', 'ui', 'api', 'general'
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    assignee_id INTEGER,
    reporter_id INTEGER NOT NULL DEFAULT 0,
    fix_verification TEXT, -- 'pending', 'verified', 'failed'
    tags TEXT DEFAULT '[]', -- JSON array of tags
    resolution_notes TEXT,
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Foreign keys
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (duplicate_of) REFERENCES bug_reports(id),
    FOREIGN KEY (assignee_id) REFERENCES users(id),
    FOREIGN KEY (reporter_id) REFERENCES users(id)
);

-- AI analysis results table
CREATE TABLE IF NOT EXISTS ai_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    bug_report_id INTEGER,
    provider TEXT NOT NULL, -- 'openai', 'claude', 'gemini'
    analysis_type TEXT NOT NULL, -- 'bug-detection', 'code-review', 'fix-suggestion'
    input_data TEXT NOT NULL, -- JSON string of input data
    result TEXT NOT NULL, -- JSON string of analysis result
    tokens_used INTEGER DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (bug_report_id) REFERENCES bug_reports(id) ON DELETE CASCADE
);

-- User API keys (encrypted)
CREATE TABLE IF NOT EXISTS user_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service TEXT NOT NULL, -- 'openai', 'claude', 'gemini', 'github', 'gitlab'
    key_hash TEXT NOT NULL, -- Encrypted API key
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, service)
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Debug sessions (for real-time debugging)
CREATE TABLE IF NOT EXISTS debug_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    creator_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'ended'
    participants TEXT, -- JSON array of user IDs
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Test runs
CREATE TABLE IF NOT EXISTS test_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    framework TEXT NOT NULL, -- 'jest', 'mocha', 'pytest', etc.
    status TEXT DEFAULT 'running', -- 'running', 'passed', 'failed', 'error'
    total_tests INTEGER DEFAULT 0,
    passed_tests INTEGER DEFAULT 0,
    failed_tests INTEGER DEFAULT 0,
    coverage_percent DECIMAL(5, 2),
    duration_ms INTEGER DEFAULT 0,
    output TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_project_id ON bug_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
-- Phase 4.1 enhanced bug report indexes
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_category ON bug_reports(category);
CREATE INDEX IF NOT EXISTS idx_bug_reports_priority ON bug_reports(priority);
CREATE INDEX IF NOT EXISTS idx_bug_reports_assignee ON bug_reports(assignee_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter ON bug_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_ai_score ON bug_reports(ai_confidence_score);
-- Other indexes
CREATE INDEX IF NOT EXISTS idx_ai_analyses_project_id ON ai_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_project_id ON debug_sessions(project_id);

-- Schema version tracking for migrations
CREATE TABLE IF NOT EXISTS schema_version (
    version TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);