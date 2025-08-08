// Teams Management API
// Handles team creation, management, and collaboration within organizations

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/database.js';
import { requireAuth, requireOrgRole, requirePermission } from './middleware/auth.js';
import { logAuditEvent } from './services/auditLogger.js';

const router = express.Router();

// Get all teams in organization
router.get('/organization/:orgId', requireAuth, requireOrgRole('viewer'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const teams = await db.all(
      `SELECT 
        t.*,
        COUNT(DISTINCT om.user_id) as member_count,
        COUNT(DISTINCT p.id) as project_count
       FROM teams t
       LEFT JOIN organization_members om ON t.id = om.team_id
       LEFT JOIN project_permissions pp ON t.id = pp.team_id
       LEFT JOIN projects p ON pp.project_id = p.id
       WHERE t.organization_id = ? AND t.deleted_at IS NULL
       GROUP BY t.id
       ORDER BY t.name`,
      [orgId]
    );
    
    // Parse JSON settings
    teams.forEach(team => {
      team.settings = JSON.parse(team.settings || '{}');
    });
    
    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get team details
router.get('/:teamId', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await db.get(
      `SELECT * FROM teams WHERE id = ? AND deleted_at IS NULL`,
      [teamId]
    );
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check user has access to this team's organization
    const membership = await db.get(
      `SELECT * FROM organization_members 
       WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
      [team.organization_id, req.user.id]
    );
    
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get team members
    const members = await db.all(
      `SELECT 
        u.id, u.username, u.email, u.full_name, u.avatar_url,
        om.role, om.joined_at, om.last_active_at
       FROM organization_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.team_id = ? AND om.status = 'active'
       ORDER BY om.joined_at`,
      [teamId]
    );
    
    // Get team projects
    const projects = await db.all(
      `SELECT 
        p.id, p.name, p.description, p.status,
        pp.role as team_role
       FROM project_permissions pp
       JOIN projects p ON pp.project_id = p.id
       WHERE pp.team_id = ? AND p.deleted_at IS NULL
       ORDER BY p.updated_at DESC`,
      [teamId]
    );
    
    team.settings = JSON.parse(team.settings || '{}');
    team.members = members;
    team.projects = projects;
    
    res.json(team);
  } catch (error) {
    console.error('Get team details error:', error);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// Create new team
router.post('/', requireAuth, requirePermission('teams.create'), async (req, res) => {
  try {
    const {
      organization_id,
      name,
      description,
      slug,
      max_members = 10,
      default_project_role = 'viewer',
      can_create_projects = true
    } = req.body;
    
    // Validate slug uniqueness within organization
    const existing = await db.get(
      `SELECT id FROM teams 
       WHERE organization_id = ? AND slug = ? AND deleted_at IS NULL`,
      [organization_id, slug]
    );
    
    if (existing) {
      return res.status(400).json({ error: 'Team slug already exists in organization' });
    }
    
    const teamId = uuidv4();
    const now = new Date().toISOString();
    
    // Create team
    await db.run(
      `INSERT INTO teams (
        id, organization_id, name, description, slug,
        settings, max_members, default_project_role, can_create_projects,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        teamId, organization_id, name, description, slug,
        JSON.stringify({}), max_members, default_project_role, can_create_projects,
        now, now
      ]
    );
    
    // Add creator as first team member if requested
    if (req.body.add_creator) {
      await db.run(
        `UPDATE organization_members 
         SET team_id = ?, updated_at = ?
         WHERE organization_id = ? AND user_id = ?`,
        [teamId, now, organization_id, req.user.id]
      );
    }
    
    // Log audit event
    await logAuditEvent({
      organization_id,
      user_id: req.user.id,
      event_type: 'team.create',
      event_category: 'admin',
      resource_type: 'team',
      resource_id: teamId,
      resource_name: name,
      event_data: { slug, max_members }
    });
    
    res.status(201).json({
      id: teamId,
      name,
      slug,
      message: 'Team created successfully'
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Update team settings
router.patch('/:teamId', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    
    // Get team to check organization
    const team = await db.get(
      `SELECT organization_id FROM teams WHERE id = ?`,
      [teamId]
    );
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check user has admin access to organization
    const membership = await db.get(
      `SELECT role FROM organization_members 
       WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
      [team.organization_id, req.user.id]
    );
    
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Build update query
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'name', 'description', 'max_members', 
      'default_project_role', 'can_create_projects'
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
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    fields.push('updated_at = ?');
    values.push(now);
    values.push(teamId);
    
    await db.run(
      `UPDATE teams SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    // Log audit event
    await logAuditEvent({
      organization_id: team.organization_id,
      user_id: req.user.id,
      event_type: 'team.update',
      event_category: 'admin',
      resource_type: 'team',
      resource_id: teamId,
      event_data: updates
    });
    
    res.json({ message: 'Team updated successfully' });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Add member to team
router.post('/:teamId/members', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { user_id } = req.body;
    const now = new Date().toISOString();
    
    // Get team details
    const team = await db.get(
      `SELECT * FROM teams WHERE id = ? AND deleted_at IS NULL`,
      [teamId]
    );
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check requester has permission
    const requesterMembership = await db.get(
      `SELECT role FROM organization_members 
       WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
      [team.organization_id, req.user.id]
    );
    
    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Check if user is in the organization
    const userMembership = await db.get(
      `SELECT * FROM organization_members 
       WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
      [team.organization_id, user_id]
    );
    
    if (!userMembership) {
      return res.status(400).json({ error: 'User is not a member of the organization' });
    }
    
    // Check team member limit
    const currentMemberCount = await db.get(
      `SELECT COUNT(*) as count FROM organization_members 
       WHERE team_id = ?`,
      [teamId]
    );
    
    if (currentMemberCount.count >= team.max_members) {
      return res.status(400).json({ 
        error: `Team has reached maximum member limit (${team.max_members})` 
      });
    }
    
    // Add user to team
    await db.run(
      `UPDATE organization_members 
       SET team_id = ?, updated_at = ?
       WHERE organization_id = ? AND user_id = ?`,
      [teamId, now, team.organization_id, user_id]
    );
    
    // Log audit event
    await logAuditEvent({
      organization_id: team.organization_id,
      user_id: req.user.id,
      event_type: 'team.member_add',
      event_category: 'admin',
      resource_type: 'team',
      resource_id: teamId,
      resource_name: team.name,
      event_data: { added_user_id: user_id }
    });
    
    res.json({ message: 'Member added to team successfully' });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ error: 'Failed to add member to team' });
  }
});

// Remove member from team
router.delete('/:teamId/members/:userId', requireAuth, async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const now = new Date().toISOString();
    
    // Get team details
    const team = await db.get(
      `SELECT * FROM teams WHERE id = ? AND deleted_at IS NULL`,
      [teamId]
    );
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check requester has permission
    const requesterMembership = await db.get(
      `SELECT role FROM organization_members 
       WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
      [team.organization_id, req.user.id]
    );
    
    if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
      // Allow users to remove themselves from team
      if (userId !== req.user.id.toString()) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    }
    
    // Remove user from team
    await db.run(
      `UPDATE organization_members 
       SET team_id = NULL, updated_at = ?
       WHERE organization_id = ? AND user_id = ? AND team_id = ?`,
      [now, team.organization_id, userId, teamId]
    );
    
    // Log audit event
    await logAuditEvent({
      organization_id: team.organization_id,
      user_id: req.user.id,
      event_type: 'team.member_remove',
      event_category: 'admin',
      resource_type: 'team',
      resource_id: teamId,
      resource_name: team.name,
      event_data: { removed_user_id: userId }
    });
    
    res.json({ message: 'Member removed from team successfully' });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({ error: 'Failed to remove member from team' });
  }
});

// Grant team access to project
router.post('/:teamId/projects/:projectId', requireAuth, async (req, res) => {
  try {
    const { teamId, projectId } = req.params;
    const { role = 'viewer', permissions = [] } = req.body;
    const now = new Date().toISOString();
    
    // Get team and project details
    const team = await db.get(
      `SELECT * FROM teams WHERE id = ? AND deleted_at IS NULL`,
      [teamId]
    );
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const project = await db.get(
      `SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL`,
      [projectId]
    );
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check requester has permission to grant access
    if (project.owner_id !== req.user.id) {
      const requesterMembership = await db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
        [team.organization_id, req.user.id]
      );
      
      if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }
    
    // Check if access already exists
    const existing = await db.get(
      `SELECT id FROM project_permissions 
       WHERE project_id = ? AND team_id = ?`,
      [projectId, teamId]
    );
    
    if (existing) {
      // Update existing permission
      await db.run(
        `UPDATE project_permissions 
         SET role = ?, permissions = ?, granted_by = ?, granted_at = ?
         WHERE project_id = ? AND team_id = ?`,
        [role, JSON.stringify(permissions), req.user.id, now, projectId, teamId]
      );
    } else {
      // Create new permission
      await db.run(
        `INSERT INTO project_permissions (
          project_id, team_id, role, permissions,
          can_share, can_delete, can_export,
          granted_by, granted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId, teamId, role, JSON.stringify(permissions),
          role === 'owner' || role === 'editor',
          role === 'owner',
          true,
          req.user.id, now
        ]
      );
    }
    
    // Log audit event
    await logAuditEvent({
      organization_id: team.organization_id,
      user_id: req.user.id,
      event_type: 'team.project_access_grant',
      event_category: 'admin',
      resource_type: 'project',
      resource_id: projectId,
      resource_name: project.name,
      event_data: { team_id: teamId, team_name: team.name, role }
    });
    
    res.json({ message: 'Project access granted to team' });
  } catch (error) {
    console.error('Grant team project access error:', error);
    res.status(500).json({ error: 'Failed to grant project access' });
  }
});

// Revoke team access to project
router.delete('/:teamId/projects/:projectId', requireAuth, async (req, res) => {
  try {
    const { teamId, projectId } = req.params;
    
    // Get project details
    const project = await db.get(
      `SELECT * FROM projects WHERE id = ?`,
      [projectId]
    );
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check requester has permission
    if (project.owner_id !== req.user.id) {
      const team = await db.get(
        `SELECT organization_id FROM teams WHERE id = ?`,
        [teamId]
      );
      
      const requesterMembership = await db.get(
        `SELECT role FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
        [team.organization_id, req.user.id]
      );
      
      if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }
    
    // Remove team access
    await db.run(
      `DELETE FROM project_permissions 
       WHERE project_id = ? AND team_id = ?`,
      [projectId, teamId]
    );
    
    // Log audit event
    const team = await db.get(
      `SELECT name, organization_id FROM teams WHERE id = ?`,
      [teamId]
    );
    
    await logAuditEvent({
      organization_id: team.organization_id,
      user_id: req.user.id,
      event_type: 'team.project_access_revoke',
      event_category: 'admin',
      resource_type: 'project',
      resource_id: projectId,
      resource_name: project.name,
      event_data: { team_id: teamId, team_name: team.name }
    });
    
    res.json({ message: 'Project access revoked from team' });
  } catch (error) {
    console.error('Revoke team project access error:', error);
    res.status(500).json({ error: 'Failed to revoke project access' });
  }
});

// Delete team (soft delete)
router.delete('/:teamId', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const now = new Date().toISOString();
    
    // Get team details
    const team = await db.get(
      `SELECT * FROM teams WHERE id = ? AND deleted_at IS NULL`,
      [teamId]
    );
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check requester has permission
    const requesterMembership = await db.get(
      `SELECT role FROM organization_members 
       WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
      [team.organization_id, req.user.id]
    );
    
    if (!requesterMembership || requesterMembership.role !== 'owner') {
      return res.status(403).json({ error: 'Only organization owner can delete teams' });
    }
    
    // Soft delete team
    await db.run(
      `UPDATE teams SET deleted_at = ? WHERE id = ?`,
      [now, teamId]
    );
    
    // Remove all team members
    await db.run(
      `UPDATE organization_members 
       SET team_id = NULL, updated_at = ?
       WHERE team_id = ?`,
      [now, teamId]
    );
    
    // Remove team project permissions
    await db.run(
      `DELETE FROM project_permissions WHERE team_id = ?`,
      [teamId]
    );
    
    // Log audit event
    await logAuditEvent({
      organization_id: team.organization_id,
      user_id: req.user.id,
      event_type: 'team.delete',
      event_category: 'admin',
      event_severity: 'warning',
      resource_type: 'team',
      resource_id: teamId,
      resource_name: team.name
    });
    
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

export default router;