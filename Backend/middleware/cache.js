const { getRedisClient } = require('../config/redis');

/**
 * Station Cache Middleware
 * Caches individual station data with automatic invalidation
 */
class StationCacheManager {
  constructor() {
    this.CACHE_PREFIX = 'station:';
    this.CACHE_TTL = 3600; // 1 hour in seconds
    this.INDEX_KEY = 'cached_stations'; // Set to track all cached stations
  }

  /**
   * Generate cache key for a station
   */
  getStationCacheKey(stationId) {
    return `${this.CACHE_PREFIX}${stationId}`;
  }

  /**
   * Cache middleware for GET /api/stations/:id
   */
  cacheStationData() {
    return async (req, res, next) => {
      try {
        const stationId = req.params.id;
        const cacheKey = this.getStationCacheKey(stationId);
        const redisClient = getRedisClient();

        // Try to get cached data
        const cachedData = await redisClient.get(cacheKey);
        
        if (cachedData) {
          console.log(`🎯 Cache HIT for station ${stationId}`);
          const parsedData = JSON.parse(cachedData);
          
          // Add cache metadata
          parsedData.cacheInfo = {
            cached: true,
            cachedAt: parsedData.cacheInfo?.cachedAt || new Date().toISOString(),
            source: 'redis'
          };

          return res.status(200).json(parsedData);
        }

        console.log(`💾 Cache MISS for station ${stationId} - will cache after response`);

        // Store original res.json to intercept the response
        const originalJson = res.json;
        const self = this;
        
        res.json = function(data) {
          // Only cache successful responses
          if (data.success && data.data) {
            // Cache the response asynchronously (don't wait for it)
            setImmediate(async () => {
              try {
                // Add cache metadata
                const dataToCache = {
                  ...data,
                  cacheInfo: {
                    cached: true,
                    cachedAt: new Date().toISOString(),
                    source: 'database'
                  }
                };

                await redisClient.setEx(cacheKey, self.CACHE_TTL, JSON.stringify(dataToCache));
                
                // Add to index set for tracking
                await redisClient.sAdd(self.INDEX_KEY, stationId);
                
                console.log(`✅ Cached station ${stationId} for ${self.CACHE_TTL} seconds`);
              } catch (cacheError) {
                console.error(`❌ Failed to cache station ${stationId}:`, cacheError.message);
              }
            });
          }

          // Call original res.json
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        // Continue without caching if Redis fails
        next();
      }
    };
  }

  /**
   * Invalidate cache for a specific station
   */
  async invalidateStation(stationId) {
    try {
      const redisClient = getRedisClient();
      const cacheKey = this.getStationCacheKey(stationId);
      
      const deleted = await redisClient.del(cacheKey);
      
      if (deleted > 0) {
        // Remove from index set
        await redisClient.sRem(this.INDEX_KEY, stationId);
        console.log(`🗑️ Cache invalidated for station ${stationId}`);
        return true;
      } else {
        console.log(`ℹ️ No cache found for station ${stationId} to invalidate`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to invalidate cache for station ${stationId}:`, error.message);
      throw error;
    }
  }

  /**
   * Invalidate cache for multiple stations
   */
  async invalidateMultipleStations(stationIds) {
    try {
      const redisClient = getRedisClient();
      const pipeline = redisClient.multi();
      
      stationIds.forEach(stationId => {
        const cacheKey = this.getStationCacheKey(stationId);
        pipeline.del(cacheKey);
        pipeline.sRem(this.INDEX_KEY, stationId);
      });

      const results = await pipeline.exec();
      console.log(`🗑️ Batch invalidated cache for ${stationIds.length} stations`);
      return results;
    } catch (error) {
      console.error(`❌ Failed to batch invalidate cache:`, error.message);
      throw error;
    }
  }

  /**
   * Invalidate all station caches
   */
  async invalidateAllStations() {
    try {
      const redisClient = getRedisClient();
      
      // Get all cached station IDs
      const cachedStationIds = await redisClient.sMembers(this.INDEX_KEY);
      
      if (cachedStationIds.length === 0) {
        console.log('ℹ️ No station caches to invalidate');
        return 0;
      }

      // Delete all cached stations
      const pipeline = redisClient.multi();
      cachedStationIds.forEach(stationId => {
        const cacheKey = this.getStationCacheKey(stationId);
        pipeline.del(cacheKey);
      });
      
      // Clear the index set
      pipeline.del(this.INDEX_KEY);
      
      const results = await pipeline.exec();
      console.log(`🗑️ Invalidated all station caches (${cachedStationIds.length} stations)`);
      return cachedStationIds.length;
    } catch (error) {
      console.error(`❌ Failed to invalidate all station caches:`, error.message);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    try {
      const redisClient = getRedisClient();
      const cachedStationIds = await redisClient.sMembers(this.INDEX_KEY);
      
      return {
        totalCachedStations: cachedStationIds.length,
        cachedStationIds: cachedStationIds,
        cachePrefix: this.CACHE_PREFIX,
        cacheTTL: this.CACHE_TTL
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error.message);
      throw error;
    }
  }

  /**
   * Middleware to invalidate station cache after updates
   */
  invalidateStationCache() {
    return async (req, res, next) => {
      try {
        // Store original res.json to intercept successful responses
        const originalJson = res.json;
        const self = this;
        
        res.json = function(data) {
          // Only invalidate cache on successful updates
          if (data.success) {
            const stationId = req.params.id || req.params.stationId;
            
            if (stationId) {
              // Invalidate cache asynchronously (don't wait for it)
              setImmediate(async () => {
                try {
                  await self.invalidateStation(stationId);
                  console.log(`🗑️ Cache invalidated for station ${stationId}`);
                } catch (invalidateError) {
                  console.error(`❌ Failed to invalidate cache for station ${stationId}:`, invalidateError.message);
                }
              });
            }
          }

          // Call original res.json
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error('Cache invalidation middleware error:', error);
        // Continue without cache invalidation if Redis fails
        next();
      }
    };
  }
}

// Create singleton instance
const stationCacheManager = new StationCacheManager();

module.exports = {
  stationCacheManager,
  
  // Export commonly used functions
  cacheStationData: () => stationCacheManager.cacheStationData(),
  invalidateStationCache: () => stationCacheManager.invalidateStationCache(),
  invalidateStation: (stationId) => stationCacheManager.invalidateStation(stationId),
  invalidateAllStations: () => stationCacheManager.invalidateAllStations(),
  getCacheStats: () => stationCacheManager.getCacheStats()
};
