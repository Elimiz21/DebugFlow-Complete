// Performance Monitoring Service
// Tracks and reports application performance metrics

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: [],
      apiCalls: {},
      renderTimes: {},
      errors: [],
      memoryUsage: []
    };
    
    this.observers = new Map();
    this.isMonitoring = false;
    this.reportInterval = null;
    
    // Initialize if Performance API is available
    if (typeof window !== 'undefined' && window.performance) {
      this.init();
    }
  }

  init() {
    // Monitor page load performance
    this.measurePageLoad();
    
    // Set up Performance Observer for various metrics
    this.setupObservers();
    
    // Monitor memory usage
    this.monitorMemory();
    
    // Set up error tracking
    this.setupErrorTracking();
    
    // Start periodic reporting
    this.startReporting();
    
    this.isMonitoring = true;
  }

  measurePageLoad() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
      const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
      const dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
      const tcpTime = timing.connectEnd - timing.connectStart;
      const requestTime = timing.responseEnd - timing.requestStart;
      
      this.metrics.pageLoad.push({
        timestamp: Date.now(),
        pageLoadTime,
        domReadyTime,
        dnsTime,
        tcpTime,
        requestTime
      });
      
      console.log('Page Load Metrics:', {
        pageLoadTime: `${pageLoadTime}ms`,
        domReadyTime: `${domReadyTime}ms`,
        dnsTime: `${dnsTime}ms`,
        tcpTime: `${tcpTime}ms`,
        requestTime: `${requestTime}ms`
      });
    }
  }

  setupObservers() {
    // Observe long tasks (blocking main thread)
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.warn('Long Task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
            
            // Track tasks longer than 50ms
            if (entry.duration > 50) {
              this.trackLongTask(entry);
            }
          }
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        console.log('Long task observer not supported');
      }

      // Observe resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackResourceTiming(entry);
          }
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (e) {
        console.log('Resource observer not supported');
      }

      // Observe navigation timing
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackNavigationTiming(entry);
          }
        });
        
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navigationObserver);
      } catch (e) {
        console.log('Navigation observer not supported');
      }

      // Observe paint timing (FCP, LCP)
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackPaintTiming(entry);
          }
        });
        
        paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        this.observers.set('paint', paintObserver);
      } catch (e) {
        console.log('Paint observer not supported');
      }
    }
  }

  trackLongTask(entry) {
    if (!this.metrics.longTasks) {
      this.metrics.longTasks = [];
    }
    
    this.metrics.longTasks.push({
      duration: entry.duration,
      startTime: entry.startTime,
      timestamp: Date.now()
    });
    
    // Alert if too many long tasks
    const recentTasks = this.metrics.longTasks.filter(
      task => Date.now() - task.timestamp < 60000 // Last minute
    );
    
    if (recentTasks.length > 10) {
      console.error('Performance Warning: Too many long tasks detected');
      this.reportPerformanceIssue('long-tasks', {
        count: recentTasks.length,
        totalDuration: recentTasks.reduce((sum, task) => sum + task.duration, 0)
      });
    }
  }

  trackResourceTiming(entry) {
    const resourceType = entry.initiatorType;
    
    if (!this.metrics.resources) {
      this.metrics.resources = {};
    }
    
    if (!this.metrics.resources[resourceType]) {
      this.metrics.resources[resourceType] = [];
    }
    
    this.metrics.resources[resourceType].push({
      name: entry.name,
      duration: entry.duration,
      size: entry.transferSize,
      timestamp: Date.now()
    });
    
    // Warn about slow resources
    if (entry.duration > 1000) {
      console.warn(`Slow resource detected: ${entry.name} took ${entry.duration}ms`);
    }
  }

  trackNavigationTiming(entry) {
    this.metrics.navigation = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      domInteractive: entry.domInteractive,
      timestamp: Date.now()
    };
  }

  trackPaintTiming(entry) {
    if (!this.metrics.paint) {
      this.metrics.paint = {};
    }
    
    this.metrics.paint[entry.name] = {
      startTime: entry.startTime,
      timestamp: Date.now()
    };
    
    // Track Core Web Vitals
    if (entry.name === 'first-contentful-paint' && entry.startTime > 2500) {
      console.warn(`Slow FCP: ${entry.startTime}ms (target: < 2500ms)`);
    }
    
    if (entry.entryType === 'largest-contentful-paint' && entry.startTime > 4000) {
      console.warn(`Slow LCP: ${entry.startTime}ms (target: < 4000ms)`);
    }
  }

  monitorMemory() {
    if (performance.memory) {
      setInterval(() => {
        const memoryInfo = {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          timestamp: Date.now()
        };
        
        this.metrics.memoryUsage.push(memoryInfo);
        
        // Keep only last 100 measurements
        if (this.metrics.memoryUsage.length > 100) {
          this.metrics.memoryUsage.shift();
        }
        
        // Detect memory leaks
        const usage = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
        if (usage > 0.9) {
          console.error('Memory Warning: Using over 90% of heap limit');
          this.reportPerformanceIssue('memory', {
            usage: `${(usage * 100).toFixed(2)}%`,
            used: memoryInfo.usedJSHeapSize,
            limit: memoryInfo.jsHeapSizeLimit
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  setupErrorTracking() {
    // Track unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error,
        timestamp: Date.now()
      });
    });
    
    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: 'Unhandled Promise Rejection',
        reason: event.reason,
        promise: event.promise,
        timestamp: Date.now()
      });
    });
  }

  trackError(errorInfo) {
    this.metrics.errors.push(errorInfo);
    
    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors.shift();
    }
    
    console.error('Error tracked:', errorInfo);
    
    // Send to error tracking service
    this.reportError(errorInfo);
  }

  // API Call Performance Tracking
  trackAPICall(endpoint, method, duration, status) {
    const key = `${method} ${endpoint}`;
    
    if (!this.metrics.apiCalls[key]) {
      this.metrics.apiCalls[key] = {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errors: 0
      };
    }
    
    const metric = this.metrics.apiCalls[key];
    metric.count++;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.count;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.minDuration = Math.min(metric.minDuration, duration);
    
    if (status >= 400) {
      metric.errors++;
    }
    
    // Warn about slow API calls
    if (duration > 3000) {
      console.warn(`Slow API call: ${key} took ${duration}ms`);
    }
  }

  // Component Render Performance
  trackComponentRender(componentName, duration) {
    if (!this.metrics.renderTimes[componentName]) {
      this.metrics.renderTimes[componentName] = {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0
      };
    }
    
    const metric = this.metrics.renderTimes[componentName];
    metric.count++;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.count;
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    
    // Warn about slow renders
    if (duration > 16) { // 60fps = 16.67ms per frame
      console.warn(`Slow render: ${componentName} took ${duration}ms`);
    }
  }

  // Get current performance metrics
  getMetrics() {
    const summary = {
      timestamp: Date.now(),
      pageLoad: this.metrics.pageLoad[this.metrics.pageLoad.length - 1] || {},
      memory: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || {},
      apiCalls: this.getAPICallSummary(),
      renderTimes: this.getRenderSummary(),
      errors: this.metrics.errors.length,
      paint: this.metrics.paint || {},
      navigation: this.metrics.navigation || {},
      longTasks: (this.metrics.longTasks || []).length
    };
    
    return summary;
  }

  getAPICallSummary() {
    const summary = {};
    
    for (const [endpoint, metrics] of Object.entries(this.metrics.apiCalls)) {
      summary[endpoint] = {
        averageDuration: Math.round(metrics.averageDuration),
        calls: metrics.count,
        errorRate: metrics.errors / metrics.count
      };
    }
    
    return summary;
  }

  getRenderSummary() {
    const summary = {};
    
    for (const [component, metrics] of Object.entries(this.metrics.renderTimes)) {
      if (metrics.averageDuration > 10) { // Only report slow components
        summary[component] = {
          averageDuration: Math.round(metrics.averageDuration),
          renders: metrics.count,
          maxDuration: Math.round(metrics.maxDuration)
        };
      }
    }
    
    return summary;
  }

  // Reporting
  startReporting() {
    // Report metrics every 5 minutes
    this.reportInterval = setInterval(() => {
      this.reportMetrics();
    }, 5 * 60 * 1000);
  }

  reportMetrics() {
    const metrics = this.getMetrics();
    
    // Send to analytics service
    if (window.analytics) {
      window.analytics.track('Performance Metrics', metrics);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('Performance Report:', metrics);
    }
    
    // Send to backend
    this.sendToBackend('/api/metrics/performance', metrics);
  }

  reportError(errorInfo) {
    // Send to error tracking service
    if (window.errorReporter) {
      window.errorReporter.captureException(errorInfo);
    }
    
    // Send to backend
    this.sendToBackend('/api/metrics/errors', errorInfo);
  }

  reportPerformanceIssue(type, details) {
    const issue = {
      type,
      details,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // Send to backend
    this.sendToBackend('/api/metrics/issues', issue);
  }

  async sendToBackend(endpoint, data) {
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('debugflow_token')}`
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }

  // Cleanup
  destroy() {
    // Clear observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
    
    // Clear reporting interval
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }
    
    this.isMonitoring = false;
  }

  // Utility: Measure function execution time
  measureFunction(fn, name) {
    return async (...args) => {
      const start = performance.now();
      
      try {
        const result = await fn(...args);
        const duration = performance.now() - start;
        
        this.trackComponentRender(name, duration);
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        
        this.trackComponentRender(name, duration);
        this.trackError({
          message: `Error in ${name}`,
          error,
          duration,
          timestamp: Date.now()
        });
        
        throw error;
      }
    };
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.performanceMonitor = performanceMonitor;
}

export default performanceMonitor;