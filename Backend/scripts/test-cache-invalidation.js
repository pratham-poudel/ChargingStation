#!/usr/bin/env node

/**
 * Cache Invalidation Testing Script
 * 
 * This script tests cache invalidation by:
 * 1. Caching a station
 * 2. Updating the station via API
 * 3. Checking if cache was invalidated
 * 4. Making another request to verify fresh data
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const STATION_ID = process.argv[2] || '6870a6196bba432e730c0f60';

// Add authentication token for vendor requests
const VENDOR_TOKEN = process.env.VENDOR_TOKEN; // You'll need to set this

class CacheInvalidationTest {
  constructor(stationId) {
    this.stationId = stationId;
    this.apiUrl = API_BASE_URL;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  async testCacheInvalidation() {
    console.log('🧪 Starting Cache Invalidation Test');
    console.log('=' .repeat(60));
    console.log(`Station ID: ${this.stationId}`);
    console.log(`API URL: ${this.apiUrl}`);
    console.log();

    // Step 1: Clear existing cache to start fresh
    console.log('🗑️ Step 1: Clearing existing cache...');
    const clearCache = await this.makeRequest('DELETE', `/debug/cache/stations/${this.stationId}`);
    console.log('Cache clear result:', clearCache.success ? '✅ Success' : '❌ Failed');
    console.log();

    // Step 2: Make first request to populate cache
    console.log('📥 Step 2: Making first request to populate cache...');
    const firstRequest = await this.makeRequest('GET', `/stations/${this.stationId}`);
    if (!firstRequest.success) {
      console.log('❌ Failed to get station data:', firstRequest.error);
      return;
    }
    
    const originalData = firstRequest.data;
    console.log('✅ First request successful');
    console.log('Original description:', originalData.data?.description || 'No description');
    console.log('Cache info:', originalData.data?.cacheInfo);
    console.log();

    // Step 3: Wait and make second request (should hit cache)
    await this.delay(1000);
    console.log('📥 Step 3: Making second request (should hit cache)...');
    const secondRequest = await this.makeRequest('GET', `/stations/${this.stationId}`);
    if (secondRequest.success) {
      console.log('✅ Second request successful');
      console.log('Cache info:', secondRequest.data.data?.cacheInfo);
      console.log('Source:', secondRequest.data.data?.cacheInfo?.source || 'Unknown');
    }
    console.log();

    // Step 4: Check cache stats
    console.log('📊 Step 4: Checking cache stats before update...');
    const beforeStats = await this.makeRequest('GET', '/debug/cache/stats');
    if (beforeStats.success) {
      console.log('Cache stats before update:');
      console.log(`- Total cached stations: ${beforeStats.data.data.totalCachedStations}`);
      console.log(`- Target station cached: ${beforeStats.data.data.cachedStationIds.includes(this.stationId) ? 'YES' : 'NO'}`);
    }
    console.log();

    // Step 5: Update station to trigger cache invalidation
    console.log('🔄 Step 5: Updating station to trigger cache invalidation...');
    const updateData = {
      description: `Cache invalidation test - Updated at ${new Date().toISOString()}`
    };

    // Try both vendor and direct API update
    const updateEndpoints = [
      { endpoint: `/vendor/stations/${this.stationId}`, method: 'PUT', headers: VENDOR_TOKEN ? { 'Authorization': `Bearer ${VENDOR_TOKEN}` } : {} },
      { endpoint: `/debug/cache/test/${this.stationId}`, method: 'POST', headers: {} }
    ];

    let updateSuccessful = false;
    for (const endpointConfig of updateEndpoints) {
      console.log(`Trying to update via ${endpointConfig.endpoint}...`);
      const updateRequest = await this.makeRequest(
        endpointConfig.method,
        endpointConfig.endpoint,
        updateData,
        endpointConfig.headers
      );

      if (updateRequest.success) {
        console.log('✅ Station update successful');
        console.log('Update response:', updateRequest.data.message);
        updateSuccessful = true;
        break;
      } else {
        console.log('❌ Update failed:', updateRequest.error);
        if (endpointConfig.endpoint.includes('vendor') && updateRequest.status === 401) {
          console.log('ℹ️ Vendor endpoint requires authentication token');
        }
      }
    }

    if (!updateSuccessful) {
      console.log('❌ All update attempts failed. Cannot test cache invalidation.');
      return;
    }
    console.log();

    // Step 6: Check cache stats after update
    await this.delay(1000);
    console.log('📊 Step 6: Checking cache stats after update...');
    const afterStats = await this.makeRequest('GET', '/debug/cache/stats');
    if (afterStats.success) {
      console.log('Cache stats after update:');
      console.log(`- Total cached stations: ${afterStats.data.data.totalCachedStations}`);
      console.log(`- Target station cached: ${afterStats.data.data.cachedStationIds.includes(this.stationId) ? 'YES' : 'NO'}`);
      
      const wasCachedBefore = beforeStats.success && beforeStats.data.data.cachedStationIds.includes(this.stationId);
      const isCachedAfter = afterStats.data.data.cachedStationIds.includes(this.stationId);
      
      if (wasCachedBefore && !isCachedAfter) {
        console.log('🎉 CACHE INVALIDATION SUCCESS: Station was cached before update and is not cached after');
      } else if (!wasCachedBefore && !isCachedAfter) {
        console.log('ℹ️ Station was not cached before update (this is also valid)');
      } else {
        console.log('⚠️ POSSIBLE ISSUE: Cache invalidation may not have worked as expected');
      }
    }
    console.log();

    // Step 7: Make request after update (should be fresh from database)
    console.log('📥 Step 7: Making request after update (should get fresh data)...');
    const thirdRequest = await this.makeRequest('GET', `/stations/${this.stationId}`);
    if (thirdRequest.success) {
      console.log('✅ Third request successful');
      console.log('Updated description:', thirdRequest.data.data?.description || 'No description');
      console.log('Cache info:', thirdRequest.data.data?.cacheInfo);
      console.log('Source:', thirdRequest.data.data?.cacheInfo?.source || 'Unknown');
      
      // Check if description was actually updated
      const isUpdated = thirdRequest.data.data?.description?.includes('Cache invalidation test');
      console.log(`Data freshness: ${isUpdated ? '🔄 FRESH (contains test text)' : '⚠️ STALE (no test text found)'}`);
    }
    console.log();

    // Step 8: Final summary
    console.log('📋 Step 8: Test Summary');
    console.log('-'.repeat(40));
    
    if (beforeStats.success && afterStats.success) {
      const wasCached = beforeStats.data.data.cachedStationIds.includes(this.stationId);
      const isStillCached = afterStats.data.data.cachedStationIds.includes(this.stationId);
      
      console.log(`Before update - Station cached: ${wasCached ? 'YES' : 'NO'}`);
      console.log(`After update - Station cached: ${isStillCached ? 'YES' : 'NO'}`);
      
      if (wasCached && !isStillCached) {
        console.log('🎉 RESULT: Cache invalidation is WORKING correctly!');
      } else if (!wasCached) {
        console.log('ℹ️ RESULT: Station was not cached initially - invalidation cannot be tested');
      } else {
        console.log('❌ RESULT: Cache invalidation may NOT be working - station still cached after update');
      }
    } else {
      console.log('⚠️ Could not determine cache invalidation status due to stats API issues');
    }

    console.log();
    console.log('🏁 Cache Invalidation Test Completed!');
    console.log('=' .repeat(60));
  }
}

// Main execution
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: node test-cache-invalidation.js [stationId]');
    console.log('');
    console.log('Environment variables:');
    console.log('  VENDOR_TOKEN - Bearer token for vendor API calls');
    console.log('  API_URL - Base API URL (default: http://localhost:5000/api)');
    console.log('');
    console.log('Example:');
    console.log('  VENDOR_TOKEN=your_token node test-cache-invalidation.js 6870a6196bba432e730c0f60');
    return;
  }

  const test = new CacheInvalidationTest(STATION_ID);

  try {
    await test.testCacheInvalidation();
  } catch (error) {
    console.error('💥 Test script error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = CacheInvalidationTest;
