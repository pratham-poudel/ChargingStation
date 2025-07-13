const express = require('express');
const { stationCacheManager, getCacheStats, invalidateStation, invalidateAllStations } = require('../middleware/cache');
const ChargingStation = require('../models/ChargingStation');

const router = express.Router();

// @desc    Get cache statistics
// @route   GET /api/debug/cache/stats
// @access  Development only
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await getCacheStats();
    res.status(200).json({
      success: true,
      data: stats,
      message: 'Cache statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics',
      error: error.message
    });
  }
});

// @desc    Invalidate cache for specific station
// @route   DELETE /api/debug/cache/stations/:stationId
// @access  Development only
router.delete('/cache/stations/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const invalidated = await invalidateStation(stationId);
    
    res.status(200).json({
      success: true,
      data: { stationId, invalidated },
      message: invalidated ? 
        `Cache invalidated for station ${stationId}` : 
        `No cache found for station ${stationId}`
    });
  } catch (error) {
    console.error('Error invalidating station cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate station cache',
      error: error.message
    });
  }
});

// @desc    Invalidate all station caches
// @route   DELETE /api/debug/cache/stations
// @access  Development only
router.delete('/cache/stations', async (req, res) => {
  try {
    const invalidatedCount = await invalidateAllStations();
    
    res.status(200).json({
      success: true,
      data: { invalidatedCount },
      message: `Invalidated ${invalidatedCount} station caches`
    });
  } catch (error) {
    console.error('Error invalidating all station caches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate all station caches',
      error: error.message
    });
  }
});

// @desc    Test cache functionality by updating a station
// @route   POST /api/debug/cache/test/:stationId
// @access  Development only
router.post('/cache/test/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { updateField = 'description', updateValue = `Cache test update at ${new Date().toISOString()}` } = req.body;
    
    // Get station before update
    const stationBefore = await ChargingStation.findById(stationId);
    if (!stationBefore) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    // Check cache before update
    const cacheKey = stationCacheManager.getStationCacheKey(stationId);
    const { getRedisClient } = require('../config/redis');
    const redisClient = getRedisClient();
    const cachedBefore = await redisClient.get(cacheKey);

    console.log(`🧪 Testing cache invalidation for station ${stationId}`);
    console.log(`🔍 Cache state before update: ${cachedBefore ? 'CACHED' : 'NOT_CACHED'}`);

    // Update the station
    const updateData = {};
    updateData[updateField] = updateValue;
    
    console.log(`🔄 Updating station with:`, updateData);
    const updatedStation = await ChargingStation.findByIdAndUpdate(
      stationId,
      updateData,
      { new: true }
    );

    // Small delay to allow cache invalidation hooks to run
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check cache after update (should be invalidated)
    const cachedAfter = await redisClient.get(cacheKey);
    console.log(`🔍 Cache state after update: ${cachedAfter ? 'CACHED' : 'NOT_CACHED'}`);

    const cacheInvalidated = cachedBefore && !cachedAfter;
    console.log(`🎯 Cache invalidation result: ${cacheInvalidated ? 'SUCCESS' : 'NO CHANGE'}`);

    res.status(200).json({
      success: true,
      data: {
        stationId,
        updateField,
        updateValue,
        cacheBefore: cachedBefore ? 'CACHED' : 'NOT_CACHED',
        cacheAfter: cachedAfter ? 'CACHED' : 'NOT_CACHED',
        cacheInvalidated: cacheInvalidated,
        invalidationResult: cacheInvalidated ? 'SUCCESS' : (cachedBefore ? 'FAILED' : 'NOT_APPLICABLE'),
        updatedStation: {
          id: updatedStation._id,
          [updateField]: updatedStation[updateField],
          updatedAt: updatedStation.updatedAt
        }
      },
      message: 'Cache invalidation test completed successfully'
    });
  } catch (error) {
    console.error('Error testing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test cache functionality',
      error: error.message
    });
  }
});

// @desc    Warm up cache for a specific station
// @route   POST /api/debug/cache/warmup/:stationId
// @access  Development only
router.post('/cache/warmup/:stationId', async (req, res) => {
  try {
    const { stationId } = req.params;
    
    // Simulate a GET request to warm up the cache
    const station = await ChargingStation.findById(stationId)
      .populate('vendor', 'businessName email phoneNumber rating')
      .lean();

    if (!station) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }

    // Manually cache the station data
    const dataToCache = {
      success: true,
      data: {
        ...station,
        formattedAddress: `${station.address.street}${station.address.landmark ? ', ' + station.address.landmark : ''}, ${station.address.city}, ${station.address.state} - ${station.address.pincode}`,
        availablePorts: station.chargingPorts.filter(port => 
          port.isOperational && port.currentStatus === 'available'
        ).length
      },
      cacheInfo: {
        cached: true,
        cachedAt: new Date().toISOString(),
        source: 'warmup'
      }
    };

    const cacheKey = stationCacheManager.getStationCacheKey(stationId);
    const { getRedisClient } = require('../config/redis');
    const redisClient = getRedisClient();
    
    await redisClient.setEx(cacheKey, stationCacheManager.CACHE_TTL, JSON.stringify(dataToCache));
    await redisClient.sAdd(stationCacheManager.INDEX_KEY, stationId);

    res.status(200).json({
      success: true,
      data: {
        stationId,
        cached: true,
        ttl: stationCacheManager.CACHE_TTL
      },
      message: `Cache warmed up for station ${stationId}`
    });
  } catch (error) {
    console.error('Error warming up cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to warm up cache',
      error: error.message
    });
  }
});

module.exports = router;