import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// AI Service for code analysis and bug detection
class AIService {
  constructor() {
    // Initialize OpenAI
    this.openai = process.env.OPENAI_API_KEY 
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;
    
    // Initialize Anthropic Claude
    this.anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    
    // Default to using whichever is available
    this.preferredProvider = this.anthropic ? 'anthropic' : (this.openai ? 'openai' : null);
  }

  // Check if AI services are available
  isAvailable() {
    return this.openai !== null || this.anthropic !== null;
  }

  // Analyze code for bugs and issues
  async analyzeCode(code, language = 'javascript', options = {}) {
    if (!this.isAvailable()) {
      return this.mockAnalysis(code, language);
    }

    const prompt = this.buildAnalysisPrompt(code, language, options);
    
    try {
      if (this.preferredProvider === 'anthropic' && this.anthropic) {
        return await this.analyzeWithClaude(prompt, code, language);
      } else if (this.openai) {
        return await this.analyzeWithOpenAI(prompt, code, language);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      return this.mockAnalysis(code, language);
    }
  }

  // Build analysis prompt
  buildAnalysisPrompt(code, language, options) {
    const { 
      focusAreas = ['bugs', 'security', 'performance', 'best-practices'],
      context = '',
      severity = 'all'
    } = options;

    return `Analyze the following ${language} code for potential issues.

Focus on: ${focusAreas.join(', ')}
${context ? `Context: ${context}` : ''}
${severity !== 'all' ? `Report only ${severity} severity issues` : ''}

Please provide a structured analysis with:
1. List of identified issues with severity (critical/high/medium/low)
2. Specific line numbers where issues occur
3. Brief description of each issue
4. Suggested fixes for each issue
5. Overall code quality score (0-100)

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

Return the response in JSON format.`;
  }

  // Analyze with Claude
  async analyzeWithClaude(prompt, code, language) {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 2000,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0].text;
      
      // Try to parse JSON response
      try {
        return JSON.parse(content);
      } catch {
        // If not JSON, structure the response
        return this.structureTextResponse(content, code, language);
      }
    } catch (error) {
      console.error('Claude analysis error:', error);
      throw error;
    }
  }

  // Analyze with OpenAI
  async analyzeWithOpenAI(prompt, code, language) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert code analyzer. Provide detailed analysis of code issues and suggestions for improvements. Always respond in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch {
        return this.structureTextResponse(content, code, language);
      }
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      throw error;
    }
  }

  // Generate fix suggestions
  async generateFix(code, issue, language = 'javascript') {
    if (!this.isAvailable()) {
      return this.mockFix(code, issue, language);
    }

    const prompt = `Given the following ${language} code with an issue, provide a fixed version.

Issue: ${issue.description}
Line: ${issue.line_number}
Severity: ${issue.severity}

Original code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. The fixed code
2. Explanation of what was changed
3. Why this fix resolves the issue

Return as JSON with fields: fixed_code, changes, explanation`;

    try {
      if (this.preferredProvider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 2000,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }]
        });
        
        const content = response.content[0].text;
        return JSON.parse(content);
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'You are an expert code fixer. Provide corrected code with explanations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0,
          response_format: { type: 'json_object' }
        });
        
        return JSON.parse(response.choices[0].message.content);
      }
    } catch (error) {
      console.error('Fix generation error:', error);
      return this.mockFix(code, issue, language);
    }
  }

  // Generate code suggestions
  async generateSuggestions(code, language = 'javascript', context = '') {
    if (!this.isAvailable()) {
      return this.mockSuggestions(code, language);
    }

    const prompt = `Analyze this ${language} code and provide improvement suggestions.

${context ? `Context: ${context}` : ''}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide 3-5 specific suggestions for:
1. Performance optimizations
2. Code readability improvements
3. Best practices
4. Potential refactoring opportunities

Format as JSON with an array of suggestions, each containing: type, description, priority, example`;

    try {
      if (this.preferredProvider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 1500,
          temperature: 0.3,
          messages: [{ role: 'user', content: prompt }]
        });
        
        return JSON.parse(response.content[0].text);
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'You are a code improvement expert.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        });
        
        return JSON.parse(response.choices[0].message.content);
      }
    } catch (error) {
      console.error('Suggestions generation error:', error);
      return this.mockSuggestions(code, language);
    }
  }

  // Explain code functionality
  async explainCode(code, language = 'javascript') {
    if (!this.isAvailable()) {
      return { explanation: 'AI service not configured. This code appears to be a ' + language + ' implementation.' };
    }

    const prompt = `Explain what this ${language} code does in simple terms.

Code:
\`\`\`${language}
${code}
\`\`\`

Provide:
1. Overall purpose
2. Step-by-step breakdown
3. Key concepts used
4. Potential use cases`;

    try {
      if (this.preferredProvider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 1000,
          temperature: 0.5,
          messages: [{ role: 'user', content: prompt }]
        });
        
        return { explanation: response.content[0].text };
      } else if (this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: 'You are a code explanation expert. Explain code clearly and concisely.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5
        });
        
        return { explanation: response.choices[0].message.content };
      }
    } catch (error) {
      console.error('Code explanation error:', error);
      return { explanation: 'Unable to generate explanation at this time.' };
    }
  }

  // Structure text response into JSON
  structureTextResponse(text, code, language) {
    // Basic parsing to extract issues from text
    const lines = text.split('\n');
    const issues = [];
    let qualityScore = 75;

    for (const line of lines) {
      if (line.includes('error') || line.includes('bug') || line.includes('issue')) {
        issues.push({
          severity: line.toLowerCase().includes('critical') ? 'critical' : 'medium',
          line_number: 0,
          description: line.trim(),
          suggested_fix: 'Review this issue'
        });
      }
    }

    return {
      issues,
      quality_score: qualityScore,
      summary: 'Analysis completed',
      language
    };
  }

  // Mock analysis for when AI is not available
  mockAnalysis(code, language) {
    const lines = code.split('\n');
    const issues = [];
    
    // Simple pattern-based detection
    lines.forEach((line, index) => {
      // Check for common issues
      if (line.includes('eval(')) {
        issues.push({
          severity: 'critical',
          line_number: index + 1,
          description: 'Use of eval() is a security risk',
          suggested_fix: 'Replace eval() with safer alternatives'
        });
      }
      
      if (line.includes('var ')) {
        issues.push({
          severity: 'low',
          line_number: index + 1,
          description: 'Use of var instead of let/const',
          suggested_fix: 'Replace var with let or const'
        });
      }
      
      if (line.includes('console.log')) {
        issues.push({
          severity: 'low',
          line_number: index + 1,
          description: 'Console.log statement found',
          suggested_fix: 'Remove console.log in production'
        });
      }
      
      if (line.includes('TODO') || line.includes('FIXME')) {
        issues.push({
          severity: 'medium',
          line_number: index + 1,
          description: 'TODO/FIXME comment found',
          suggested_fix: 'Address the TODO/FIXME item'
        });
      }
    });

    return {
      issues,
      quality_score: Math.max(0, 100 - (issues.length * 10)),
      summary: 'Basic pattern-based analysis (AI not configured)',
      language
    };
  }

  // Mock fix generation
  mockFix(code, issue, language) {
    return {
      fixed_code: code,
      changes: 'Unable to generate fix without AI configuration',
      explanation: 'Please configure OpenAI or Anthropic API key for intelligent fixes'
    };
  }

  // Mock suggestions
  mockSuggestions(code, language) {
    return {
      suggestions: [
        {
          type: 'best-practice',
          description: 'Consider adding error handling',
          priority: 'medium',
          example: 'try { ... } catch (error) { ... }'
        },
        {
          type: 'performance',
          description: 'Consider optimizing loops',
          priority: 'low',
          example: 'Use array methods like map, filter, reduce'
        }
      ]
    };
  }
}

// Export singleton instance
export const aiService = new AIService();
export default AIService;