import React, { useState, useEffect } from 'react';
import { Key, Github, Brain, Cloud, Shield, User, Check, X, Settings as SettingsIcon, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { aiProviderManager } from '../services/AIProviderManager.js';

const Settings = ({ user }) => {
  const [activeSection, setActiveSection] = useState('ai-platforms');
  const [credentials, setCredentials] = useState({
    openai: '',
    claude: '',
    gemini: '',
    githubToken: '',
    vercelToken: '',
    netlifyToken: ''
  });
  const [availableProviders, setAvailableProviders] = useState([]);
  const [analysisPreferences, setAnalysisPreferences] = useState({
    defaultAnalysisType: 'full-application',
    focusAreas: [],
    customInstructions: '',
    autoAnalysis: false
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
    { id: 'ai-preferences', label: 'Analysis Preferences', icon: Target },
    { id: 'repositories', label: 'Code Repositories', icon: Github },
    { id: 'deployment', label: 'Deployment', icon: Cloud },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  useEffect(() => {
    loadAvailableProviders();
  }, [credentials]);

  const loadAvailableProviders = async () => {
    try {
      const providers = await aiProviderManager.getAvailableProviders(user.id, credentials);
      setAvailableProviders(providers);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const testApiKey = async (provider, apiKey) => {
    if (!apiKey || apiKey.length < 10) {
      toast.error('Please enter a valid API key');
      return false;
    }

    try {
      const validation = await aiProviderManager.validateApiKey(provider, apiKey);
      if (validation.valid) {
        toast.success(`${validation.provider} API key validated successfully!`);
        return true;
      } else {
        toast.error(`Invalid ${provider} API key: ${validation.error}`);
        return false;
      }
    } catch (error) {
      toast.error(`Failed to validate ${provider} API key`);
      return false;
    }
  };

  const saveApiKey = async (provider, key) => {
    const isValid = await testApiKey(provider, key);
    if (isValid) {
      setCredentials(prev => ({ ...prev, [provider]: key }));
      localStorage.setItem(`debugflow_${provider}_key`, key);
      await loadAvailableProviders();
    }
  };

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
        <p className="text-gray-600">Connect your AI services for enhanced debugging capabilities. Free tier usage limits apply.</p>
      </div>

      {/* Provider Status Overview */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Provider Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableProviders.slice(0, 6).map((provider) => (
            <div key={provider.id} className="bg-white rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{provider.name}</span>
                <div className={`w-2 h-2 rounded-full ${
                  provider.status === 'available' ? 'bg-green-500' : 
                  provider.status === 'limit_reached' ? 'bg-orange-500' : 'bg-gray-400'
                }`} />
              </div>
              <div className="text-xs text-gray-600">
                {provider.tier === 'free' ? (
                  <span>Free: {provider.remainingRequests || 0} remaining</span>
                ) : provider.hasUserKey ? (
                  <span>Premium: Connected</span>
                ) : (
                  <span>Premium: Requires API key</span>
                )}
              </div>
            </div>
          ))}
        </div>
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
        <h4 className="font-medium text-blue-900 mb-2">Premium API Key Management</h4>
        <p className="text-blue-700 text-sm mb-4">
          Add your own API keys for premium features and unlimited usage. Keys are stored locally and never transmitted to our servers.
        </p>
        
        <div className="space-y-4">
          {['openai', 'claude', 'gemini'].map((provider) => {
            const providerKey = credentials[provider];
            const isConnected = providerKey && providerKey.length > 10;
            
            return (
              <div key={provider} className="bg-white rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900">
                    {provider.charAt(0).toUpperCase() + provider.slice(1)} API Key
                  </label>
                  {isConnected && (
                    <span className="inline-flex items-center text-green-600 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Connected
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    value={providerKey}
                    onChange={(e) => setCredentials(prev => ({ ...prev, [provider]: e.target.value }))}
                    placeholder={provider === 'openai' ? 'sk-...' : provider === 'claude' ? 'sk-ant-...' : 'ai-...'}
                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={() => saveApiKey(provider, providerKey)}
                    disabled={!providerKey || providerKey.length < 10}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Test
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {provider === 'openai' && 'Get your key at platform.openai.com/api-keys'}
                  {provider === 'claude' && 'Get your key at console.anthropic.com'}
                  {provider === 'gemini' && 'Get your key at ai.google.dev'}
                </p>
              </div>
            );
          })}
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

  const renderAIPreferences = () => {
    const analysisTypes = {
      'full-application': {
        name: 'Full Application Analysis',
        description: 'Comprehensive analysis of entire codebase'
      },
      'single-file': {
        name: 'Single File Analysis',
        description: 'Focused analysis of specific files'
      },
      'targeted-bug-fix': {
        name: 'Targeted Bug Fix',
        description: 'Debug and fix specific issues'
      },
      'security-audit': {
        name: 'Security Audit',
        description: 'Security-focused vulnerability analysis'
      },
      'performance-optimization': {
        name: 'Performance Optimization',
        description: 'Performance bottleneck identification'
      }
    };

    const focusAreaOptions = [
      'Security vulnerabilities',
      'Performance optimizations',
      'Code quality improvements',
      'Architecture patterns',
      'Error handling',
      'Documentation',
      'Testing coverage',
      'Accessibility',
      'Mobile responsiveness',
      'Database optimization'
    ];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analysis Preferences</h3>
          <p className="text-gray-600">Customize how AI analyzes your code and what areas to focus on</p>
        </div>

        {/* Default Analysis Type */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Default Analysis Type</h4>
          <div className="space-y-3">
            {Object.entries(analysisTypes).map(([type, info]) => (
              <label key={type} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="defaultAnalysisType"
                  value={type}
                  checked={analysisPreferences.defaultAnalysisType === type}
                  onChange={(e) => setAnalysisPreferences(prev => ({ ...prev, defaultAnalysisType: e.target.value }))}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">{info.name}</div>
                  <div className="text-sm text-gray-600">{info.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Focus Areas */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Analysis Focus Areas</h4>
          <p className="text-sm text-gray-600 mb-4">Select areas you want AI to prioritize during analysis</p>
          <div className="grid grid-cols-2 gap-3">
            {focusAreaOptions.map((area) => (
              <label key={area} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={analysisPreferences.focusAreas.includes(area)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAnalysisPreferences(prev => ({
                        ...prev,
                        focusAreas: [...prev.focusAreas, area]
                      }));
                    } else {
                      setAnalysisPreferences(prev => ({
                        ...prev,
                        focusAreas: prev.focusAreas.filter(f => f !== area)
                      }));
                    }
                  }}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">{area}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Custom Analysis Instructions</h4>
          <p className="text-sm text-gray-600 mb-3">
            Provide specific instructions to guide AI analysis (e.g., "Focus on React hooks optimization" or "Prioritize SQL injection prevention")
          </p>
          <textarea
            value={analysisPreferences.customInstructions}
            onChange={(e) => setAnalysisPreferences(prev => ({ ...prev, customInstructions: e.target.value }))}
            placeholder="Enter custom analysis instructions..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 h-24 text-sm"
          />
        </div>

        {/* Auto Analysis */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Auto Analysis</h4>
              <p className="text-sm text-gray-600">Automatically analyze new projects and files when uploaded</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={analysisPreferences.autoAnalysis}
                onChange={(e) => setAnalysisPreferences(prev => ({ ...prev, autoAnalysis: e.target.checked }))}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full shadow-inner transition-colors duration-300 ${
                analysisPreferences.autoAnalysis ? 'bg-blue-600' : 'bg-gray-300'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-300 ${
                  analysisPreferences.autoAnalysis ? 'translate-x-6' : 'translate-x-1'
                } mt-1`} />
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={() => {
              localStorage.setItem('debugflow_analysis_preferences', JSON.stringify(analysisPreferences));
              toast.success('Analysis preferences saved!');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Preferences
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentSection = () => {
    switch (activeSection) {
      case 'ai-platforms':
        return renderAIPlatforms();
      case 'ai-preferences':
        return renderAIPreferences();
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
