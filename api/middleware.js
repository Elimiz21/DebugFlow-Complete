// Central middleware configuration for all API routes
import corsMiddleware from '../utils/cors.js';
import { configureSecurityMiddleware, rateLimiters } from '../utils/security.js';
import { sanitizeAllInputs, handleValidationErrors } from '../middleware/validation.js';
import { errorLogger, globalErrorHandler, notFoundHandler } from '../middleware/errorHandler.js';

// Configure all middleware for an Express app
export const configureMiddleware = (app) => {
  // Trust proxy (important for rate limiting behind reverse proxies)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Security middleware (Helmet, custom headers)
  configureSecurityMiddleware(app);

  // CORS
  app.use(corsMiddleware);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Input sanitization
  app.use(sanitizeAllInputs);

  // General rate limiting
  app.use('/api/', rateLimiters.general);
  
  // Specific rate limits for sensitive endpoints
  app.use('/api/auth/login', rateLimiters.auth);
  app.use('/api/auth/register', rateLimiters.auth);
  app.use('/api/upload', rateLimiters.upload);
  
  // Health check endpoint (no rate limit)
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      success: true, 
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  // API documentation endpoint
  app.get('/api', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'DebugFlow API',
      version: '1.0.0',
      endpoints: {
        auth: {
          register: 'POST /api/auth?action=register',
          login: 'POST /api/auth?action=login',
          verify: 'POST /api/auth?action=verify-token',
          profile: 'GET /api/auth',
          logout: 'DELETE /api/auth'
        },
        upload: {
          upload: 'POST /api/upload',
          import: 'POST /api/upload?action=import'
        },
        projects: {
          list: 'GET /api/projects',
          get: 'GET /api/projects/:id',
          update: 'PUT /api/projects/:id',
          delete: 'DELETE /api/projects/:id'
        },
        health: {
          check: 'GET /api/health'
        }
      }
    });
  });
};

// Configure error handling (should be added last)
export const configureErrorHandling = (app) => {
  // Error logging
  app.use(errorLogger);
  
  // 404 handler
  app.use(notFoundHandler);
  
  // Global error handler
  app.use(globalErrorHandler);
};

// Export individual middleware for use in specific routes
export { 
  corsMiddleware,
  rateLimiters,
  sanitizeAllInputs,
  handleValidationErrors
};

export default {
  configureMiddleware,
  configureErrorHandling
};