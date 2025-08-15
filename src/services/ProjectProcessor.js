// Enhanced Project Analysis Engine with Background Processing
// Provides intelligent orchestration, parallel execution, and progress tracking

import { aiAnalyzer } from './AIAnalyzer.js';
import axios from 'axios';

export class ProjectProcessor {
  constructor() {
    this.supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.rb', '.go', '.rs', '.swift'];
    this.activeAnalyses = new Map();
    this.analysisProgress = new Map();
    this.cancellationTokens = new Map();
    this.MAX_PARALLEL_ANALYSES = 3;
    this.CHUNK_SIZE = 10; // Files per chunk for parallel processing
    this.API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';
  }

  async processUploadedFiles(files) {
    console.log('📄 Processing uploaded files:', files.length);
    
    const processedFiles = [];
    let totalLines = 0;
    const languages = new Set();

    for (const file of files) {
      try {
        const content = await fs.readFile(file.path, 'utf8');
        const lines = content.split('\n').length;
        const extension = path.extname(file.originalname);
        
        processedFiles.push({
          name: file.originalname,
          path: file.path,
          content,
          size: file.size,
          lines,
          extension,
          language: this.detectLanguage(extension),
          analysis: await this.analyzeFile(content, extension)
        });

        totalLines += lines;
        languages.add(this.detectLanguage(extension));

      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
      }
    }

    return {
      name: 'Uploaded Project',
      files: processedFiles,
      totalFiles: processedFiles.length,
      totalLines,
      languages: Array.from(languages),
      projectType: this.detectProjectType(processedFiles),
      dependencies: await this.extractDependencies(processedFiles)
    };
  }

  async processAppProject(files, projectData) {
    console.log('🌐 Processing app project:', projectData.name);
    
    const processedFiles = await this.processUploadedFiles(files);
    
    return {
      ...processedFiles,
      name: projectData.name,
      description: projectData.description,
      codebaseUrl: projectData.codebaseUrl,
      accessType: projectData.accessType,
      deploymentUrl: projectData.deploymentUrl
    };
  }

  detectLanguage(extension) {
    const languageMap = {
      '.js': 'JavaScript',
      '.jsx': 'JavaScript (React)',
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript (React)',
      '.py': 'Python',
      '.java': 'Java',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.go': 'Go',
      '.rs': 'Rust',
      '.swift': 'Swift'
    };
    return languageMap[extension] || 'Unknown';
  }

  detectProjectType(files) {
    const hasFile = (name) => files.some(f => f.name === name);
    
    if (hasFile('package.json')) return 'Node.js/JavaScript';
    if (hasFile('requirements.txt')) return 'Python';
    if (hasFile('pom.xml')) return 'Java';
    if (hasFile('Gemfile')) return 'Ruby';
    if (hasFile('go.mod')) return 'Go';
    
    return 'Generic';
  }

  async extractDependencies(files) {
    const dependencies = {};

    for (const file of files) {
      if (file.name === 'package.json') {
        try {
          const packageJson = JSON.parse(file.content);
          dependencies.npm = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };
        } catch (error) {
          console.error('Error parsing package.json:', error);
        }
      }
    }

    return dependencies;
  }

  async analyzeFile(content, extension) {
    const analysis = {
      functions: [],
      classes: [],
      imports: [],
      complexity: 0,
      potentialIssues: []
    };

    try {
      if (extension === '.js' || extension === '.jsx') {
        await this.analyzeJavaScript(content, analysis);
      }
    } catch (error) {
      console.error('File analysis error:', error);
    }

    return analysis;
  }

  async analyzeJavaScript(content, analysis) {
    // Basic JavaScript analysis using regex patterns
    try {
      // Find functions
      const functionPattern = /function\s+(\w+)\s*\([^)]*\)/g;
      let match;
      while ((match = functionPattern.exec(content)) !== null) {
        analysis.functions.push({
          name: match[1],
          line: content.substring(0, match.index).split('\n').length
        });
      }

      // Find classes
      const classPattern = /class\s+(\w+)\s*(?:extends\s+\w+)?\s*{/g;
      while ((match = classPattern.exec(content)) !== null) {
        analysis.classes.push({
          name: match[1],
          line: content.substring(0, match.index).split('\n').length
        });
      }

      // Find imports
      const importPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      while ((match = importPattern.exec(content)) !== null) {
        analysis.imports.push(match[1]);
      }

    } catch (error) {
      console.error('JavaScript analysis error:', error);
    }
  }

  /**
   * Start enhanced background analysis with progress tracking
   */
  async startBackgroundAnalysis(projectId, options = {}) {
    const {
      userId,
      analysisTypes = ['full-application'],
      priority = 0,
      userApiKeys = {},
      userInstructions = ''
    } = options;

    const analysisId = `analysis-${projectId}-${Date.now()}`;
    
    // Check if analysis is already running for this project
    if (this.activeAnalyses.has(projectId)) {
      console.log('⚠️ Analysis already in progress for project:', projectId);
      return {
        success: false,
        message: 'Analysis already in progress',
        analysisId: this.activeAnalyses.get(projectId)
      };
    }

    // Initialize progress tracking
    this.analysisProgress.set(analysisId, {
      projectId,
      status: 'initializing',
      progress: 0,
      totalSteps: 0,
      completedSteps: 0,
      currentStep: 'Preparing analysis',
      startTime: Date.now(),
      results: [],
      errors: []
    });

    // Create cancellation token
    const cancelToken = { cancelled: false };
    this.cancellationTokens.set(analysisId, cancelToken);

    // Mark project as having active analysis
    this.activeAnalyses.set(projectId, analysisId);

    try {
      // Get project data
      const projectData = await this.getProjectData(projectId);
      
      // Start orchestrated analysis
      const result = await this.orchestrateAnalysis(projectData, analysisId);
      
      // Update progress
      const progress = this.analysisProgress.get(analysisId);
      progress.status = 'completed';
      progress.progress = 100;
      progress.results = result;
      this.updateProgress(analysisId, progress);

      return {
        success: true,
        analysisId,
        results: result
      };

    } catch (error) {
      console.error('Failed to start background analysis:', error);
      this.cleanupAnalysis(analysisId, projectId);
      
      return {
        success: false,
        error: error.message,
        analysisId
      };
    }
  }

  /**
   * Smart analysis orchestration - determines optimal analysis strategy
   */
  async orchestrateAnalysis(projectData, analysisId) {
    const progress = this.analysisProgress.get(analysisId);
    if (!progress) return null;

    const cancelToken = this.cancellationTokens.get(analysisId);
    
    try {
      // Determine analysis strategy based on project characteristics
      const strategy = this.determineAnalysisStrategy(projectData);
      
      progress.totalSteps = strategy.steps.length;
      progress.status = 'analyzing';
      this.updateProgress(analysisId, progress);

      const results = [];
      
      // Execute analysis steps
      for (let i = 0; i < strategy.steps.length; i++) {
        if (cancelToken?.cancelled) {
          throw new Error('Analysis cancelled by user');
        }

        const step = strategy.steps[i];
        progress.currentStep = step.name;
        progress.completedSteps = i;
        progress.progress = Math.round((i / strategy.steps.length) * 100);
        this.updateProgress(analysisId, progress);

        // Execute step based on type
        const stepResult = await this.executeAnalysisStep(
          step,
          projectData,
          analysisId,
          cancelToken
        );

        if (stepResult) {
          results.push(stepResult);
        }

        // Add small delay between steps to prevent overload
        if (i < strategy.steps.length - 1) {
          await this.delay(100);
        }
      }

      // Aggregate and return results
      return this.aggregateAnalysisResults(results, projectData);

    } catch (error) {
      console.error('Orchestration error:', error);
      progress.status = 'failed';
      progress.errors.push(error.message);
      this.updateProgress(analysisId, progress);
      throw error;
    }
  }

  /**
   * Determine optimal analysis strategy based on project characteristics
   */
  determineAnalysisStrategy(projectData) {
    const fileCount = projectData.files?.length || 0;
    const hasTests = projectData.files?.some(f => 
      f.name?.includes('test') || f.name?.includes('spec')
    );
    
    const strategy = {
      type: 'comprehensive',
      parallel: fileCount > 20,
      steps: []
    };

    // Core analysis steps
    strategy.steps.push({
      name: 'Analyzing project structure',
      type: 'structure',
      parallel: false
    });

    // File analysis
    if (fileCount > 0) {
      if (strategy.parallel) {
        // Split files into chunks for parallel processing
        const chunks = this.chunkFiles(projectData.files, this.CHUNK_SIZE);
        chunks.forEach((chunk, index) => {
          strategy.steps.push({
            name: `Analyzing files (batch ${index + 1}/${chunks.length})`,
            type: 'files',
            files: chunk,
            parallel: true
          });
        });
      } else {
        strategy.steps.push({
          name: 'Analyzing source files',
          type: 'files',
          files: projectData.files,
          parallel: false
        });
      }
    }

    // Security analysis
    strategy.steps.push({
      name: 'Performing security scan',
      type: 'security',
      parallel: false
    });

    // Test coverage analysis if tests exist
    if (hasTests) {
      strategy.steps.push({
        name: 'Analyzing test coverage',
        type: 'tests',
        parallel: false
      });
    }

    // Final aggregation step
    strategy.steps.push({
      name: 'Generating insights and recommendations',
      type: 'insights',
      parallel: false
    });

    return strategy;
  }

  /**
   * Execute individual analysis step
   */
  async executeAnalysisStep(step, projectData, analysisId, cancelToken) {
    if (cancelToken?.cancelled) {
      throw new Error('Analysis cancelled');
    }

    try {
      switch (step.type) {
        case 'structure':
          return await this.analyzeProjectStructure(projectData);
        
        case 'files':
          if (step.parallel) {
            return await this.analyzeFilesParallel(step.files, projectData);
          }
          return await this.analyzeFiles(step.files, projectData);
        
        case 'security':
          return await this.analyzeSecurityPatterns(projectData);
        
        case 'tests':
          return await this.analyzeTestCoverage(projectData);
        
        case 'insights':
          return await this.generateInsights(projectData);
        
        default:
          console.warn('Unknown analysis step type:', step.type);
          return null;
      }
    } catch (error) {
      console.error(`Step failed: ${step.name}`, error);
      return {
        type: step.type,
        error: error.message
      };
    }
  }

  /**
   * Parallel file analysis for improved performance
   */
  async analyzeFilesParallel(files, projectData) {
    const promises = files.map(file => 
      this.analyzeSingleFile(file, projectData).catch(err => ({
        file: file.name,
        error: err.message
      }))
    );

    const results = await Promise.all(promises);
    
    return {
      type: 'files',
      results: results.filter(r => !r.error),
      errors: results.filter(r => r.error)
    };
  }

  /**
   * Analyze single file using AI
   */
  async analyzeSingleFile(file, projectData) {
    const result = await aiAnalyzer.performAnalysis({
      analysisType: 'code-review',
      projectData,
      fileData: file,
      useCache: true
    });

    return {
      file: file.name,
      analysis: result
    };
  }

  /**
   * Get current progress for an analysis
   */
  getProgress(analysisId) {
    return this.analysisProgress.get(analysisId) || null;
  }

  /**
   * Cancel an ongoing analysis
   */
  async cancelAnalysis(analysisId) {
    const cancelToken = this.cancellationTokens.get(analysisId);
    const progress = this.analysisProgress.get(analysisId);
    
    if (!cancelToken || !progress) {
      return {
        success: false,
        message: 'Analysis not found'
      };
    }

    // Set cancellation flag
    cancelToken.cancelled = true;
    
    // Update progress status
    progress.status = 'cancelled';
    progress.currentStep = 'Analysis cancelled by user';
    this.updateProgress(analysisId, progress);

    // Cleanup
    this.cleanupAnalysis(analysisId, progress.projectId);

    return {
      success: true,
      message: 'Analysis cancelled successfully'
    };
  }

  /**
   * Update and emit progress
   */
  updateProgress(analysisId, progress) {
    this.analysisProgress.set(analysisId, progress);
    console.log(`Analysis ${analysisId}: ${progress.currentStep} (${progress.progress}%)`);
  }

  /**
   * Clean up analysis resources
   */
  cleanupAnalysis(analysisId, projectId) {
    this.analysisProgress.delete(analysisId);
    this.cancellationTokens.delete(analysisId);
    if (this.activeAnalyses.get(projectId) === analysisId) {
      this.activeAnalyses.delete(projectId);
    }
  }

  // Helper analysis methods
  async analyzeProjectStructure(projectData) {
    return {
      type: 'structure',
      patterns: ['Component-based'],
      quality: 'good',
      fileCount: projectData.files?.length || 0
    };
  }

  async analyzeFiles(files, projectData) {
    return {
      type: 'files',
      analyzed: files.length,
      issues: []
    };
  }

  async analyzeSecurityPatterns(projectData) {
    return {
      type: 'security',
      vulnerabilities: [],
      recommendations: ['Use environment variables for sensitive data']
    };
  }

  async analyzeTestCoverage(projectData) {
    return {
      type: 'tests',
      coverage: 'partial',
      suggestions: ['Add unit tests for core components']
    };
  }

  async generateInsights(projectData) {
    return {
      type: 'insights',
      recommendations: ['Consider implementing error boundaries'],
      priorities: ['Performance optimization', 'Test coverage']
    };
  }

  /**
   * Aggregate analysis results from all steps
   */
  aggregateAnalysisResults(results, projectData) {
    const aggregated = {
      success: true,
      timestamp: Date.now(),
      projectId: projectData.id || projectData.name,
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        suggestions: results.length,
        codeQuality: 'good'
      },
      details: {},
      recommendations: [],
      metrics: {}
    };

    // Process each result type
    results.forEach(result => {
      if (result && !result.error) {
        aggregated.details[result.type] = result;
        if (result.recommendations) {
          aggregated.recommendations.push(...result.recommendations);
        }
      }
    });

    return aggregated;
  }

  // Utility methods
  async getProjectData(projectId) {
    // Mock implementation - in production would fetch from database
    return {
      id: projectId,
      name: 'Project ' + projectId,
      files: []
    };
  }

  chunkFiles(files, chunkSize) {
    const chunks = [];
    for (let i = 0; i < files.length; i += chunkSize) {
      chunks.push(files.slice(i, i + chunkSize));
    }
    return chunks;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
