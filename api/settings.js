// Settings API
// Handles user preferences, application settings, and configuration

import express from 'express';
import database from '../database/database.js';
import { requireAuth, requireOrgRole } from './middleware/auth.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get user settings
router.get('/user', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user settings
    const settings = await database.get(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );
    
    // Get user profile
    const profile = await database.get(
      `SELECT id, username, email, role, created_at, 
       two_factor_enabled, notification_preferences
       FROM users WHERE id = ?`,
      [userId]
    );
    
    // Get API keys
    const apiKeys = await database.all(
      'SELECT id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE user_id = ?',
      [userId]
    );
    
    res.json({
      profile,
      settings: settings || getDefaultUserSettings(),
      apiKeys: apiKeys || []
    });
    
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user settings'
    });
  }
});

// Update user settings
router.put('/user', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      theme,
      language,
      editorTheme,
      fontSize,
      tabSize,
      autoSave,
      notifications,
      aiProvider,
      debugMode
    } = req.body;
    
    // Check if settings exist
    const existing = await database.get(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );
    
    if (existing) {
      // Update existing settings
      await database.run(
        `UPDATE user_settings SET
         theme = ?, language = ?, editor_theme = ?,
         font_size = ?, tab_size = ?, auto_save = ?,
         notifications = ?, ai_provider = ?, debug_mode = ?,
         updated_at = ?
         WHERE user_id = ?`,
        [
          theme || existing.theme,
          language || existing.language,
          editorTheme || existing.editor_theme,
          fontSize || existing.font_size,
          tabSize || existing.tab_size,
          autoSave !== undefined ? autoSave : existing.auto_save,
          notifications !== undefined ? notifications : existing.notifications,
          aiProvider || existing.ai_provider,
          debugMode !== undefined ? debugMode : existing.debug_mode,
          new Date().toISOString(),
          userId
        ]
      );
    } else {
      // Create new settings
      await database.run(
        `INSERT INTO user_settings (
          user_id, theme, language, editor_theme,
          font_size, tab_size, auto_save, notifications,
          ai_provider, debug_mode, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          theme || 'dark',
          language || 'en',
          editorTheme || 'monokai',
          fontSize || 14,
          tabSize || 2,
          autoSave !== undefined ? autoSave : 1,
          notifications !== undefined ? notifications : 1,
          aiProvider || 'openai',
          debugMode !== undefined ? debugMode : 0,
          new Date().toISOString()
        ]
      );
    }
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
    
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, email, currentPassword, newPassword } = req.body;
    
    // Verify current password if changing password
    if (newPassword) {
      const user = await database.get(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      );
      
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }
    
    // Build update query
    const updates = [];
    const params = [];
    
    if (username) {
      updates.push('username = ?');
      params.push(username);
    }
    
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }
    
    if (updates.length > 0) {
      params.push(userId);
      await database.run(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get organization settings
router.get('/organization/:orgId', requireAuth, requireOrgRole('viewer'), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const settings = await database.get(
      'SELECT * FROM organization_settings WHERE organization_id = ?',
      [orgId]
    );
    
    const organization = await database.get(
      'SELECT * FROM organizations WHERE id = ?',
      [orgId]
    );
    
    res.json({
      organization,
      settings: settings || getDefaultOrgSettings()
    });
    
  } catch (error) {
    console.error('Get organization settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organization settings'
    });
  }
});

// Update organization settings
router.put('/organization/:orgId', requireAuth, requireOrgRole('admin'), async (req, res) => {
  try {
    const { orgId } = req.params;
    const {
      allowGuestAccess,
      requireTwoFactor,
      sessionTimeout,
      ipRestrictions,
      defaultRole,
      aiProviders,
      maxProjectSize,
      retentionDays
    } = req.body;
    
    // Check if settings exist
    const existing = await database.get(
      'SELECT * FROM organization_settings WHERE organization_id = ?',
      [orgId]
    );
    
    if (existing) {
      // Update existing settings
      await database.run(
        `UPDATE organization_settings SET
         allow_guest_access = ?, require_two_factor = ?,
         session_timeout = ?, ip_restrictions = ?,
         default_role = ?, ai_providers = ?,
         max_project_size = ?, retention_days = ?,
         updated_at = ?
         WHERE organization_id = ?`,
        [
          allowGuestAccess !== undefined ? allowGuestAccess : existing.allow_guest_access,
          requireTwoFactor !== undefined ? requireTwoFactor : existing.require_two_factor,
          sessionTimeout || existing.session_timeout,
          ipRestrictions ? JSON.stringify(ipRestrictions) : existing.ip_restrictions,
          defaultRole || existing.default_role,
          aiProviders ? JSON.stringify(aiProviders) : existing.ai_providers,
          maxProjectSize || existing.max_project_size,
          retentionDays || existing.retention_days,
          new Date().toISOString(),
          orgId
        ]
      );
    } else {
      // Create new settings
      await database.run(
        `INSERT INTO organization_settings (
          organization_id, allow_guest_access, require_two_factor,
          session_timeout, ip_restrictions, default_role,
          ai_providers, max_project_size, retention_days, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orgId,
          allowGuestAccess !== undefined ? allowGuestAccess : 0,
          requireTwoFactor !== undefined ? requireTwoFactor : 0,
          sessionTimeout || 3600,
          ipRestrictions ? JSON.stringify(ipRestrictions) : null,
          defaultRole || 'viewer',
          aiProviders ? JSON.stringify(aiProviders) : '["openai"]',
          maxProjectSize || 100,
          retentionDays || 90,
          new Date().toISOString()
        ]
      );
    }
    
    res.json({
      success: true,
      message: 'Organization settings updated successfully'
    });
    
  } catch (error) {
    console.error('Update organization settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update organization settings'
    });
  }
});

// Create API key
router.post('/api-keys', requireAuth, async (req, res) => {
  try {
    const { name, permissions, expiresAt } = req.body;
    const userId = req.user.id;
    
    // Generate API key
    const apiKey = `dbf_${uuidv4().replace(/-/g, '')}`;
    const keyPrefix = apiKey.substring(0, 8) + '...';
    
    // Hash the API key before storing
    const hashedKey = await bcrypt.hash(apiKey, 10);
    
    await database.run(
      `INSERT INTO api_keys (
        user_id, name, key_hash, key_prefix,
        permissions, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name || 'API Key',
        hashedKey,
        keyPrefix,
        permissions ? JSON.stringify(permissions) : null,
        expiresAt || null,
        new Date().toISOString()
      ]
    );
    
    res.json({
      success: true,
      apiKey, // Only returned once
      keyPrefix,
      message: 'API key created successfully. Please save it securely as it won\'t be shown again.'
    });
    
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create API key'
    });
  }
});

// Delete API key
router.delete('/api-keys/:keyId', requireAuth, async (req, res) => {
  try {
    const { keyId } = req.params;
    const userId = req.user.id;
    
    await database.run(
      'DELETE FROM api_keys WHERE id = ? AND user_id = ?',
      [keyId, userId]
    );
    
    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete API key'
    });
  }
});

// Get notification preferences
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const preferences = await database.get(
      'SELECT notification_preferences FROM users WHERE id = ?',
      [userId]
    );
    
    res.json(
      preferences?.notification_preferences 
        ? JSON.parse(preferences.notification_preferences)
        : getDefaultNotificationPreferences()
    );
    
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences'
    });
  }
});

// Update notification preferences
router.put('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;
    
    await database.run(
      'UPDATE users SET notification_preferences = ? WHERE id = ?',
      [JSON.stringify(preferences), userId]
    );
    
    res.json({
      success: true,
      message: 'Notification preferences updated'
    });
    
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences'
    });
  }
});

// Get AI provider settings
router.get('/ai-providers', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const providers = await database.all(
      'SELECT * FROM ai_provider_settings WHERE user_id = ? OR user_id IS NULL',
      [userId]
    );
    
    res.json(providers || []);
    
  } catch (error) {
    console.error('Get AI providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI provider settings'
    });
  }
});

// Update AI provider settings
router.put('/ai-providers/:providerId', requireAuth, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { apiKey, endpoint, model, enabled } = req.body;
    const userId = req.user.id;
    
    // Check if settings exist
    const existing = await database.get(
      'SELECT * FROM ai_provider_settings WHERE provider_id = ? AND user_id = ?',
      [providerId, userId]
    );
    
    if (existing) {
      // Update existing
      await database.run(
        `UPDATE ai_provider_settings SET
         api_key = ?, endpoint = ?, model = ?, enabled = ?, updated_at = ?
         WHERE provider_id = ? AND user_id = ?`,
        [
          apiKey || existing.api_key,
          endpoint || existing.endpoint,
          model || existing.model,
          enabled !== undefined ? enabled : existing.enabled,
          new Date().toISOString(),
          providerId,
          userId
        ]
      );
    } else {
      // Create new
      await database.run(
        `INSERT INTO ai_provider_settings (
          provider_id, user_id, api_key, endpoint, model, enabled, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          providerId,
          userId,
          apiKey,
          endpoint,
          model,
          enabled !== undefined ? enabled : 1,
          new Date().toISOString()
        ]
      );
    }
    
    res.json({
      success: true,
      message: 'AI provider settings updated'
    });
    
  } catch (error) {
    console.error('Update AI provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AI provider settings'
    });
  }
});

// Helper functions
function getDefaultUserSettings() {
  return {
    theme: 'dark',
    language: 'en',
    editor_theme: 'monokai',
    font_size: 14,
    tab_size: 2,
    auto_save: true,
    notifications: true,
    ai_provider: 'openai',
    debug_mode: false
  };
}

function getDefaultOrgSettings() {
  return {
    allow_guest_access: false,
    require_two_factor: false,
    session_timeout: 3600,
    ip_restrictions: null,
    default_role: 'viewer',
    ai_providers: ['openai'],
    max_project_size: 100,
    retention_days: 90
  };
}

function getDefaultNotificationPreferences() {
  return {
    email: {
      bugReports: true,
      debugSessions: true,
      teamInvites: true,
      systemUpdates: false
    },
    inApp: {
      bugReports: true,
      debugSessions: true,
      teamInvites: true,
      systemUpdates: true
    }
  };
}

// Initialize settings tables when database is ready
function initializeSettingsTables() {
  if (database && database.db) {
    Promise.all([
      database.run(`
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id INTEGER PRIMARY KEY,
          theme TEXT DEFAULT 'dark',
          language TEXT DEFAULT 'en',
          editor_theme TEXT DEFAULT 'monokai',
          font_size INTEGER DEFAULT 14,
          tab_size INTEGER DEFAULT 2,
          auto_save INTEGER DEFAULT 1,
          notifications INTEGER DEFAULT 1,
          ai_provider TEXT DEFAULT 'openai',
          debug_mode INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `),
      
      database.run(`
        CREATE TABLE IF NOT EXISTS organization_settings (
          organization_id TEXT PRIMARY KEY,
          allow_guest_access INTEGER DEFAULT 0,
          require_two_factor INTEGER DEFAULT 0,
          session_timeout INTEGER DEFAULT 3600,
          ip_restrictions TEXT,
          default_role TEXT DEFAULT 'viewer',
          ai_providers TEXT DEFAULT '["openai"]',
          max_project_size INTEGER DEFAULT 100,
          retention_days INTEGER DEFAULT 90,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME,
          FOREIGN KEY (organization_id) REFERENCES organizations(id)
        )
      `),
      
      database.run(`
        CREATE TABLE IF NOT EXISTS ai_provider_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider_id TEXT NOT NULL,
          user_id INTEGER,
          api_key TEXT,
          endpoint TEXT,
          model TEXT,
          enabled INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `)
    ]).catch(console.error);
  } else {
    // Retry after a short delay if database is not ready
    setTimeout(initializeSettingsTables, 1000);
  }
}

// Initialize tables when this module is loaded
initializeSettingsTables();

export default router;