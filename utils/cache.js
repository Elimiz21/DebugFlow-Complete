import NodeCache from 'node-cache';

/**
 * Simple in-memory cache for development
 * In production, this should be replaced with Redis
 */
class CacheService {
  constructor() {
    // Initialize cache with 5 minute default TTL
    this.cache = new NodeCache({ 
      stdTTL: 300,
      checkperiod: 60,
      useClones: false
    });
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      const value = this.cache.get(key);
      if (value !== undefined) {
        this.stats.hits++;
        console.log(`Cache HIT for key: ${key}`);
        return value;
      }
      this.stats.misses++;
      console.log(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = 300) {
    try {
      const success = this.cache.set(key, value, ttl);
      if (success) {
        this.stats.sets++;
        console.log(`Cache SET for key: ${key} with TTL: ${ttl}s`);
      }
      return success;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    try {
      const deleted = this.cache.del(key);
      if (deleted > 0) {
        this.stats.deletes++;
        console.log(`Cache DELETE for key: ${key}`);
      }
      return deleted;
    } catch (error) {
      console.error('Cache delete error:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async flush() {
    try {
      this.cache.flushAll();
      console.log('Cache FLUSHED');
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const nodeStats = this.cache.getStats();
    return {
      ...this.stats,
      keys: nodeStats.keys,
      ksize: nodeStats.ksize,
      vsize: nodeStats.vsize
    };
  }

  /**
   * Cache middleware for Express routes
   */
  middleware(duration = 300) {
    return async (req, res, next) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip caching if disabled
      if (process.env.ENABLE_CACHING === 'false') {
        return next();
      }

      // Generate cache key from URL and query params
      const key = `route:${req.originalUrl || req.url}`;

      try {
        // Check cache
        const cachedResponse = await this.get(key);
        if (cachedResponse) {
          console.log(`Serving cached response for ${req.url}`);
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-TTL', duration);
          return res.json(cachedResponse);
        }

        // Store original json method
        const originalJson = res.json;

        // Override json method to cache response
        res.json = function(body) {
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-TTL', duration);
          
          // Cache successful responses only
          if (res.statusCode >= 200 && res.statusCode < 300) {
            cacheService.set(key, body, duration);
          }

          // Call original json method
          return originalJson.call(this, body);
        };

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Create cache key for API responses
   */
  createKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    const keys = this.cache.keys();
    const keysToDelete = keys.filter(key => key.includes(pattern));
    
    for (const key of keysToDelete) {
      await this.del(key);
    }
    
    console.log(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
    return keysToDelete.length;
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;