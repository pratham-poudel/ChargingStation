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
      // Fallback to straight-line distance
      return this.calculateStraightLineDistance(srcLat, srcLng, dstLat, dstLng);
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
  }

  // Calculate straight-line distance (Haversine formula) as fallback
  calculateStraightLineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    return {
      distanceKm: (distance).toFixed(1),
      durationMinutes: Math.round((distance / 40) * 60) // Fallback calculation
    };
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Format distance for display
  formatDistance(distanceKm) {
    const distance = parseFloat(distanceKm);
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 10) {
      return `${distance}km`;
    } else {
      return `${Math.round(distance)}km`;
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
