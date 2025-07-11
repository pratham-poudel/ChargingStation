const express = require('express');
const axios = require('axios');
const router = express.Router();

const GRAPH_HOPPER_API_KEY = '0086de71-3a18-474a-a401-139651689d1f'; 
const GRAPH_HOPPER_URL = 'https://graphhopper.com/api/1';

const geoAPI = axios.create({
  baseURL: GRAPH_HOPPER_URL,
  timeout: 10000,
});

// 1. Reverse Geocoding
router.post('/reverse-geocode', async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
  }

  try {
    const response = await geoAPI.get('/geocode', {
      params: {
        key: GRAPH_HOPPER_API_KEY,
        reverse: true,
        point: `${latitude},${longitude}`,
        provider: 'default',
        locale: 'en',
        radius: 5,
      },
    });

    const place = response.data.hits[0];
    return res.json({
      success: true,
      data: {
        address: place.name || place.street || 'Unknown',
        fullAddress: `${place.name}, ${place.city || ''}, ${place.country || ''}`,
        city: place.city || '',
        district: place.state || '',
        province: '',
        ward: '',
        country: place.country || 'Nepal',
      },
    });
  } catch (error) {
    console.error('Reverse geocode error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to reverse geocode', error: error.message });
  }
});

// 2. Autocomplete (Nepal only)
router.get('/autocomplete', async (req, res) => {
  const { query, lat = 27.7, lng = 85.3 } = req.query;

  if (!query || query.length < 3) {
    return res.json({ success: true, data: [] });
  }

  try {
    const response = await geoAPI.get('/geocode', {
      params: {
        key: GRAPH_HOPPER_API_KEY,
        q: query,
        locale: 'en',
        limit: 5,
        provider: 'default',
        bbox: '80.0586,26.347,88.2015,30.447', // Nepal bounding box
        point: `${lat},${lng}`,
        location_bias_scale: 0.3,
      },
    });

    const results = response.data.hits.map(item => ({
      id: item.osm_id || item.name,
      name: item.name,
      shortName: item.name.toLowerCase(),
      fullAddress: `${item.name}, ${item.city || ''}, ${item.country || ''}`,
      province: '',
      district: item.state || '',
      municipality: item.city || '',
      ward: '',
      distance: item.distance || 0,
    }));

    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Autocomplete error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to autocomplete', error: error.message });
  }
});

// 3. Search to get coordinates
router.post('/search', async (req, res) => {
  const { name, currentLat = 27.7, currentLng = 85.3 } = req.body;

  if (!name) return res.status(400).json({ success: false, message: 'Location name is required' });

  try {
    const response = await geoAPI.get('/geocode', {
      params: {
        key: GRAPH_HOPPER_API_KEY,
        q: name,
        limit: 1,
        provider: 'default',
        point: `${currentLat},${currentLng}`,
        bbox: '80.0586,26.347,88.2015,30.447',
      },
    });

    const place = response.data.hits[0];
    return res.json({
      success: true,
      data: {
        latitude: place.point.lat,
        longitude: place.point.lng,
        name: place.name,
        fullAddress: `${place.city || ''}, ${place.country || ''}`,
        distance: place.distance,
        municipality: place.city || '',
        district: place.state || '',
        province: '',
        ward: '',
      },
    });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to search location', error: error.message });
  }
});

// 4. Distance between two points (GraphHopper Routing)
router.post('/distance', async (req, res) => {
  const { srcLat, srcLng, dstLat, dstLng, mode = 'car' } = req.body;

  try {
    const response = await axios.get('https://graphhopper.com/api/1/route', {
      params: {
        key: GRAPH_HOPPER_API_KEY,
        point: [`${srcLat},${srcLng}`, `${dstLat},${dstLng}`],
        vehicle: mode,
        type: 'json',
        locale: 'en',
      },
    });

    const path = response.data.paths[0];

    return res.json({
      success: true,
      data: {
        distance: path.distance,
        duration: path.time,
        distanceKm: (path.distance / 1000).toFixed(1),
        durationMinutes: Math.round(path.time / 60000),
        mode: mode,
      },
    });
  } catch (error) {
    console.error('Distance error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to calculate distance', error: error.message });
  }
});

// 5. Batch Distance Calculation
router.post('/distances-batch', async (req, res) => {
  const { srcLat, srcLng, destinations, mode = 'car' } = req.body;

  if (!Array.isArray(destinations)) {
    return res.status(400).json({ success: false, message: 'Destinations must be an array' });
  }

  const results = [];

  for (const dest of destinations) {
    try {
      const response = await axios.get('https://graphhopper.com/api/1/route', {
        params: {
          key: GRAPH_HOPPER_API_KEY,
          point: [`${srcLat},${srcLng}`, `${dest.latitude},${dest.longitude}`],
          vehicle: mode,
          type: 'json',
        },
      });

      const path = response.data.paths[0];

      results.push({
        id: dest.id,
        distance: path.distance,
        duration: path.time,
        distanceKm: (path.distance / 1000).toFixed(1),
        durationMinutes: Math.round(path.time / 60000),
        mode: mode,
      });
    } catch (err) {
      console.warn(`Failed for destination ${dest.id}`);
    }
  }

  return res.json({ success: true, data: results });
});

module.exports = router;
