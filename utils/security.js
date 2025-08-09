import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Configure Helmet for security headers
export const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com", "https://api.github.com"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some third-party services
  });
};

// Rate limiting configurations
export const rateLimiters = {
  // General API rate limit
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: req.rateLimit.resetTime
      });
    }
  }),

  // Strict rate limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true, // Don't count successful requests
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Rate limit for file uploads
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 uploads per hour
    message: 'Upload limit exceeded. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip;
    }
  }),

  // Rate limit for API key generation
  apiKey: rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 3, // Limit each IP to 3 API key requests per day
    message: 'API key generation limit exceeded. Please try again tomorrow.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Flexible rate limit for read operations
  read: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Read request limit exceeded. Please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
  })
};

// IP-based rate limiting with Redis support (for production)
export const createRedisRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    // Redis store would be configured here in production
    // store: new RedisStore({
    //   client: redisClient,
    //   prefix: 'rate-limit:',
    // }),
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// Trusted proxy configuration
export const configureTrustedProxies = (app) => {
  // Trust proxy headers in production (important for rate limiting behind proxies)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy
  }
};

// Security middleware configuration
export const configureSecurityMiddleware = (app) => {
  // Configure trusted proxies
  configureTrustedProxies(app);
  
  // Apply Helmet for security headers
  app.use(configureHelmet());
  
  // Disable X-Powered-By header
  app.disable('x-powered-by');
  
  // Add custom security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    next();
  });
};

export default {
  configureHelmet,
  rateLimiters,
  createRedisRateLimiter,
  configureTrustedProxies,
  configureSecurityMiddleware
};