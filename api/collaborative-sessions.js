import database from '../database/database.js';
import { verifyToken } from '../utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Collaborative Sessions API Endpoint
 * Handles real-time collaborative debugging sessions
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
      // Handle different POST actions
      const action = req.url.split('?action=')[1]?.split('&')[0] || 'create';

      if (action === 'create') {
        // Create new collaborative session
        const {
          project_id,
          session_type,
          title,
          description,
          participants = [],
          session_config = {}
        } = req.body;

        if (!project_id || !title) {
          return res.status(400).json({
            success: false,
            message: 'project_id and title are required'
          });
        }

        // Verify user has access to project
        const project = await database.getProjectById(project_id);
        if (!project || project.user_id !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to project'
          });
        }

        const sessionId = uuidv4();
        
        // Add creator as owner to participants
        const sessionParticipants = [
          { user_id: userId, role: 'owner' },
          ...participants.map(p => ({ ...p, role: p.role || 'participant' }))
        ];

        const sessionData = {
          id: sessionId,
          project_id,
          session_type: session_type || 'debugging',
          title,
          description,
          creator_id: userId,
          participants: sessionParticipants,
          session_config
        };

        await database.createCollaborativeSession(sessionData);

        // Add creator as participant in participants table
        await database.addSessionParticipant({
          session_id: sessionId,
          user_id: userId,
          role: 'owner',
          permissions: [
            'edit_code', 'add_annotations', 'manage_breakpoints', 
            'invite_users', 'end_session'
          ]
        });

        const session = await database.getCollaborativeSession(sessionId);

        return res.status(201).json({
          success: true,
          data: session,
          message: 'Collaborative session created successfully'
        });

      } else if (action === 'join') {
        // Join existing session
        const { session_id, role = 'participant' } = req.body;

        if (!session_id) {
          return res.status(400).json({
            success: false,
            message: 'session_id is required'
          });
        }

        const session = await database.getCollaborativeSession(session_id);
        if (!session) {
          return res.status(404).json({
            success: false,
            message: 'Session not found'
          });
        }

        // Check if user has access to project
        const project = await database.getProjectById(session.project_id);
        if (!project || project.user_id !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to session'
          });
        }

        // Add participant
        await database.addSessionParticipant({
          session_id: session_id,
          user_id: userId,
          role,
          permissions: getPermissionsForRole(role)
        });

        return res.status(200).json({
          success: true,
          message: 'Joined session successfully'
        });

      } else if (action === 'add-annotation') {
        // Add annotation to session
        const {
          session_id,
          file_path,
          line_number,
          column_number = 0,
          annotation_type = 'comment',
          content,
          metadata,
          parent_id
        } = req.body;

        if (!session_id || !file_path || line_number === undefined || !content) {
          return res.status(400).json({
            success: false,
            message: 'session_id, file_path, line_number, and content are required'
          });
        }

        const annotation = await database.createSessionAnnotation({
          session_id,
          user_id: userId,
          file_path,
          line_number,
          column_number,
          annotation_type,
          content,
          metadata,
          parent_id
        });

        return res.status(201).json({
          success: true,
          data: annotation,
          message: 'Annotation added successfully'
        });

      } else if (action === 'add-breakpoint') {
        // Add breakpoint to session
        const {
          session_id,
          file_path,
          line_number,
          breakpoint_type = 'line',
          condition_expression
        } = req.body;

        if (!session_id || !file_path || line_number === undefined) {
          return res.status(400).json({
            success: false,
            message: 'session_id, file_path, and line_number are required'
          });
        }

        const result = await database.createSessionBreakpoint({
          session_id,
          user_id: userId,
          file_path,
          line_number,
          breakpoint_type,
          condition_expression
        });

        return res.status(201).json({
          success: true,
          data: result,
          message: 'Breakpoint added successfully'
        });

      } else {
        return res.status(400).json({
          success: false,
          message: `Unknown action: ${action}`
        });
      }

    } else if (req.method === 'GET') {
      const { project_id, session_id, action } = req.query;

      if (session_id) {
        // Get specific session details
        const session = await database.getCollaborativeSession(session_id);
        if (!session) {
          return res.status(404).json({
            success: false,
            message: 'Session not found'
          });
        }

        // Check access
        const project = await database.getProjectById(session.project_id);
        if (!project || project.user_id !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to session'
          });
        }

        if (action === 'participants') {
          const participants = await database.getSessionParticipants(session_id);
          return res.status(200).json({
            success: true,
            data: participants
          });
        } else if (action === 'annotations') {
          const { file_path } = req.query;
          const annotations = await database.getSessionAnnotations(session_id, file_path);
          return res.status(200).json({
            success: true,
            data: annotations
          });
        } else if (action === 'breakpoints') {
          const { file_path } = req.query;
          const breakpoints = await database.getSessionBreakpoints(session_id, file_path);
          return res.status(200).json({
            success: true,
            data: breakpoints
          });
        } else if (action === 'events') {
          const { since_timestamp, event_type, limit } = req.query;
          const events = await database.getSessionEvents(session_id, {
            since_timestamp,
            event_type,
            limit: limit ? parseInt(limit) : undefined
          });
          return res.status(200).json({
            success: true,
            data: events
          });
        } else {
          return res.status(200).json({
            success: true,
            data: session
          });
        }

      } else if (project_id) {
        // Get sessions for project
        const sessions = await database.getCollaborativeSessionsByProject(project_id, userId);
        return res.status(200).json({
          success: true,
          data: sessions
        });

      } else {
        return res.status(400).json({
          success: false,
          message: 'project_id or session_id is required'
        });
      }

    } else if (req.method === 'PUT') {
      // Update session or session elements
      const { session_id } = req.query;

      if (!session_id) {
        return res.status(400).json({
          success: false,
          message: 'session_id is required'
        });
      }

      const session = await database.getCollaborativeSession(session_id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Check if user is owner or moderator
      const participants = await database.getSessionParticipants(session_id);
      const userParticipant = participants.find(p => p.user_id === userId);
      
      if (!userParticipant || !['owner', 'moderator'].includes(userParticipant.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update session'
        });
      }

      const action = req.url.split('?action=')[1]?.split('&')[0];

      if (action === 'update-status') {
        const { is_online, cursor_position, current_selection } = req.body;
        
        await database.updateParticipantStatus(session_id, userId, {
          is_online,
          cursor_position,
          current_selection,
          last_activity: new Date().toISOString()
        });

        return res.status(200).json({
          success: true,
          message: 'Status updated successfully'
        });

      } else {
        // Update session properties
        const allowedUpdates = ['title', 'description', 'session_config', 'active_file', 'status'];
        const updates = {};
        
        Object.keys(req.body).forEach(key => {
          if (allowedUpdates.includes(key)) {
            updates[key] = req.body[key];
          }
        });

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No valid fields to update'
          });
        }

        await database.updateCollaborativeSession(session_id, updates);

        return res.status(200).json({
          success: true,
          message: 'Session updated successfully'
        });
      }

    } else if (req.method === 'DELETE') {
      const { session_id, annotation_id } = req.query;

      if (annotation_id) {
        // Delete annotation (only creator or session owner)
        const annotation = await database.query(
          'SELECT * FROM session_annotations WHERE id = ?', 
          [annotation_id]
        );

        if (!annotation.length) {
          return res.status(404).json({
            success: false,
            message: 'Annotation not found'
          });
        }

        const annotationData = annotation[0];
        
        if (annotationData.user_id !== userId) {
          // Check if user is session owner
          const session = await database.getCollaborativeSession(annotationData.session_id);
          if (!session || session.creator_id !== userId) {
            return res.status(403).json({
              success: false,
              message: 'Permission denied'
            });
          }
        }

        await database.run('DELETE FROM session_annotations WHERE id = ?', [annotation_id]);

        return res.status(200).json({
          success: true,
          message: 'Annotation deleted successfully'
        });

      } else if (session_id) {
        // End session (only owner)
        const session = await database.getCollaborativeSession(session_id);
        if (!session) {
          return res.status(404).json({
            success: false,
            message: 'Session not found'
          });
        }

        if (session.creator_id !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Only session creator can end session'
          });
        }

        await database.updateCollaborativeSession(session_id, {
          status: 'ended'
        });

        return res.status(200).json({
          success: true,
          message: 'Session ended successfully'
        });

      } else {
        return res.status(400).json({
          success: false,
          message: 'session_id or annotation_id is required'
        });
      }

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Collaborative Sessions API Error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

function getPermissionsForRole(role) {
  const permissions = {
    owner: [
      'edit_code', 'add_annotations', 'manage_breakpoints', 
      'invite_users', 'end_session', 'moderate_session'
    ],
    moderator: [
      'edit_code', 'add_annotations', 'manage_breakpoints', 
      'invite_users', 'moderate_session'
    ],
    participant: [
      'edit_code', 'add_annotations', 'manage_breakpoints'
    ],
    observer: [
      'add_annotations'
    ]
  };

  return permissions[role] || permissions.observer;
}