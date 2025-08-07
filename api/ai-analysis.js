import database from '../database/database.js';
import { verifyToken } from '../utils/auth.js';

/**
 * AI Analysis API Endpoint
 * Handles saving and retrieving AI analysis results
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const userId = decoded.userId;

    if (req.method === 'POST') {
      // Save analysis results
      const {
        id,
        user_id,
        project_id,
        analysis_type,
        ai_provider,
        status,
        results,
        confidence_score,
        duration_ms,
        token_usage
      } = req.body;

      // Validate user can only save their own analyses
      if (user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Cannot save analysis for another user'
        });
      }

      const analysisRecord = await database.createAIAnalysis({
        id: id || Date.now().toString(),
        user_id: userId,
        project_id,
        analysis_type,
        ai_provider,
        status: status || 'completed',
        results,
        confidence_score: confidence_score || 0.5,
        duration_ms: duration_ms || 0,
        token_usage: token_usage || 0,
        created_at: new Date().toISOString()
      });

      return res.status(201).json({
        success: true,
        data: analysisRecord,
        message: 'Analysis saved successfully'
      });

    } else if (req.method === 'GET') {
      // Get analysis history
      const { project_id } = req.query;

      if (!project_id) {
        return res.status(400).json({
          success: false,
          message: 'project_id is required'
        });
      }

      const analyses = await database.getAIAnalysesByProject(project_id, userId);

      return res.status(200).json({
        success: true,
        data: analyses,
        message: `Retrieved ${analyses.length} analysis records`
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('AI Analysis API Error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}