import database from '../database/database.js';
import { verifyToken } from '../utils/auth.js';

/**
 * Multi-Provider AI Analysis API Endpoint
 * Handles AI analysis requests with support for multiple providers:
 * - OpenAI (Free & Premium)
 * - Groq (Free)
 * - Google Gemini (Free & Premium) 
 * - Anthropic Claude (Premium)
 */

class MultiProviderAIManager {
  constructor() {
    this.providers = {
      'openai-free': {
        name: 'OpenAI GPT-3.5 Turbo',
        model: 'gpt-3.5-turbo',
        tier: 'free',
        execute: this.executeOpenAI.bind(this)
      },
      'openai-premium': {
        name: 'OpenAI GPT-4o',
        model: 'gpt-4o',
        tier: 'premium',
        execute: this.executeOpenAI.bind(this)
      },
      'groq-free': {
        name: 'Groq Llama 3.1',
        model: 'llama-3.1-70b-versatile',
        tier: 'free',
        execute: this.executeGroq.bind(this)
      },
      'gemini-free': {
        name: 'Google Gemini Flash',
        model: 'gemini-1.5-flash',
        tier: 'free',
        execute: this.executeGemini.bind(this)
      },
      'gemini-premium': {
        name: 'Google Gemini Pro',
        model: 'gemini-1.5-pro', 
        tier: 'premium',
        execute: this.executeGemini.bind(this)
      },
      'claude-premium': {
        name: 'Anthropic Claude 3.5 Sonnet',
        model: 'claude-3-5-sonnet-20241022',
        tier: 'premium',
        execute: this.executeClaude.bind(this)
      }
    };
  }

  /**
   * Execute OpenAI analysis
   */
  async executeOpenAI(providerId, systemPrompt, analysisPrompt, userApiKey) {
    const provider = this.providers[providerId];
    const apiKey = providerId.includes('premium') ? userApiKey : process.env.DEBUGFLOW_OPENAI_FREE_KEY;
    
    if (!apiKey) {
      throw new Error(`${provider.name} API key not available`);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.7,
        max_tokens: providerId.includes('premium') ? 4000 : 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens
      },
      model: provider.model,
      provider: 'openai'
    };
  }

  /**
   * Execute Groq analysis
   */
  async executeGroq(providerId, systemPrompt, analysisPrompt, userApiKey) {
    const provider = this.providers[providerId];
    const apiKey = process.env.DEBUGFLOW_GROQ_FREE_KEY; // Groq only has free tier in our setup
    
    if (!apiKey) {
      throw new Error(`${provider.name} API key not available`);
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens
      },
      model: provider.model,
      provider: 'groq'
    };
  }

  /**
   * Execute Gemini analysis
   */
  async executeGemini(providerId, systemPrompt, analysisPrompt, userApiKey) {
    const provider = this.providers[providerId];
    const apiKey = providerId.includes('premium') ? userApiKey : process.env.DEBUGFLOW_GEMINI_FREE_KEY;
    
    if (!apiKey) {
      throw new Error(`${provider.name} API key not available`);
    }

    // Combine system prompt and analysis prompt for Gemini
    const fullPrompt = `${systemPrompt}\n\nTask: ${analysisPrompt}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: providerId.includes('premium') ? 4000 : 2000
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid Gemini API response format');
    }

    return {
      content: data.candidates[0].content.parts[0].text,
      usage: {
        prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
        completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        total_tokens: data.usageMetadata?.totalTokenCount || 0
      },
      model: provider.model,
      provider: 'gemini'
    };
  }

  /**
   * Execute Claude analysis
   */
  async executeClaude(providerId, systemPrompt, analysisPrompt, userApiKey) {
    const provider = this.providers[providerId];
    
    if (!userApiKey) {
      throw new Error(`${provider.name} requires user API key`);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': userApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0].text,
      usage: {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens
      },
      model: provider.model,
      provider: 'claude'
    };
  }

  /**
   * Validate API key for a provider
   */
  async validateApiKey(provider, apiKey) {
    try {
      switch (provider) {
        case 'openai':
          const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
          });
          return { valid: openaiResponse.ok, error: openaiResponse.ok ? null : 'Invalid OpenAI API key' };

        case 'claude':
          const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 10,
              messages: [{ role: 'user', content: 'test' }]
            })
          });
          return { valid: claudeResponse.ok, error: claudeResponse.ok ? null : 'Invalid Claude API key' };

        case 'gemini':
          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          return { valid: geminiResponse.ok, error: geminiResponse.ok ? null : 'Invalid Gemini API key' };

        default:
          return { valid: false, error: `Unknown provider: ${provider}` };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

const aiManager = new MultiProviderAIManager();

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Handle different POST actions
      const action = req.url.includes('/analyze') ? 'analyze' : 
                     req.url.includes('/validate-key') ? 'validate-key' : 'unknown';

      if (action === 'analyze') {
        // Verify authentication for analysis
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        
        if (!decoded) {
          return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
          });
        }

        const { providerId, systemPrompt, analysisPrompt, userApiKeys, options } = req.body;

        if (!providerId || !analysisPrompt) {
          return res.status(400).json({
            success: false,
            message: 'providerId and analysisPrompt are required'
          });
        }

        const provider = aiManager.providers[providerId];
        if (!provider) {
          return res.status(400).json({
            success: false,
            message: `Unknown provider: ${providerId}`
          });
        }

        // Get the appropriate API key
        let apiKey = null;
        if (provider.tier === 'premium') {
          const keyMap = {
            'openai-premium': userApiKeys?.openai,
            'claude-premium': userApiKeys?.claude,
            'gemini-premium': userApiKeys?.gemini
          };
          apiKey = keyMap[providerId];
        }

        try {
          const startTime = Date.now();
          const result = await provider.execute(
            providerId,
            systemPrompt || 'You are DebugFlow AI, an expert code analysis assistant.',
            analysisPrompt,
            apiKey
          );

          const duration = Date.now() - startTime;

          // Save analysis to database if project_id provided
          if (options?.project_id) {
            await database.run(`
              INSERT INTO ai_analyses (project_id, provider, analysis_type, input_data, result, tokens_used, duration_ms)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              options.project_id,
              result.provider,
              options.analysisType || 'general',
              JSON.stringify({ systemPrompt, analysisPrompt }),
              JSON.stringify(result),
              result.usage.total_tokens,
              duration
            ]);
          }

          return res.status(200).json({
            success: true,
            data: {
              content: result.content,
              usage: result.usage,
              provider: result.provider,
              model: result.model,
              duration
            }
          });

        } catch (error) {
          console.error(`AI Analysis error for ${providerId}:`, error);
          return res.status(500).json({
            success: false,
            message: `AI analysis failed: ${error.message}`
          });
        }

      } else if (action === 'validate-key') {
        // API key validation
        const { provider, apiKey } = req.body;

        if (!provider || !apiKey) {
          return res.status(400).json({
            success: false,
            message: 'provider and apiKey are required'
          });
        }

        const validation = await aiManager.validateApiKey(provider, apiKey);
        
        return res.status(200).json({
          success: true,
          data: validation
        });

      } else {
        return res.status(400).json({
          success: false,
          message: 'Unknown action'
        });
      }

    } else if (req.method === 'GET') {
      // Get available providers info
      return res.status(200).json({
        success: true,
        data: {
          providers: Object.keys(aiManager.providers).map(id => ({
            id,
            ...aiManager.providers[id],
            execute: undefined // Don't expose function
          }))
        }
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('AI API Error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}