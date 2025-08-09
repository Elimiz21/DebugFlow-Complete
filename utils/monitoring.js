import * as Sentry from '@sentry/node';
import { CaptureConsole } from '@sentry/integrations';

// Initialize Sentry monitoring
export const initializeMonitoring = (app) => {
  if (!process.env.SENTRY_DSN) {
    console.log('Sentry DSN not configured, monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // Capture console errors
      new CaptureConsole({
        levels: ['error', 'warn']
      }),
      // Express integration
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      // Additional integrations
      new Sentry.Integrations.RequestData({
        include: {
          data: true,
          headers: true,
          cookies: true,
          query_string: true,
          url: true,
          user: true
        }
      })
    ],
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session tracking
    autoSessionTracking: true,
    
    // Release tracking
    release: process.env.RELEASE_VERSION || '1.0.0',
    
    // Environment filtering
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        
        // Remove passwords from request data
        if (event.request.data) {
          if (event.request.data.password) {
            event.request.data.password = '[REDACTED]';
          }
          if (event.request.data.token) {
            event.request.data.token = '[REDACTED]';
          }
        }
      }
      
      // Don't send events in development unless explicitly enabled
      if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEV_ENABLE) {
        return null;
      }
      
      return event;
    },
    
    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      
      return breadcrumb;
    }
  });

  console.log('Sentry monitoring initialized');
};

// Custom error capture with context
export const captureError = (error, context = {}) => {
  Sentry.withScope((scope) => {
    // Add custom context
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    // Capture the error
    Sentry.captureException(error);
  });
};

// Capture custom message
export const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.withScope((scope) => {
    // Add custom context
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    // Set level
    scope.setLevel(level);
    
    // Capture the message
    Sentry.captureMessage(message);
  });
};

// Add user context
export const setUserContext = (user) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name
  });
};

// Clear user context
export const clearUserContext = () => {
  Sentry.setUser(null);
};

// Add custom tags
export const addTags = (tags) => {
  Sentry.configureScope((scope) => {
    Object.keys(tags).forEach(key => {
      scope.setTag(key, tags[key]);
    });
  });
};

// Performance monitoring
export const startTransaction = (name, op = 'http.request') => {
  return Sentry.startTransaction({
    name,
    op
  });
};

// Measure performance
export const measurePerformance = async (name, fn, metadata = {}) => {
  const transaction = startTransaction(name, 'function');
  
  try {
    const span = transaction.startChild({
      op: 'function.execution',
      description: name
    });
    
    const result = await fn();
    
    span.finish();
    transaction.finish();
    
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    transaction.finish();
    throw error;
  }
};

// Express middleware
export const sentryMiddleware = {
  requestHandler: Sentry.Handlers.requestHandler(),
  tracingHandler: Sentry.Handlers.tracingHandler(),
  errorHandler: Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors in production
      if (process.env.NODE_ENV === 'production') {
        return true;
      }
      
      // In development, only capture 5xx errors
      if (error.status === undefined || error.status >= 500) {
        return true;
      }
      
      return false;
    }
  })
};

// Health check for monitoring
export const getMonitoringHealth = () => {
  return {
    sentry: {
      enabled: !!process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.RELEASE_VERSION || '1.0.0'
    }
  };
};

// Custom metrics tracking
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      apiCalls: {},
      performance: {},
      cache: {
        hits: 0,
        misses: 0
      }
    };
  }

  incrementRequests() {
    this.metrics.requests++;
  }

  incrementErrors() {
    this.metrics.errors++;
  }

  trackApiCall(endpoint, duration, status) {
    if (!this.metrics.apiCalls[endpoint]) {
      this.metrics.apiCalls[endpoint] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        errors: 0
      };
    }
    
    const api = this.metrics.apiCalls[endpoint];
    api.count++;
    api.totalDuration += duration;
    api.avgDuration = api.totalDuration / api.count;
    
    if (status >= 400) {
      api.errors++;
    }
  }

  trackPerformance(operation, duration) {
    if (!this.metrics.performance[operation]) {
      this.metrics.performance[operation] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        min: duration,
        max: duration
      };
    }
    
    const perf = this.metrics.performance[operation];
    perf.count++;
    perf.totalDuration += duration;
    perf.avgDuration = perf.totalDuration / perf.count;
    perf.min = Math.min(perf.min, duration);
    perf.max = Math.max(perf.max, duration);
  }

  trackCacheHit() {
    this.metrics.cache.hits++;
  }

  trackCacheMiss() {
    this.metrics.cache.misses++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      cache: {
        ...this.metrics.cache,
        hitRate: this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses)
      },
      errorRate: this.metrics.errors / this.metrics.requests
    };
  }

  reset() {
    this.metrics = {
      requests: 0,
      errors: 0,
      apiCalls: {},
      performance: {},
      cache: {
        hits: 0,
        misses: 0
      }
    };
  }
}

export const metricsCollector = new MetricsCollector();

// API timing middleware
export const apiTimingMiddleware = (req, res, next) => {
  const start = Date.now();
  
  metricsCollector.incrementRequests();
  
  // Override res.end to capture timing
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;
    const endpoint = `${req.method} ${req.path}`;
    
    metricsCollector.trackApiCall(endpoint, duration, res.statusCode);
    
    // Add timing header
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      captureMessage(`Slow API request: ${endpoint}`, 'warning', {
        duration,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode
      });
    }
    
    originalEnd.apply(res, args);
  };
  
  next();
};

export default {
  initializeMonitoring,
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
  addTags,
  measurePerformance,
  sentryMiddleware,
  getMonitoringHealth,
  metricsCollector,
  apiTimingMiddleware
};