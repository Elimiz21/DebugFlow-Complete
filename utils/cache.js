import Redis from 'ioredis';
import NodeCache from 'node-cache';

// Cache service with Redis for production and in-memory for development
class CacheService {
  constructor() {
    this.redis = null;
    this.nodeCache = null;
    this.isRedisAvailable = false;
    
    this.initialize();
  }

  initialize() {
    // Try to connect to Redis if configured
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              console.log('Redis connection failed, falling back to in-memory cache');
              this.isRedisAvailable = false;
              return null;
            }
            return Math.min(times * 100, 3000);
          },
          lazyConnect: true
        });

        this.redis.on('connect', () => {
          console.log('Redis cache connected');
          this.isRedisAvailable = true;
        });

        this.redis.on('error', (err) => {
          console.error('Redis error:', err);
          this.isRedisAvailable = false;
        });

        // Attempt connection
        this.redis.connect().catch(err => {
          console.error('Failed to connect to Redis:', err);
          this.isRedisAvailable = false;
        });
      } catch (error) {
        console.error('Redis initialization error:', error);
      }
    }

    // Always initialize in-memory cache as fallback
    this.nodeCache = new NodeCache({
      stdTTL: 600, // 10 minutes default TTL
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false, // For performance
      maxKeys: 1000 // Limit memory usage
    });
  }

  // Get cache client
  getClient() {
    return this.isRedisAvailable ? this.redis : this.nodeCache;
  }

  // Universal get method
  async get(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return this.nodeCache.get(key) || null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Universal set method
  async set(key, value, ttl = 600) {
    try {
      const serialized = JSON.stringify(value);
      
      if (this.isRedisAvailable && this.redis) {
        if (ttl) {
          await this.redis.set(key, serialized, 'EX', ttl);
        } else {
          await this.redis.set(key, serialized);
        }
      } else {
        this.nodeCache.set(key, value, ttl);
      }
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete key
  async del(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.del(key);
      } else {
        this.nodeCache.del(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete keys by pattern
  async delPattern(pattern) {
    try {
      if (this.isRedisAvailable && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // For node-cache, we need to get all keys and filter
        const keys = this.nodeCache.keys();
        const regex = new RegExp(pattern.replace('*', '.*'));
        const matchingKeys = keys.filter(key => regex.test(key));
        if (matchingKeys.length > 0) {
          this.nodeCache.del(matchingKeys);
        }
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      if (this.isRedisAvailable && this.redis) {
        return await this.redis.exists(key) === 1;
      } else {
        return this.nodeCache.has(key);
      }
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Set expiration
  async expire(key, ttl) {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.expire(key, ttl);
      } else {
        // For node-cache, we need to re-set with new TTL
        const value = this.nodeCache.get(key);
        if (value !== undefined) {
          this.nodeCache.set(key, value, ttl);
        }
      }
      return true;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  // Flush all cache
  async flush() {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.flushdb();
      } else {
        this.nodeCache.flushAll();
      }
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Cache wrapper for functions
  async cached(key, fn, ttl = 600) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  // Cache wrapper with tags for invalidation
  async cachedWithTags(key, tags, fn, ttl = 600) {
    // Store tags for this key
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.get(tagKey) || [];
        if (!keys.includes(key)) {
          keys.push(key);
          await this.set(tagKey, keys, 86400); // Store tags for 24 hours
        }
      }
    }

    return this.cached(key, fn, ttl);
  }

  // Invalidate cache by tags
  async invalidateByTags(tags) {
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const keys = await this.get(tagKey) || [];
      
      // Delete all keys with this tag
      for (const key of keys) {
        await this.del(key);
      }
      
      // Delete the tag key itself
      await this.del(tagKey);
    }
  }

  // Get cache statistics
  async getStats() {
    if (this.isRedisAvailable && this.redis) {
      const info = await this.redis.info('stats');
      return {
        type: 'redis',
        connected: true,
        info
      };
    } else {
      return {
        type: 'node-cache',
        connected: true,
        keys: this.nodeCache.keys().length,
        hits: this.nodeCache.getStats().hits,
        misses: this.nodeCache.getStats().misses,
        ksize: this.nodeCache.getStats().ksize,
        vsize: this.nodeCache.getStats().vsize
      };
    }
  }
}

// Specific cache utilities for different use cases
export const cacheKeys = {
  // User cache keys
  user: (id) => `user:${id}`,
  userByEmail: (email) => `user:email:${email}`,
  userProjects: (userId) => `user:${userId}:projects`,
  
  // Project cache keys
  project: (id) => `project:${id}`,
  projectFiles: (projectId) => `project:${projectId}:files`,
  projectAnalysis: (projectId) => `project:${projectId}:analysis`,
  
  // Analysis cache keys
  analysis: (id) => `analysis:${id}`,
  codeAnalysis: (hash) => `analysis:code:${hash}`,
  
  // Session cache keys
  session: (id) => `session:${id}`,
  sessionParticipants: (sessionId) => `session:${sessionId}:participants`,
  
  // Rate limiting keys
  rateLimit: (ip, endpoint) => `rate:${ip}:${endpoint}`,
  
  // API response cache
  apiResponse: (endpoint, params) => `api:${endpoint}:${JSON.stringify(params)}`,
  
  // GitHub cache
  githubRepo: (owner, repo) => `github:${owner}:${repo}`,
  githubFiles: (owner, repo, branch) => `github:${owner}:${repo}:${branch}:files`
};

// Cache TTL configurations (in seconds)
export const cacheTTL = {
  short: 60,        // 1 minute
  medium: 300,      // 5 minutes
  long: 3600,       // 1 hour
  day: 86400,       // 24 hours
  week: 604800,     // 7 days
  
  // Specific TTLs
  user: 3600,       // 1 hour
  project: 1800,    // 30 minutes
  analysis: 7200,   // 2 hours
  session: 300,     // 5 minutes
  github: 3600,     // 1 hour
  apiResponse: 300  // 5 minutes
};

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;