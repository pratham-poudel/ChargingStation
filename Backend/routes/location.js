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

  // Debug logging
  console.log('Distance calculation request:', {
    srcLat, srcLng, dstLat, dstLng, mode,
    srcLatType: typeof srcLat,
    srcLngType: typeof srcLng,
    dstLatType: typeof dstLat,
    dstLngType: typeof dstLng
  });

  // Validate required parameters
  if (!srcLat || !srcLng || !dstLat || !dstLng) {
    console.log('Missing coordinates:', { srcLat, srcLng, dstLat, dstLng });
    return res.status(400).json({ 
      success: false, 
      message: 'All coordinates are required: srcLat, srcLng, dstLat, dstLng' 
    });
  }

  // Validate coordinate types and ranges
  const coordinates = [
    { name: 'srcLat', value: srcLat },
    { name: 'srcLng', value: srcLng },
    { name: 'dstLat', value: dstLat },
    { name: 'dstLng', value: dstLng }
  ];

  for (const coord of coordinates) {
    const numValue = parseFloat(coord.value);
    
    if (isNaN(numValue)) {
      return res.status(400).json({ 
        success: false, 
        message: `${coord.name} must be a valid number, received: ${coord.value}` 
      });
    }
    
    // Validate latitude range (-90 to 90)
    if (coord.name.includes('Lat') && (numValue < -90 || numValue > 90)) {
      return res.status(400).json({ 
        success: false, 
        message: `${coord.name} must be between -90 and 90, received: ${numValue}` 
      });
    }
    
    // Validate longitude range (-180 to 180)
    if (coord.name.includes('Lng') && (numValue < -180 || numValue > 180)) {
      return res.status(400).json({ 
        success: false, 
        message: `${coord.name} must be between -180 and 180, received: ${numValue}` 
      });
    }
  }

  // Validate mode parameter
  const validModes = ['car', 'bike', 'foot', 'motorcycle', 'truck'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid mode. Must be one of: ${validModes.join(', ')}` 
    });
  }

  try {
    // Convert to numbers for API call
    const srcLatNum = parseFloat(srcLat);
    const srcLngNum = parseFloat(srcLng);
    const dstLatNum = parseFloat(dstLat);
    const dstLngNum = parseFloat(dstLng);

    // Debug logging for parsed coordinates
    console.log('Parsed coordinates:', {
      srcLatNum, srcLngNum, dstLatNum, dstLngNum,
      srcLatValid: !isNaN(srcLatNum),
      srcLngValid: !isNaN(srcLngNum),
      dstLatValid: !isNaN(dstLatNum),
      dstLngValid: !isNaN(dstLngNum)
    });

    // Check if any coordinates are NaN after parsing
    if (isNaN(srcLatNum) || isNaN(srcLngNum) || isNaN(dstLatNum) || isNaN(dstLngNum)) {
      console.log('Invalid coordinates after parsing:', {
        srcLatNum, srcLngNum, dstLatNum, dstLngNum
      });
      return res.status(400).json({ 
        success: false, 
        message: 'One or more coordinates are invalid numbers' 
      });
    }

    const response = await axios.get('https://graphhopper.com/api/1/route', {
      params: {
        key: GRAPH_HOPPER_API_KEY,
        point: [`${srcLatNum},${srcLngNum}`, `${dstLatNum},${dstLngNum}`],
        vehicle: mode,
        type: 'json',
        locale: 'en',
      },
      timeout: 15000, // 15 second timeout
    });

    if (!response.data.paths || response.data.paths.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No route found between the specified coordinates' 
      });
    }

    const path = response.data.paths[0];

    return res.json({
      success: true,
      data: {
        distance: path.distance,
        duration: path.time,
        distanceKm: (path.distance / 1000).toFixed(1),
        durationMinutes: Math.round(path.time / 60000),
        mode: mode,
        coordinates: {
          source: { lat: srcLatNum, lng: srcLngNum },
          destination: { lat: dstLatNum, lng: dstLngNum }
        }
      },
    });
  } catch (error) {
    console.error('Distance error:', error.message);
    
    // Handle specific GraphHopper API errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 400) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid coordinates or route parameters',
          error: data.message || error.message 
        });
      } else if (status === 429) {
        return res.status(429).json({ 
          success: false, 
          message: 'Rate limit exceeded. Please try again later.',
          error: error.message 
        });
      } else if (status === 500) {
        return res.status(500).json({ 
          success: false, 
          message: 'GraphHopper service temporarily unavailable',
          error: error.message 
        });
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to calculate distance', 
      error: error.message 
    });
  }
});

// 5. Batch Distance Calculation
router.post('/distances-batch', async (req, res) => {
  const { srcLat, srcLng, destinations, mode = 'car' } = req.body;

  // Validate required parameters
  if (!srcLat || !srcLng) {
    return res.status(400).json({ 
      success: false, 
      message: 'Source coordinates (srcLat, srcLng) are required' 
    });
  }

  if (!Array.isArray(destinations) || destinations.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Destinations must be a non-empty array' 
    });
  }

  // Validate source coordinates
  const srcLatNum = parseFloat(srcLat);
  const srcLngNum = parseFloat(srcLng);
  
  if (isNaN(srcLatNum) || isNaN(srcLngNum)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Source coordinates must be valid numbers' 
    });
  }
  
  if (srcLatNum < -90 || srcLatNum > 90) {
    return res.status(400).json({ 
      success: false, 
      message: 'srcLat must be between -90 and 90' 
    });
  }
  
  if (srcLngNum < -180 || srcLngNum > 180) {
    return res.status(400).json({ 
      success: false, 
      message: 'srcLng must be between -180 and 180' 
    });
  }

  // Validate mode parameter
  const validModes = ['car', 'bike', 'foot', 'motorcycle', 'truck'];
  if (!validModes.includes(mode)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid mode. Must be one of: ${validModes.join(', ')}` 
    });
  }

  // Validate destinations array
  const validDestinations = [];
  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    
    if (!dest.latitude || !dest.longitude) {
      console.warn(`Destination ${i} missing coordinates:`, dest);
      continue;
    }
    
    const destLat = parseFloat(dest.latitude);
    const destLng = parseFloat(dest.longitude);
    
    if (isNaN(destLat) || isNaN(destLng)) {
      console.warn(`Destination ${i} has invalid coordinates:`, dest);
      continue;
    }
    
    if (destLat < -90 || destLat > 90) {
      console.warn(`Destination ${i} latitude out of range:`, destLat);
      continue;
    }
    
    if (destLng < -180 || destLng > 180) {
      console.warn(`Destination ${i} longitude out of range:`, destLng);
      continue;
    }
    
    validDestinations.push({
      ...dest,
      latitude: destLat,
      longitude: destLng
    });
  }

  if (validDestinations.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'No valid destinations found in the array' 
    });
  }

  const results = [];
  const errors = [];

  for (const dest of validDestinations) {
    try {
      const response = await axios.get('https://graphhopper.com/api/1/route', {
        params: {
          key: GRAPH_HOPPER_API_KEY,
          point: [`${srcLatNum},${srcLngNum}`, `${dest.latitude},${dest.longitude}`],
          vehicle: mode,
          type: 'json',
        },
        timeout: 10000, // 10 second timeout per request
      });

      if (response.data.paths && response.data.paths.length > 0) {
        const path = response.data.paths[0];

        results.push({
          id: dest.id,
          distance: path.distance,
          duration: path.time,
          distanceKm: (path.distance / 1000).toFixed(1),
          durationMinutes: Math.round(path.time / 60000),
          mode: mode,
          destination: {
            latitude: dest.latitude,
            longitude: dest.longitude
          }
        });
      } else {
        errors.push({
          id: dest.id,
          error: 'No route found'
        });
      }
    } catch (err) {
      console.warn(`Failed for destination ${dest.id}:`, err.message);
      errors.push({
        id: dest.id,
        error: err.message
      });
    }
  }

  return res.json({ 
    success: true, 
    data: results,
    errors: errors.length > 0 ? errors : undefined,
    summary: {
      total: validDestinations.length,
      successful: results.length,
      failed: errors.length
    }
  });
});

module.exports = router;
