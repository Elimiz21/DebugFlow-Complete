-- Add missing role column to users table
-- This migration fixes the database schema to include the role column needed by admin panel

-- Only add role column if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we'll handle this in the migration code

-- These statements may fail if columns already exist, which is acceptable
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN organization_id INTEGER DEFAULT NULL;

-- Add foreign key constraint if organizations table exists
-- Note: This will only work if organizations table already exists
-- FOREIGN KEY (organization_id) REFERENCES organizations(id)

-- Update existing users to have 'user' role by default
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);