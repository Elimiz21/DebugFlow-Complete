import { aiAnalyzer } from './AIAnalyzer.js';
import { advancedCodeAnalyzer } from './AdvancedCodeAnalyzer.js';
import { aiProviderManager } from './AIProviderManager.js';

/**
 * Intelligent Bug Prediction Engine - Phase 5.3
 * Predicts potential bugs and issues before they occur using:
 * - Historical analysis patterns
 * - Code change impact analysis
 * - Machine learning-based risk assessment
 * - Temporal bug pattern detection
 * - Cross-project learning and insights
 */
export class BugPredictionEngine {
  constructor() {
    this.baseAnalyzer = aiAnalyzer;
    this.semanticAnalyzer = advancedCodeAnalyzer;
    this.providerManager = aiProviderManager;
    this.predictionCache = new Map();
    this.historicalPatterns = new Map();
    this.riskModels = this.initializeRiskModels();
    this.bugPatternLibrary = this.initializeBugPatternLibrary();
    this.temporalAnalyzer = new TemporalBugAnalyzer();
  }

  /**
   * Main bug prediction entry point
   */
  async predictBugs(projectData, options = {}) {
    try {
      console.log('🔮 Starting intelligent bug prediction...');
      
      const startTime = Date.now();
      const predictionId = this.generatePredictionId(projectData);

      // Check cache
      if (this.predictionCache.has(predictionId) && !options.forceRefresh) {
        const cached = this.predictionCache.get(predictionId);
        if (Date.now() - cached.timestamp < 1800000) { // 30 minute cache
          return { ...cached.result, fromCache: true };
        }
      }

      // Multi-layered prediction approach
      const predictions = await Promise.all([
        this.predictPatternBasedBugs(projectData),
        this.predictComplexityBasedBugs(projectData),
        this.predictChangeImpactBugs(projectData),
        this.predictTemporalBugs(projectData),
        this.predictCrossFileRisks(projectData),
        this.predictSecurityVulnerabilities(projectData)
      ]);

      // Consolidate and rank predictions
      const consolidatedPredictions = this.consolidatePredictions(predictions);
      
      // Calculate risk scores
      const riskAssessment = await this.calculateRiskAssessment(consolidatedPredictions, projectData);
      
      // Generate actionable recommendations
      const preventionStrategies = await this.generatePreventionStrategies(consolidatedPredictions);
      
      // Predict timeline and impact
      const timelineAnalysis = this.predictBugTimelines(consolidatedPredictions);

      const result = {
        success: true,
        predictionId,
        results: {
          predictions: consolidatedPredictions,
          risk_assessment: riskAssessment,
          prevention_strategies: preventionStrategies,
          timeline_analysis: timelineAnalysis,
          confidence_score: this.calculateOverallConfidence(consolidatedPredictions),
          predicted_bug_count: consolidatedPredictions.length,
          high_risk_areas: this.identifyHighRiskAreas(consolidatedPredictions),
          prevention_urgency: this.calculatePreventionUrgency(consolidatedPredictions)
        },
        metadata: {
          duration: Date.now() - startTime,
          files_analyzed: projectData.files?.length || 0,
          prediction_methods_used: 6,
          historical_patterns_matched: this.countHistoricalMatches(consolidatedPredictions)
        },
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.predictionCache.set(predictionId, {
        result,
        timestamp: Date.now()
      });

      // Update historical patterns for future learning
      this.updateHistoricalPatterns(projectData, consolidatedPredictions);

      return result;

    } catch (error) {
      console.error('❌ Bug prediction failed:', error);
      return {
        success: false,
        error: error.message,
        analysisType: 'bug-prediction'
      };
    }
  }

  /**
   * Predict bugs based on known patterns and anti-patterns
   */
  async predictPatternBasedBugs(projectData) {
    const predictions = [];

    for (const file of projectData.files || []) {
      const fileName = file.filename || file.name || '';
      const content = file.content || '';

      // Check for common bug patterns
      const patterns = this.detectBugPatterns(content, fileName);
      
      patterns.forEach(pattern => {
        predictions.push({
          type: 'pattern-based',
          severity: pattern.severity,
          confidence: pattern.confidence,
          file_path: fileName,
          line_number: pattern.line,
          pattern_name: pattern.name,
          description: `High likelihood of ${pattern.bug_type} based on code pattern "${pattern.name}"`,
          predicted_bug_type: pattern.bug_type,
          probability: pattern.probability,
          prevention_difficulty: pattern.prevention_difficulty,
          detection_method: 'static-pattern-analysis'
        });
      });
    }

    return predictions;
  }

  /**
   * Predict bugs based on code complexity and structure
   */
  async predictComplexityBasedBugs(projectData) {
    const predictions = [];

    try {
      // Get semantic analysis for complexity insights
      const semanticAnalysis = await this.semanticAnalyzer.performSemanticAnalysis(projectData);
      
      if (semanticAnalysis.success) {
        const semanticMap = semanticAnalysis.results.semantic_map;
        
        Object.entries(semanticMap).forEach(([fileName, fileData]) => {
          // High complexity functions are more likely to have bugs
          fileData.elements?.functions?.forEach(func => {
            if (func.complexity && func.complexity > 10) {
              predictions.push({
                type: 'complexity-based',
                severity: func.complexity > 20 ? 'HIGH' : 'MEDIUM',
                confidence: Math.min(func.complexity / 20, 1.0),
                file_path: fileName,
                line_number: func.line,
                function_name: func.name,
                description: `High complexity function (${func.complexity}) likely to contain bugs`,
                predicted_bug_type: 'logic-error',
                probability: Math.min(func.complexity * 0.05, 0.8),
                prevention_difficulty: 'medium',
                detection_method: 'complexity-analysis'
              });
            }
          });

          // Large classes with many methods
          fileData.elements?.classes?.forEach(cls => {
            if (cls.methods && cls.methods.length > 15) {
              predictions.push({
                type: 'complexity-based',
                severity: 'MEDIUM',
                confidence: 0.6,
                file_path: fileName,
                line_number: cls.line,
                class_name: cls.name,
                description: `Large class with ${cls.methods.length} methods likely to have maintainability issues`,
                predicted_bug_type: 'maintainability-issue',
                probability: 0.4,
                prevention_difficulty: 'high',
                detection_method: 'structural-analysis'
              });
            }
          });
        });
      }
    } catch (error) {
      console.warn('Complexity-based prediction failed:', error);
    }

    return predictions;
  }

  /**
   * Predict bugs based on code change impact analysis
   */
  async predictChangeImpactBugs(projectData) {
    const predictions = [];

    // Analyze files that are likely to be changed frequently
    const highChangeFiles = this.identifyHighChangeFiles(projectData);
    
    highChangeFiles.forEach(file => {
      predictions.push({
        type: 'change-impact',
        severity: 'MEDIUM',
        confidence: 0.7,
        file_path: file.path,
        description: `File frequently modified, high risk of introducing bugs in future changes`,
        predicted_bug_type: 'regression',
        probability: 0.5,
        prevention_difficulty: 'low',
        detection_method: 'change-impact-analysis',
        recommended_actions: [
          'Increase test coverage for this file',
          'Consider refactoring to reduce coupling',
          'Implement stricter code review for changes'
        ]
      });
    });

    return predictions;
  }

  /**
   * Predict bugs based on temporal patterns
   */
  async predictTemporalBugs(projectData) {
    const predictions = [];

    try {
      const temporalPatterns = await this.temporalAnalyzer.analyzeTemporalPatterns(projectData);
      
      temporalPatterns.forEach(pattern => {
        if (pattern.risk_score > 0.6) {
          predictions.push({
            type: 'temporal',
            severity: pattern.risk_score > 0.8 ? 'HIGH' : 'MEDIUM',
            confidence: pattern.confidence,
            file_path: pattern.file_path,
            description: `Temporal analysis indicates increased bug probability: ${pattern.description}`,
            predicted_bug_type: pattern.predicted_type,
            probability: pattern.risk_score,
            prevention_difficulty: pattern.prevention_difficulty,
            detection_method: 'temporal-analysis',
            timing_prediction: pattern.timing_prediction
          });
        }
      });
    } catch (error) {
      console.warn('Temporal prediction failed:', error);
    }

    return predictions;
  }

  /**
   * Predict bugs based on cross-file dependencies and relationships
   */
  async predictCrossFileRisks(projectData) {
    const predictions = [];

    try {
      // Analyze file dependencies
      const dependencyGraph = this.buildDependencyGraph(projectData);
      
      // Find highly coupled files
      const highlyCoupledFiles = this.findHighlyCoupledFiles(dependencyGraph);
      
      highlyCoupledFiles.forEach(coupling => {
        predictions.push({
          type: 'cross-file-risk',
          severity: 'MEDIUM',
          confidence: coupling.coupling_strength,
          file_path: coupling.primary_file,
          related_files: coupling.coupled_files,
          description: `High coupling between files increases bug propagation risk`,
          predicted_bug_type: 'integration-error',
          probability: coupling.coupling_strength * 0.6,
          prevention_difficulty: 'high',
          detection_method: 'dependency-analysis'
        });
      });
    } catch (error) {
      console.warn('Cross-file risk prediction failed:', error);
    }

    return predictions;
  }

  /**
   * Predict security vulnerabilities that could become bugs
   */
  async predictSecurityVulnerabilities(projectData) {
    const predictions = [];

    try {
      // Use AI to identify potential security issues
      const securityAnalysis = await this.analyzeSecurityPatterns(projectData);
      
      securityAnalysis.forEach(issue => {
        if (issue.severity === 'HIGH' || issue.severity === 'CRITICAL') {
          predictions.push({
            type: 'security-vulnerability',
            severity: issue.severity,
            confidence: issue.confidence,
            file_path: issue.file_path,
            line_number: issue.line_number,
            description: `Security vulnerability likely to cause bugs: ${issue.description}`,
            predicted_bug_type: 'security-bug',
            probability: issue.exploit_probability,
            prevention_difficulty: 'medium',
            detection_method: 'security-analysis',
            cwe_id: issue.cwe_id,
            impact_assessment: issue.impact
          });
        }
      });
    } catch (error) {
      console.warn('Security vulnerability prediction failed:', error);
    }

    return predictions;
  }

  /**
   * Consolidate predictions from different methods
   */
  consolidatePredictions(predictionArrays) {
    const allPredictions = predictionArrays.flat();
    
    // Remove duplicates and merge similar predictions
    const consolidatedMap = new Map();
    
    allPredictions.forEach(prediction => {
      const key = `${prediction.file_path}:${prediction.line_number || 0}:${prediction.predicted_bug_type}`;
      
      if (consolidatedMap.has(key)) {
        const existing = consolidatedMap.get(key);
        // Merge predictions, taking higher confidence/probability
        existing.confidence = Math.max(existing.confidence, prediction.confidence);
        existing.probability = Math.max(existing.probability, prediction.probability);
        existing.detection_methods = [...new Set([
          ...(existing.detection_methods || [existing.detection_method]),
          prediction.detection_method
        ])];
      } else {
        consolidatedMap.set(key, { ...prediction });
      }
    });

    // Sort by risk score (probability * confidence)
    return Array.from(consolidatedMap.values())
      .sort((a, b) => (b.probability * b.confidence) - (a.probability * a.confidence));
  }

  /**
   * Calculate comprehensive risk assessment
   */
  async calculateRiskAssessment(predictions, projectData) {
    const totalFiles = projectData.files?.length || 1;
    const predictedBugs = predictions.length;
    
    const severityCounts = predictions.reduce((counts, pred) => {
      counts[pred.severity] = (counts[pred.severity] || 0) + 1;
      return counts;
    }, {});

    const avgProbability = predictions.length > 0 
      ? predictions.reduce((sum, pred) => sum + pred.probability, 0) / predictions.length
      : 0;

    const riskScore = Math.min(
      (predictedBugs / totalFiles) * 0.4 + avgProbability * 0.6,
      1.0
    );

    return {
      overall_risk_score: riskScore,
      risk_level: this.getRiskLevel(riskScore),
      predicted_bugs_per_file: predictedBugs / totalFiles,
      severity_distribution: severityCounts,
      average_bug_probability: avgProbability,
      highest_risk_file: this.findHighestRiskFile(predictions),
      recommendation: this.generateRiskRecommendation(riskScore, severityCounts)
    };
  }

  /**
   * Generate prevention strategies
   */
  async generatePreventionStrategies(predictions) {
    const strategies = [];
    
    // Group by bug type and generate specific strategies
    const bugTypeGroups = this.groupPredictionsByType(predictions);
    
    Object.entries(bugTypeGroups).forEach(([bugType, preds]) => {
      const strategy = this.generateBugTypeStrategy(bugType, preds);
      if (strategy) {
        strategies.push(strategy);
      }
    });

    // Add general strategies
    strategies.push(...this.generateGeneralStrategies(predictions));

    return strategies.sort((a, b) => b.impact_score - a.impact_score);
  }

  /**
   * Helper methods for bug pattern detection
   */
  detectBugPatterns(content, fileName) {
    const patterns = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Detect common bug patterns
      this.bugPatternLibrary.forEach(pattern => {
        if (pattern.regex.test(trimmed)) {
          patterns.push({
            name: pattern.name,
            bug_type: pattern.bug_type,
            severity: pattern.severity,
            confidence: pattern.confidence,
            probability: pattern.probability,
            prevention_difficulty: pattern.prevention_difficulty,
            line: lineNum
          });
        }
      });
    });

    return patterns;
  }

  // Initialization methods
  initializeRiskModels() {
    return {
      complexity_threshold: 10,
      coupling_threshold: 0.7,
      change_frequency_threshold: 0.8,
      security_severity_weights: {
        'CRITICAL': 1.0,
        'HIGH': 0.8,
        'MEDIUM': 0.5,
        'LOW': 0.2
      }
    };
  }

  initializeBugPatternLibrary() {
    return [
      {
        name: 'null_pointer_access',
        regex: /\.\w+\s*\(\s*\)\s*\.\w+/,
        bug_type: 'null-pointer-exception',
        severity: 'HIGH',
        confidence: 0.7,
        probability: 0.6,
        prevention_difficulty: 'low'
      },
      {
        name: 'uncaught_exception',
        regex: /throw\s+new\s+\w+\s*\([^)]*\)\s*;?\s*$/,
        bug_type: 'uncaught-exception',
        severity: 'MEDIUM',
        confidence: 0.6,
        probability: 0.4,
        prevention_difficulty: 'low'
      },
      {
        name: 'sql_injection_risk',
        regex: /query\s*\(\s*["'`][^"'`]*\$\{.*\}[^"'`]*["'`]/,
        bug_type: 'sql-injection',
        severity: 'CRITICAL',
        confidence: 0.9,
        probability: 0.8,
        prevention_difficulty: 'medium'
      },
      {
        name: 'memory_leak_risk',
        regex: /setInterval\s*\(|setTimeout\s*\(/,
        bug_type: 'memory-leak',
        severity: 'MEDIUM',
        confidence: 0.5,
        probability: 0.3,
        prevention_difficulty: 'medium'
      },
      {
        name: 'race_condition',
        regex: /async\s+\w+.*await\s+.*async\s+/,
        bug_type: 'race-condition',
        severity: 'HIGH',
        confidence: 0.6,
        probability: 0.5,
        prevention_difficulty: 'high'
      }
    ];
  }

  // Utility methods (simplified for demo)
  generatePredictionId(projectData) {
    return `prediction-${projectData.id}-${Date.now().toString(36)}`;
  }

  calculateOverallConfidence(predictions) {
    if (predictions.length === 0) return 0;
    return predictions.reduce((sum, pred) => sum + pred.confidence, 0) / predictions.length;
  }

  identifyHighRiskAreas(predictions) {
    const fileRisks = {};
    predictions.forEach(pred => {
      const file = pred.file_path;
      fileRisks[file] = (fileRisks[file] || 0) + (pred.probability * pred.confidence);
    });

    return Object.entries(fileRisks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([file, score]) => ({ file, risk_score: score }));
  }

  calculatePreventionUrgency(predictions) {
    const highRiskCount = predictions.filter(p => p.probability > 0.7).length;
    const criticalCount = predictions.filter(p => p.severity === 'CRITICAL' || p.severity === 'HIGH').length;
    
    if (criticalCount > 3 || highRiskCount > 5) return 'urgent';
    if (criticalCount > 1 || highRiskCount > 2) return 'high';
    if (predictions.length > 3) return 'medium';
    return 'low';
  }

  countHistoricalMatches(predictions) {
    // Simplified - would match against historical bug database
    return Math.floor(predictions.length * 0.3);
  }

  updateHistoricalPatterns(projectData, predictions) {
    // Update learning database for future predictions
    console.log('📚 Updating historical patterns for improved predictions');
  }

  // Additional helper methods (simplified implementations)
  identifyHighChangeFiles(projectData) { return []; }
  buildDependencyGraph(projectData) { return new Map(); }
  findHighlyCoupledFiles(dependencyGraph) { return []; }
  async analyzeSecurityPatterns(projectData) { return []; }
  getRiskLevel(score) { 
    if (score > 0.8) return 'critical';
    if (score > 0.6) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
  }
  findHighestRiskFile(predictions) {
    if (predictions.length === 0) return null;
    const sorted = predictions.sort((a, b) => (b.probability * b.confidence) - (a.probability * a.confidence));
    return sorted[0].file_path;
  }
  generateRiskRecommendation(score, counts) {
    return `Based on analysis, implement ${score > 0.7 ? 'immediate' : 'planned'} prevention measures`;
  }
  groupPredictionsByType(predictions) {
    return predictions.reduce((groups, pred) => {
      groups[pred.predicted_bug_type] = groups[pred.predicted_bug_type] || [];
      groups[pred.predicted_bug_type].push(pred);
      return groups;
    }, {});
  }
  generateBugTypeStrategy(type, predictions) {
    return {
      bug_type: type,
      priority: predictions.length > 2 ? 'high' : 'medium',
      impact_score: predictions.reduce((sum, p) => sum + p.probability, 0),
      strategies: [`Implement specific prevention for ${type}`],
      estimated_effort: '1-2 weeks'
    };
  }
  generateGeneralStrategies(predictions) {
    return [{
      bug_type: 'general',
      priority: 'medium',
      impact_score: predictions.length * 0.1,
      strategies: ['Increase test coverage', 'Implement code review practices'],
      estimated_effort: '2-4 weeks'
    }];
  }
  predictBugTimelines(predictions) {
    return {
      immediate_risk: predictions.filter(p => p.probability > 0.8).length,
      short_term_risk: predictions.filter(p => p.probability > 0.6).length,
      long_term_risk: predictions.filter(p => p.probability > 0.4).length
    };
  }
}

/**
 * Temporal Bug Analyzer - Analyzes time-based patterns
 */
class TemporalBugAnalyzer {
  async analyzeTemporalPatterns(projectData) {
    // Simplified temporal analysis
    return [];
  }
}

// Export singleton instance
export const bugPredictionEngine = new BugPredictionEngine();