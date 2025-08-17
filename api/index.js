// Main API Router
// Consolidates all API endpoints for the application

import express from 'express';
import authRouter from './auth.js';
import projectsRouter from './projects.js';
import uploadRouter from './upload.js';
import bugReportsRouter from './bug-reports.js';
import aiRouter from './ai.js';
import aiAnalysisRouter from './ai-analysis.js';
import collaborativeRouter from './collaborative-sessions.js';
import organizationsRouter from './organizations.js';
import teamsRouter from './teams.js';
import testRunnerRouter from './test-runner.js';
import analyticsRouter from './analytics.js';
import settingsRouter from './settings.js';
import debugSessionRouter from './debug-sessions.js';
import bugsRouter from './bugs.js';
import jobsRouter from './jobs.js';
import adminRouter from './admin.js';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Mount all routers
router.use('/auth', authRouter);
router.use('/projects', projectsRouter);
router.use('/upload', uploadRouter);
router.use('/bug-reports', bugReportsRouter);
router.use('/ai', aiRouter);
router.use('/ai-analysis', aiAnalysisRouter);
router.use('/collaborative-sessions', collaborativeRouter);
router.use('/organizations', organizationsRouter);
router.use('/teams', teamsRouter);
router.use('/test-runner', testRunnerRouter);
router.use('/analytics', analyticsRouter);
router.use('/settings', settingsRouter);
router.use('/debug-sessions', debugSessionRouter);
router.use('/bugs', bugsRouter);
router.use('/jobs', jobsRouter);
router.use('/admin', adminRouter);

// 404 handler for undefined API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

export default router;