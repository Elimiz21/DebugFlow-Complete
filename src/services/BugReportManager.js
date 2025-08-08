import api from './api.js';
import toast from 'react-hot-toast';
import { aiAnalyzer } from './AIAnalyzer.js';

/**
 * Advanced Bug Report Management Service
 * Handles all bug report operations with AI integration
 */
export class BugReportManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * Create a new bug report
   */
  async createBugReport(bugData) {
    try {
      const response = await api.post('/api/bug-reports?action=create', bugData);
      
      if (response.data.success) {
        // Clear cache for this project
        this.clearProjectCache(bugData.project_id);
        
        toast.success('Bug report created successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error creating bug report:', error);
      toast.error(`Failed to create bug report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create bug report from AI analysis results
   */
  async createBugFromAnalysis(projectId, analysisResult, userId) {
    try {
      const bugs = [];
      
      if (analysisResult.results && analysisResult.results.recommendations) {
        for (const recommendation of analysisResult.results.recommendations) {
          const bugData = {
            project_id: projectId,
            title: recommendation.title || 'AI Detected Issue',
            description: recommendation.description || '',
            severity: this.mapSeverity(recommendation.severity),
            category: this.mapCategory(recommendation.category),
            file_path: recommendation.file_path || null,
            line_number: recommendation.line_number || null,
            suggested_fix: recommendation.solution || null,
            ai_analysis: JSON.stringify(recommendation),
            ai_confidence_score: analysisResult.results.confidence_score || 0.8,
            estimated_fix_time: this.estimateFixTime(recommendation),
            priority: this.mapPriority(recommendation.severity),
            tags: this.generateTags(recommendation)
          };

          const created = await this.createBugReport(bugData);
          bugs.push(created);
        }
      }

      return bugs;
    } catch (error) {
      console.error('Error creating bugs from analysis:', error);
      throw error;
    }
  }

  /**
   * Get bug reports for a project with filtering
   */
  async getBugReports(projectId, filters = {}, useCache = true) {
    try {
      const cacheKey = `bugs-${projectId}-${JSON.stringify(filters)}`;
      
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const queryParams = new URLSearchParams({
        project_id: projectId,
        include_stats: 'true',
        ...filters
      });

      const response = await api.get(`/api/bug-reports?${queryParams}`);
      
      if (response.data.success) {
        const data = response.data.data;
        
        // Cache the results
        if (useCache) {
          this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        }
        
        return data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching bug reports:', error);
      toast.error(`Failed to fetch bug reports: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific bug report with full details
   */
  async getBugReport(bugId, includeDetails = true) {
    try {
      const queryParams = includeDetails ? '?action=full' : '';
      const response = await api.get(`/api/bug-reports${queryParams}&bug_id=${bugId}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching bug report:', error);
      toast.error(`Failed to fetch bug report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a bug report
   */
  async updateBugReport(bugId, updateData) {
    try {
      const response = await api.put(`/api/bug-reports?bug_id=${bugId}`, updateData);
      
      if (response.data.success) {
        // Clear cache
        this.clearCache();
        
        toast.success('Bug report updated successfully');
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error updating bug report:', error);
      toast.error(`Failed to update bug report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a bug report
   */
  async deleteBugReport(bugId) {
    try {
      const response = await api.delete(`/api/bug-reports?bug_id=${bugId}`);
      
      if (response.data.success) {
        // Clear cache
        this.clearCache();
        
        toast.success('Bug report deleted successfully');
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error deleting bug report:', error);
      toast.error(`Failed to delete bug report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add comment to bug report
   */
  async addComment(bugId, comment, commentType = 'comment', metadata = null) {
    try {
      const response = await api.post(`/api/bug-reports?action=comment&bug_id=${bugId}`, {
        comment,
        comment_type: commentType,
        metadata
      });
      
      if (response.data.success) {
        toast.success('Comment added successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(`Failed to add comment: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload attachment to bug report
   */
  async uploadAttachment(bugId, file) {
    try {
      const formData = new FormData();
      formData.append('attachment', file);

      const response = await api.post(`/api/bug-reports?action=upload&bug_id=${bugId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        toast.success('File uploaded successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available bug labels
   */
  async getBugLabels() {
    try {
      const cacheKey = 'bug-labels';
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const response = await api.get('/api/bug-reports?action=labels');
      
      if (response.data.success) {
        const labels = response.data.data;
        
        // Cache the labels
        this.cache.set(cacheKey, {
          data: labels,
          timestamp: Date.now()
        });
        
        return labels;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching labels:', error);
      return [];
    }
  }

  /**
   * Perform AI analysis on bug report to suggest fixes
   */
  async analyzeAndSuggestFix(bugId, codeContext = '') {
    try {
      const bug = await this.getBugReport(bugId, false);
      
      if (!bug) {
        throw new Error('Bug report not found');
      }

      const analysisPrompt = `
        Analyze this bug report and provide a detailed fix suggestion:
        
        Title: ${bug.title}
        Description: ${bug.description}
        File: ${bug.file_path || 'Unknown'}
        Line: ${bug.line_number || 'Unknown'}
        Severity: ${bug.severity}
        Category: ${bug.category}
        
        ${codeContext ? `Code Context:\n${codeContext}` : ''}
        
        Please provide:
        1. Root cause analysis
        2. Step-by-step fix instructions
        3. Code examples if applicable
        4. Prevention strategies
        5. Estimated fix time
      `;

      const analysisResult = await aiAnalyzer.performAnalysis({
        analysisType: 'targeted-bug-fix',
        projectData: { id: bug.project_id, name: 'Bug Fix Analysis' },
        bugData: {
          description: bug.description,
          error_message: bug.title,
          line_number: bug.line_number
        },
        userInstructions: analysisPrompt,
        useCache: false
      });

      if (analysisResult.success && analysisResult.results.recommendations.length > 0) {
        const suggestion = analysisResult.results.recommendations[0];
        
        // Update bug report with AI suggestion
        await this.updateBugReport(bugId, {
          suggested_fix: suggestion.solution,
          ai_analysis: JSON.stringify(suggestion),
          ai_confidence_score: analysisResult.results.confidence_score,
          estimated_fix_time: this.estimateFixTime(suggestion)
        });

        return suggestion;
      } else {
        throw new Error('No fix suggestions generated');
      }
    } catch (error) {
      console.error('Error analyzing bug:', error);
      toast.error(`Failed to analyze bug: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk operations for bug reports
   */
  async bulkUpdate(bugIds, updateData) {
    try {
      const promises = bugIds.map(id => this.updateBugReport(id, updateData));
      await Promise.all(promises);
      
      toast.success(`${bugIds.length} bug reports updated successfully`);
      return true;
    } catch (error) {
      console.error('Error in bulk update:', error);
      toast.error(`Failed to update bug reports: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find similar/duplicate bugs using AI
   */
  async findSimilarBugs(projectId, bugTitle, bugDescription) {
    try {
      const allBugs = await this.getBugReports(projectId, {}, false);
      
      if (!allBugs.bugs || allBugs.bugs.length < 2) {
        return [];
      }

      // Simple similarity check (can be enhanced with AI)
      const similarBugs = allBugs.bugs.filter(bug => {
        const titleSimilarity = this.calculateSimilarity(bugTitle, bug.title);
        const descSimilarity = this.calculateSimilarity(bugDescription, bug.description || '');
        
        return titleSimilarity > 0.6 || descSimilarity > 0.5;
      });

      return similarBugs.slice(0, 5); // Return top 5 similar bugs
    } catch (error) {
      console.error('Error finding similar bugs:', error);
      return [];
    }
  }

  /**
   * Generate bug report from error logs
   */
  async createBugFromErrorLog(projectId, errorLog, userId) {
    try {
      // Parse error log to extract useful information
      const errorLines = errorLog.split('\n');
      const errorMessage = errorLines[0] || 'Unknown error';
      
      // Find file path and line number from stack trace
      let filePath = null;
      let lineNumber = null;
      
      for (const line of errorLines) {
        const match = line.match(/at .* \((.+):(\d+):\d+\)/);
        if (match) {
          filePath = match[1];
          lineNumber = parseInt(match[2]);
          break;
        }
      }

      const bugData = {
        project_id: projectId,
        title: `Runtime Error: ${errorMessage.substring(0, 100)}`,
        description: errorLog,
        severity: 'high',
        category: 'logic',
        file_path: filePath,
        line_number: lineNumber,
        priority: 'high',
        tags: ['runtime-error', 'auto-generated']
      };

      return await this.createBugReport(bugData);
    } catch (error) {
      console.error('Error creating bug from error log:', error);
      throw error;
    }
  }

  // Helper methods
  mapSeverity(aiSeverity) {
    const severityMap = {
      'CRITICAL': 'critical',
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low'
    };
    return severityMap[aiSeverity] || 'medium';
  }

  mapCategory(aiCategory) {
    const categoryMap = {
      'security': 'security',
      'performance': 'performance',
      'bug': 'logic',
      'quality': 'general',
      'architecture': 'general'
    };
    return categoryMap[aiCategory] || 'general';
  }

  mapPriority(severity) {
    const priorityMap = {
      'critical': 'urgent',
      'high': 'high',
      'medium': 'normal',
      'low': 'low'
    };
    return priorityMap[severity] || 'normal';
  }

  estimateFixTime(recommendation) {
    // Simple heuristic for fix time estimation (in minutes)
    const severity = recommendation.severity || 'MEDIUM';
    const baseTime = {
      'CRITICAL': 240, // 4 hours
      'HIGH': 120,     // 2 hours
      'MEDIUM': 60,    // 1 hour
      'LOW': 30        // 30 minutes
    };
    
    return baseTime[severity] || 60;
  }

  generateTags(recommendation) {
    const tags = [];
    
    if (recommendation.category) {
      tags.push(recommendation.category);
    }
    
    if (recommendation.severity === 'CRITICAL') {
      tags.push('critical');
    }
    
    tags.push('ai-generated');
    
    return tags;
  }

  calculateSimilarity(str1, str2) {
    // Simple Levenshtein distance similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  clearCache() {
    this.cache.clear();
  }

  clearProjectCache(projectId) {
    for (const key of this.cache.keys()) {
      if (key.includes(projectId)) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const bugReportManager = new BugReportManager();