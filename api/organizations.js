// Organizations Management API
// Handles organization creation, management, and settings

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../database/database.js';
import { requireAuth, requireOrgRole } from './middleware/auth.js';
import { logAuditEvent } from './services/auditLogger.js';

const router = express.Router();

// Get organization details
router.get('/:orgId', requireAuth, requireOrgRole('viewer'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const org = await db.get(
      `SELECT * FROM organizations WHERE id = ? AND deleted_at IS NULL`,
      [orgId]
    );
    
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Check user has access to this organization
    const membership = await db.get(
      `SELECT * FROM organization_members 
       WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
      [orgId, req.user.id]
    );
    
    if (!membership && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Parse JSON fields
    org.settings = JSON.parse(org.settings || '{}');
    org.features = JSON.parse(org.features || '[]');
    org.compliance_certifications = JSON.parse(org.compliance_certifications || '[]');
    
    res.json(org);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Create new organization
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      industry,
      size,
      website,
      subscription_tier = 'free'
    } = req.body;
    
    // Validate slug uniqueness
    const existing = await db.get(
      `SELECT id FROM organizations WHERE slug = ?`,
      [slug]
    );
    
    if (existing) {
      return res.status(400).json({ error: 'Organization slug already exists' });
    }
    
    const orgId = uuidv4();
    const now = new Date().toISOString();
    
    // Create organization
    await db.run(
      `INSERT INTO organizations (
        id, name, slug, description, industry, size, website,
        subscription_tier, subscription_status, max_users, max_projects,
        max_storage_gb, max_api_calls_per_month, settings, features,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, '{}', '[]', ?, ?)`,
      [
        orgId, name, slug, description, industry, size, website,
        subscription_tier,
        subscription_tier === 'enterprise' ? 1000 : subscription_tier === 'pro' ? 100 : 5,
        subscription_tier === 'enterprise' ? 1000 : subscription_tier === 'pro' ? 100 : 10,
        subscription_tier === 'enterprise' ? 1000 : subscription_tier === 'pro' ? 100 : 10,
        subscription_tier === 'enterprise' ? 1000000 : subscription_tier === 'pro' ? 100000 : 10000,
        now, now
      ]
    );
    
    // Add creator as owner
    await db.run(
      `INSERT INTO organization_members (
        organization_id, user_id, role, status, joined_at, updated_at
      ) VALUES (?, ?, 'owner', 'active', ?, ?)`,
      [orgId, req.user.id, now, now]
    );
    
    // Create default security policy
    await db.run(
      `INSERT INTO security_policies (
        organization_id, min_password_length, require_uppercase,
        require_lowercase, require_numbers, require_special_chars,
        password_expiry_days, session_timeout_minutes, max_concurrent_sessions,
        enforce_data_encryption, enforce_audit_logging, created_at, updated_at
      ) VALUES (?, 8, 1, 1, 1, 0, 90, 60, 5, 1, 1, ?, ?)`,
      [orgId, now, now]
    );
    
    // Log audit event
    await logAuditEvent({
      organization_id: orgId,
      user_id: req.user.id,
      event_type: 'organization.create',
      event_category: 'admin',
      resource_type: 'organization',
      resource_id: orgId,
      resource_name: name,
      event_data: { subscription_tier, size, industry }
    });
    
    res.status(201).json({
      id: orgId,
      name,
      slug,
      message: 'Organization created successfully'
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Update organization settings
router.patch('/:orgId', requireAuth, requireOrgRole('admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    
    // Build update query dynamically
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'name', 'description', 'logo_url', 'website', 'industry', 'size',
      'billing_email', 'data_retention_days', 'data_residency'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }
    
    if (updates.settings) {
      fields.push('settings = ?');
      values.push(JSON.stringify(updates.settings));
    }
    
    if (updates.features) {
      fields.push('features = ?');
      values.push(JSON.stringify(updates.features));
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(orgId);
    
    await db.run(
      `UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    // Log audit event
    await logAuditEvent({
      organization_id: orgId,
      user_id: req.user.id,
      event_type: 'organization.update',
      event_category: 'admin',
      resource_type: 'organization',
      resource_id: orgId,
      event_data: updates
    });
    
    res.json({ message: 'Organization updated successfully' });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Get organization members
router.get('/:orgId/members', requireAuth, requireOrgRole('viewer'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const members = await db.all(
      `SELECT 
        om.*, 
        u.username, 
        u.email, 
        u.full_name,
        u.avatar_url,
        t.name as team_name
       FROM organization_members om
       JOIN users u ON om.user_id = u.id
       LEFT JOIN teams t ON om.team_id = t.id
       WHERE om.organization_id = ?
       ORDER BY om.joined_at DESC`,
      [orgId]
    );
    
    // Parse permissions JSON
    members.forEach(member => {
      member.permissions = JSON.parse(member.permissions || '[]');
      member.projects_accessed = JSON.parse(member.projects_accessed || '[]');
    });
    
    res.json(members);
  } catch (error) {
    console.error('Get organization members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Invite member to organization
router.post('/:orgId/members/invite', requireAuth, requireOrgRole('admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { email, role = 'viewer', team_id } = req.body;
    const now = new Date().toISOString();
    
    // Check if user exists
    let user = await db.get(
      `SELECT id FROM users WHERE email = ?`,
      [email]
    );
    
    if (!user) {
      // Create pending user account
      const userId = Date.now();
      await db.run(
        `INSERT INTO users (id, email, username, created_at)
         VALUES (?, ?, ?, ?)`,
        [userId, email, email.split('@')[0], now]
      );
      user = { id: userId };
    }
    
    // Check if already a member
    const existing = await db.get(
      `SELECT id FROM organization_members 
       WHERE organization_id = ? AND user_id = ?`,
      [orgId, user.id]
    );
    
    if (existing) {
      return res.status(400).json({ error: 'User is already a member' });
    }
    
    // Generate invitation token
    const invitationToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Add as pending member
    await db.run(
      `INSERT INTO organization_members (
        organization_id, user_id, team_id, role, status,
        invited_by, invitation_token, invitation_expires_at,
        joined_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [orgId, user.id, team_id, role, req.user.id, invitationToken, expiresAt, now, now]
    );
    
    // Log audit event
    await logAuditEvent({
      organization_id: orgId,
      user_id: req.user.id,
      event_type: 'member.invite',
      event_category: 'admin',
      resource_type: 'user',
      resource_id: user.id,
      resource_name: email,
      event_data: { role, team_id }
    });
    
    res.json({
      message: 'Invitation sent successfully',
      invitation_token: invitationToken
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

// Update member role
router.patch('/:orgId/members/:userId', requireAuth, requireOrgRole('admin'), async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    const { role, team_id, permissions } = req.body;
    const now = new Date().toISOString();
    
    // Prevent demoting the last owner
    if (role !== 'owner') {
      const ownerCount = await db.get(
        `SELECT COUNT(*) as count FROM organization_members
         WHERE organization_id = ? AND role = 'owner' AND status = 'active'`,
        [orgId]
      );
      
      if (ownerCount.count === 1) {
        const currentMember = await db.get(
          `SELECT role FROM organization_members
           WHERE organization_id = ? AND user_id = ?`,
          [orgId, userId]
        );
        
        if (currentMember && currentMember.role === 'owner') {
          return res.status(400).json({ 
            error: 'Cannot demote the last owner. Assign another owner first.' 
          });
        }
      }
    }
    
    const updates = [];
    const values = [];
    
    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    
    if (team_id !== undefined) {
      updates.push('team_id = ?');
      values.push(team_id);
    }
    
    if (permissions) {
      updates.push('permissions = ?');
      values.push(JSON.stringify(permissions));
    }
    
    updates.push('updated_at = ?');
    values.push(now);
    values.push(orgId);
    values.push(userId);
    
    await db.run(
      `UPDATE organization_members 
       SET ${updates.join(', ')}
       WHERE organization_id = ? AND user_id = ?`,
      values
    );
    
    // Log audit event
    await logAuditEvent({
      organization_id: orgId,
      user_id: req.user.id,
      event_type: 'member.role_update',
      event_category: 'admin',
      resource_type: 'user',
      resource_id: userId,
      event_data: { role, team_id, permissions }
    });
    
    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// Remove member from organization
router.delete('/:orgId/members/:userId', requireAuth, requireOrgRole('admin'), async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    
    // Prevent removing the last owner
    const member = await db.get(
      `SELECT role FROM organization_members
       WHERE organization_id = ? AND user_id = ?`,
      [orgId, userId]
    );
    
    if (member && member.role === 'owner') {
      const ownerCount = await db.get(
        `SELECT COUNT(*) as count FROM organization_members
         WHERE organization_id = ? AND role = 'owner' AND status = 'active'`,
        [orgId]
      );
      
      if (ownerCount.count === 1) {
        return res.status(400).json({ 
          error: 'Cannot remove the last owner' 
        });
      }
    }
    
    await db.run(
      `DELETE FROM organization_members 
       WHERE organization_id = ? AND user_id = ?`,
      [orgId, userId]
    );
    
    // Remove from all project permissions
    await db.run(
      `DELETE FROM project_permissions 
       WHERE user_id = ? AND project_id IN (
         SELECT id FROM projects WHERE organization_id = ?
       )`,
      [userId, orgId]
    );
    
    // Log audit event
    await logAuditEvent({
      organization_id: orgId,
      user_id: req.user.id,
      event_type: 'member.remove',
      event_category: 'admin',
      resource_type: 'user',
      resource_id: userId,
      event_data: { role: member.role }
    });
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Get organization audit logs
router.get('/:orgId/audit-logs', requireAuth, requireOrgRole('admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const { 
      start_date, 
      end_date, 
      event_category, 
      user_id,
      limit = 100,
      offset = 0 
    } = req.query;
    
    let query = `
      SELECT 
        al.*,
        u.username,
        u.email
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.organization_id = ?
    `;
    const params = [orgId];
    
    if (start_date) {
      query += ' AND al.created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND al.created_at <= ?';
      params.push(end_date);
    }
    
    if (event_category) {
      query += ' AND al.event_category = ?';
      params.push(event_category);
    }
    
    if (user_id) {
      query += ' AND al.user_id = ?';
      params.push(user_id);
    }
    
    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const logs = await db.all(query, params);
    
    // Parse JSON fields
    logs.forEach(log => {
      log.event_data = JSON.parse(log.event_data || '{}');
      log.compliance_tags = JSON.parse(log.compliance_tags || '[]');
    });
    
    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;