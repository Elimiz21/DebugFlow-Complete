-- Phase 4.1: Bug Reports System Enhancements (Version 2)
-- Database schema extensions for world-class bug management
-- This migration is idempotent and safe to run multiple times

-- Bug attachments table for screenshots, logs, etc.
CREATE TABLE IF NOT EXISTS bug_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_report_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'image', 'log', 'document'
    file_size INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bug_report_id) REFERENCES bug_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Bug comments for collaboration
CREATE TABLE IF NOT EXISTS bug_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_report_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    comment_type TEXT DEFAULT 'comment', -- 'comment', 'status_change', 'fix_attempt'
    metadata TEXT, -- JSON for additional data like old/new status
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bug_report_id) REFERENCES bug_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bug labels for categorization
CREATE TABLE IF NOT EXISTS bug_labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL, -- hex color code
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for bug-label many-to-many relationship
CREATE TABLE IF NOT EXISTS bug_report_labels (
    bug_report_id INTEGER NOT NULL,
    label_id INTEGER NOT NULL,
    PRIMARY KEY (bug_report_id, label_id),
    FOREIGN KEY (bug_report_id) REFERENCES bug_reports(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES bug_labels(id) ON DELETE CASCADE
);

-- Create additional indexes for performance (only for existing tables)
CREATE INDEX IF NOT EXISTS idx_bug_attachments_bug_id ON bug_attachments(bug_report_id);
CREATE INDEX IF NOT EXISTS idx_bug_comments_bug_id ON bug_comments(bug_report_id);
CREATE INDEX IF NOT EXISTS idx_bug_comments_user_id ON bug_comments(user_id);

-- Insert default bug labels
INSERT OR IGNORE INTO bug_labels (name, color, description) VALUES
    ('bug', '#dc2626', 'Something isn''t working'),
    ('enhancement', '#16a34a', 'New feature or request'),
    ('documentation', '#0ea5e9', 'Improvements or additions to documentation'),
    ('security', '#dc2626', 'Security vulnerability'),
    ('performance', '#f59e0b', 'Performance improvement'),
    ('ui/ux', '#8b5cf6', 'User interface and experience'),
    ('api', '#06b6d4', 'API related issue'),
    ('database', '#db2777', 'Database related issue'),
    ('critical', '#dc2626', 'Critical issue requiring immediate attention'),
    ('easy-fix', '#16a34a', 'Good for beginners');

-- Update schema version tracking
INSERT OR IGNORE INTO schema_version (version) VALUES ('phase4_extensions_v2.0');