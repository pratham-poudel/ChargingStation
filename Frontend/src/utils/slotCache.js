/**
 * Simple cache utility for slot availability data
 * Helps reduce API calls by caching results for a short period
 */
class SlotCache {
  constructor(cacheTimeMs = 2 * 60 * 1000) { // 2 minutes default
    this.cache = new Map()
    this.cacheTime = cacheTimeMs
  }

  /**
   * Generate a cache key for slot data
   */
  generateKey(stationId, dates) {
    const sortedDates = Array.isArray(dates) ? dates.sort().join(',') : dates
    return `${stationId}-${sortedDates}`
  }

  /**
   * Get cached data if not expired
   */
  get(stationId, dates) {
    const key = this.generateKey(stationId, dates)
    const cached = this.cache.get(key)
    
    if (!cached) return null
    
    const now = Date.now()
    if (now - cached.timestamp > this.cacheTime) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  /**
   * Store data in cache with timestamp
   */
  set(stationId, dates, data) {
    const key = this.generateKey(stationId, dates)
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear()
  }

  /**
   * Clear expired entries
   */
  cleanup() {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTime) {
        this.cache.delete(key)
      }
    }
  }
}

// Export a singleton instance
export const slotCache = new SlotCache()
