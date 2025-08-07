/**
 * Advanced AI Prompt Management System
 * Optimized versions of analysis prompts with dynamic context injection
 */

export class AIPromptManager {
  constructor() {
    this.systemPrompts = this.initializeSystemPrompts();
    this.analysisPrompts = this.initializeAnalysisPrompts();
    this.contextInjectors = this.initializeContextInjectors();
  }

  /**
   * Core system prompts - define AI behavior and output format
   */
  initializeSystemPrompts() {
    return {
      base: `You are DebugFlow AI, an expert code analysis system with enterprise-level debugging capabilities.

CORE RESPONSIBILITIES:
- Analyze code for bugs, security issues, and optimization opportunities
- Provide actionable, specific recommendations with code examples
- Rank issues by severity: CRITICAL, HIGH, MEDIUM, LOW
- Generate structured JSON responses for consistent processing

OUTPUT FORMAT: Always respond with valid JSON:
{
  "analysis_summary": "Brief overview in 1-2 sentences",
  "confidence_score": 0.85,
  "total_issues": 5,
  "critical_issues": 1,
  "recommendations": [
    {
      "id": "issue_1",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "category": "security|performance|bug|quality|architecture",
      "title": "Descriptive issue title",
      "description": "Clear explanation of the issue",
      "file_path": "path/to/file.js",
      "line_number": 42,
      "code_snippet": "problematic code",
      "solution": "Specific fix with code example",
      "impact": "Business/technical impact explanation"
    }
  ],
  "metrics": {
    "lines_of_code": 1500,
    "complexity_score": 7.2,
    "estimated_fix_time": "4 hours"
  }
}

ANALYSIS PRINCIPLES:
- Focus on real, actionable issues
- Provide specific code fixes, not general advice
- Consider security, performance, and maintainability
- Be concise but thorough`,

      security: `You are a security-focused code analyst specializing in vulnerability detection and remediation.

SECURITY FOCUS AREAS:
- Input validation and sanitization
- Authentication and authorization flaws
- Injection vulnerabilities (SQL, XSS, Command)
- Insecure data handling and storage
- API security misconfigurations
- Dependency vulnerabilities

SEVERITY MAPPING:
- CRITICAL: Remote code execution, data breach potential
- HIGH: Privilege escalation, data exposure
- MEDIUM: Information disclosure, DoS potential  
- LOW: Security best practice violations`,

      performance: `You are a performance optimization specialist focused on code efficiency and scalability.

PERFORMANCE FOCUS AREAS:
- Algorithm complexity and optimization opportunities
- Memory usage and leak detection
- Database query optimization
- Network and I/O efficiency
- Caching and resource management
- Scalability bottlenecks

METRICS TO CONSIDER:
- Time complexity (O notation)
- Space complexity
- Resource utilization patterns
- Scalability limits`
    };
  }

  /**
   * Analysis type specific prompts - optimized from your examples
   */
  initializeAnalysisPrompts() {
    return {
      'full-application': {
        template: `Perform comprehensive application analysis of this {LANGUAGE} {PROJECT_TYPE}.

PROJECT CONTEXT:
- Technology Stack: {TECH_STACK}
- Architecture: {ARCHITECTURE_PATTERN}
- File Count: {FILE_COUNT}
- Total LOC: {TOTAL_LOC}

ANALYSIS SCOPE:
1. **Architectural Assessment**: Evaluate design patterns, coupling, and scalability
2. **Security Review**: Identify vulnerabilities and security misconfigurations  
3. **Performance Analysis**: Find bottlenecks and optimization opportunities
4. **Code Quality**: Assess maintainability, readability, and best practices
5. **Bug Detection**: Identify logic errors, edge cases, and potential failures

FILES TO ANALYZE:
{FILE_CONTENTS}

DEPENDENCIES:
{DEPENDENCIES}

{USER_FOCUS_INSTRUCTIONS}

Provide prioritized recommendations focusing on the most impactful issues first.`,
        maxTokens: 6000,
        temperature: 0.1
      },

      'single-file': {
        template: `Analyze this {LANGUAGE} file for issues and improvements.

FILE: {FILE_PATH}
CONTEXT: Part of {PROJECT_TYPE} application
LOC: {FILE_LOC}

FILE CONTENT:
{FILE_CONTENT}

ANALYSIS FOCUS:
1. **Bug Detection**: Logic errors, null pointer exceptions, edge cases
2. **Security Issues**: Input validation, injection risks, data exposure
3. **Performance**: Inefficient algorithms, memory leaks, optimization opportunities
4. **Code Quality**: Readability, maintainability, best practices compliance

{USER_FOCUS_INSTRUCTIONS}

Focus on specific, actionable fixes with code examples.`,
        maxTokens: 4000,
        temperature: 0.1
      },

      'targeted-bug-fix': {
        template: `Debug and fix this specific issue in {LANGUAGE} code.

ISSUE DESCRIPTION: {BUG_DESCRIPTION}
ERROR MESSAGE: {ERROR_MESSAGE}
FILE: {FILE_PATH}
LINE: {LINE_NUMBER}

RELEVANT CODE:
{CODE_SNIPPET}

FULL FILE CONTEXT:
{FILE_CONTENT}

DEBUGGING ANALYSIS:
1. **Root Cause**: Identify the exact cause of the issue
2. **Fix Strategy**: Determine the best approach to resolve it
3. **Code Solution**: Provide specific code changes
4. **Testing**: Suggest how to verify the fix
5. **Prevention**: Recommend preventing similar issues

{USER_FOCUS_INSTRUCTIONS}

Provide a complete, tested solution with explanation.`,
        maxTokens: 3000,
        temperature: 0.1
      },

      'security-audit': {
        template: `Conduct security audit of this {LANGUAGE} {PROJECT_TYPE}.

SECURITY FOCUS AREAS:
- Authentication & Authorization
- Input Validation & Sanitization  
- Data Protection & Privacy
- API Security
- Dependency Vulnerabilities
- Configuration Security

PROJECT CONTEXT:
{PROJECT_STRUCTURE}

CODE TO AUDIT:
{FILE_CONTENTS}

DEPENDENCIES:
{DEPENDENCIES}

{USER_FOCUS_INSTRUCTIONS}

Prioritize by exploitability and business impact. Include specific remediation steps.`,
        maxTokens: 5000,
        temperature: 0.1
      },

      'performance-optimization': {
        template: `Analyze performance characteristics and optimization opportunities for this {LANGUAGE} application.

PERFORMANCE SCOPE:
- Algorithm efficiency and complexity
- Memory usage and garbage collection
- Database and query optimization
- Network and I/O patterns
- Caching strategies
- Scalability bottlenecks

APPLICATION DETAILS:
- Type: {PROJECT_TYPE}
- Scale: {SCALE_CONTEXT}
- Architecture: {ARCHITECTURE_PATTERN}

CODE TO ANALYZE:
{FILE_CONTENTS}

{USER_FOCUS_INSTRUCTIONS}

Focus on measurable improvements with performance impact estimates.`,
        maxTokens: 4500,
        temperature: 0.1
      }
    };
  }

  /**
   * Context injection system - dynamic content insertion
   */
  initializeContextInjectors() {
    return {
      projectContext: (projectData) => ({
        LANGUAGE: projectData.language || 'Unknown',
        PROJECT_TYPE: projectData.type || 'application',
        TECH_STACK: this.formatTechStack(projectData),
        ARCHITECTURE_PATTERN: this.detectArchitecture(projectData),
        FILE_COUNT: projectData.file_count || 0,
        TOTAL_LOC: this.calculateTotalLOC(projectData),
        SCALE_CONTEXT: this.determineScale(projectData)
      }),

      fileContext: (fileData, projectData) => ({
        FILE_PATH: fileData.filepath || fileData.filename,
        FILE_CONTENT: fileData.content || '',
        FILE_LOC: this.countLOC(fileData.content),
        ...this.projectContext(projectData)
      }),

      bugContext: (bugData, fileData, projectData) => ({
        BUG_DESCRIPTION: bugData.description || '',
        ERROR_MESSAGE: bugData.error_message || '',
        LINE_NUMBER: bugData.line_number || 'Unknown',
        CODE_SNIPPET: this.extractCodeSnippet(fileData.content, bugData.line_number),
        ...this.fileContext(fileData, projectData)
      }),

      userFocus: (userInstructions) => ({
        USER_FOCUS_INSTRUCTIONS: userInstructions ? 
          `\nADDITIONAL FOCUS AREAS:\n${userInstructions}` : ''
      })
    };
  }

  /**
   * Generate complete prompt for analysis type
   */
  generatePrompt(analysisType, context, userInstructions = '') {
    const promptConfig = this.analysisPrompts[analysisType];
    if (!promptConfig) {
      throw new Error(`Unknown analysis type: ${analysisType}`);
    }

    // Build context variables
    let contextVars = {};
    
    // Add project context
    if (context.projectData) {
      contextVars = { ...contextVars, ...this.contextInjectors.projectContext(context.projectData) };
    }

    // Add file context
    if (context.fileData) {
      contextVars = { ...contextVars, ...this.contextInjectors.fileContext(context.fileData, context.projectData) };
    }

    // Add bug context
    if (context.bugData) {
      contextVars = { ...contextVars, ...this.contextInjectors.bugContext(context.bugData, context.fileData, context.projectData) };
    }

    // Add user focus
    contextVars = { ...contextVars, ...this.contextInjectors.userFocus(userInstructions) };

    // Add dynamic content
    if (context.fileContents) {
      contextVars.FILE_CONTENTS = this.formatFileContents(context.fileContents);
    }

    if (context.dependencies) {
      contextVars.DEPENDENCIES = this.formatDependencies(context.dependencies);
    }

    if (context.projectStructure) {
      contextVars.PROJECT_STRUCTURE = this.formatProjectStructure(context.projectStructure);
    }

    // Inject variables into template
    let prompt = promptConfig.template;
    for (const [key, value] of Object.entries(contextVars)) {
      prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return {
      systemPrompt: this.getSystemPrompt(analysisType),
      analysisPrompt: prompt,
      options: {
        maxTokens: promptConfig.maxTokens,
        temperature: promptConfig.temperature,
        responseFormat: true // Always expect JSON
      }
    };
  }

  /**
   * Get appropriate system prompt for analysis type
   */
  getSystemPrompt(analysisType) {
    const systemPromptMap = {
      'security-audit': 'security',
      'performance-optimization': 'performance'
    };

    const promptType = systemPromptMap[analysisType] || 'base';
    return this.systemPrompts[promptType];
  }

  /**
   * Helper methods for context generation
   */
  formatTechStack(projectData) {
    const stack = [];
    if (projectData.language) stack.push(projectData.language);
    if (projectData.framework) stack.push(projectData.framework);
    if (projectData.database) stack.push(projectData.database);
    return stack.join(', ') || 'Not specified';
  }

  detectArchitecture(projectData) {
    // Simple architecture detection based on file patterns
    if (projectData.hasDockerfile) return 'Containerized';
    if (projectData.hasMicroservices) return 'Microservices';
    if (projectData.hasAPI) return 'API-based';
    return 'Monolithic';
  }

  calculateTotalLOC(projectData) {
    return projectData.size_bytes ? Math.round(projectData.size_bytes / 30) : 'Unknown';
  }

  determineScale(projectData) {
    const fileCount = projectData.file_count || 0;
    if (fileCount > 100) return 'Large';
    if (fileCount > 20) return 'Medium';
    return 'Small';
  }

  countLOC(content) {
    return content ? content.split('\n').length : 0;
  }

  extractCodeSnippet(content, lineNumber, contextLines = 5) {
    if (!content || !lineNumber) return '';
    
    const lines = content.split('\n');
    const line = parseInt(lineNumber) - 1;
    const start = Math.max(0, line - contextLines);
    const end = Math.min(lines.length, line + contextLines + 1);
    
    return lines.slice(start, end)
      .map((l, i) => `${start + i + 1}: ${l}`)
      .join('\n');
  }

  formatFileContents(files) {
    if (!files || files.length === 0) return 'No files provided';
    
    return files.map(file => `
=== ${file.filename} ===
${file.content || '// File content not available'}
`).join('\n').substring(0, 15000); // Limit to prevent token overflow
  }

  formatDependencies(dependencies) {
    if (!dependencies || dependencies.length === 0) return 'No dependencies found';
    
    return dependencies.map(dep => `- ${dep.name} (${dep.version})`).join('\n');
  }

  formatProjectStructure(structure) {
    if (!structure) return 'Project structure not available';
    return typeof structure === 'string' ? structure : JSON.stringify(structure, null, 2);
  }

  /**
   * Validate and parse AI response
   */
  parseAIResponse(response, analysisType) {
    try {
      // Clean response - remove markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      }
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleanResponse);
      
      // Validate required fields
      const required = ['analysis_summary', 'confidence_score', 'total_issues', 'recommendations'];
      for (const field of required) {
        if (!(field in parsed)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate recommendations structure
      if (!Array.isArray(parsed.recommendations)) {
        throw new Error('Recommendations must be an array');
      }

      parsed.recommendations.forEach((rec, index) => {
        const requiredFields = ['severity', 'category', 'title', 'description', 'solution'];
        for (const field of requiredFields) {
          if (!(field in rec)) {
            throw new Error(`Recommendation ${index} missing field: ${field}`);
          }
        }
      });

      return {
        valid: true,
        data: parsed,
        analysisType
      };
      
    } catch (error) {
      console.error('AI response parsing error:', error);
      
      // Return fallback structure
      return {
        valid: false,
        error: error.message,
        data: {
          analysis_summary: 'Failed to parse AI response properly',
          confidence_score: 0.1,
          total_issues: 0,
          critical_issues: 0,
          recommendations: [],
          metrics: {
            lines_of_code: 0,
            complexity_score: 0,
            estimated_fix_time: 'Unknown'
          }
        },
        analysisType
      };
    }
  }

  /**
   * Get available analysis types with descriptions
   */
  getAnalysisTypes() {
    return {
      'full-application': {
        name: 'Full Application Analysis',
        description: 'Comprehensive analysis of entire codebase including architecture, security, performance, and code quality',
        estimatedTime: '3-5 minutes',
        bestFor: 'New projects, major refactoring, comprehensive audits'
      },
      'single-file': {
        name: 'Single File Analysis', 
        description: 'Focused analysis of a specific file for bugs, optimizations, and quality improvements',
        estimatedTime: '30-60 seconds',
        bestFor: 'Debugging specific issues, code review, optimization'
      },
      'targeted-bug-fix': {
        name: 'Targeted Bug Fix',
        description: 'Debug and fix specific errors with detailed root cause analysis and solutions',
        estimatedTime: '1-2 minutes', 
        bestFor: 'Known bugs, error messages, specific issues'
      },
      'security-audit': {
        name: 'Security Audit',
        description: 'Security-focused analysis identifying vulnerabilities, compliance issues, and security best practices',
        estimatedTime: '2-4 minutes',
        bestFor: 'Security compliance, vulnerability assessment, secure coding'
      },
      'performance-optimization': {
        name: 'Performance Optimization',
        description: 'Performance-focused analysis identifying bottlenecks, inefficiencies, and optimization opportunities',
        estimatedTime: '2-3 minutes',
        bestFor: 'Slow applications, scalability issues, resource optimization'
      }
    };
  }
}

// Export singleton instance
export const aiPromptManager = new AIPromptManager();