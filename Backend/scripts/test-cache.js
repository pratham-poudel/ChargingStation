#!/usr/bin/env node

/**
 * Station Cache Testing Script
 * 
 * This script tests the station caching functionality by:
 * 1. Making requests to get station data
 * 2. Checking cache status
 * 3. Updating station data  
 * 4. Verifying cache invalidation
 * 
 * Usage: node test-cache.js [stationId]
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const STATION_ID = process.argv[2] || '6870a6196bba432e730c0f60'; // Use provided ID or default

class CacheTest {
  constructor(stationId) {
    this.stationId = stationId;
    this.apiUrl = API_BASE_URL;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return {
        success: true,
        data: response.data,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  async testStationCaching() {
    console.log('🧪 Starting Station Cache Test');
    console.log('=' .repeat(50));
    console.log(`Station ID: ${this.stationId}`);
    console.log(`API URL: ${this.apiUrl}`);
    console.log();

    // Step 1: Get cache stats before test
    console.log('📊 Getting initial cache stats...');
    const initialStats = await this.makeRequest('GET', '/debug/cache/stats');
    if (initialStats.success) {
      console.log('✅ Initial cache stats:', JSON.stringify(initialStats.data.data, null, 2));
    } else {
      console.log('❌ Failed to get initial cache stats:', initialStats.error);
    }
    console.log();

    // Step 2: Clear any existing cache for this station
    console.log('🗑️ Clearing existing cache...');
    const clearCache = await this.makeRequest('DELETE', `/debug/cache/stations/${this.stationId}`);
    if (clearCache.success) {
      console.log('✅ Cache cleared:', clearCache.data.message);
    } else {
      console.log('ℹ️ No cache to clear or error:', clearCache.error);
    }
    console.log();

    // Step 3: First request (should be cache MISS)
    console.log('🎯 Making first request (expecting cache MISS)...');
    const firstRequest = await this.makeRequest('GET', `/stations/${this.stationId}`);
    if (firstRequest.success) {
      console.log('✅ First request successful');
      console.log('Cache info:', firstRequest.data.data.cacheInfo || 'No cache info');
    } else {
      console.log('❌ First request failed:', firstRequest.error);
      return;
    }
    console.log();

    // Step 4: Wait a moment and make second request (should be cache HIT)
    await this.delay(1000);
    console.log('🎯 Making second request (expecting cache HIT)...');
    const secondRequest = await this.makeRequest('GET', `/stations/${this.stationId}`);
    if (secondRequest.success) {
      console.log('✅ Second request successful');
      console.log('Cache info:', secondRequest.data.data.cacheInfo || 'No cache info');
    } else {
      console.log('❌ Second request failed:', secondRequest.error);
    }
    console.log();

    // Step 5: Get cache stats after caching
    console.log('📊 Getting cache stats after caching...');
    const midStats = await this.makeRequest('GET', '/debug/cache/stats');
    if (midStats.success) {
      console.log('✅ Cache stats after caching:', JSON.stringify(midStats.data.data, null, 2));
    } else {
      console.log('❌ Failed to get cache stats:', midStats.error);
    }
    console.log();

    // Step 6: Test cache invalidation by updating station
    console.log('🔄 Testing cache invalidation by updating station...');
    const testUpdate = await this.makeRequest('POST', `/debug/cache/test/${this.stationId}`, {
      updateField: 'description',
      updateValue: `Cache test update at ${new Date().toISOString()}`
    });
    
    if (testUpdate.success) {
      console.log('✅ Cache invalidation test completed');
      console.log('Test results:', JSON.stringify(testUpdate.data.data, null, 2));
    } else {
      console.log('❌ Cache invalidation test failed:', testUpdate.error);
    }
    console.log();

    // Step 7: Make third request (should be cache MISS after invalidation)
    await this.delay(1000);
    console.log('🎯 Making third request after update (expecting cache MISS)...');
    const thirdRequest = await this.makeRequest('GET', `/stations/${this.stationId}`);
    if (thirdRequest.success) {
      console.log('✅ Third request successful');
      console.log('Cache info:', thirdRequest.data.data.cacheInfo || 'No cache info');
    } else {
      console.log('❌ Third request failed:', thirdRequest.error);
    }
    console.log();

    // Step 8: Final cache stats
    console.log('📊 Getting final cache stats...');
    const finalStats = await this.makeRequest('GET', '/debug/cache/stats');
    if (finalStats.success) {
      console.log('✅ Final cache stats:', JSON.stringify(finalStats.data.data, null, 2));
    } else {
      console.log('❌ Failed to get final cache stats:', finalStats.error);
    }

    console.log();
    console.log('🏁 Cache test completed!');
    console.log('=' .repeat(50));
  }

  async warmupCache() {
    console.log('🔥 Warming up cache for station:', this.stationId);
    const warmup = await this.makeRequest('POST', `/debug/cache/warmup/${this.stationId}`);
    
    if (warmup.success) {
      console.log('✅ Cache warmed up successfully:', warmup.data.message);
    } else {
      console.log('❌ Failed to warm up cache:', warmup.error);
    }
  }
}

// Main execution
async function main() {
  const command = process.argv[3]; // third argument for commands
  const cacheTest = new CacheTest(STATION_ID);

  try {
    if (command === 'warmup') {
      await cacheTest.warmupCache();
    } else {
      await cacheTest.testStationCaching();
    }
  } catch (error) {
    console.error('💥 Test script error:', error.message);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main();
}

module.exports = CacheTest;
