// Note: AI clients are now handled server-side via API

/**
 * Multi-Provider AI Management System
 * Handles free tier usage limits and user API keys
 */

export class AIProviderManager {
  constructor() {
    this.providers = new Map();
    this.userUsage = new Map();
    this.freeTierLimits = {
      'openai-free': { limit: 500, window: 'month' },
      'groq-free': { limit: 2000, window: 'month' },
      'gemini-free': { limit: 1000, window: 'month' }
    };
    
    this.initializeProviders();
  }

  initializeProviders() {
    // Free tier providers (built-in API keys)
    // Note: These will be populated from server-side config
    this.providers.set('openai-free', {
      name: 'OpenAI GPT-3.5 Turbo (Free)',
      model: 'gpt-3.5-turbo',
      tier: 'free',
      apiKey: null, // Will be handled server-side
      costPerToken: 0,
      features: ['code-analysis', 'bug-detection', 'simple-fixes'],
      initialized: false
    });

    this.providers.set('groq-free', {
      name: 'Groq Llama 3.1 (Free)',
      model: 'llama-3.1-70b-versatile',
      tier: 'free', 
      apiKey: null, // Will be handled server-side
      costPerToken: 0,
      features: ['code-analysis', 'performance-optimization'],
      initialized: false
    });

    this.providers.set('gemini-free', {
      name: 'Google Gemini Flash (Free)',
      model: 'gemini-1.5-flash',
      tier: 'free',
      apiKey: null, // Will be handled server-side
      costPerToken: 0,
      features: ['code-analysis', 'security-audit'],
      initialized: false
    });

    // Premium providers (user API keys)
    this.providers.set('openai-premium', {
      name: 'OpenAI GPT-4o',
      model: 'gpt-4o',
      tier: 'premium',
      features: ['advanced-analysis', 'complex-fixes', 'architectural-review'],
      costPerToken: 0.005,
      requiresUserKey: true,
      initialized: false
    });

    this.providers.set('claude-premium', {
      name: 'Anthropic Claude 3.5 Sonnet', 
      model: 'claude-3-5-sonnet-20241022',
      tier: 'premium',
      features: ['code-reasoning', 'complex-debugging', 'refactoring'],
      costPerToken: 0.003,
      requiresUserKey: true,
      initialized: false
    });

    this.providers.set('gemini-premium', {
      name: 'Google Gemini Pro',
      model: 'gemini-1.5-pro',
      tier: 'premium',
      features: ['multimodal-analysis', 'large-codebase-analysis'],
      costPerToken: 0.002,
      requiresUserKey: true,
      initialized: false
    });
  }

  /**
   * Get available providers for a user
   */
  async getAvailableProviders(userId, userApiKeys = {}) {
    const available = [];
    
    for (const [providerId, config] of this.providers) {
      if (config.tier === 'free') {
        const usage = await this.getUserUsage(userId, providerId);
        const limit = this.freeTierLimits[providerId];
        
        if (usage < limit.limit) {
          available.push({
            id: providerId,
            ...config,
            remainingRequests: limit.limit - usage,
            status: 'available'
          });
        } else {
          available.push({
            id: providerId,
            ...config,
            remainingRequests: 0,
            status: 'limit_reached'
          });
        }
      } else if (config.tier === 'premium') {
        const hasUserKey = this.hasValidUserKey(providerId, userApiKeys);
        available.push({
          id: providerId,
          ...config,
          status: hasUserKey ? 'available' : 'requires_api_key',
          hasUserKey
        });
      }
    }
    
    return available.sort((a, b) => {
      // Prioritize available premium providers, then available free providers
      if (a.status === 'available' && b.status !== 'available') return -1;
      if (b.status === 'available' && a.status !== 'available') return 1;
      if (a.tier === 'premium' && b.tier === 'free') return -1;
      if (b.tier === 'premium' && a.tier === 'free') return 1;
      return 0;
    });
  }

  /**
   * Select optimal provider for analysis type
   */
  async selectProvider(userId, analysisType, userApiKeys = {}) {
    const available = await this.getAvailableProviders(userId, userApiKeys);
    const availableProviders = available.filter(p => p.status === 'available');
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available. Please add API keys or wait for free tier reset.');
    }

    // Provider selection logic based on analysis type
    const analysisTypePreferences = {
      'full-application': ['claude-premium', 'openai-premium', 'gemini-premium', 'openai-free'],
      'single-file': ['openai-premium', 'claude-premium', 'openai-free', 'groq-free'],
      'bug-fix': ['claude-premium', 'openai-premium', 'openai-free', 'groq-free'],
      'security-audit': ['claude-premium', 'gemini-premium', 'gemini-free', 'openai-premium'],
      'performance-optimization': ['groq-free', 'openai-premium', 'claude-premium']
    };

    const preferences = analysisTypePreferences[analysisType] || ['openai-free'];
    
    // Find first available provider from preferences
    for (const preferred of preferences) {
      const provider = availableProviders.find(p => p.id === preferred);
      if (provider) {
        return provider;
      }
    }

    // Fallback to first available provider
    return availableProviders[0];
  }

  /**
   * Initialize AI client for specific provider
   */
  async initializeProvider(providerId, userApiKey = null) {
    const config = this.providers.get(providerId);
    if (!config) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    // For client-side, we just mark as initialized
    // Actual initialization happens server-side
    config.initialized = true;
    config.userApiKey = userApiKey;
    
    return true;
  }

  /**
   * Execute AI analysis with provider (via server API)
   */
  async executeAnalysis(providerId, prompt, options = {}) {
    const config = this.providers.get(providerId);
    if (!config) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const startTime = Date.now();
    
    try {
      // Get auth token
      const token = localStorage.getItem('debugflow_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Build user API keys object
      const userApiKeys = {
        openai: localStorage.getItem('debugflow_openai_key') || '',
        claude: localStorage.getItem('debugflow_claude_key') || '',
        gemini: localStorage.getItem('debugflow_gemini_key') || ''
      };

      // Make request to server API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          providerId,
          systemPrompt: prompt.systemPrompt || 'You are DebugFlow AI, an expert code analysis assistant.',
          analysisPrompt: prompt.analysisPrompt || prompt,
          options,
          userApiKeys
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Analysis failed');
      }

      const duration = Date.now() - startTime;
      
      // Track usage for free tier providers
      if (config.tier === 'free') {
        await this.trackUsage(options.userId, providerId, {
          tokens: result.data.usage?.total_tokens || 1000,
          cost: 0,
          duration
        });
      }

      return {
        success: true,
        provider: providerId,
        response: result.data.content,
        usage: result.data.usage,
        duration,
        model: config.model
      };
      
    } catch (error) {
      console.error(`AI analysis failed for ${providerId}:`, error);
      
      return {
        success: false,
        provider: providerId,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  // Individual provider execution methods removed - now handled server-side

  /**
   * Track usage for rate limiting
   */
  async trackUsage(userId, providerId, metrics) {
    const key = `${userId}:${providerId}`;
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    if (!this.userUsage.has(key)) {
      this.userUsage.set(key, {});
    }
    
    const userProviderUsage = this.userUsage.get(key);
    if (!userProviderUsage[currentMonth]) {
      userProviderUsage[currentMonth] = { requests: 0, tokens: 0, cost: 0 };
    }
    
    userProviderUsage[currentMonth].requests += 1;
    userProviderUsage[currentMonth].tokens += metrics.tokens;
    userProviderUsage[currentMonth].cost += metrics.cost;
    
    // In production, store this in database
    console.log(`Usage tracked for ${userId}:${providerId}:`, userProviderUsage[currentMonth]);
  }

  /**
   * Get user's current usage
   */
  async getUserUsage(userId, providerId) {
    const key = `${userId}:${providerId}`;
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    const userProviderUsage = this.userUsage.get(key);
    if (!userProviderUsage || !userProviderUsage[currentMonth]) {
      return 0;
    }
    
    return userProviderUsage[currentMonth].requests;
  }

  /**
   * Check if user has valid API key for provider
   */
  hasValidUserKey(providerId, userApiKeys) {
    const keyMap = {
      'openai-premium': 'openai',
      'claude-premium': 'claude',
      'gemini-premium': 'gemini'
    };
    
    const keyName = keyMap[providerId];
    return keyName && userApiKeys[keyName] && userApiKeys[keyName].length > 10;
  }

  /**
   * Validate API key for provider
   */
  async validateApiKey(provider, apiKey) {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/ai/validate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, apiKey })
      });

      const result = await response.json();
      return result.data || { valid: false, error: 'Validation failed' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get provider statistics
   */
  getProviderStats() {
    return {
      totalProviders: this.providers.size,
      freeProviders: Array.from(this.providers.values()).filter(p => p.tier === 'free').length,
      premiumProviders: Array.from(this.providers.values()).filter(p => p.tier === 'premium').length,
      initializedProviders: Array.from(this.providers.values()).filter(p => p.initialized).length
    };
  }
}

// Export singleton instance
export const aiProviderManager = new AIProviderManager();