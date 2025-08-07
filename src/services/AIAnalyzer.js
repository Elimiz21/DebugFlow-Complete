import { aiProviderManager } from './AIProviderManager.js';
import { aiPromptManager } from './AIPromptManager.js';
// Note: Database operations moved to API endpoints for browser compatibility

/**
 * Advanced AI Analysis Engine
 * Integrates with multi-provider system and optimized prompts
 */
export class AIAnalyzer {
  constructor() {
    this.providerManager = aiProviderManager;
    this.promptManager = aiPromptManager;
    this.analysisCache = new Map();
    this.analysisQueue = new Map(); // For tracking in-progress analyses
  }

  /**
   * Main analysis entry point - supports all analysis types
   */
  async performAnalysis({
    analysisType = 'full-application',
    projectData,
    fileData = null,
    bugData = null,
    userId,
    userApiKeys = {},
    userInstructions = '',
    useCache = true
  }) {
    const analysisId = this.generateAnalysisId(analysisType, projectData, fileData, bugData);
    
    try {
      // Check cache first
      if (useCache && this.analysisCache.has(analysisId)) {
        const cached = this.analysisCache.get(analysisId);
        if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
          console.log('📋 Returning cached analysis:', analysisId);
          return { ...cached.result, fromCache: true };
        }
      }

      // Check if analysis is already in progress
      if (this.analysisQueue.has(analysisId)) {
        console.log('⏳ Analysis already in progress, waiting...', analysisId);
        return await this.analysisQueue.get(analysisId);
      }

      // Start new analysis
      const analysisPromise = this.executeAnalysis({
        analysisType,
        projectData,
        fileData,
        bugData,
        userId,
        userApiKeys,
        userInstructions,
        analysisId
      });

      this.analysisQueue.set(analysisId, analysisPromise);

      const result = await analysisPromise;
      
      // Cache successful results
      if (result.success) {
        this.analysisCache.set(analysisId, {
          result,
          timestamp: Date.now()
        });
      }

      // Clean up queue
      this.analysisQueue.delete(analysisId);

      return result;

    } catch (error) {
      console.error('🚨 Analysis failed:', error);
      this.analysisQueue.delete(analysisId);
      
      return this.createErrorResponse(error, analysisType);
    }
  }

  /**
   * Execute AI analysis with provider selection and retry logic
   */
  async executeAnalysis({
    analysisType,
    projectData,
    fileData,
    bugData,
    userId,
    userApiKeys,
    userInstructions,
    analysisId
  }) {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Select optimal provider
        const provider = await this.providerManager.selectProvider(
          userId,
          analysisType,
          userApiKeys
        );

        console.log(`🤖 Attempt ${attempts}: Using ${provider.name} for ${analysisType}`);

        // Initialize provider if needed
        const userApiKey = userApiKeys[provider.id?.split('-')[0]] || null;
        if (!provider.initialized) {
          await this.providerManager.initializeProvider(provider.id, userApiKey);
        }

        // Generate context-aware prompt
        const promptData = this.buildAnalysisContext({
          analysisType,
          projectData,
          fileData,
          bugData,
          userInstructions
        });

        const { systemPrompt, analysisPrompt, options } = this.promptManager.generatePrompt(
          analysisType,
          promptData,
          userInstructions
        );

        // Execute AI analysis
        const aiResponse = await this.providerManager.executeAnalysis(
          provider.id,
          `${systemPrompt}\n\n${analysisPrompt}`,
          { ...options, userId }
        );

        if (!aiResponse.success) {
          throw new Error(`Provider failed: ${aiResponse.error}`);
        }

        // Parse and validate AI response
        const parsedResponse = this.promptManager.parseAIResponse(
          aiResponse.response,
          analysisType
        );

        // Store analysis in database
        const analysisRecord = await this.saveAnalysisToDatabase({
          analysisId,
          userId,
          projectId: projectData.id,
          analysisType,
          provider: provider.id,
          status: parsedResponse.valid ? 'completed' : 'partial',
          results: parsedResponse.data,
          duration: Date.now() - startTime,
          tokenUsage: aiResponse.usage?.total_tokens || 0
        });

        // Return comprehensive result
        return {
          success: true,
          analysisId: analysisRecord.id,
          analysisType,
          provider: {
            id: provider.id,
            name: provider.name,
            model: aiResponse.model
          },
          results: parsedResponse.data,
          metadata: {
            duration: Date.now() - startTime,
            attempts,
            tokenUsage: aiResponse.usage,
            valid: parsedResponse.valid,
            cached: false
          },
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        console.error(`❌ Attempt ${attempts} failed:`, error);
        
        if (attempts === maxAttempts) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }

  /**
   * Build analysis context from input data
   */
  buildAnalysisContext({ analysisType, projectData, fileData, bugData, userInstructions }) {
    const context = {
      projectData: this.enrichProjectData(projectData),
      userInstructions
    };

    // Add file-specific context
    if (fileData) {
      context.fileData = fileData;
    }

    // Add bug-specific context
    if (bugData) {
      context.bugData = bugData;
    }

    // Add dynamic content based on analysis type
    if (analysisType === 'full-application' || analysisType === 'security-audit') {
      context.fileContents = this.prepareFileContents(projectData.files);
      context.dependencies = this.extractDependencies(projectData);
      context.projectStructure = this.generateProjectStructure(projectData);
    }

    return context;
  }

  /**
   * Enrich project data with analysis-relevant metadata
   */
  enrichProjectData(projectData) {
    return {
      ...projectData,
      type: this.detectProjectType(projectData),
      language: this.detectPrimaryLanguage(projectData),
      framework: this.detectFramework(projectData),
      architecture_pattern: this.detectArchitecture(projectData),
      file_count: projectData.files?.length || 0,
      size_bytes: this.calculateProjectSize(projectData),
      hasDockerfile: this.hasFile(projectData, 'Dockerfile'),
      hasAPI: this.hasAPIFiles(projectData),
      hasMicroservices: this.detectMicroservices(projectData)
    };
  }

  /**
   * Prepare file contents for AI analysis (with smart truncation)
   */
  prepareFileContents(files) {
    if (!files || files.length === 0) return [];

    // Prioritize important files
    const prioritizedFiles = this.prioritizeFiles(files);
    
    const prepared = [];
    let totalSize = 0;
    const maxSize = 50000; // 50KB limit for context

    for (const file of prioritizedFiles) {
      if (totalSize >= maxSize) break;

      const fileContent = {
        filename: file.filename || file.name,
        filepath: file.filepath || file.path,
        content: file.content || ''
      };

      // Truncate large files intelligently
      if (fileContent.content.length > 2000) {
        fileContent.content = this.intelligentTruncate(fileContent.content, fileContent.filename);
      }

      totalSize += fileContent.content.length;
      prepared.push(fileContent);

      if (prepared.length >= 20) break; // Max 20 files
    }

    return prepared;
  }

  /**
   * Prioritize files for analysis (most important first)
   */
  prioritizeFiles(files) {
    const priorities = {
      // Config files
      'package.json': 100,
      'Dockerfile': 95,
      'docker-compose.yml': 90,
      '.env': 85,
      
      // Main application files
      'index.js': 80,
      'main.js': 80,
      'app.js': 80,
      'server.js': 80,
      'App.jsx': 75,
      'App.tsx': 75,
      
      // Important patterns
      'router': 70,
      'controller': 65,
      'service': 60,
      'model': 55,
      'component': 50
    };

    return files.sort((a, b) => {
      const aName = (a.filename || a.name || '').toLowerCase();
      const bName = (b.filename || b.name || '').toLowerCase();
      
      const aPriority = Object.entries(priorities).reduce((max, [pattern, priority]) => {
        return aName.includes(pattern) ? Math.max(max, priority) : max;
      }, 10);
      
      const bPriority = Object.entries(priorities).reduce((max, [pattern, priority]) => {
        return bName.includes(pattern) ? Math.max(max, priority) : max;
      }, 10);

      return bPriority - aPriority;
    });
  }

  /**
   * Intelligently truncate file content while preserving structure
   */
  intelligentTruncate(content, filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    // For JavaScript/TypeScript, try to preserve function signatures
    if (['js', 'ts', 'jsx', 'tsx'].includes(extension)) {
      const lines = content.split('\n');
      const important = [];
      
      for (let i = 0; i < lines.length && important.join('\n').length < 1500; i++) {
        const line = lines[i];
        // Keep imports, exports, function declarations, class declarations
        if (line.match(/^(import|export|function|class|const|let|var)/) || 
            line.includes('function') || line.includes('class ')) {
          important.push(line);
        }
      }
      
      return important.length > 0 
        ? important.join('\n') + '\n\n// ... (truncated)'
        : content.substring(0, 1500) + '\n\n// ... (truncated)';
    }
    
    // Default truncation
    return content.substring(0, 1500) + '\n\n// ... (truncated)';
  }

  /**
   * Extract project dependencies
   */
  extractDependencies(projectData) {
    const dependencies = [];
    
    if (projectData.files) {
      const packageJson = projectData.files.find(f => 
        (f.filename || f.name) === 'package.json'
      );
      
      if (packageJson) {
        try {
          const pkg = JSON.parse(packageJson.content);
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };
          
          for (const [name, version] of Object.entries(deps || {})) {
            dependencies.push({ name, version });
          }
        } catch (error) {
          console.warn('Failed to parse package.json:', error);
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Generate project structure overview
   */
  generateProjectStructure(projectData) {
    if (!projectData.files) return 'No file structure available';
    
    const structure = projectData.files
      .map(f => f.filepath || f.filename || f.name)
      .filter(Boolean)
      .sort()
      .map(path => `  ${path}`)
      .join('\n');
    
    return `Project Structure:\n${structure}`;
  }

  /**
   * Save analysis results via API endpoint
   */
  async saveAnalysisToDatabase({
    analysisId,
    userId,
    projectId,
    analysisType,
    provider,
    status,
    results,
    duration,
    tokenUsage
  }) {
    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('debugflow_token')}`
        },
        body: JSON.stringify({
          id: analysisId,
          user_id: userId,
          project_id: projectId,
          analysis_type: analysisType,
          ai_provider: provider,
          status,
          results: JSON.stringify(results),
          confidence_score: results.confidence_score || 0.5,
          duration_ms: duration,
          token_usage: tokenUsage
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.data;
      } else {
        console.warn('Failed to save analysis to database via API');
        return { id: analysisId };
      }
    } catch (error) {
      console.error('Failed to save analysis to database:', error);
      return { id: analysisId }; // Return minimal object to continue
    }
  }

  /**
   * Create error response with helpful fallback
   */
  createErrorResponse(error, analysisType) {
    return {
      success: false,
      error: error.message,
      analysisType,
      fallback: {
        analysis_summary: 'Analysis failed due to technical issues. Please try again or use a different AI provider.',
        confidence_score: 0.0,
        total_issues: 0,
        critical_issues: 0,
        recommendations: [{
          id: 'error_1',
          severity: 'LOW',
          category: 'system',
          title: 'Analysis Service Unavailable',
          description: 'The AI analysis service is currently unavailable. This may be due to rate limits, API issues, or network connectivity.',
          solution: 'Try again later or configure premium API keys for more reliable service.',
          impact: 'Unable to provide automated code analysis at this time.'
        }],
        metrics: {
          lines_of_code: 0,
          complexity_score: 0,
          estimated_fix_time: 'Unknown'
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  // Utility methods for project analysis
  detectProjectType(projectData) {
    const files = projectData.files || [];
    const fileNames = files.map(f => f.filename || f.name || '').join(' ');
    
    if (fileNames.includes('package.json')) return 'Node.js Application';
    if (fileNames.includes('Dockerfile')) return 'Containerized Application';
    if (fileNames.includes('requirements.txt')) return 'Python Application';
    if (fileNames.includes('pom.xml')) return 'Java Application';
    return 'Web Application';
  }

  detectPrimaryLanguage(projectData) {
    const files = projectData.files || [];
    const extensions = files.map(f => {
      const name = f.filename || f.name || '';
      return name.split('.').pop()?.toLowerCase();
    }).filter(Boolean);

    const counts = {};
    extensions.forEach(ext => counts[ext] = (counts[ext] || 0) + 1);

    const primary = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const langMap = {
      js: 'JavaScript', ts: 'TypeScript', jsx: 'React', tsx: 'React TypeScript',
      py: 'Python', java: 'Java', php: 'PHP', rb: 'Ruby', go: 'Go'
    };

    return langMap[primary?.[0]] || 'Mixed';
  }

  detectFramework(projectData) {
    const packageJson = this.findPackageJson(projectData);
    if (!packageJson) return null;

    const deps = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies } || {});
    
    if (deps.includes('react')) return 'React';
    if (deps.includes('vue')) return 'Vue.js';
    if (deps.includes('angular')) return 'Angular';
    if (deps.includes('express')) return 'Express.js';
    if (deps.includes('fastapi')) return 'FastAPI';
    if (deps.includes('django')) return 'Django';
    
    return null;
  }

  detectArchitecture(projectData) {
    if (this.hasFile(projectData, 'Dockerfile')) return 'Containerized';
    if (this.detectMicroservices(projectData)) return 'Microservices';
    if (this.hasAPIFiles(projectData)) return 'API-based';
    return 'Monolithic';
  }

  hasFile(projectData, filename) {
    return projectData.files?.some(f => 
      (f.filename || f.name || '').toLowerCase() === filename.toLowerCase()
    ) || false;
  }

  hasAPIFiles(projectData) {
    const files = projectData.files || [];
    return files.some(f => {
      const name = (f.filename || f.name || '').toLowerCase();
      return name.includes('api') || name.includes('routes') || name.includes('controller');
    });
  }

  detectMicroservices(projectData) {
    return this.hasFile(projectData, 'docker-compose.yml') || 
           this.hasFile(projectData, 'kubernetes.yml');
  }

  calculateProjectSize(projectData) {
    return projectData.files?.reduce((total, file) => 
      total + (file.content?.length || 0), 0
    ) || 0;
  }

  findPackageJson(projectData) {
    const file = projectData.files?.find(f => (f.filename || f.name) === 'package.json');
    if (!file) return null;
    
    try {
      return JSON.parse(file.content);
    } catch {
      return null;
    }
  }

  generateAnalysisId(analysisType, projectData, fileData, bugData) {
    const parts = [
      analysisType,
      projectData.id || projectData.name,
      fileData?.filename || '',
      bugData?.id || ''
    ].filter(Boolean);
    
    return parts.join('-').replace(/[^a-zA-Z0-9-]/g, '').substring(0, 50);
  }

  /**
   * Get analysis history for a project via API
   */
  async getAnalysisHistory(projectId, userId) {
    try {
      const response = await fetch(`/api/ai-analysis?project_id=${projectId}&user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('debugflow_token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Failed to get analysis history:', error);
      return [];
    }
  }

  /**
   * Get available analysis types with user-friendly information
   */
  getAvailableAnalysisTypes() {
    return this.promptManager.getAnalysisTypes();
  }

  /**
   * Legacy method support for existing code
   */
  async analyzeBug({ projectData, bugDescription, aiProvider = 'openai', userId = 'anonymous' }) {
    console.warn('🔄 Using legacy analyzeBug method. Consider upgrading to performAnalysis.');
    
    return await this.performAnalysis({
      analysisType: 'targeted-bug-fix',
      projectData,
      bugData: { description: bugDescription },
      userId,
      userInstructions: bugDescription
    });
  }

  /**
   * Legacy method support for implementation generation
   */
  async generateImplementation({ projectData, fix, customInstructions, aiProvider = 'openai', userId = 'anonymous' }) {
    console.warn('🔄 Using legacy generateImplementation method.');
    
    // Convert fix data to bug data format
    const bugData = {
      description: fix.title,
      error_message: fix.description,
      line_number: fix.lineNumber || null
    };

    const result = await this.performAnalysis({
      analysisType: 'targeted-bug-fix',
      projectData,
      bugData,
      userId,
      userInstructions: customInstructions || `Generate implementation for: ${fix.title}. ${fix.description}`
    });

    // Extract implementation from recommendations
    if (result.success && result.results.recommendations.length > 0) {
      const recommendation = result.results.recommendations[0];
      return `Implementation for: ${fix.title}\n\n${recommendation.solution}\n\nSteps:\n${recommendation.description}`;
    }

    return `Implementation for: ${fix.title}\n\nPlease implement the following:\n${fix.description}\n\nCustom instructions: ${customInstructions || 'None'}`;
  }
}

// Export singleton instance
export const aiAnalyzer = new AIAnalyzer();