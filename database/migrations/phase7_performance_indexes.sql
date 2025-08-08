-- Phase 7: Performance Optimization (Fixed)
-- Database indexes and query optimization - only for existing columns

-- ====================================
-- Core Table Indexes
-- ====================================

-- Users table indexes (only existing columns)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);

-- Projects table indexes (only existing columns)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at);

-- Bug Reports table indexes
CREATE INDEX IF NOT EXISTS idx_bugs_project ON bug_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bugs_severity ON bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bugs_created ON bug_reports(created_at);

-- Project Files indexes
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_language ON project_files(language);

-- AI Analyses indexes
CREATE INDEX IF NOT EXISTS idx_ai_analyses_project ON ai_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON ai_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created ON ai_analyses(created_at);

-- Debug Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_debug_sessions_project ON debug_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_creator ON debug_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_status ON debug_sessions(status);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_created ON debug_sessions(created_at);

-- Test Runs indexes
CREATE INDEX IF NOT EXISTS idx_test_runs_project ON test_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_created ON test_runs(created_at);

-- ====================================
-- Collaborative Features Indexes
-- ====================================

-- Collaborative Sessions indexes
CREATE INDEX IF NOT EXISTS idx_collab_session_status ON collaborative_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collab_session_creator ON collaborative_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_collab_session_project ON collaborative_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_collab_session_created ON collaborative_sessions(created_at);

-- Session Participants indexes
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_online ON session_participants(is_online);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_user ON session_participants(session_id, user_id);

-- Session Events indexes
CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_user ON session_events(user_id);
CREATE INDEX IF NOT EXISTS idx_session_events_type ON session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_timestamp ON session_events(timestamp);

-- Session Annotations indexes
CREATE INDEX IF NOT EXISTS idx_session_annotations_session ON session_annotations(session_id);
CREATE INDEX IF NOT EXISTS idx_session_annotations_file_line ON session_annotations(file_path, line_number);
CREATE INDEX IF NOT EXISTS idx_session_annotations_user ON session_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_session_annotations_resolved ON session_annotations(resolved);

-- Session Code Changes indexes
CREATE INDEX IF NOT EXISTS idx_session_code_changes_session ON session_code_changes(session_id);
CREATE INDEX IF NOT EXISTS idx_session_code_changes_file ON session_code_changes(file_path);
CREATE INDEX IF NOT EXISTS idx_session_code_changes_user ON session_code_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_session_code_changes_review ON session_code_changes(review_status);

-- Session Breakpoints indexes
CREATE INDEX IF NOT EXISTS idx_session_breakpoints_session ON session_breakpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_session_breakpoints_file ON session_breakpoints(file_path);
CREATE INDEX IF NOT EXISTS idx_session_breakpoints_active ON session_breakpoints(is_active);

-- ====================================
-- Enterprise Features Indexes (if tables exist)
-- ====================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_created ON organizations(created_at);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- Organization Members indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);

-- Audit Logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(event_type);

-- API Keys indexes
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_active ON user_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_created ON user_api_keys(created_at);

-- Analytics Events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_project ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);

-- Analytics Metrics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_project ON analytics_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_date ON analytics_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_name ON analytics_metrics(metric_name);

-- ====================================
-- Performance Analysis
-- ====================================

-- Analyze table statistics
ANALYZE;

-- Update schema version
INSERT OR IGNORE INTO schema_version (version, applied_at) 
VALUES ('phase7_performance_indexes_fixed_v1.0', CURRENT_TIMESTAMP);