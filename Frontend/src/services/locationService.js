import { locationAPI } from './api'

class LocationService {
  // Get current location with high accuracy
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Reverse geocode coordinates to get address
  async reverseGeocode(latitude, longitude) {
    try {
      console.log('Reverse geocoding for:', latitude, longitude);
      const response = await locationAPI.reverseGeocode({ latitude, longitude });
      
      console.log('Reverse geocoding response:', response.data);
      
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to get location details');
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        address: 'Current Location',
        fullAddress: 'Current Location',
        city: '',
        district: '',
        province: '',
        ward: '',
        country: 'Nepal'
      };
    }
  }

  // Autocomplete search
  async autocompleteSearch(query, currentLat, currentLng) {
    try {
      if (query.length < 3) {
        return [];
      }

      const response = await locationAPI.autocomplete({
        query,
        lat: currentLat,
        lng: currentLng
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Autocomplete search error:', error);
      return [];
    }
  }

  // Search for specific location and get coordinates
  async searchLocation(name, currentLat, currentLng) {
    try {
      const response = await locationAPI.searchLocation({
        name,
        currentLat,
        currentLng
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Location not found');
    } catch (error) {
      console.error('Location search error:', error);
      throw error;
    }
  }
  // Calculate distance and duration using backend API
  async calculateRouteDistance(srcLat, srcLng, dstLat, dstLng, mode = 'car') {
    try {
      // Map frontend mode to backend mode
      const backendMode = this.mapModeToBackend(mode);
      
      // Validate coordinates before making API call
      if (typeof srcLat !== 'number' || typeof srcLng !== 'number' || 
          typeof dstLat !== 'number' || typeof dstLng !== 'number') {
        throw new Error('All coordinates must be valid numbers');
      }
      
      // Check for valid coordinate ranges
      if (srcLat < -90 || srcLat > 90 || dstLat < -90 || dstLat > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      
      if (srcLng < -180 || srcLng > 180 || dstLng < -180 || dstLng > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      
      // Debug logging
      console.log('LocationService - calculateRouteDistance called with:', {
        srcLat, srcLng, dstLat, dstLng, mode, backendMode,
        srcLatType: typeof srcLat,
        srcLngType: typeof srcLng,
        dstLatType: typeof dstLat,
        dstLngType: typeof dstLng
      });
      
      const response = await locationAPI.calculateDistance({
        srcLat,
        srcLng,
        dstLat,
        dstLng,
        mode: backendMode
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to calculate route distance');
    } catch (error) {
      console.error('Route distance calculation error:', error);
      throw error; // Don't provide fallback, let the caller handle it
    }
  }

  // Calculate distances to multiple destinations
  async calculateDistancesBatch(srcLat, srcLng, destinations, mode = 'car') {
    try {
      // Map frontend mode to backend mode
      const backendMode = this.mapModeToBackend(mode);
      
      const response = await locationAPI.calculateDistancesBatch({
        srcLat,
        srcLng,
        destinations,
        mode: backendMode
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Batch distance calculation error:', error);
      return [];
    }
  }

  // Map frontend transport modes to backend modes
  mapModeToBackend(frontendMode) {
    const modeMap = {
      'driving': 'car',
      'walking': 'foot',
      'cycling': 'bike',
      'motorcycle': 'motorcycle',
      'truck': 'truck'
    };
    return modeMap[frontendMode] || 'car';
  }  // Format distance for display
  formatDistance(distanceKm) {
    const distance = parseFloat(distanceKm);
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  }

  // Format travel time from minutes
  formatTravelTime(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  }

  // Get transport mode icon
  getTransportIcon(mode) {
    const icons = {
      driving: '🚗',
      walking: '🚶',
      cycling: '🚴'
    };
    return icons[mode] || '🚗';
  }

  // Get transport mode label
  getTransportLabel(mode) {
    const labels = {
      driving: 'Driving',
      walking: 'Walking', 
      cycling: 'Cycling'
    };
    return labels[mode] || 'Driving';
  }
}

export default new LocationService();
