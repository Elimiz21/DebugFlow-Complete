import React, { useState } from 'react';
import { Key, Github, Brain, Cloud, Shield, User, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = ({ user }) => {
  const [activeSection, setActiveSection] = useState('ai-platforms');
  const [credentials, setCredentials] = useState({
    openaiKey: '',
    claudeKey: '',
    geminiKey: '',
    githubToken: '',
    vercelToken: '',
    netlifyToken: ''
  });

  const [integrations, setIntegrations] = useState({
    aiPlatforms: [
      { name: 'OpenAI GPT-4', status: 'not-connected', features: ['Bug Analysis', 'Code Generation', 'Fix Recommendations'] },
      { name: 'Claude', status: 'not-connected', features: ['Code Review', 'Refactoring', 'Documentation'] },
      { name: 'Google Gemini', status: 'not-connected', features: ['Multi-language Support', 'Code Translation'] }
    ],
    repositories: [
      { name: 'GitHub', status: 'not-connected', permissions: 'none', username: '' },
      { name: 'GitLab', status: 'not-connected', permissions: 'none' },
      { name: 'Bitbucket', status: 'not-connected', permissions: 'none' }
    ],
    deployment: [
      { name: 'Vercel', status: 'not-connected', projects: 0 },
      { name: 'Netlify', status: 'not-connected', projects: 0 },
      { name: 'AWS', status: 'not-connected', projects: 0 }
    ]
  });

  const sections = [
    { id: 'ai-platforms', label: 'AI Platforms', icon: Brain },
    { id: 'repositories', label: 'Code Repositories', icon: Github },
    { id: 'deployment', label: 'Deployment', icon: Cloud },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const connectIntegration = async (type, name) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIntegrations(prev => ({
        ...prev,
        [type]: prev[type].map(item => 
          item.name === name 
            ? { ...item, status: 'connected' }
            : item
        )
      }));
      
      toast.success(`${name} connected successfully!`);
    } catch (error) {
      toast.error(`Failed to connect ${name}`);
    }
  };

  const disconnectIntegration = async (type, name) => {
    try {
      setIntegrations(prev => ({
        ...prev,
        [type]: prev[type].map(item => 
          item.name === name 
            ? { ...item, status: 'not-connected' }
            : item
        )
      }));
      
      toast.success(`${name} disconnected`);
    } catch (error) {
      toast.error(`Failed to disconnect ${name}`);
    }
  };

  const renderAIPlatforms = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">AI Platform Integrations</h3>
        <p className="text-gray-600">Connect your AI services for enhanced debugging capabilities</p>
      </div>

      <div className="space-y-4">
        {integrations.aiPlatforms.map((platform) => (
          <div key={platform.name} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Brain className="h-8 w-8 text-purple-600" />
                <div>
                  <h4 className="font-medium text-gray-900">{platform.name}</h4>
                  <div className="flex items-center space-x-2">
                    {platform.status === 'connected' ? (
                      <span className="inline-flex items-center text-green-600 text-sm">
                        <Check className="h-4 w-4 mr-1" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-500 text-sm">
                        <X className="h-4 w-4 mr-1" />
                        Not Connected
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {platform.status === 'connected' ? (
                <button
                  onClick={() => disconnectIntegration('aiPlatforms', platform.name)}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => connectIntegration('aiPlatforms', platform.name)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Connect
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              <strong>Features:</strong> {platform.features.join(', ')}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">API Key Management</h4>
        <p className="text-blue-700 text-sm mb-4">
          Securely store your API keys. Keys are encrypted and never stored in plain text.
        </p>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">OpenAI API Key</label>
            <input
              type="password"
              value={credentials.openaiKey}
              onChange={(e) => setCredentials(prev => ({ ...prev, openaiKey: e.target.value }))}
              placeholder="sk-..."
              className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">Claude API Key</label>
            <input
              type="password"
              value={credentials.claudeKey}
              onChange={(e) => setCredentials(prev => ({ ...prev, claudeKey: e.target.value }))}
              placeholder="sk-ant-..."
              className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderRepositories = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Code Repository Access</h3>
        <p className="text-gray-600">Connect your code repositories for automatic bug fixing</p>
      </div>

      <div className="space-y-4">
        {integrations.repositories.map((repo) => (
          <div key={repo.name} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Github className="h-8 w-8 text-gray-700" />
                <div>
                  <h4 className="font-medium text-gray-900">{repo.name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className={`inline-flex items-center ${
                      repo.status === 'connected' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {repo.status === 'connected' ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}
                      {repo.status === 'connected' ? 'Connected' : 'Not Connected'}
                    </span>
                    {repo.status === 'connected' && (
                      <>
                        <span>•</span>
                        <span>{repo.permissions}</span>
                        {repo.username && (
                          <>
                            <span>•</span>
                            <span>@{repo.username}</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {repo.status === 'connected' ? (
                <button
                  onClick={() => disconnectIntegration('repositories', repo.name)}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => connectIntegration('repositories', repo.name)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCurrentSection = () => {
    switch (activeSection) {
      case 'ai-platforms':
        return renderAIPlatforms();
      case 'repositories':
        return renderRepositories();
      case 'deployment':
        return (
          <div className="text-center py-12">
            <Cloud className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Deployment Settings</h3>
            <p className="text-gray-600">Configure your deployment platform integrations</p>
          </div>
        );
      case 'security':
        return (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Security Settings</h3>
            <p className="text-gray-600">Manage your security preferences and access controls</p>
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Settings</h3>
              <p className="text-gray-600">Manage your account information</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{user.name}</h4>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={user.name}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={user.email}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return renderAIPlatforms();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your integrations and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors ${
                  activeSection === id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow p-6">
            {renderCurrentSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
