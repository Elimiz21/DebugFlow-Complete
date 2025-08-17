import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Server-side AI handler for processing analysis requests
 * Handles API keys and provider-specific implementations
 */
export class AIHandler {
  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  initializeProviders() {
    // Free tier configurations - using server-side env variables
    this.providers.set('openai-free', {
      name: 'OpenAI GPT-3.5 Turbo (Free)',
      model: 'gpt-3.5-turbo',
      apiKey: process.env.DEBUGFLOW_OPENAI_FREE_KEY,
      tier: 'free'
    });

    this.providers.set('groq-free', {
      name: 'Groq Llama 3.1 (Free)',
      model: 'llama-3.1-70b-versatile',
      apiKey: process.env.DEBUGFLOW_GROQ_FREE_KEY,
      tier: 'free'
    });

    this.providers.set('gemini-free', {
      name: 'Google Gemini Flash (Free)',
      model: 'gemini-1.5-flash',
      apiKey: process.env.DEBUGFLOW_GEMINI_FREE_KEY,
      tier: 'free'
    });

    // Premium tier configurations
    this.providers.set('openai-premium', {
      name: 'OpenAI GPT-4o',
      model: 'gpt-4o',
      tier: 'premium',
      requiresUserKey: true
    });

    this.providers.set('claude-premium', {
      name: 'Anthropic Claude 3.5 Sonnet',
      model: 'claude-3-5-sonnet-20241022',
      tier: 'premium',
      requiresUserKey: true
    });
  }

  /**
   * Process AI analysis request
   */
  async processAnalysis({
    providerId,
    systemPrompt,
    analysisPrompt,
    options = {},
    userApiKeys = {}
  }) {
    try {
      const providerConfig = this.providers.get(providerId);
      if (!providerConfig) {
        throw new Error(`Unknown provider: ${providerId}`);
      }

      // Get API key
      let apiKey = providerConfig.apiKey;
      if (providerConfig.requiresUserKey) {
        const keyType = providerId.split('-')[0]; // Extract provider type
        apiKey = userApiKeys[keyType];
        if (!apiKey) {
          throw new Error(`User API key required for ${providerId}`);
        }
      }

      // For demo/development, use a mock response if no API key
      if (!apiKey || apiKey === 'demo-key') {
        return this.getMockResponse(providerId, analysisPrompt);
      }

      // Execute based on provider type
      if (providerId.includes('openai')) {
        return await this.executeOpenAI(providerConfig, apiKey, systemPrompt, analysisPrompt, options);
      } else if (providerId.includes('groq')) {
        return await this.executeGroq(providerConfig, apiKey, systemPrompt, analysisPrompt, options);
      } else if (providerId.includes('gemini')) {
        return await this.executeGemini(providerConfig, apiKey, systemPrompt, analysisPrompt, options);
      } else if (providerId.includes('claude')) {
        return await this.executeClaude(providerConfig, apiKey, systemPrompt, analysisPrompt, options);
      }

      throw new Error(`Provider ${providerId} not yet implemented`);

    } catch (error) {
      console.error('AI Handler Error:', error);
      throw error;
    }
  }

  /**
   * OpenAI execution
   */
  async executeOpenAI(config, apiKey, systemPrompt, analysisPrompt, options) {
    const client = new OpenAI({ apiKey });
    
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: options.temperature || 0.1,
      max_tokens: options.maxTokens || 4000,
      response_format: options.responseFormat ? { type: 'json_object' } : undefined
    });

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: config.model,
      provider: 'openai'
    };
  }

  /**
   * Groq execution - Fast LLM inference
   */
  async executeGroq(config, apiKey, systemPrompt, analysisPrompt, options) {
    try {
      const groq = new Groq({
        apiKey: apiKey || process.env.GROQ_API_KEY
      });

      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: analysisPrompt }
        ],
        model: config.model || 'llama3-8b-8192',
        temperature: options.temperature || 0.3,
        max_tokens: options.maxTokens || 2000,
        top_p: 1,
        stream: false
      });

      return {
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage,
        model: config.model || 'llama3-8b-8192',
        provider: 'groq'
      };
    } catch (error) {
      console.error('Groq API error:', error);
      // Fall back to mock response if API fails
      return this.getMockResponse('groq', analysisPrompt);
    }
  }

  /**
   * Gemini execution - Google's AI model
   */
  async executeGemini(config, apiKey, systemPrompt, analysisPrompt, options) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey || process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ 
        model: config.model || 'gemini-1.5-flash' 
      });

      const prompt = `${systemPrompt}\n\n${analysisPrompt}`;
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature || 0.3,
          maxOutputTokens: options.maxTokens || 2000,
          topP: 0.95,
          topK: 40
        }
      });

      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        usage: {
          prompt_tokens: prompt.length / 4, // Rough estimate
          completion_tokens: text.length / 4,
          total_tokens: (prompt.length + text.length) / 4
        },
        model: config.model || 'gemini-1.5-flash',
        provider: 'gemini'
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fall back to mock response if API fails
      return this.getMockResponse('gemini', analysisPrompt);
    }
  }

  /**
   * Claude execution - Anthropic's AI model
   */
  async executeClaude(config, apiKey, systemPrompt, analysisPrompt, options) {
    try {
      const anthropic = new Anthropic({
        apiKey: apiKey || process.env.ANTHROPIC_API_KEY || ''
      });

      const message = await anthropic.messages.create({
        model: config.model || 'claude-3-haiku-20240307',
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      });

      return {
        content: message.content[0].text,
        usage: {
          prompt_tokens: message.usage?.input_tokens || 0,
          completion_tokens: message.usage?.output_tokens || 0,
          total_tokens: (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0)
        },
        model: config.model || 'claude-3-haiku-20240307',
        provider: 'claude'
      };
    } catch (error) {
      console.error('Claude API error:', error);
      // Fall back to mock response if API fails
      return this.getMockResponse('claude', analysisPrompt);
    }
  }

  /**
   * Mock response for development/demo
   */
  getMockResponse(provider, prompt) {
    return {
      content: JSON.stringify({
        analysis_summary: "Mock analysis result for development/demo purposes",
        confidence_score: 0.85,
        total_issues: 3,
        critical_issues: 1,
        recommendations: [
          {
            id: "mock_issue_1",
            severity: "HIGH",
            category: "security",
            title: "Example Security Issue (Mock)",
            description: "This is a mock security issue for demonstration",
            file_path: "example.js",
            line_number: 42,
            code_snippet: "// Example code",
            solution: "// Fixed code example",
            impact: "Could lead to security vulnerabilities"
          },
          {
            id: "mock_issue_2",
            severity: "MEDIUM",
            category: "performance",
            title: "Example Performance Issue (Mock)",
            description: "This is a mock performance issue",
            file_path: "example.js",
            line_number: 100,
            code_snippet: "// Slow code",
            solution: "// Optimized code",
            impact: "May cause performance degradation"
          }
        ],
        metrics: {
          lines_of_code: 500,
          complexity_score: 6.5,
          estimated_fix_time: "2 hours"
        }
      }),
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300
      },
      model: provider,
      provider: provider
    };
  }

  /**
   * Validate API key
   */
  async validateApiKey(provider, apiKey) {
    try {
      if (provider === 'openai') {
        const client = new OpenAI({ apiKey });
        await client.models.list();
        return { valid: true, provider: 'OpenAI' };
      }
      
      // TODO: Add validation for other providers
      
      return { valid: false, error: 'Provider validation not implemented' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

export const aiHandler = new AIHandler();