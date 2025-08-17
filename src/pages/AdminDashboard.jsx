import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Users, Settings, Database, Activity, Shield,
  Server, Mail, Cloud, AlertCircle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Clock, Package, Bug, Code,
  Key, Save, RefreshCw, Download, Trash2, Power
} from 'lucide-react';
import adminApi from '../services/adminApi';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [systemConfig, setSystemConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Config form states
  const [configForm, setConfigForm] = useState({});
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    if (adminToken) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [adminToken]);

  // Admin login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const response = await adminApi.post('/admin/login', { password: loginPassword });
      
      if (response.data.success) {
        const token = response.data.data.token;
        localStorage.setItem('adminToken', token);
        setAdminToken(token);
        adminApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        loadDashboardData();
      }
    } catch (error) {
      setLoginError(error.response?.data?.message || 'Login failed');
    }
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Set admin token for all requests
      adminApi.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;

      const [dashboard, config, userList, systemLogs, analyticsData] = await Promise.all([
        adminApi.get('/admin/dashboard'),
        adminApi.get('/admin/config'),
        adminApi.get('/admin/users'),
        adminApi.get('/admin/logs?limit=50'),
        adminApi.get('/admin/analytics?period=7d')
      ]);

      setDashboardData(dashboard.data.data);
      setSystemConfig(config.data.data);
      setConfigForm(config.data.data);
      setUsers(userList.data.data);
      setLogs(systemLogs.data.data);
      setAnalytics(analyticsData.data.data);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        setAdminToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Save configuration
  const saveConfiguration = async (section) => {
    setConfigSaving(true);
    try {
      await adminApi.put('/admin/config', { [section]: configForm[section] });
      await loadDashboardData();
      alert('Configuration saved successfully');
    } catch (error) {
      alert('Failed to save configuration: ' + (error.response?.data?.message || error.message));
    } finally {
      setConfigSaving(false);
    }
  };

  // Toggle maintenance mode
  const toggleMaintenance = async () => {
    try {
      const enabled = !configForm.system.maintenanceMode;
      await adminApi.post('/admin/maintenance', {
        enabled,
        message: 'System is under maintenance. Please try again later.'
      });
      setConfigForm(prev => ({
        ...prev,
        system: { ...prev.system, maintenanceMode: enabled }
      }));
    } catch (error) {
      alert('Failed to toggle maintenance mode');
    }
  };

  // Manage job queue
  const manageJobQueue = async (action, queue) => {
    try {
      await adminApi.post('/admin/jobs', { action, queue });
      await loadDashboardData();
    } catch (error) {
      alert('Failed to manage job queue');
    }
  };

  // Database cleanup
  const cleanupDatabase = async () => {
    if (confirm('Are you sure you want to cleanup old database records?')) {
      try {
        await adminApi.post('/admin/database', { action: 'cleanup' });
        alert('Database cleanup completed');
        await loadDashboardData();
      } catch (error) {
        alert('Failed to cleanup database');
      }
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    delete adminApi.defaults.headers.common['Authorization'];
    navigate('/');
  };

  // Login screen
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
          <div className="flex items-center justify-center mb-6">
            <Shield className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white text-center mb-6">Admin Access</h2>
          
          <form onSubmit={handleAdminLogin}>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Admin Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter admin password"
                required
              />
              <p className="text-xs text-gray-500 mt-2">Default: admin123456</p>
            </div>
            
            {loginError && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md text-red-300">
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md transition-colors"
            >
              Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold">Admin Control Panel</h1>
              {configForm?.system?.maintenanceMode && (
                <span className="px-3 py-1 bg-yellow-600 rounded-md text-sm">
                  MAINTENANCE MODE
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => loadDashboardData()}
                className="p-2 hover:bg-gray-700 rounded-md transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'config', label: 'API Config', icon: Key },
              { id: 'system', label: 'System', icon: Settings },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'database', label: 'Database', icon: Database },
              { id: 'logs', label: 'Logs', icon: Activity },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboardData && (
          <div className="space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Users"
                value={dashboardData.statistics.users.total}
                change={dashboardData.statistics.users.newThisWeek}
                changeLabel="new this week"
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Active Projects"
                value={dashboardData.statistics.projects.total}
                change={dashboardData.statistics.projects.today}
                changeLabel="created today"
                icon={Package}
                color="green"
              />
              <StatCard
                title="Open Bugs"
                value={dashboardData.statistics.bugs.open}
                total={dashboardData.statistics.bugs.total}
                icon={Bug}
                color="red"
              />
              <StatCard
                title="AI Requests"
                value={dashboardData.statistics.ai.requestsToday}
                total={dashboardData.statistics.ai.totalRequests}
                icon={Code}
                color="purple"
              />
            </div>

            {/* Job Queues */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Job Queues</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(dashboardData.jobQueues).map(([queue, stats]) => (
                  <div key={queue} className="bg-gray-700 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{queue}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        stats.paused ? 'bg-yellow-600' : 'bg-green-600'
                      }`}>
                        {stats.paused ? 'Paused' : 'Running'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div>Pending: {stats.pending}</div>
                      <div>Processing: {stats.processing}</div>
                      <div>Completed: {stats.completed}</div>
                      <div>Failed: {stats.failed}</div>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => manageJobQueue(stats.paused ? 'resume' : 'pause', queue)}
                        className="text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded"
                      >
                        {stats.paused ? 'Resume' : 'Pause'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-2">
                {dashboardData.recentActivity.slice(0, 10).map((event, idx) => (
                  <div key={idx} className="flex items-center space-x-3 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      event.event_severity === 'error' ? 'bg-red-500' :
                      event.event_severity === 'warning' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <span className="text-gray-400">{new Date(event.created_at).toLocaleString()}</span>
                    <span>{event.event_description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API Configuration Tab */}
        {activeTab === 'config' && configForm && (
          <div className="space-y-6">
            {/* GitHub Configuration */}
            <ConfigSection
              title="GitHub API"
              icon={<Cloud className="h-5 w-5" />}
              fields={[
                { key: 'token', label: 'Access Token', type: 'password' },
                { key: 'rateLimit', label: 'Rate Limit', type: 'number' }
              ]}
              data={configForm.github}
              onChange={(field, value) => setConfigForm(prev => ({
                ...prev,
                github: { ...prev.github, [field]: value }
              }))}
              onSave={() => saveConfiguration('github')}
              saving={configSaving}
            />

            {/* OpenAI Configuration */}
            <ConfigSection
              title="OpenAI API"
              icon={<Code className="h-5 w-5" />}
              fields={[
                { key: 'apiKey', label: 'API Key', type: 'password' },
                { key: 'model', label: 'Model', type: 'text' },
                { key: 'maxTokens', label: 'Max Tokens', type: 'number' }
              ]}
              data={configForm.openai}
              onChange={(field, value) => setConfigForm(prev => ({
                ...prev,
                openai: { ...prev.openai, [field]: value }
              }))}
              onSave={() => saveConfiguration('openai')}
              saving={configSaving}
            />

            {/* Groq Configuration */}
            <ConfigSection
              title="Groq API"
              icon={<Code className="h-5 w-5" />}
              fields={[
                { key: 'apiKey', label: 'API Key', type: 'password' },
                { key: 'model', label: 'Model', type: 'text' }
              ]}
              data={configForm.groq}
              onChange={(field, value) => setConfigForm(prev => ({
                ...prev,
                groq: { ...prev.groq, [field]: value }
              }))}
              onSave={() => saveConfiguration('groq')}
              saving={configSaving}
            />

            {/* Gemini Configuration */}
            <ConfigSection
              title="Google Gemini API"
              icon={<Code className="h-5 w-5" />}
              fields={[
                { key: 'apiKey', label: 'API Key', type: 'password' },
                { key: 'model', label: 'Model', type: 'text' }
              ]}
              data={configForm.gemini}
              onChange={(field, value) => setConfigForm(prev => ({
                ...prev,
                gemini: { ...prev.gemini, [field]: value }
              }))}
              onSave={() => saveConfiguration('gemini')}
              saving={configSaving}
            />

            {/* Anthropic Configuration */}
            <ConfigSection
              title="Anthropic Claude API"
              icon={<Code className="h-5 w-5" />}
              fields={[
                { key: 'apiKey', label: 'API Key', type: 'password' },
                { key: 'model', label: 'Model', type: 'text' }
              ]}
              data={configForm.anthropic}
              onChange={(field, value) => setConfigForm(prev => ({
                ...prev,
                anthropic: { ...prev.anthropic, [field]: value }
              }))}
              onSave={() => saveConfiguration('anthropic')}
              saving={configSaving}
            />

            {/* Email Configuration */}
            <ConfigSection
              title="Email Service"
              icon={<Mail className="h-5 w-5" />}
              fields={[
                { key: 'provider', label: 'Provider', type: 'text' },
                { key: 'apiKey', label: 'API Key', type: 'password' },
                { key: 'fromEmail', label: 'From Email', type: 'email' }
              ]}
              data={configForm.email}
              onChange={(field, value) => setConfigForm(prev => ({
                ...prev,
                email: { ...prev.email, [field]: value }
              }))}
              onSave={() => saveConfiguration('email')}
              saving={configSaving}
            />
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === 'system' && configForm && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">System Settings</h3>
              
              {/* Maintenance Mode */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Maintenance Mode</h4>
                    <p className="text-sm text-gray-400">Enable to prevent user access during maintenance</p>
                  </div>
                  <button
                    onClick={toggleMaintenance}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      configForm.system.maintenanceMode
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {configForm.system.maintenanceMode ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>

              {/* System Limits */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Upload Size (bytes)</label>
                  <input
                    type="number"
                    value={configForm.system.maxUploadSize}
                    onChange={(e) => setConfigForm(prev => ({
                      ...prev,
                      system: { ...prev.system, maxUploadSize: parseInt(e.target.value) }
                    }))}
                    className="w-full bg-gray-700 px-3 py-2 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Session Timeout (ms)</label>
                  <input
                    type="number"
                    value={configForm.system.sessionTimeout}
                    onChange={(e) => setConfigForm(prev => ({
                      ...prev,
                      system: { ...prev.system, sessionTimeout: parseInt(e.target.value) }
                    }))}
                    className="w-full bg-gray-700 px-3 py-2 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Debug Mode</label>
                  <select
                    value={configForm.system.debugMode}
                    onChange={(e) => setConfigForm(prev => ({
                      ...prev,
                      system: { ...prev.system, debugMode: e.target.value === 'true' }
                    }))}
                    className="w-full bg-gray-700 px-3 py-2 rounded-md"
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => saveConfiguration('system')}
                disabled={configSaving}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              >
                Save System Settings
              </button>
            </div>

            {/* Database Management */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Database Management</h3>
              <div className="flex space-x-4">
                <button
                  onClick={cleanupDatabase}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors"
                >
                  <Trash2 className="inline h-4 w-4 mr-2" />
                  Cleanup Old Records
                </button>
                <button
                  onClick={() => alert('Backup functionality coming soon')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  <Download className="inline h-4 w-4 mr-2" />
                  Backup Database
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && users && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">User Management</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Created</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-gray-700">
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">{user.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.role === 'admin' ? 'bg-red-600' :
                          user.role === 'premium' ? 'bg-purple-600' :
                          'bg-gray-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-blue-400 hover:text-blue-300 mr-3">Edit</button>
                        <button className="text-red-400 hover:text-red-300">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Database Tab */}
        {activeTab === 'database' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Database Statistics</h3>
            <p className="text-gray-400">Database management interface will be displayed here</p>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && logs && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">System Logs</h3>
            <div className="space-y-2 font-mono text-sm">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    log.event_severity === 'error' ? 'bg-red-500' :
                    log.event_severity === 'warning' ? 'bg-yellow-500' :
                    log.event_severity === 'info' ? 'bg-blue-500' :
                    'bg-green-500'
                  }`} />
                  <span className="text-gray-500 flex-shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                  <span className="text-gray-400">[{log.event_type}]</span>
                  <span className="text-gray-300">{log.event_description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Usage Analytics (Last 7 Days)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">New Users</h4>
                  <div className="space-y-2">
                    {analytics.users?.map(day => (
                      <div key={day.date} className="flex justify-between">
                        <span className="text-gray-400">{day.date}</span>
                        <span>{day.new_users}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Bug Distribution</h4>
                  <div className="space-y-2">
                    {analytics.bugs?.map(bug => (
                      <div key={bug.severity} className="flex justify-between">
                        <span className="text-gray-400 capitalize">{bug.severity}</span>
                        <span>{bug.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-3">Top API Endpoints</h4>
                <div className="space-y-2">
                  {analytics.apiUsage?.map(api => (
                    <div key={api.event_type} className="flex justify-between">
                      <span className="text-gray-400">{api.event_type}</span>
                      <span>{api.count} requests</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, change, changeLabel, total, icon: Icon, color }) => {
  const colorMap = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    purple: 'bg-purple-600'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorMap[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        {change !== undefined && change > 0 && (
          <span className="text-green-400 text-sm">+{change} {changeLabel}</span>
        )}
        {total !== undefined && (
          <span className="text-gray-400 text-sm">Total: {total}</span>
        )}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-gray-400 text-sm">{title}</div>
    </div>
  );
};

// Config Section Component
const ConfigSection = ({ title, icon, fields, data, onChange, onSave, saving }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        {icon}
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
            <input
              type={field.type}
              value={data?.[field.key] || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full bg-gray-700 px-3 py-2 rounded-md"
              placeholder={field.type === 'password' ? '••••••••' : ''}
            />
          </div>
        ))}
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
      >
        <Save className="inline h-4 w-4 mr-2" />
        Save Configuration
      </button>
    </div>
  );
};

export default AdminDashboard;