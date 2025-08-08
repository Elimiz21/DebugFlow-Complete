-- Phase 5.1: Real-Time Collaborative Debugging Features
-- Database schema for advanced collaboration and real-time debugging

-- Collaborative session state management
CREATE TABLE IF NOT EXISTS collaborative_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    session_type TEXT DEFAULT 'debugging', -- 'debugging', 'code-review', 'analysis'
    title TEXT NOT NULL,
    description TEXT,
    creator_id INTEGER NOT NULL,
    participants TEXT, -- JSON array of participant objects with roles
    active_file TEXT, -- Currently focused file path
    session_state TEXT, -- JSON: cursors, selections, annotations, breakpoints
    session_config TEXT, -- JSON: permissions, settings, editor config
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'ended'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id)
);

-- Real-time session events for playback and debugging
CREATE TABLE IF NOT EXISTS session_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL, -- 'cursor_move', 'selection', 'annotation', 'breakpoint', 'code_change', 'file_switch'
    event_data TEXT NOT NULL, -- JSON payload with event details
    file_path TEXT, -- File associated with event
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    sequence_number INTEGER, -- For ordering events properly
    FOREIGN KEY (session_id) REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Session annotations and collaborative comments
CREATE TABLE IF NOT EXISTS session_annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    column_number INTEGER DEFAULT 0,
    annotation_type TEXT DEFAULT 'comment', -- 'comment', 'bug_marker', 'suggestion', 'question', 'fix_proposal'
    content TEXT NOT NULL,
    metadata TEXT, -- JSON: styling, severity, code_snippet, etc.
    parent_id INTEGER, -- For threaded discussions
    resolved BOOLEAN DEFAULT FALSE,
    upvotes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by INTEGER,
    FOREIGN KEY (session_id) REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES session_annotations(id)
);

-- Session participant activity and permissions
CREATE TABLE IF NOT EXISTS session_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'participant', -- 'owner', 'moderator', 'participant', 'observer'
    permissions TEXT, -- JSON array of permissions
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_online BOOLEAN DEFAULT TRUE,
    cursor_position TEXT, -- JSON: file, line, column
    current_selection TEXT, -- JSON: selection range
    FOREIGN KEY (session_id) REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(session_id, user_id)
);

-- Collaborative code changes tracking
CREATE TABLE IF NOT EXISTS session_code_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    change_type TEXT NOT NULL, -- 'insert', 'delete', 'replace'
    line_start INTEGER NOT NULL,
    line_end INTEGER NOT NULL,
    content_before TEXT,
    content_after TEXT,
    change_metadata TEXT, -- JSON: diff info, context
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    applied BOOLEAN DEFAULT FALSE,
    reviewed_by INTEGER,
    review_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    FOREIGN KEY (session_id) REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Session breakpoints for collaborative debugging
CREATE TABLE IF NOT EXISTS session_breakpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    line_number INTEGER NOT NULL,
    breakpoint_type TEXT DEFAULT 'line', -- 'line', 'conditional', 'exception'
    condition_expression TEXT, -- For conditional breakpoints
    is_active BOOLEAN DEFAULT TRUE,
    hit_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_hit_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(session_id, file_path, line_number)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_project ON collaborative_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_creator ON collaborative_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_status ON collaborative_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_events_session_id ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_timestamp ON session_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_session_events_user_id ON session_events(user_id);
CREATE INDEX IF NOT EXISTS idx_session_annotations_session_id ON session_annotations(session_id);
CREATE INDEX IF NOT EXISTS idx_session_annotations_file_line ON session_annotations(file_path, line_number);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_code_changes_session_file ON session_code_changes(session_id, file_path);
CREATE INDEX IF NOT EXISTS idx_session_breakpoints_session_file ON session_breakpoints(session_id, file_path);

-- Insert schema version
INSERT OR IGNORE INTO schema_version (version) VALUES ('phase5_collaborative_features_v1.0');