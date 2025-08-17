import rateLimit from 'express-rate-limit';

/**
 * Rate limiting configurations for different endpoints
 */

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin users
    const token = req.headers.authorization?.split(' ')[1];
    if (token && req.path.includes('/admin')) {
      return true;
    }
    return false;
  }
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  },
  skipSuccessfulRequests: true
});

// Rate limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    message: 'Upload limit exceeded. Please try again later.',
    retryAfter: 3600
  }
});

// Rate limiter for AI endpoints
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 AI requests per minute
  message: {
    success: false,
    message: 'AI request limit exceeded. Please try again later.',
    retryAfter: 60
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip;
  }
});

// Rate limiter for admin endpoints
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Higher limit for admin
  message: {
    success: false,
    message: 'Admin rate limit exceeded.',
    retryAfter: 60
  }
});

// Dynamic rate limiter based on user tier
export const dynamicLimiter = (req, res, next) => {
  const userTier = req.user?.tier || 'free';
  
  const limits = {
    free: { windowMs: 60000, max: 50 },
    premium: { windowMs: 60000, max: 200 },
    enterprise: { windowMs: 60000, max: 1000 }
  };
  
  const config = limits[userTier];
  
  const limiter = rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      message: `Rate limit exceeded for ${userTier} tier.`,
      tier: userTier,
      limit: config.max
    }
  });
  
  return limiter(req, res, next);
};

// IP-based rate limiter for public endpoints
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for public endpoints
  message: {
    success: false,
    message: 'Rate limit exceeded for public access.',
    retryAfter: 60
  },
  keyGenerator: (req) => req.ip
});

// Webhook rate limiter
export const webhookLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 webhook events per second
  message: {
    success: false,
    message: 'Webhook rate limit exceeded.',
    retryAfter: 1
  }
});

// Export all limiters
export default {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  aiLimiter,
  adminLimiter,
  dynamicLimiter,
  publicLimiter,
  webhookLimiter
};