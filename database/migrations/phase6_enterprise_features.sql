-- Phase 6: Enterprise & Scalability Features
-- Database schema for enterprise security, team management, and analytics

-- Organizations (companies/workspaces)
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    industry TEXT,
    size TEXT, -- 'small', 'medium', 'large', 'enterprise'
    
    -- Subscription & Billing
    subscription_tier TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise', 'custom'
    subscription_status TEXT DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
    billing_email TEXT,
    stripe_customer_id TEXT,
    subscription_expires_at DATETIME,
    
    -- Limits & Quotas
    max_users INTEGER DEFAULT 5,
    max_projects INTEGER DEFAULT 10,
    max_storage_gb INTEGER DEFAULT 10,
    max_api_calls_per_month INTEGER DEFAULT 10000,
    
    -- Settings
    settings TEXT, -- JSON: security settings, features, etc.
    features TEXT, -- JSON: enabled features list
    
    -- Compliance
    compliance_certifications TEXT, -- JSON: ['SOC2', 'GDPR', 'HIPAA']
    data_retention_days INTEGER DEFAULT 90,
    data_residency TEXT, -- Geographic location requirement
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME -- Soft delete
);

-- Teams within organizations
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL,
    
    -- Team settings
    settings TEXT, -- JSON: team-specific settings
    max_members INTEGER DEFAULT 10,
    
    -- Access control
    default_project_role TEXT DEFAULT 'viewer', -- Default role for team projects
    can_create_projects BOOLEAN DEFAULT TRUE,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME, -- Soft delete
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, slug)
);

-- Organization/Team members with roles
CREATE TABLE IF NOT EXISTS organization_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    team_id TEXT, -- Optional team assignment
    
    -- Roles & Permissions
    role TEXT NOT NULL, -- 'owner', 'admin', 'developer', 'viewer'
    permissions TEXT, -- JSON: specific permission overrides
    
    -- Status
    status TEXT DEFAULT 'active', -- 'pending', 'active', 'suspended'
    invited_by INTEGER,
    invitation_token TEXT,
    invitation_expires_at DATETIME,
    
    -- Activity tracking
    last_active_at DATETIME,
    projects_accessed TEXT, -- JSON: list of recently accessed projects
    
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    UNIQUE(organization_id, user_id)
);

-- Enhanced role-based access control
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Permissions as JSON array
    permissions TEXT NOT NULL, -- JSON: ['projects.create', 'projects.delete', etc.]
    
    -- System roles can't be modified
    is_system BOOLEAN DEFAULT FALSE,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, name)
);

-- Project access control
CREATE TABLE IF NOT EXISTS project_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    
    -- Can be user or team
    user_id INTEGER,
    team_id TEXT,
    
    -- Access level
    role TEXT NOT NULL, -- 'owner', 'editor', 'viewer'
    permissions TEXT, -- JSON: specific permission overrides
    
    -- Sharing settings
    can_share BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_export BOOLEAN DEFAULT TRUE,
    
    granted_by INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME, -- Optional expiration
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id),
    
    -- Ensure unique permissions per entity
    UNIQUE(project_id, user_id),
    UNIQUE(project_id, team_id)
);

-- Audit logs for compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT,
    user_id INTEGER NOT NULL,
    
    -- Event details
    event_type TEXT NOT NULL, -- 'auth.login', 'project.create', 'data.export', etc.
    event_category TEXT NOT NULL, -- 'authentication', 'data', 'admin', 'security'
    event_severity TEXT DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'
    
    -- Resource affected
    resource_type TEXT, -- 'project', 'user', 'team', 'organization'
    resource_id TEXT,
    resource_name TEXT,
    
    -- Event data
    event_data TEXT, -- JSON: detailed event information
    ip_address TEXT,
    user_agent TEXT,
    
    -- Compliance fields
    data_classification TEXT, -- 'public', 'internal', 'confidential', 'restricted'
    compliance_tags TEXT, -- JSON: ['GDPR', 'HIPAA', etc.]
    
    -- Status
    status TEXT DEFAULT 'success', -- 'success', 'failed', 'partial'
    error_message TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- API keys for programmatic access
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL, -- Hashed API key
    key_prefix TEXT NOT NULL, -- First 8 chars for identification
    
    -- Permissions & Scopes
    scopes TEXT NOT NULL, -- JSON: ['read:projects', 'write:bugs', etc.]
    
    -- Rate limiting
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    
    -- Usage tracking
    last_used_at DATETIME,
    usage_count INTEGER DEFAULT 0,
    
    -- Security
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    allowed_ips TEXT, -- JSON: IP whitelist
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME,
    revoked_by INTEGER,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (revoked_by) REFERENCES users(id)
);

-- Two-factor authentication
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    
    -- Method
    method TEXT NOT NULL, -- 'totp', 'sms', 'email', 'backup_codes'
    
    -- TOTP specific
    secret TEXT, -- Encrypted TOTP secret
    
    -- Backup codes
    backup_codes TEXT, -- JSON: encrypted backup codes
    
    -- Status
    is_enabled BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Verification
    verified_at DATETIME,
    last_used_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, method)
);

-- Security policies
CREATE TABLE IF NOT EXISTS security_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    
    -- Password policies
    min_password_length INTEGER DEFAULT 8,
    require_uppercase BOOLEAN DEFAULT TRUE,
    require_lowercase BOOLEAN DEFAULT TRUE,
    require_numbers BOOLEAN DEFAULT TRUE,
    require_special_chars BOOLEAN DEFAULT FALSE,
    password_expiry_days INTEGER DEFAULT 90,
    password_history_count INTEGER DEFAULT 5,
    
    -- Session policies
    session_timeout_minutes INTEGER DEFAULT 60,
    max_concurrent_sessions INTEGER DEFAULT 5,
    
    -- Authentication policies
    require_2fa BOOLEAN DEFAULT FALSE,
    allowed_2fa_methods TEXT, -- JSON: ['totp', 'sms']
    
    -- IP restrictions
    allowed_ip_ranges TEXT, -- JSON: IP whitelist
    blocked_ip_ranges TEXT, -- JSON: IP blacklist
    
    -- Data policies
    enforce_data_encryption BOOLEAN DEFAULT TRUE,
    enforce_audit_logging BOOLEAN DEFAULT TRUE,
    data_export_requires_approval BOOLEAN DEFAULT FALSE,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id)
);

-- Analytics and metrics tracking
CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT,
    user_id INTEGER,
    project_id TEXT,
    
    -- Event details
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL,
    event_properties TEXT, -- JSON: custom properties
    
    -- Metrics
    numeric_value REAL, -- For quantitative metrics
    duration_ms INTEGER, -- For performance metrics
    
    -- Context
    session_id TEXT,
    page_url TEXT,
    referrer TEXT,
    
    -- Technical details
    browser TEXT,
    os TEXT,
    device_type TEXT,
    screen_resolution TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Aggregated metrics for dashboards
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT NOT NULL,
    
    -- Time period
    metric_date DATE NOT NULL,
    metric_hour INTEGER, -- 0-23, NULL for daily metrics
    
    -- Metric details
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_count INTEGER DEFAULT 1,
    
    -- Dimensions
    project_id TEXT,
    user_id INTEGER,
    team_id TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    
    UNIQUE(organization_id, metric_date, metric_hour, metric_name, project_id, user_id, team_id)
);

-- Compliance reports
CREATE TABLE IF NOT EXISTS compliance_reports (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    
    report_type TEXT NOT NULL, -- 'audit', 'gdpr', 'soc2', 'security'
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    
    -- Report data
    report_data TEXT NOT NULL, -- JSON: detailed report content
    summary TEXT,
    
    -- Status
    status TEXT DEFAULT 'draft', -- 'draft', 'final', 'submitted'
    
    -- Metadata
    generated_by INTEGER NOT NULL,
    reviewed_by INTEGER,
    approved_by INTEGER,
    
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    approved_at DATETIME,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_permissions_project ON project_permissions(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_org ON analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_org_date ON analytics_metrics(organization_id, metric_date);

-- Insert default system roles
INSERT OR IGNORE INTO roles (name, description, permissions, is_system) VALUES
    ('owner', 'Full organization access', '["*"]', TRUE),
    ('admin', 'Administrative access', '["users.*", "projects.*", "teams.*", "settings.*"]', TRUE),
    ('developer', 'Development access', '["projects.read", "projects.write", "bugs.*", "analysis.*"]', TRUE),
    ('viewer', 'Read-only access', '["projects.read", "bugs.read", "analysis.read"]', TRUE);

-- Insert schema version
INSERT OR IGNORE INTO schema_version (version) VALUES ('phase6_enterprise_features_v1.0');