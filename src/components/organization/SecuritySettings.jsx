import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  Globe, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Check,
  Clock,
  Settings,
  Users,
  Database,
  Network,
  AlertCircle
} from 'lucide-react';
import organizationService from '../../services/OrganizationService.js';
import toast from 'react-hot-toast';

const SecuritySettings = ({ organizationId, currentUserRole }) => {
  const [securityPolicy, setSecurityPolicy] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('authentication');
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState(null);

  // API Key creation form
  const [apiKeyForm, setApiKeyForm] = useState({
    name: '',
    scopes: []
  });
  const [isCreatingKey, setIsCreatingKey] = useState(false);

  // Form state for security settings
  const [formData, setFormData] = useState({
    // Authentication settings
    require_2fa: false,
    password_min_length: 8,
    password_require_special: true,
    password_require_numbers: true,
    password_require_uppercase: true,
    password_expiry_days: 90,
    max_login_attempts: 5,
    lockout_duration_minutes: 30,
    
    // Session settings
    session_timeout_minutes: 480,
    concurrent_sessions_limit: 5,
    require_fresh_auth_for_sensitive: true,
    
    // Access control
    ip_whitelist_enabled: false,
    ip_whitelist: '',
    allowed_domains: '',
    restrict_email_domains: false,
    
    // Data protection
    data_encryption_at_rest: true,
    audit_log_retention_days: 365,
    auto_backup_enabled: true,
    backup_frequency_hours: 24,
    
    // Compliance
    gdpr_compliance_enabled: true,
    data_retention_days: 2555, // 7 years
    anonymize_deleted_users: true
  });

  const apiScopes = [
    { value: 'read:projects', label: 'Read Projects', description: 'View project data and files' },
    { value: 'write:projects', label: 'Write Projects', description: 'Create and modify projects' },
    { value: 'read:bugs', label: 'Read Bug Reports', description: 'View bug reports and analysis' },
    { value: 'write:bugs', label: 'Write Bug Reports', description: 'Create and update bug reports' },
    { value: 'read:analytics', label: 'Read Analytics', description: 'Access analytics and reports' },
    { value: 'read:members', label: 'Read Members', description: 'View organization members' },
    { value: 'write:members', label: 'Manage Members', description: 'Invite and manage members' },
    { value: 'admin', label: 'Admin Access', description: 'Full administrative access' }
  ];

  const securityTabs = [
    { id: 'authentication', label: 'Authentication', icon: Lock },
    { id: 'access', label: 'Access Control', icon: Users },
    { id: 'data', label: 'Data Protection', icon: Database },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'compliance', label: 'Compliance', icon: Shield }
  ];

  useEffect(() => {
    if (organizationId) {
      fetchSecurityData();
    }
  }, [organizationId]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [policyData, keysData] = await Promise.all([
        organizationService.getSecurityPolicy(organizationId),
        organizationService.getAPIKeys(organizationId)
      ]);
      
      setSecurityPolicy(policyData);
      setApiKeys(keysData);
      
      // Update form data with fetched policy
      if (policyData) {
        setFormData(prevForm => ({
          ...prevForm,
          ...policyData
        }));
      }
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!organizationService.canManageSecuritySettings(currentUserRole)) {
      toast.error('You do not have permission to modify security settings');
      return;
    }

    setIsSaving(true);
    try {
      await organizationService.updateSecurityPolicy(organizationId, formData);
      toast.success('Security settings updated successfully');
      fetchSecurityData(); // Refresh data
    } catch (error) {
      toast.error(error.message || 'Failed to update security settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    
    if (!apiKeyForm.name.trim()) {
      toast.error('API key name is required');
      return;
    }

    if (apiKeyForm.scopes.length === 0) {
      toast.error('Please select at least one scope');
      return;
    }

    setIsCreatingKey(true);
    try {
      const result = await organizationService.createAPIKey(
        organizationId,
        apiKeyForm.name,
        apiKeyForm.scopes
      );
      
      toast.success('API key created successfully');
      setShowCreateApiKey(false);
      setApiKeyForm({ name: '', scopes: [] });
      
      // Show the key in a modal since it can only be viewed once
      const keyModal = document.createElement('div');
      keyModal.innerHTML = `
        <div class="fixed inset-0 z-50 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4">
          <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-medium text-white mb-4">API Key Created</h3>
            <p class="text-gray-300 mb-4">Save this API key now. You won't be able to see it again!</p>
            <div class="bg-gray-900 p-3 rounded-md mb-4">
              <code class="text-green-400 text-sm break-all">${result.key}</code>
            </div>
            <div class="flex justify-end space-x-3">
              <button onclick="navigator.clipboard.writeText('${result.key}'); this.textContent='Copied!'" 
                      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Copy Key
              </button>
              <button onclick="this.closest('.fixed').remove()" 
                      class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">
                Done
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(keyModal);
      
      fetchSecurityData(); // Refresh the keys list
    } catch (error) {
      toast.error(error.message || 'Failed to create API key');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (keyId, keyName) => {
    if (!confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await organizationService.revokeAPIKey(organizationId, keyId);
      toast.success('API key revoked successfully');
      fetchSecurityData();
    } catch (error) {
      toast.error(error.message || 'Failed to revoke API key');
    }
  };

  const copyToClipboard = async (text, keyId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const canModifySettings = organizationService.canManageSecuritySettings(currentUserRole);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                <div className="h-8 bg-gray-700 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Failed to Load Security Settings</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchSecurityData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-blue-400 mr-2" />
            <h2 className="text-xl font-semibold text-white">Security Settings</h2>
          </div>
          
          {canModifySettings && (
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>

        {!canModifySettings && (
          <div className="mt-4 p-3 bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
              <span className="text-yellow-300 text-sm">
                You need owner permissions to modify security settings.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8 px-6">
          {securityTabs.map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <TabIcon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Authentication Settings */}
        {activeTab === 'authentication' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Password Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="50"
                    value={formData.password_min_length}
                    onChange={(e) => setFormData(prev => ({ ...prev, password_min_length: parseInt(e.target.value) }))}
                    disabled={!canModifySettings}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password Expiry (days)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="365"
                    value={formData.password_expiry_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, password_expiry_days: parseInt(e.target.value) }))}
                    disabled={!canModifySettings}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.password_require_special}
                    onChange={(e) => setFormData(prev => ({ ...prev, password_require_special: e.target.checked }))}
                    disabled={!canModifySettings}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-300">Require special characters</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.password_require_numbers}
                    onChange={(e) => setFormData(prev => ({ ...prev, password_require_numbers: e.target.checked }))}
                    disabled={!canModifySettings}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-300">Require numbers</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.password_require_uppercase}
                    onChange={(e) => setFormData(prev => ({ ...prev, password_require_uppercase: e.target.checked }))}
                    disabled={!canModifySettings}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-300">Require uppercase letters</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Multi-Factor Authentication</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.require_2fa}
                  onChange={(e) => setFormData(prev => ({ ...prev, require_2fa: e.target.checked }))}
                  disabled={!canModifySettings}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">Require 2FA for all members</span>
              </label>
              <p className="mt-2 text-sm text-gray-400">
                When enabled, all organization members must set up two-factor authentication.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Login Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={formData.max_login_attempts}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_login_attempts: parseInt(e.target.value) }))}
                    disabled={!canModifySettings}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Lockout Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={formData.lockout_duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, lockout_duration_minutes: parseInt(e.target.value) }))}
                    disabled={!canModifySettings}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Access Control Settings */}
        {activeTab === 'access' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Session Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="1440"
                    value={formData.session_timeout_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, session_timeout_minutes: parseInt(e.target.value) }))}
                    disabled={!canModifySettings}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Concurrent Sessions Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.concurrent_sessions_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, concurrent_sessions_limit: parseInt(e.target.value) }))}
                    disabled={!canModifySettings}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.require_fresh_auth_for_sensitive}
                    onChange={(e) => setFormData(prev => ({ ...prev, require_fresh_auth_for_sensitive: e.target.checked }))}
                    disabled={!canModifySettings}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-300">Require fresh authentication for sensitive operations</span>
                </label>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">IP Restrictions</h3>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={formData.ip_whitelist_enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, ip_whitelist_enabled: e.target.checked }))}
                  disabled={!canModifySettings}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">Enable IP whitelist</span>
              </label>
              
              {formData.ip_whitelist_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Allowed IP Addresses (one per line)
                  </label>
                  <textarea
                    value={formData.ip_whitelist}
                    onChange={(e) => setFormData(prev => ({ ...prev, ip_whitelist: e.target.value }))}
                    disabled={!canModifySettings}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    placeholder="192.168.1.1&#10;10.0.0.0/8&#10;203.0.113.0/24"
                  />
                  <p className="mt-2 text-sm text-gray-400">
                    Enter IP addresses or CIDR ranges. Be careful not to lock yourself out!
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Email Domain Restrictions</h3>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={formData.restrict_email_domains}
                  onChange={(e) => setFormData(prev => ({ ...prev, restrict_email_domains: e.target.checked }))}
                  disabled={!canModifySettings}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">Restrict to specific email domains</span>
              </label>
              
              {formData.restrict_email_domains && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Allowed Domains (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.allowed_domains}
                    onChange={(e) => setFormData(prev => ({ ...prev, allowed_domains: e.target.value }))}
                    disabled={!canModifySettings}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    placeholder="example.com, company.org"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Protection Settings */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Encryption</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.data_encryption_at_rest}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_encryption_at_rest: e.target.checked }))}
                  disabled={!canModifySettings}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">Enable encryption at rest</span>
              </label>
              <p className="mt-2 text-sm text-gray-400">
                All data will be encrypted using AES-256 encryption when stored.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Backup Settings</h3>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={formData.auto_backup_enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, auto_backup_enabled: e.target.checked }))}
                  disabled={!canModifySettings}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">Enable automatic backups</span>
              </label>
              
              {formData.auto_backup_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Backup Frequency (hours)
                  </label>
                  <select
                    value={formData.backup_frequency_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, backup_frequency_hours: parseInt(e.target.value) }))}
                    disabled={!canModifySettings}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value={6}>Every 6 hours</option>
                    <option value={12}>Every 12 hours</option>
                    <option value={24}>Daily</option>
                    <option value={48}>Every 2 days</option>
                    <option value={168}>Weekly</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Audit Logs</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Log Retention Period (days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="2555"
                  value={formData.audit_log_retention_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, audit_log_retention_days: parseInt(e.target.value) }))}
                  disabled={!canModifySettings}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                <p className="mt-2 text-sm text-gray-400">
                  How long to keep audit logs before automatic deletion (minimum 30 days).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">API Keys</h3>
              {canModifySettings && (
                <button
                  onClick={() => setShowCreateApiKey(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create API Key
                </button>
              )}
            </div>

            {apiKeys.length === 0 ? (
              <div className="text-center py-12">
                <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-400 mb-2">No API Keys</h4>
                <p className="text-gray-500 mb-4">
                  Create API keys to access the DebugFlow API programmatically.
                </p>
                {canModifySettings && (
                  <button
                    onClick={() => setShowCreateApiKey(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Your First API Key
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map(key => (
                  <div key={key.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-white">{key.name}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            key.status === 'active' 
                              ? 'bg-green-900 text-green-300' 
                              : 'bg-red-900 text-red-300'
                          }`}>
                            {key.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 space-y-1">
                          <p>Created: {new Date(key.created_at).toLocaleDateString()}</p>
                          <p>Last used: {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}</p>
                          <p>Scopes: {key.scopes.join(', ')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(`df_${key.id.slice(0, 8)}...`, key.id)}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-600 rounded-md transition-colors"
                          title="Copy Key ID"
                        >
                          {copiedKeyId === key.id ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        
                        {canModifySettings && (
                          <button
                            onClick={() => handleRevokeApiKey(key.id, key.name)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded-md transition-colors"
                            title="Revoke API Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create API Key Modal */}
            {showCreateApiKey && (
              <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowCreateApiKey(false)}></div>

                  <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-lg">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                      <h3 className="text-lg font-medium text-white">Create API Key</h3>
                      <button
                        onClick={() => setShowCreateApiKey(false)}
                        className="text-gray-400 hover:text-gray-300"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateApiKey} className="p-6">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          API Key Name
                        </label>
                        <input
                          type="text"
                          value={apiKeyForm.name}
                          onChange={(e) => setApiKeyForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500"
                          placeholder="My App Integration"
                          required
                        />
                      </div>

                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Scopes
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {apiScopes.map(scope => (
                            <label key={scope.value} className="flex items-start">
                              <input
                                type="checkbox"
                                checked={apiKeyForm.scopes.includes(scope.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setApiKeyForm(prev => ({
                                      ...prev,
                                      scopes: [...prev.scopes, scope.value]
                                    }));
                                  } else {
                                    setApiKeyForm(prev => ({
                                      ...prev,
                                      scopes: prev.scopes.filter(s => s !== scope.value)
                                    }));
                                  }
                                }}
                                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500 mt-0.5"
                              />
                              <div className="ml-2">
                                <span className="text-gray-300 font-medium">{scope.label}</span>
                                <p className="text-sm text-gray-400">{scope.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => setShowCreateApiKey(false)}
                          className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingKey}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isCreatingKey ? 'Creating...' : 'Create API Key'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compliance Settings */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">GDPR Compliance</h3>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={formData.gdpr_compliance_enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, gdpr_compliance_enabled: e.target.checked }))}
                  disabled={!canModifySettings}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">Enable GDPR compliance features</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.anonymize_deleted_users}
                  onChange={(e) => setFormData(prev => ({ ...prev, anonymize_deleted_users: e.target.checked }))}
                  disabled={!canModifySettings}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-300">Anonymize data when users are deleted</span>
              </label>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Data Retention</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data Retention Period (days)
                </label>
                <input
                  type="number"
                  min="365"
                  max="3650"
                  value={formData.data_retention_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) }))}
                  disabled={!canModifySettings}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                <p className="mt-2 text-sm text-gray-400">
                  How long to retain user data after account deletion (minimum 1 year for compliance).
                </p>
              </div>
            </div>

            <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-2">Compliance Information</p>
                  <ul className="space-y-1 text-blue-200">
                    <li>• All data is encrypted in transit and at rest</li>
                    <li>• Audit logs track all sensitive operations</li>
                    <li>• Users can request data export or deletion</li>
                    <li>• Regular security assessments are performed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecuritySettings;