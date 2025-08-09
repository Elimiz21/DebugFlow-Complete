import { AuthUtils } from '../utils/auth.js';
import { aiService } from '../utils/ai.js';
import database from '../database/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { validationRules, handleValidationErrors } from '../middleware/validation.js';
import { rateLimiters } from '../utils/security.js';

// Main handler
export default asyncHandler(async function handler(req, res) {
  const { method } = req;
  
  // Authentication required
  const authHeader = req.headers['authorization'];
  const token = AuthUtils.extractTokenFromHeader(authHeader);
  
  // Allow mock token in development
  let user;
  if (process.env.NODE_ENV !== 'production' && token === 'mock-jwt-token-for-development') {
    user = { id: 1, name: 'Test User', email: 'test@debugflow.com' };
  } else {
    if (!token) {
      throw new AppError('Access denied. No token provided.', 401, 'NO_TOKEN');
    }
    
    user = AuthUtils.verifyToken(token);
    if (!user) {
      throw new AppError('Invalid token.', 401, 'INVALID_TOKEN');
    }
  }

  switch (method) {
    case 'POST':
      return handleAnalysis(req, res, user);
    case 'GET':
      return getAnalysisHistory(req, res, user);
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      throw new AppError(`Method ${method} not allowed`, 405, 'METHOD_NOT_ALLOWED');
  }
});

// Handle code analysis
const handleAnalysis = asyncHandler(async (req, res, user) => {
  const { action } = req.query;
  
  switch (action) {
    case 'analyze':
      return analyzeCode(req, res, user);
    case 'fix':
      return generateFix(req, res, user);
    case 'suggest':
      return generateSuggestions(req, res, user);
    case 'explain':
      return explainCode(req, res, user);
    default:
      return analyzeCode(req, res, user);
  }
});

// Analyze code for bugs and issues
const analyzeCode = asyncHandler(async (req, res, user) => {
  const { code, language = 'javascript', projectId, filename, options = {} } = req.body;
  
  if (!code) {
    throw new AppError('Code is required for analysis', 400, 'MISSING_CODE');
  }
  
  // Perform AI analysis
  const analysis = await aiService.analyzeCode(code, language, options);
  
  // Store analysis in database if projectId provided
  if (projectId) {
    try {
      await database.createAnalysis({
        project_id: projectId,
        type: 'ai-analysis',
        status: 'completed',
        result: JSON.stringify(analysis),
        error_count: analysis.issues?.filter(i => i.severity === 'critical' || i.severity === 'high').length || 0,
        warning_count: analysis.issues?.filter(i => i.severity === 'medium').length || 0,
        info_count: analysis.issues?.filter(i => i.severity === 'low').length || 0,
        completed_at: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Failed to store analysis:', dbError);
    }
  }
  
  res.status(200).json({
    success: true,
    message: 'Code analysis completed',
    data: {
      analysis,
      language,
      filename,
      analyzedAt: new Date().toISOString(),
      provider: aiService.preferredProvider || 'mock'
    }
  });
});

// Generate fix for specific issue
const generateFix = asyncHandler(async (req, res, user) => {
  const { code, issue, language = 'javascript' } = req.body;
  
  if (!code || !issue) {
    throw new AppError('Code and issue are required', 400, 'MISSING_PARAMS');
  }
  
  const fix = await aiService.generateFix(code, issue, language);
  
  res.status(200).json({
    success: true,
    message: 'Fix generated successfully',
    data: {
      fix,
      language,
      issue,
      generatedAt: new Date().toISOString()
    }
  });
});

// Generate improvement suggestions
const generateSuggestions = asyncHandler(async (req, res, user) => {
  const { code, language = 'javascript', context = '' } = req.body;
  
  if (!code) {
    throw new AppError('Code is required', 400, 'MISSING_CODE');
  }
  
  const suggestions = await aiService.generateSuggestions(code, language, context);
  
  res.status(200).json({
    success: true,
    message: 'Suggestions generated successfully',
    data: {
      suggestions,
      language,
      context,
      generatedAt: new Date().toISOString()
    }
  });
});

// Explain code functionality
const explainCode = asyncHandler(async (req, res, user) => {
  const { code, language = 'javascript' } = req.body;
  
  if (!code) {
    throw new AppError('Code is required', 400, 'MISSING_CODE');
  }
  
  const explanation = await aiService.explainCode(code, language);
  
  res.status(200).json({
    success: true,
    message: 'Code explained successfully',
    data: {
      explanation,
      language,
      explainedAt: new Date().toISOString()
    }
  });
});

// Get analysis history
const getAnalysisHistory = asyncHandler(async (req, res, user) => {
  const { projectId } = req.query;
  
  if (!projectId) {
    throw new AppError('Project ID is required', 400, 'MISSING_PROJECT_ID');
  }
  
  // Get analyses from database
  const analyses = await database.getAnalysesByProjectId(projectId);
  
  res.status(200).json({
    success: true,
    message: 'Analysis history retrieved',
    data: {
      analyses,
      count: analyses.length
    }
  });
});