import React, { useState, useEffect } from 'react';
import { Brain, FileSearch, AlertTriangle, CheckCircle, Code, Loader, Package } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ProjectAnalyzer = ({ project }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (project?.id) {
      fetchProjectFiles();
    }
  }, [project]);

  const fetchProjectFiles = async () => {
    try {
      const response = await api.get(`/projects/${project.id}/files`);
      if (response.data.success) {
        setProjectFiles(response.data.files || []);
      }
    } catch (error) {
      console.error('Error fetching project files:', error);
    }
  };

  const analyzeProject = async () => {
    if (!project) {
      toast.error('No project selected');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Prepare project context for AI analysis
      const projectContext = {
        name: project.name,
        description: project.description,
        type: project.type,
        language: project.language,
        files: projectFiles.slice(0, 10), // Send first 10 files for analysis
        repository: project.codebase_url
      };

      // Call AI analysis endpoint
      const response = await api.post('/ai/analyze-project', {
        project: projectContext,
        analysisType: 'comprehensive'
      });

      if (response.data.success) {
        setAnalysisResults(response.data.analysis);
        toast.success('Project analysis completed!');
      } else {
        throw new Error(response.data.message || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze project. Please try again.');
      
      // Provide mock analysis for demonstration
      setAnalysisResults({
        summary: 'Project analysis is being processed. This is a demo result.',
        codeQuality: {
          score: 85,
          issues: [
            { type: 'warning', message: 'Consider adding error handling in main functions' },
            { type: 'info', message: 'Code follows good naming conventions' }
          ]
        },
        security: {
          score: 90,
          issues: [
            { type: 'info', message: 'No major security vulnerabilities detected' }
          ]
        },
        performance: {
          score: 75,
          suggestions: [
            'Consider implementing caching for frequently accessed data',
            'Optimize database queries for better performance'
          ]
        },
        bugs: {
          found: 3,
          fixed: 0,
          critical: 0,
          items: [
            { severity: 'low', description: 'Unused variables in multiple files' },
            { severity: 'medium', description: 'Missing null checks in data processing' },
            { severity: 'low', description: 'Inconsistent code formatting' }
          ]
        },
        recommendations: [
          'Add comprehensive unit tests',
          'Implement continuous integration',
          'Add documentation for API endpoints',
          'Consider using TypeScript for better type safety'
        ]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeFile = async (file) => {
    setSelectedFile(file);
    try {
      const response = await api.post('/ai/analyze-code', {
        code: file.content || 'File content not available',
        filename: file.filename,
        language: file.language
      });

      if (response.data.success) {
        toast.success(`Analysis complete for ${file.filename}`);
        // Handle file-specific analysis results
      }
    } catch (error) {
      console.error('File analysis error:', error);
      toast.error('Failed to analyze file');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!project) {
    return (
      <div className="text-center py-8">
        <Package className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-600">Select a project to analyze</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">{project.name}</h2>
            <p className="text-gray-600">{project.description}</p>
            <div className="flex gap-4 mt-2">
              <span className="text-sm text-gray-500">Type: {project.type}</span>
              <span className="text-sm text-gray-500">Language: {project.language}</span>
              <span className="text-sm text-gray-500">Status: {project.status}</span>
            </div>
          </div>
          <button
            onClick={analyzeProject}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader className="animate-spin" size={20} />
                Analyzing...
              </>
            ) : (
              <>
                <Brain size={20} />
                Analyze Project
              </>
            )}
          </button>
        </div>

        {/* Quick Stats */}
        {project.file_count > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-500">Files</p>
              <p className="text-xl font-semibold">{project.file_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Size</p>
              <p className="text-xl font-semibold">
                {Math.round(project.size_bytes / 1024)} KB
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Bugs Found</p>
              <p className="text-xl font-semibold">{project.bugs_found || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Bugs Fixed</p>
              <p className="text-xl font-semibold">{project.bugs_fixed || 0}</p>
            </div>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysisResults && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-3">Analysis Summary</h3>
            <p className="text-gray-700">{analysisResults.summary}</p>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Code Quality</span>
                <span className={`text-2xl font-bold ${getScoreColor(analysisResults.codeQuality?.score)}`}>
                  {analysisResults.codeQuality?.score}%
                </span>
              </div>
              <div className="space-y-1">
                {analysisResults.codeQuality?.issues.map((issue, idx) => (
                  <div key={idx} className="text-xs text-gray-600">
                    • {issue.message}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Security</span>
                <span className={`text-2xl font-bold ${getScoreColor(analysisResults.security?.score)}`}>
                  {analysisResults.security?.score}%
                </span>
              </div>
              <div className="space-y-1">
                {analysisResults.security?.issues.map((issue, idx) => (
                  <div key={idx} className="text-xs text-gray-600">
                    • {issue.message}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Performance</span>
                <span className={`text-2xl font-bold ${getScoreColor(analysisResults.performance?.score)}`}>
                  {analysisResults.performance?.score}%
                </span>
              </div>
              <div className="space-y-1">
                {analysisResults.performance?.suggestions.slice(0, 2).map((suggestion, idx) => (
                  <div key={idx} className="text-xs text-gray-600">
                    • {suggestion}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bugs */}
          {analysisResults.bugs && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle size={20} />
                Detected Issues
              </h3>
              <div className="space-y-2">
                {analysisResults.bugs.items.map((bug, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(bug.severity)}`}>
                      {bug.severity}
                    </span>
                    <p className="text-sm text-gray-700">{bug.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysisResults.recommendations && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle size={20} />
                Recommendations
              </h3>
              <ul className="space-y-2">
                {analysisResults.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    <span className="text-sm text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* File List */}
      {projectFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileSearch size={20} />
            Project Files ({projectFiles.length})
          </h3>
          <div className="max-h-64 overflow-y-auto">
            <div className="space-y-1">
              {projectFiles.map((file, idx) => (
                <div
                  key={idx}
                  onClick={() => analyzeFile(file)}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Code size={16} className="text-gray-400" />
                    <span className="text-sm">{file.filename}</span>
                    <span className="text-xs text-gray-500">{file.language}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {Math.round(file.size_bytes / 1024)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAnalyzer;