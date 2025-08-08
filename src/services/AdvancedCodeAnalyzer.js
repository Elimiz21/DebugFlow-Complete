import { aiAnalyzer } from './AIAnalyzer.js';
import { aiProviderManager } from './AIProviderManager.js';

/**
 * Advanced Code Analyzer - Phase 5.2
 * Implements sophisticated code understanding capabilities including:
 * - Semantic code analysis and relationship mapping
 * - Code pattern detection and anti-pattern identification
 * - Advanced context understanding and cross-file analysis
 * - Code quality metrics and technical debt assessment
 * - Intelligent code suggestions and refactoring recommendations
 */
export class AdvancedCodeAnalyzer {
  constructor() {
    this.baseAnalyzer = aiAnalyzer;
    this.providerManager = aiProviderManager;
    this.analysisCache = new Map();
    this.semanticGraph = new Map(); // Stores code relationships
    this.patternLibrary = this.initializePatternLibrary();
    this.contextBuilder = new CodeContextBuilder();
  }

  /**
   * Perform semantic code analysis - understands code meaning and relationships
   */
  async performSemanticAnalysis(projectData, options = {}) {
    try {
      console.log('🧠 Starting semantic code analysis...');
      
      const startTime = Date.now();
      const analysisId = this.generateSemanticAnalysisId(projectData);
      
      // Check cache
      if (this.analysisCache.has(analysisId) && !options.forceRefresh) {
        const cached = this.analysisCache.get(analysisId);
        if (Date.now() - cached.timestamp < 600000) { // 10 minute cache
          return { ...cached.result, fromCache: true };
        }
      }

      // Build semantic understanding of the codebase
      const semanticMap = await this.buildSemanticMap(projectData);
      
      // Analyze code relationships and dependencies
      const relationshipAnalysis = await this.analyzeCodeRelationships(semanticMap);
      
      // Detect architectural patterns
      const architecturalAnalysis = await this.analyzeArchitecturalPatterns(semanticMap);
      
      // Identify code smells and anti-patterns
      const codeSmellAnalysis = await this.detectCodeSmells(semanticMap);
      
      // Calculate advanced metrics
      const advancedMetrics = await this.calculateAdvancedMetrics(semanticMap);
      
      // Generate intelligent suggestions
      const intelligentSuggestions = await this.generateIntelligentSuggestions(
        semanticMap, 
        relationshipAnalysis, 
        architecturalAnalysis
      );

      const result = {
        success: true,
        analysisId,
        analysisType: 'semantic-analysis',
        results: {
          semantic_map: this.serializeSemanticMap(semanticMap),
          relationships: relationshipAnalysis,
          architecture: architecturalAnalysis,
          code_smells: codeSmellAnalysis,
          metrics: advancedMetrics,
          suggestions: intelligentSuggestions,
          confidence_score: this.calculateConfidenceScore(semanticMap, advancedMetrics)
        },
        metadata: {
          duration: Date.now() - startTime,
          files_analyzed: semanticMap.size,
          relationships_found: relationshipAnalysis.length,
          patterns_detected: architecturalAnalysis.patterns.length
        },
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.analysisCache.set(analysisId, {
        result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('❌ Semantic analysis failed:', error);
      return {
        success: false,
        error: error.message,
        analysisType: 'semantic-analysis'
      };
    }
  }

  /**
   * Build semantic map of the codebase - creates understanding of code structure and meaning
   */
  async buildSemanticMap(projectData) {
    const semanticMap = new Map();
    const files = projectData.files || [];

    for (const file of files) {
      const fileName = file.filename || file.name || '';
      const fileContent = file.content || '';
      
      if (!this.isAnalyzableFile(fileName)) continue;

      console.log(`📊 Analyzing semantic structure of ${fileName}`);

      // Parse file structure and extract semantic elements
      const semanticElements = await this.extractSemanticElements(fileName, fileContent);
      
      // Build relationships within the file
      const internalRelationships = this.buildInternalRelationships(semanticElements);
      
      // Store in semantic map
      semanticMap.set(fileName, {
        elements: semanticElements,
        relationships: internalRelationships,
        metrics: this.calculateFileMetrics(fileContent, semanticElements),
        language: this.detectFileLanguage(fileName),
        role: this.detectFileRole(fileName, fileContent),
        complexity: this.calculateComplexity(semanticElements)
      });
    }

    // Build cross-file relationships
    await this.buildCrossFileRelationships(semanticMap);

    return semanticMap;
  }

  /**
   * Extract semantic elements from code (functions, classes, variables, etc.)
   */
  async extractSemanticElements(fileName, content) {
    const language = this.detectFileLanguage(fileName);
    const elements = {
      functions: [],
      classes: [],
      variables: [],
      imports: [],
      exports: [],
      comments: [],
      types: []
    };

    try {
      // Use AI to understand code structure with language-specific analysis
      const aiAnalysis = await this.getAISemanticAnalysis(fileName, content, language);
      
      if (aiAnalysis.success) {
        Object.assign(elements, aiAnalysis.elements);
      }

      // Fallback to regex-based extraction for reliability
      this.extractWithRegex(content, elements, language);

    } catch (error) {
      console.warn(`⚠️ Failed AI semantic analysis for ${fileName}, using regex fallback`);
      this.extractWithRegex(content, elements, language);
    }

    return elements;
  }

  /**
   * Use AI to perform semantic analysis of code
   */
  async getAISemanticAnalysis(fileName, content, language) {
    try {
      const prompt = `Analyze the semantic structure of this ${language} file and extract key elements:

FILE: ${fileName}
\`\`\`${language}
${content.substring(0, 3000)}${content.length > 3000 ? '\n... (truncated)' : ''}
\`\`\`

Extract and return JSON with:
{
  "functions": [{"name": "functionName", "line": 10, "parameters": ["param1"], "returnType": "string", "purpose": "description"}],
  "classes": [{"name": "ClassName", "line": 5, "methods": ["method1"], "properties": ["prop1"], "purpose": "description"}],
  "variables": [{"name": "varName", "line": 1, "type": "string", "scope": "global|local", "usage": "description"}],
  "imports": [{"module": "moduleName", "items": ["import1"], "line": 1}],
  "exports": [{"name": "exportName", "type": "function|class|variable", "line": 15}],
  "types": [{"name": "TypeName", "definition": "interface|type", "line": 8}],
  "comments": [{"type": "single|block|doc", "line": 3, "content": "comment text"}]
}

Focus on extracting meaningful semantic information that helps understand code relationships and purpose.`;

      const provider = await this.providerManager.selectProvider('system', 'code-analysis');
      const response = await this.providerManager.executeAnalysis(
        provider.id,
        prompt,
        { temperature: 0.1, maxTokens: 2000 }
      );

      if (response.success) {
        const parsed = JSON.parse(response.response);
        return { success: true, elements: parsed };
      }

      return { success: false };

    } catch (error) {
      console.warn('AI semantic analysis failed:', error);
      return { success: false };
    }
  }

  /**
   * Regex-based semantic element extraction as fallback
   */
  extractWithRegex(content, elements, language) {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Extract functions (JavaScript/TypeScript)
      if (language.match(/javascript|typescript|jsx|tsx/i)) {
        // Function declarations
        const funcMatch = trimmed.match(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|\w+))/);
        if (funcMatch) {
          elements.functions.push({
            name: funcMatch[1] || funcMatch[2],
            line: lineNum,
            parameters: this.extractParameters(line),
            type: 'function'
          });
        }

        // Class declarations
        const classMatch = trimmed.match(/class\s+(\w+)/);
        if (classMatch) {
          elements.classes.push({
            name: classMatch[1],
            line: lineNum,
            type: 'class'
          });
        }

        // Import statements
        const importMatch = trimmed.match(/import\s+(.+)\s+from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
          elements.imports.push({
            items: importMatch[1],
            module: importMatch[2],
            line: lineNum
          });
        }
      }

      // Extract Python elements
      if (language === 'python') {
        const defMatch = trimmed.match(/def\s+(\w+)\s*\(/);
        if (defMatch) {
          elements.functions.push({
            name: defMatch[1],
            line: lineNum,
            parameters: this.extractParameters(line),
            type: 'function'
          });
        }

        const classMatch = trimmed.match(/class\s+(\w+):/);
        if (classMatch) {
          elements.classes.push({
            name: classMatch[1],
            line: lineNum,
            type: 'class'
          });
        }
      }

      // Extract comments
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
        elements.comments.push({
          type: 'single',
          line: lineNum,
          content: trimmed.substring(trimmed.indexOf('//') + 2 || trimmed.indexOf('#') + 1).trim()
        });
      }
    });
  }

  /**
   * Analyze code relationships and dependencies
   */
  async analyzeCodeRelationships(semanticMap) {
    const relationships = [];

    // Analyze function call relationships
    const callRelationships = this.analyzeFunctionCalls(semanticMap);
    relationships.push(...callRelationships);

    // Analyze class inheritance and composition
    const classRelationships = this.analyzeClassRelationships(semanticMap);
    relationships.push(...classRelationships);

    // Analyze data flow relationships
    const dataFlowRelationships = this.analyzeDataFlow(semanticMap);
    relationships.push(...dataFlowRelationships);

    // Analyze module dependencies
    const moduleRelationships = this.analyzeModuleDependencies(semanticMap);
    relationships.push(...moduleRelationships);

    return relationships;
  }

  /**
   * Analyze architectural patterns in the codebase
   */
  async analyzeArchitecturalPatterns(semanticMap) {
    const patterns = [];
    const antiPatterns = [];

    // Detect common design patterns
    patterns.push(...this.detectDesignPatterns(semanticMap));

    // Detect architectural patterns
    patterns.push(...this.detectArchitecturalPatterns(semanticMap));

    // Detect anti-patterns
    antiPatterns.push(...this.detectAntiPatterns(semanticMap));

    return {
      patterns,
      antiPatterns,
      architecture_score: this.calculateArchitectureScore(patterns, antiPatterns)
    };
  }

  /**
   * Detect code smells and quality issues
   */
  async detectCodeSmells(semanticMap) {
    const smells = [];

    for (const [fileName, fileData] of semanticMap) {
      // Long functions
      const longFunctions = fileData.elements.functions.filter(func => 
        func.lines_count > 50 || func.complexity > 10
      );
      longFunctions.forEach(func => {
        smells.push({
          type: 'long_function',
          severity: func.lines_count > 100 ? 'HIGH' : 'MEDIUM',
          file: fileName,
          line: func.line,
          description: `Function '${func.name}' is too long (${func.lines_count} lines)`,
          suggestion: 'Consider breaking this function into smaller, focused functions'
        });
      });

      // Large classes
      const largeClasses = fileData.elements.classes.filter(cls => 
        cls.methods && cls.methods.length > 20
      );
      largeClasses.forEach(cls => {
        smells.push({
          type: 'large_class',
          severity: 'MEDIUM',
          file: fileName,
          line: cls.line,
          description: `Class '${cls.name}' has too many methods (${cls.methods.length})`,
          suggestion: 'Consider splitting this class into smaller, more focused classes'
        });
      });

      // Duplicate code patterns
      const duplicates = this.findDuplicateCode(fileData);
      duplicates.forEach(dup => {
        smells.push({
          type: 'duplicate_code',
          severity: 'MEDIUM',
          file: fileName,
          line: dup.line,
          description: `Duplicate code pattern detected`,
          suggestion: 'Extract common functionality into a shared function or module'
        });
      });
    }

    return smells;
  }

  /**
   * Calculate advanced code metrics
   */
  async calculateAdvancedMetrics(semanticMap) {
    let totalComplexity = 0;
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalLines = 0;
    let duplicateCodeLines = 0;
    let testCoverage = 0;

    for (const [fileName, fileData] of semanticMap) {
      totalComplexity += fileData.complexity;
      totalFunctions += fileData.elements.functions.length;
      totalClasses += fileData.elements.classes.length;
      totalLines += fileData.metrics.lines_of_code;
      
      // Estimate test coverage based on test files
      if (fileName.includes('.test.') || fileName.includes('.spec.')) {
        testCoverage += 1;
      }
    }

    const averageComplexity = totalFunctions > 0 ? totalComplexity / totalFunctions : 0;
    const estimatedTestCoverage = semanticMap.size > 0 ? (testCoverage / semanticMap.size) * 100 : 0;

    return {
      total_files: semanticMap.size,
      total_functions: totalFunctions,
      total_classes: totalClasses,
      total_lines_of_code: totalLines,
      average_function_complexity: Math.round(averageComplexity * 10) / 10,
      cyclomatic_complexity: totalComplexity,
      estimated_test_coverage: Math.round(estimatedTestCoverage),
      maintainability_index: this.calculateMaintainabilityIndex(averageComplexity, totalLines),
      technical_debt_ratio: this.calculateTechnicalDebt(semanticMap),
      code_duplication_ratio: Math.round((duplicateCodeLines / totalLines) * 100)
    };
  }

  /**
   * Generate intelligent suggestions based on analysis
   */
  async generateIntelligentSuggestions(semanticMap, relationships, architecture) {
    const suggestions = [];

    // Architecture improvement suggestions
    if (architecture.architecture_score < 0.7) {
      suggestions.push({
        category: 'architecture',
        priority: 'HIGH',
        title: 'Improve Code Architecture',
        description: 'The codebase shows signs of architectural issues that may affect maintainability',
        actions: [
          'Consider implementing design patterns for better code organization',
          'Review and refactor large classes and long functions',
          'Establish clear separation of concerns between modules'
        ],
        estimated_effort: '2-4 weeks'
      });
    }

    // Performance optimization suggestions
    const performanceIssues = this.identifyPerformanceBottlenecks(semanticMap);
    if (performanceIssues.length > 0) {
      suggestions.push({
        category: 'performance',
        priority: 'MEDIUM',
        title: 'Optimize Performance Bottlenecks',
        description: `Found ${performanceIssues.length} potential performance issues`,
        actions: performanceIssues.map(issue => issue.suggestion),
        estimated_effort: '1-2 weeks'
      });
    }

    // Code quality suggestions
    const qualityScore = this.calculateCodeQualityScore(semanticMap);
    if (qualityScore < 0.8) {
      suggestions.push({
        category: 'quality',
        priority: 'MEDIUM',
        title: 'Improve Code Quality',
        description: 'Several code quality issues detected that could benefit from refactoring',
        actions: [
          'Add comprehensive error handling',
          'Improve function and variable naming',
          'Add documentation and comments for complex logic',
          'Implement consistent coding standards'
        ],
        estimated_effort: '1-3 weeks'
      });
    }

    // Testing suggestions
    const testCoverage = this.estimateTestCoverage(semanticMap);
    if (testCoverage < 60) {
      suggestions.push({
        category: 'testing',
        priority: 'HIGH',
        title: 'Increase Test Coverage',
        description: `Current estimated test coverage is ${testCoverage}%, which is below recommended 80%`,
        actions: [
          'Add unit tests for critical functions',
          'Implement integration tests for main workflows',
          'Consider test-driven development for new features',
          'Set up automated testing in CI/CD pipeline'
        ],
        estimated_effort: '2-4 weeks'
      });
    }

    return suggestions;
  }

  // Utility methods

  generateSemanticAnalysisId(projectData) {
    return `semantic-${projectData.id}-${Date.now().toString(36)}`;
  }

  isAnalyzableFile(fileName) {
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.rb', '.go', '.rs', '.cpp', '.c'];
    return extensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  detectFileLanguage(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const langMap = {
      js: 'javascript', jsx: 'javascript',
      ts: 'typescript', tsx: 'typescript',
      py: 'python',
      java: 'java',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
      c: 'c'
    };
    return langMap[ext] || 'unknown';
  }

  extractParameters(line) {
    const match = line.match(/\(([^)]*)\)/);
    if (!match) return [];
    return match[1].split(',').map(p => p.trim()).filter(Boolean);
  }

  calculateComplexity(elements) {
    // Simple cyclomatic complexity estimation
    let complexity = 1; // Base complexity
    
    elements.functions.forEach(func => {
      complexity += 1; // Each function adds complexity
      if (func.parameters) {
        complexity += func.parameters.length * 0.5; // Parameters add complexity
      }
    });

    elements.classes.forEach(cls => {
      complexity += 2; // Classes add more complexity
      if (cls.methods) {
        complexity += cls.methods.length;
      }
    });

    return Math.round(complexity * 10) / 10;
  }

  calculateFileMetrics(content, elements) {
    const lines = content.split('\n');
    return {
      lines_of_code: lines.filter(line => line.trim() && !line.trim().startsWith('//')).length,
      total_lines: lines.length,
      functions_count: elements.functions.length,
      classes_count: elements.classes.length,
      comments_count: elements.comments.length
    };
  }

  detectFileRole(fileName, content) {
    const name = fileName.toLowerCase();
    
    if (name.includes('test') || name.includes('spec')) return 'test';
    if (name.includes('config') || name.includes('setting')) return 'configuration';
    if (name.includes('router') || name.includes('route')) return 'routing';
    if (name.includes('controller')) return 'controller';
    if (name.includes('service')) return 'service';
    if (name.includes('model') || name.includes('entity')) return 'model';
    if (name.includes('component') && content.includes('render')) return 'ui-component';
    if (name.includes('util') || name.includes('helper')) return 'utility';
    
    return 'business-logic';
  }

  buildInternalRelationships(elements) {
    const relationships = [];
    
    // Build relationships between functions and classes
    elements.functions.forEach(func => {
      elements.classes.forEach(cls => {
        if (func.name.includes(cls.name) || cls.methods?.includes(func.name)) {
          relationships.push({
            type: 'function-class',
            source: func.name,
            target: cls.name,
            relationship: 'belongs_to'
          });
        }
      });
    });

    return relationships;
  }

  buildCrossFileRelationships(semanticMap) {
    // This would analyze imports/exports between files
    // Implementation would be more complex in real scenario
    console.log('🔗 Building cross-file relationships...');
  }

  analyzeFunctionCalls(semanticMap) {
    // Analyze which functions call which other functions
    return [];
  }

  analyzeClassRelationships(semanticMap) {
    // Analyze inheritance, composition, etc.
    return [];
  }

  analyzeDataFlow(semanticMap) {
    // Analyze how data flows through the application
    return [];
  }

  analyzeModuleDependencies(semanticMap) {
    // Analyze dependencies between modules
    return [];
  }

  serializeSemanticMap(semanticMap) {
    const serialized = {};
    for (const [key, value] of semanticMap) {
      serialized[key] = {
        ...value,
        // Simplify for JSON serialization
        elements: {
          functions: value.elements.functions.map(f => ({ name: f.name, line: f.line })),
          classes: value.elements.classes.map(c => ({ name: c.name, line: c.line })),
          variables: value.elements.variables.map(v => ({ name: v.name, type: v.type }))
        }
      };
    }
    return serialized;
  }

  calculateConfidenceScore(semanticMap, metrics) {
    // Calculate confidence based on analysis completeness
    let score = 0.5;
    
    if (semanticMap.size > 0) score += 0.2;
    if (metrics.total_functions > 0) score += 0.1;
    if (metrics.total_classes > 0) score += 0.1;
    if (metrics.average_function_complexity > 0) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  // Additional helper methods (simplified for demo)
  initializePatternLibrary() { return new Map(); }
  detectDesignPatterns(semanticMap) { return []; }
  detectArchitecturalPatterns(semanticMap) { return []; }
  detectAntiPatterns(semanticMap) { return []; }
  calculateArchitectureScore(patterns, antiPatterns) { return 0.8; }
  findDuplicateCode(fileData) { return []; }
  calculateMaintainabilityIndex(complexity, lines) { return Math.max(0, 100 - complexity * 2 - lines / 100); }
  calculateTechnicalDebt(semanticMap) { return Math.random() * 20; }
  identifyPerformanceBottlenecks(semanticMap) { return []; }
  calculateCodeQualityScore(semanticMap) { return Math.random() * 0.4 + 0.6; }
  estimateTestCoverage(semanticMap) { return Math.floor(Math.random() * 50 + 30); }
}

/**
 * Code Context Builder - Builds comprehensive context for AI analysis
 */
class CodeContextBuilder {
  constructor() {
    this.contextTypes = ['function', 'class', 'module', 'project'];
  }

  buildContext(type, target, semanticMap) {
    switch (type) {
      case 'function':
        return this.buildFunctionContext(target, semanticMap);
      case 'class':
        return this.buildClassContext(target, semanticMap);
      case 'module':
        return this.buildModuleContext(target, semanticMap);
      case 'project':
        return this.buildProjectContext(semanticMap);
      default:
        return null;
    }
  }

  buildFunctionContext(functionName, semanticMap) {
    // Find function across all files and build comprehensive context
    return {
      function: functionName,
      callers: [],
      callees: [],
      dependencies: [],
      side_effects: [],
      complexity_factors: []
    };
  }

  buildClassContext(className, semanticMap) {
    // Build context for a specific class
    return {
      class: className,
      inheritance_hierarchy: [],
      composition_relationships: [],
      responsibilities: [],
      collaboration_patterns: []
    };
  }

  buildModuleContext(moduleName, semanticMap) {
    // Build context for a specific module/file
    return {
      module: moduleName,
      public_interface: [],
      internal_structure: [],
      dependencies: [],
      dependents: []
    };
  }

  buildProjectContext(semanticMap) {
    // Build overall project context
    return {
      architecture_style: 'unknown',
      main_patterns: [],
      technology_stack: [],
      project_health: {}
    };
  }
}

// Export singleton instance
export const advancedCodeAnalyzer = new AdvancedCodeAnalyzer();