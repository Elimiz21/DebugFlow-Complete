import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Shield, Key, Activity, Settings,
  Plus, Edit2, Trash2, ChevronRight, AlertTriangle,
  UserPlus, Mail, Lock, Globe, CreditCard, FileText
} from 'lucide-react';
import organizationService from '../services/OrganizationService';
import CreateOrgModal from '../components/organization/CreateOrgModal';
import MembersManagement from '../components/organization/MembersManagement';
import TeamsManagement from '../components/organization/TeamsManagement';
import SecuritySettings from '../components/organization/SecuritySettings';
import AuditLogs from '../components/organization/AuditLogs';
import ComplianceReports from '../components/organization/ComplianceReports';

const Organization = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRole, setUserRole] = useState('viewer');
  const [stats, setStats] = useState({
    members: 0,
    teams: 0,
    projects: 0,
    apiCalls: 0
  });

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get organization from localStorage or user context
      const storedOrgId = localStorage.getItem('organizationId');
      
      if (!storedOrgId) {
        setLoading(false);
        setShowCreateModal(true);
        return;
      }

      const orgData = await organizationService.getOrganization(storedOrgId);
      setOrganization(orgData);
      
      // Get user's role in organization
      const members = await organizationService.getOrganizationMembers(storedOrgId);
      const currentUserId = parseInt(localStorage.getItem('userId'));
      const currentMember = members.find(m => m.user_id === currentUserId);
      
      if (currentMember) {
        setUserRole(currentMember.role);
      }
      
      // Load statistics
      const teams = await organizationService.getTeams(storedOrgId);
      setStats({
        members: members.length,
        teams: teams.length,
        projects: orgData.project_count || 0,
        apiCalls: orgData.api_calls_this_month || 0
      });
      
    } catch (err) {
      console.error('Failed to load organization:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (orgData) => {
    try {
      const newOrg = await organizationService.createOrganization(orgData);
      localStorage.setItem('organizationId', newOrg.id);
      setShowCreateModal(false);
      await loadOrganization();
    } catch (err) {
      console.error('Failed to create organization:', err);
      throw err;
    }
  };

  const handleUpdateOrganization = async (updates) => {
    try {
      await organizationService.updateOrganization(organization.id, updates);
      await loadOrganization();
    } catch (err) {
      console.error('Failed to update organization:', err);
      setError(err.message);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'audit', label: 'Audit Logs', icon: Activity },
    { id: 'compliance', label: 'Compliance', icon: FileText }
  ];

  const canViewTab = (tabId) => {
    switch (tabId) {
      case 'security':
        return organizationService.canManageSecuritySettings(userRole);
      case 'audit':
        return organizationService.canViewAuditLogs(userRole);
      case 'compliance':
        return organizationService.canViewAuditLogs(userRole);
      default:
        return true;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600"
          >
            Create Organization
          </button>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Organization</h2>
          <p className="text-gray-400 mb-4">Create an organization to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600"
          >
            Create Organization
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {organization.logo_url ? (
                <img 
                  src={organization.logo_url} 
                  alt={organization.name}
                  className="w-12 h-12 rounded"
                />
              ) : (
                <Building2 className="w-12 h-12 text-cyan-400" />
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{organization.name}</h1>
                <p className="text-gray-400">{organization.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Subscription</p>
                <p className="text-white font-semibold capitalize">{organization.subscription_tier}</p>
              </div>
              {organizationService.canManageSecuritySettings(userRole) && (
                <button
                  onClick={() => setActiveTab('security')}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Users className="w-8 h-8 text-cyan-400" />
                <span className="text-2xl font-bold text-white">{stats.members}</span>
              </div>
              <p className="text-gray-400 mt-2">Members</p>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Users className="w-8 h-8 text-green-400" />
                <span className="text-2xl font-bold text-white">{stats.teams}</span>
              </div>
              <p className="text-gray-400 mt-2">Teams</p>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Globe className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold text-white">{stats.projects}</span>
              </div>
              <p className="text-gray-400 mt-2">Projects</p>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Activity className="w-8 h-8 text-orange-400" />
                <span className="text-2xl font-bold text-white">{stats.apiCalls}</span>
              </div>
              <p className="text-gray-400 mt-2">API Calls/Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            {tabs.filter(tab => canViewTab(tab.id)).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Organization Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Organization Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Industry</p>
                  <p className="text-white">{organization.industry || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Size</p>
                  <p className="text-white capitalize">{organization.size || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Website</p>
                  <p className="text-white">{organization.website || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Created</p>
                  <p className="text-white">
                    {new Date(organization.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Subscription & Limits</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400">Max Users</p>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{stats.members} / {organization.max_users}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-cyan-400 h-2 rounded-full"
                        style={{ width: `${(stats.members / organization.max_users) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400">Max Projects</p>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{stats.projects} / {organization.max_projects}</span>
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full"
                        style={{ width: `${(stats.projects / organization.max_projects) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400">Storage</p>
                  <p className="text-white">{organization.max_storage_gb} GB</p>
                </div>
                <div>
                  <p className="text-gray-400">API Calls/Month</p>
                  <p className="text-white">{organization.max_api_calls_per_month.toLocaleString()}</p>
                </div>
              </div>
              
              {organization.subscription_tier === 'free' && (
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/20 to-cyan-900/20 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">Upgrade to Pro</h3>
                      <p className="text-gray-400">Get more users, projects, and API calls</p>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded hover:opacity-90">
                      Upgrade Now
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Compliance */}
            {organization.compliance_certifications?.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Compliance Certifications</h2>
                <div className="flex gap-4">
                  {organization.compliance_certifications.map(cert => (
                    <div key={cert} className="px-4 py-2 bg-green-900/30 border border-green-500/30 rounded">
                      <Shield className="w-4 h-4 text-green-400 inline mr-2" />
                      <span className="text-white">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <MembersManagement 
            organizationId={organization.id}
            userRole={userRole}
            onUpdate={loadOrganization}
          />
        )}

        {activeTab === 'teams' && (
          <TeamsManagement
            organizationId={organization.id}
            userRole={userRole}
            onUpdate={loadOrganization}
          />
        )}

        {activeTab === 'security' && (
          <SecuritySettings
            organizationId={organization.id}
            userRole={userRole}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogs
            organizationId={organization.id}
            userRole={userRole}
          />
        )}

        {activeTab === 'compliance' && (
          <ComplianceReports
            organizationId={organization.id}
            userRole={userRole}
          />
        )}
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <CreateOrgModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateOrganization}
        />
      )}
    </div>
  );
};

export default Organization;