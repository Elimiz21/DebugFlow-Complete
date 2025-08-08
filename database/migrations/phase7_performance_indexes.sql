-- Phase 7: Performance Optimization
-- Database indexes and query optimization

-- ====================================
-- Core Table Indexes
-- ====================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_org_status ON projects(organization_id, status);

-- Bug Reports table indexes
CREATE INDEX IF NOT EXISTS idx_bugs_project ON bug_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bugs_severity ON bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bugs_assignee ON bug_reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_bugs_reporter ON bug_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_bugs_created ON bug_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_bugs_project_status ON bug_reports(project_id, status);
CREATE INDEX IF NOT EXISTS idx_bugs_assignee_status ON bug_reports(assigned_to, status);

-- Analysis Results table indexes
CREATE INDEX IF NOT EXISTS idx_analysis_project ON analysis_results(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_type ON analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_provider ON analysis_results(provider_id);
CREATE INDEX IF NOT EXISTS idx_analysis_created ON analysis_results(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_project_type ON analysis_results(project_id, analysis_type);

-- Debug Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_debug_project ON debug_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_debug_user ON debug_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_debug_status ON debug_sessions(status);
CREATE INDEX IF NOT EXISTS idx_debug_started ON debug_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_debug_user_status ON debug_sessions(user_id, status);

-- ====================================
-- Collaborative Features Indexes
-- ====================================

-- Collaborative Sessions indexes
CREATE INDEX IF NOT EXISTS idx_collab_session_status ON collaborative_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collab_session_owner ON collaborative_sessions(owner_id);
CREATE INDEX IF NOT EXISTS idx_collab_session_project ON collaborative_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_collab_session_created ON collaborative_sessions(created_at);

-- Session Participants indexes
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_status ON session_participants(status);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_user ON session_participants(session_id, user_id);

-- Session Activities indexes
CREATE INDEX IF NOT EXISTS idx_session_activities_session ON session_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_user ON session_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_session_activities_type ON session_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_session_activities_timestamp ON session_activities(timestamp);

-- ====================================
-- Enterprise Features Indexes
-- ====================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON organizations(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_organizations_deleted ON organizations(deleted_at);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_teams_deleted ON teams(deleted_at);

-- Organization Members indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_team ON organization_members(team_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);
CREATE INDEX IF NOT EXISTS idx_org_members_org_user ON organization_members(organization_id, user_id);

-- Project Permissions indexes
CREATE INDEX IF NOT EXISTS idx_project_permissions_project ON project_permissions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_permissions_user ON project_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_permissions_team ON project_permissions(team_id);
CREATE INDEX IF NOT EXISTS idx_project_permissions_project_user ON project_permissions(project_id, user_id);

-- Audit Logs indexes (critical for compliance queries)
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(event_severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_category ON audit_logs(organization_id, event_category);

-- API Keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires ON api_keys(expires_at);

-- Analytics Events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_org ON analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_project ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_org_created ON analytics_events(organization_id, created_at);

-- Analytics Metrics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_org ON analytics_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_date ON analytics_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_name ON analytics_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_project ON analytics_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_org_date ON analytics_metrics(organization_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_org_name_date ON analytics_metrics(organization_id, metric_name, metric_date);

-- ====================================
-- Full Text Search Indexes
-- ====================================

-- Enable FTS5 for full-text search if not already enabled
-- Note: SQLite needs to be compiled with FTS5 support

-- Create virtual tables for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS bugs_fts USING fts5(
    title,
    description,
    steps_to_reproduce,
    content=bug_reports,
    content_rowid=id
);

CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
    name,
    description,
    content=projects,
    content_rowid=id
);

-- Triggers to keep FTS tables in sync
CREATE TRIGGER IF NOT EXISTS bugs_fts_insert 
AFTER INSERT ON bug_reports BEGIN
    INSERT INTO bugs_fts(rowid, title, description, steps_to_reproduce)
    VALUES (new.id, new.title, new.description, new.steps_to_reproduce);
END;

CREATE TRIGGER IF NOT EXISTS bugs_fts_update 
AFTER UPDATE ON bug_reports BEGIN
    UPDATE bugs_fts 
    SET title = new.title,
        description = new.description,
        steps_to_reproduce = new.steps_to_reproduce
    WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS bugs_fts_delete 
AFTER DELETE ON bug_reports BEGIN
    DELETE FROM bugs_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS projects_fts_insert 
AFTER INSERT ON projects BEGIN
    INSERT INTO projects_fts(rowid, name, description)
    VALUES (new.id, new.name, new.description);
END;

CREATE TRIGGER IF NOT EXISTS projects_fts_update 
AFTER UPDATE ON projects BEGIN
    UPDATE projects_fts 
    SET name = new.name,
        description = new.description
    WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS projects_fts_delete 
AFTER DELETE ON projects BEGIN
    DELETE FROM projects_fts WHERE rowid = old.id;
END;

-- ====================================
-- Query Optimization Views
-- ====================================

-- Frequently accessed project statistics
CREATE VIEW IF NOT EXISTS project_stats AS
SELECT 
    p.id,
    p.name,
    p.organization_id,
    COUNT(DISTINCT br.id) as bug_count,
    COUNT(DISTINCT CASE WHEN br.status = 'open' THEN br.id END) as open_bugs,
    COUNT(DISTINCT CASE WHEN br.severity = 'critical' THEN br.id END) as critical_bugs,
    COUNT(DISTINCT ar.id) as analysis_count,
    MAX(ar.created_at) as last_analysis,
    COUNT(DISTINCT ds.id) as debug_sessions
FROM projects p
LEFT JOIN bug_reports br ON p.id = br.project_id
LEFT JOIN analysis_results ar ON p.id = ar.project_id
LEFT JOIN debug_sessions ds ON p.id = ds.project_id
WHERE p.deleted_at IS NULL
GROUP BY p.id;

-- User activity summary
CREATE VIEW IF NOT EXISTS user_activity_summary AS
SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(DISTINCT p.id) as projects_owned,
    COUNT(DISTINCT br.id) as bugs_reported,
    COUNT(DISTINCT ba.id) as bugs_assigned,
    COUNT(DISTINCT ds.id) as debug_sessions,
    MAX(u.last_login_at) as last_active
FROM users u
LEFT JOIN projects p ON u.id = p.owner_id
LEFT JOIN bug_reports br ON u.id = br.reported_by
LEFT JOIN bug_reports ba ON u.id = ba.assigned_to
LEFT JOIN debug_sessions ds ON u.id = ds.user_id
GROUP BY u.id;

-- Organization overview
CREATE VIEW IF NOT EXISTS organization_overview AS
SELECT 
    o.id,
    o.name,
    o.subscription_tier,
    COUNT(DISTINCT om.user_id) as member_count,
    COUNT(DISTINCT t.id) as team_count,
    COUNT(DISTINCT p.id) as project_count,
    SUM(CASE WHEN al.created_at > datetime('now', '-30 days') THEN 1 ELSE 0 END) as audit_logs_30d
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id AND om.status = 'active'
LEFT JOIN teams t ON o.id = t.organization_id AND t.deleted_at IS NULL
LEFT JOIN projects p ON o.id = p.organization_id AND p.deleted_at IS NULL
LEFT JOIN audit_logs al ON o.id = al.organization_id
WHERE o.deleted_at IS NULL
GROUP BY o.id;

-- ====================================
-- Performance Analysis Queries
-- ====================================

-- Analyze table statistics
ANALYZE;

-- Update schema version
INSERT OR IGNORE INTO schema_version (version, applied_at) 
VALUES ('phase7_performance_indexes_v1.0', CURRENT_TIMESTAMP);