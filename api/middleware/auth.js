// Authentication and Authorization Middleware
// Handles JWT validation, role checking, and permission verification

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../../database/database.js';
import { logAuthEvent, logSecurityEvent } from '../services/auditLogger.js';

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT token
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      await logAuthEvent(null, 'access_denied', false, {
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        reason: 'No authorization header'
      });
      return res.status(401).json({ error: 'Authorization required' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from database
      const user = await db.get(
        `SELECT * FROM users WHERE id = ?`,
        [decoded.userId]
      );
      
      if (!user) {
        await logAuthEvent(decoded.userId, 'invalid_user', false, {
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
        return res.status(401).json({ error: 'Invalid user' });
      }
      
      // Check if user is active
      if (user.status !== 'active') {
        await logAuthEvent(user.id, 'inactive_user', false, {
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          status: user.status
        });
        return res.status(403).json({ error: 'Account is not active' });
      }
      
      // Attach user to request
      req.user = user;
      req.token = decoded;
      
      // Update last activity
      await db.run(
        `UPDATE users SET last_login_at = ? WHERE id = ?`,
        [new Date().toISOString(), user.id]
      );
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        await logAuthEvent(null, 'token_expired', false, {
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
        return res.status(401).json({ error: 'Token expired' });
      }
      
      await logAuthEvent(null, 'invalid_token', false, {
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        error: error.message
      });
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Check organization role
const requireOrgRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const orgId = req.params.orgId || req.body.organization_id;
      
      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }
      
      // Get user's role in organization
      const membership = await db.get(
        `SELECT role, permissions FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
        [orgId, req.user.id]
      );
      
      if (!membership) {
        await logSecurityEvent(
          req.user.id,
          orgId,
          'unauthorized_access',
          'warning',
          { required_role: requiredRole }
        );
        return res.status(403).json({ error: 'Not a member of this organization' });
      }
      
      // Check role hierarchy
      const roleHierarchy = {
        owner: 4,
        admin: 3,
        developer: 2,
        viewer: 1
      };
      
      const userRoleLevel = roleHierarchy[membership.role] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
      
      if (userRoleLevel < requiredRoleLevel) {
        await logSecurityEvent(
          req.user.id,
          orgId,
          'insufficient_permissions',
          'warning',
          { 
            user_role: membership.role,
            required_role: requiredRole
          }
        );
        return res.status(403).json({ 
          error: `Insufficient permissions. Required role: ${requiredRole}` 
        });
      }
      
      // Attach membership to request
      req.membership = membership;
      req.organizationId = orgId;
      
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

// Check specific permission
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const orgId = req.organizationId || req.params.orgId;
      
      if (!orgId) {
        return res.status(400).json({ error: 'Organization context required' });
      }
      
      // Get user's permissions
      const membership = req.membership || await db.get(
        `SELECT role, permissions FROM organization_members 
         WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
        [orgId, req.user.id]
      );
      
      if (!membership) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      
      // Owner has all permissions
      if (membership.role === 'owner') {
        return next();
      }
      
      // Check role-based permissions
      const rolePermissions = await db.get(
        `SELECT permissions FROM roles 
         WHERE organization_id = ? AND name = ?`,
        [orgId, membership.role]
      );
      
      const permissions = [
        ...JSON.parse(rolePermissions?.permissions || '[]'),
        ...JSON.parse(membership.permissions || '[]')
      ];
      
      // Check if user has the required permission or a wildcard
      const hasPermission = permissions.some(p => {
        if (p === '*') return true;
        if (p === permission) return true;
        
        // Check wildcard permissions (e.g., 'projects.*' matches 'projects.create')
        const permParts = permission.split('.');
        const userPermParts = p.split('.');
        
        if (userPermParts[userPermParts.length - 1] === '*') {
          const prefix = userPermParts.slice(0, -1).join('.');
          return permission.startsWith(prefix + '.');
        }
        
        return false;
      });
      
      if (!hasPermission) {
        await logSecurityEvent(
          req.user.id,
          orgId,
          'permission_denied',
          'warning',
          { required_permission: permission }
        );
        return res.status(403).json({ 
          error: `Permission denied: ${permission}` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

// Check project access
const requireProjectAccess = (requiredRole = 'viewer') => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.body.project_id;
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID required' });
      }
      
      // Get project and check organization
      const project = await db.get(
        `SELECT organization_id, owner_id FROM projects WHERE id = ?`,
        [projectId]
      );
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Check if user is project owner
      if (project.owner_id === req.user.id) {
        req.projectRole = 'owner';
        return next();
      }
      
      // Check project-specific permissions
      const projectPerm = await db.get(
        `SELECT role, permissions FROM project_permissions 
         WHERE project_id = ? AND user_id = ?`,
        [projectId, req.user.id]
      );
      
      if (projectPerm) {
        const roleHierarchy = {
          owner: 3,
          editor: 2,
          viewer: 1
        };
        
        const userRoleLevel = roleHierarchy[projectPerm.role] || 0;
        const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
        
        if (userRoleLevel >= requiredRoleLevel) {
          req.projectRole = projectPerm.role;
          return next();
        }
      }
      
      // Check organization membership
      if (project.organization_id) {
        const membership = await db.get(
          `SELECT role FROM organization_members 
           WHERE organization_id = ? AND user_id = ? AND status = 'active'`,
          [project.organization_id, req.user.id]
        );
        
        if (membership) {
          // Organization members have at least viewer access
          const orgRoleAccess = {
            owner: 'owner',
            admin: 'editor',
            developer: 'editor',
            viewer: 'viewer'
          };
          
          req.projectRole = orgRoleAccess[membership.role] || 'viewer';
          
          const roleHierarchy = {
            owner: 3,
            editor: 2,
            viewer: 1
          };
          
          const userRoleLevel = roleHierarchy[req.projectRole] || 0;
          const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
          
          if (userRoleLevel >= requiredRoleLevel) {
            return next();
          }
        }
      }
      
      await logSecurityEvent(
        req.user.id,
        project.organization_id,
        'project_access_denied',
        'warning',
        { 
          project_id: projectId,
          required_role: requiredRole
        }
      );
      
      return res.status(403).json({ error: 'Access denied to project' });
    } catch (error) {
      console.error('Project access check error:', error);
      res.status(500).json({ error: 'Authorization failed' });
    }
  };
};

// Verify API key
const requireAPIKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    // Hash the API key to compare with stored hash
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Get API key details
    const apiKeyData = await db.get(
      `SELECT * FROM api_keys 
       WHERE key_hash = ? AND is_active = 1`,
      [keyHash]
    );
    
    if (!apiKeyData) {
      await logAuthEvent(null, 'invalid_api_key', false, {
        ip_address: req.ip,
        key_prefix: apiKey.substring(0, 8)
      });
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Check expiration
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      await logAuthEvent(apiKeyData.user_id, 'expired_api_key', false, {
        ip_address: req.ip,
        api_key_id: apiKeyData.id
      });
      return res.status(401).json({ error: 'API key expired' });
    }
    
    // Check IP whitelist
    if (apiKeyData.allowed_ips) {
      const allowedIPs = JSON.parse(apiKeyData.allowed_ips);
      if (allowedIPs.length > 0 && !allowedIPs.includes(req.ip)) {
        await logSecurityEvent(
          apiKeyData.user_id,
          apiKeyData.organization_id,
          'api_ip_blocked',
          'warning',
          {
            api_key_id: apiKeyData.id,
            blocked_ip: req.ip,
            allowed_ips: allowedIPs
          }
        );
        return res.status(403).json({ error: 'IP not allowed' });
      }
    }
    
    // Update usage
    await db.run(
      `UPDATE api_keys 
       SET last_used_at = ?, usage_count = usage_count + 1 
       WHERE id = ?`,
      [new Date().toISOString(), apiKeyData.id]
    );
    
    // Attach API key data to request
    req.apiKey = apiKeyData;
    req.user = await db.get(
      `SELECT * FROM users WHERE id = ?`,
      [apiKeyData.user_id]
    );
    req.organizationId = apiKeyData.organization_id;
    
    next();
  } catch (error) {
    console.error('API key verification error:', error);
    res.status(500).json({ error: 'API key verification failed' });
  }
};

// Check 2FA if required
const require2FA = async (req, res, next) => {
  try {
    // Check if organization requires 2FA
    if (req.organizationId) {
      const policy = await db.get(
        `SELECT require_2fa FROM security_policies 
         WHERE organization_id = ?`,
        [req.organizationId]
      );
      
      if (policy?.require_2fa) {
        // Check if user has 2FA enabled
        const twoFA = await db.get(
          `SELECT * FROM two_factor_auth 
           WHERE user_id = ? AND is_enabled = 1`,
          [req.user.id]
        );
        
        if (!twoFA) {
          await logSecurityEvent(
            req.user.id,
            req.organizationId,
            '2fa_required',
            'warning',
            { action: 'blocked' }
          );
          return res.status(403).json({ 
            error: '2FA required by organization policy',
            require_2fa_setup: true
          });
        }
        
        // Check if 2FA was verified in this session
        if (!req.token.twoFactorVerified) {
          return res.status(403).json({ 
            error: '2FA verification required',
            require_2fa_verification: true
          });
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('2FA check error:', error);
    res.status(500).json({ error: '2FA verification failed' });
  }
};

export {
  requireAuth,
  requireOrgRole,
  requirePermission,
  requireProjectAccess,
  requireAPIKey,
  require2FA
};