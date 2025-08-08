// Organization Service
// Manages organization, team, and enterprise security operations

class OrganizationService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get authorization headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Organization Management
  async getOrganization(orgId) {
    try {
      const cached = this.getFromCache(`org_${orgId}`);
      if (cached) return cached;

      const response = await fetch(`${this.baseURL}/organizations/${orgId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch organization: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(`org_${orgId}`, data);
      return data;
    } catch (error) {
      console.error('Get organization error:', error);
      throw error;
    }
  }

  async createOrganization(organizationData) {
    try {
      const response = await fetch(`${this.baseURL}/organizations`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(organizationData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create organization');
      }

      const data = await response.json();
      this.clearCache();
      return data;
    } catch (error) {
      console.error('Create organization error:', error);
      throw error;
    }
  }

  async updateOrganization(orgId, updates) {
    try {
      const response = await fetch(`${this.baseURL}/organizations/${orgId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update organization');
      }

      this.clearCache(`org_${orgId}`);
      return await response.json();
    } catch (error) {
      console.error('Update organization error:', error);
      throw error;
    }
  }

  // Member Management
  async getOrganizationMembers(orgId) {
    try {
      const cached = this.getFromCache(`members_${orgId}`);
      if (cached) return cached;

      const response = await fetch(`${this.baseURL}/organizations/${orgId}/members`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch members: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(`members_${orgId}`, data);
      return data;
    } catch (error) {
      console.error('Get members error:', error);
      throw error;
    }
  }

  async inviteMember(orgId, email, role = 'viewer', teamId = null) {
    try {
      const response = await fetch(`${this.baseURL}/organizations/${orgId}/members/invite`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ email, role, team_id: teamId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to invite member');
      }

      this.clearCache(`members_${orgId}`);
      return await response.json();
    } catch (error) {
      console.error('Invite member error:', error);
      throw error;
    }
  }

  async updateMemberRole(orgId, userId, role, permissions = null) {
    try {
      const response = await fetch(`${this.baseURL}/organizations/${orgId}/members/${userId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ role, permissions })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update member');
      }

      this.clearCache(`members_${orgId}`);
      return await response.json();
    } catch (error) {
      console.error('Update member error:', error);
      throw error;
    }
  }

  async removeMember(orgId, userId) {
    try {
      const response = await fetch(`${this.baseURL}/organizations/${orgId}/members/${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }

      this.clearCache(`members_${orgId}`);
      return await response.json();
    } catch (error) {
      console.error('Remove member error:', error);
      throw error;
    }
  }

  // Team Management
  async getTeams(orgId) {
    try {
      const cached = this.getFromCache(`teams_${orgId}`);
      if (cached) return cached;

      const response = await fetch(`${this.baseURL}/teams/organization/${orgId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch teams: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(`teams_${orgId}`, data);
      return data;
    } catch (error) {
      console.error('Get teams error:', error);
      throw error;
    }
  }

  async getTeam(teamId) {
    try {
      const cached = this.getFromCache(`team_${teamId}`);
      if (cached) return cached;

      const response = await fetch(`${this.baseURL}/teams/${teamId}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch team: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(`team_${teamId}`, data);
      return data;
    } catch (error) {
      console.error('Get team error:', error);
      throw error;
    }
  }

  async createTeam(teamData) {
    try {
      const response = await fetch(`${this.baseURL}/teams`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(teamData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create team');
      }

      this.clearCache();
      return await response.json();
    } catch (error) {
      console.error('Create team error:', error);
      throw error;
    }
  }

  async updateTeam(teamId, updates) {
    try {
      const response = await fetch(`${this.baseURL}/teams/${teamId}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update team');
      }

      this.clearCache(`team_${teamId}`);
      return await response.json();
    } catch (error) {
      console.error('Update team error:', error);
      throw error;
    }
  }

  async deleteTeam(teamId) {
    try {
      const response = await fetch(`${this.baseURL}/teams/${teamId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete team');
      }

      this.clearCache();
      return await response.json();
    } catch (error) {
      console.error('Delete team error:', error);
      throw error;
    }
  }

  // Team Member Management
  async addTeamMember(teamId, userId) {
    try {
      const response = await fetch(`${this.baseURL}/teams/${teamId}/members`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add team member');
      }

      this.clearCache(`team_${teamId}`);
      return await response.json();
    } catch (error) {
      console.error('Add team member error:', error);
      throw error;
    }
  }

  async removeTeamMember(teamId, userId) {
    try {
      const response = await fetch(`${this.baseURL}/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove team member');
      }

      this.clearCache(`team_${teamId}`);
      return await response.json();
    } catch (error) {
      console.error('Remove team member error:', error);
      throw error;
    }
  }

  // Audit Logs
  async getAuditLogs(orgId, filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(
        `${this.baseURL}/organizations/${orgId}/audit-logs?${queryParams}`,
        {
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get audit logs error:', error);
      throw error;
    }
  }

  // Security Policies
  async getSecurityPolicy(orgId) {
    try {
      const cached = this.getFromCache(`policy_${orgId}`);
      if (cached) return cached;

      const response = await fetch(`${this.baseURL}/organizations/${orgId}/security-policy`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch security policy: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(`policy_${orgId}`, data);
      return data;
    } catch (error) {
      console.error('Get security policy error:', error);
      throw error;
    }
  }

  async updateSecurityPolicy(orgId, policyUpdates) {
    try {
      const response = await fetch(`${this.baseURL}/organizations/${orgId}/security-policy`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(policyUpdates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update security policy');
      }

      this.clearCache(`policy_${orgId}`);
      return await response.json();
    } catch (error) {
      console.error('Update security policy error:', error);
      throw error;
    }
  }

  // Compliance Reports
  async generateComplianceReport(orgId, reportType, startDate, endDate) {
    try {
      const response = await fetch(`${this.baseURL}/organizations/${orgId}/compliance-report`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          report_type: reportType,
          start_date: startDate,
          end_date: endDate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate compliance report');
      }

      return await response.json();
    } catch (error) {
      console.error('Generate compliance report error:', error);
      throw error;
    }
  }

  async getComplianceReports(orgId) {
    try {
      const response = await fetch(`${this.baseURL}/organizations/${orgId}/compliance-reports`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch compliance reports: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get compliance reports error:', error);
      throw error;
    }
  }

  // API Key Management
  async createAPIKey(orgId, name, scopes) {
    try {
      const response = await fetch(`${this.baseURL}/organizations/${orgId}/api-keys`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ name, scopes })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      return await response.json();
    } catch (error) {
      console.error('Create API key error:', error);
      throw error;
    }
  }

  async getAPIKeys(orgId) {
    try {
      const response = await fetch(`${this.baseURL}/organizations/${orgId}/api-keys`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch API keys: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get API keys error:', error);
      throw error;
    }
  }

  async revokeAPIKey(orgId, keyId) {
    try {
      const response = await fetch(`${this.baseURL}/organizations/${orgId}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke API key');
      }

      return await response.json();
    } catch (error) {
      console.error('Revoke API key error:', error);
      throw error;
    }
  }

  // Cache Management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache(key = null) {
    if (key) {
      // Clear specific cache and related caches
      this.cache.forEach((value, cacheKey) => {
        if (cacheKey.includes(key)) {
          this.cache.delete(cacheKey);
        }
      });
    } else {
      this.cache.clear();
    }
  }

  // Role Helpers
  getRoleHierarchy() {
    return {
      owner: 4,
      admin: 3,
      developer: 2,
      viewer: 1
    };
  }

  canManageMembers(userRole) {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[userRole] >= hierarchy.admin;
  }

  canManageTeams(userRole) {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[userRole] >= hierarchy.admin;
  }

  canViewAuditLogs(userRole) {
    const hierarchy = this.getRoleHierarchy();
    return hierarchy[userRole] >= hierarchy.admin;
  }

  canManageSecuritySettings(userRole) {
    return userRole === 'owner';
  }

  // Permission Helpers
  hasPermission(permissions, required) {
    if (!permissions || !Array.isArray(permissions)) return false;
    
    // Check for wildcard permission
    if (permissions.includes('*')) return true;
    
    // Check for exact permission
    if (permissions.includes(required)) return true;
    
    // Check for partial wildcard (e.g., 'projects.*' matches 'projects.create')
    const requiredParts = required.split('.');
    return permissions.some(perm => {
      if (!perm.includes('*')) return false;
      const permParts = perm.split('.');
      if (permParts[permParts.length - 1] !== '*') return false;
      
      const prefix = permParts.slice(0, -1).join('.');
      return required.startsWith(prefix + '.');
    });
  }
}

// Export singleton instance
const organizationService = new OrganizationService();
export default organizationService;