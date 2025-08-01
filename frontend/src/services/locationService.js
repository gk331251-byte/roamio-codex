// Location Service - Robust GPS detection and geocoding
import { logError, logUserActionError } from '../lib/errorLogger';
import googleMapsLoader from './googleMapsLoader';

/**
 * Comprehensive location detection service with error handling,
 * loading states, and mood recommendations based on nearby places
 */
class LocationService {
  constructor() {
    this.currentPosition = null;
    this.geocodedAddress = null;
    this.nearbyPlaces = [];
    this.isDetecting = false;
    this.permissionStatus = null;
  }

  /**
   * Main method to get user's current location with comprehensive error handling
   * @param {Object} options - Configuration options
   * @param {Function} onProgress - Callback for progress updates
   * @param {Function} onError - Callback for error handling
   * @returns {Promise<Object>} Location data with geocoded address
   */
  async getCurrentLocation(options = {}) {
    const {
      timeout = 15000,
      enableHighAccuracy = true,
      maximumAge = 300000, // 5 minutes
      onProgress = () => {},
      onError = () => {}
    } = options;

    if (this.isDetecting) {
      throw new Error('Location detection already in progress');
    }

    this.isDetecting = true;

    try {
      onProgress({ status: 'checking_support', message: 'Checking location support...' });

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('GEOLOCATION_NOT_SUPPORTED');
      }

      onProgress({ status: 'checking_permissions', message: 'Checking location permissions...' });

      // Check permission status if available
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          this.permissionStatus = permission.state;
          
          if (permission.state === 'denied') {
            throw new Error('PERMISSION_DENIED');
          }
        } catch (permissionError) {
          // Permissions API not available in all browsers, continue anyway
          console.warn('Permissions API not available:', permissionError);
        }
      }

      onProgress({ status: 'detecting_location', message: 'Getting your location...' });

      // Get current position with proper error handling
      const position = await this.getPositionPromise({
        timeout,
        enableHighAccuracy,
        maximumAge
      });

      this.currentPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };

      onProgress({ 
        status: 'geocoding', 
        message: 'Finding your address...',
        position: this.currentPosition 
      });

      // Geocode the position to get readable address
      const geocodedData = await this.geocodePosition(this.currentPosition);
      
      onProgress({ 
        status: 'analyzing_area', 
        message: 'Analyzing nearby places...',
        geocoded: geocodedData 
      });

      // Get nearby places for mood recommendations
      const nearbyPlaces = await this.getNearbyPlaces(this.currentPosition);

      const result = {
        position: this.currentPosition,
        address: geocodedData.address,
        city: geocodedData.city,
        formattedAddress: geocodedData.formattedAddress,
        placeId: geocodedData.placeId,
        nearbyPlaces,
        suggestedMoods: this.generateMoodSuggestions(nearbyPlaces),
        timestamp: Date.now()
      };

      onProgress({ 
        status: 'complete', 
        message: 'Location detected successfully!',
        result 
      });

      return result;

    } catch (error) {
      const errorDetails = this.handleLocationError(error);
      onError(errorDetails);
      logUserActionError(error, 'getCurrentLocation', { 
        permissionStatus: this.permissionStatus,
        options 
      });
      throw errorDetails;
    } finally {
      this.isDetecting = false;
    }
  }

  /**
   * Promisified version of navigator.geolocation.getCurrentPosition
   */
  getPositionPromise(options) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        position => resolve(position),
        error => reject(error),
        options
      );
    });
  }

  /**
   * Geocode coordinates to get readable address and city information
   */
  async geocodePosition(position) {
    // Ensure Google Maps is loaded
    await googleMapsLoader.waitForReady();
    
    if (!window.google || !window.google.maps) {
      throw new Error('GOOGLE_MAPS_NOT_LOADED');
    }

    return new Promise((resolve, reject) => {
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode(
        { location: { lat: position.lat, lng: position.lng } },
        (results, status) => {
          if (status === 'OK' && results && results.length > 0) {
            const result = results[0];
            const addressComponents = result.address_components;
            
            // Extract city information from address components
            let city = '';
            let state = '';
            let country = '';
            
            for (const component of addressComponents) {
              const types = component.types;
              
              if (types.includes('locality')) {
                city = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                state = component.short_name;
              } else if (types.includes('country')) {
                country = component.short_name;
              }
            }

            // Format city string for API
            const cityString = city ? 
              `${city}${state ? `, ${state}` : ''}${country ? `, ${country}` : ''}` : 
              result.formatted_address;

            resolve({
              address: result.formatted_address,
              city: cityString,
              formattedAddress: result.formatted_address,
              placeId: result.place_id,
              addressComponents,
              geometry: result.geometry
            });
          } else {
            reject(new Error(`GEOCODING_FAILED: ${status}`));
          }
        }
      );
    });
  }

  /**
   * Get nearby places for mood recommendations
   */
  async getNearbyPlaces(position) {
    // Ensure Google Maps is loaded with Places API
    await googleMapsLoader.waitForReady();
    
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn('Google Maps Places API not available');
      return [];
    }

    return new Promise((resolve) => {
      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      // Search for various types of places nearby
      const searchTypes = [
        'restaurant', 'park', 'museum', 'cafe', 'tourist_attraction',
        'art_gallery', 'shopping_mall', 'church', 'library', 'spa'
      ];

      const searchPromises = searchTypes.map(type => 
        this.searchPlacesByType(service, position, type)
      );

      Promise.all(searchPromises)
        .then(results => {
          const allPlaces = results.flat().filter(Boolean);
          this.nearbyPlaces = allPlaces;
          resolve(allPlaces);
        })
        .catch(error => {
          console.warn('Failed to get nearby places:', error);
          resolve([]);
        });
    });
  }

  /**
   * Search for places by specific type
   */
  searchPlacesByType(service, position, type) {
    return new Promise((resolve) => {
      service.nearbySearch({
        location: { lat: position.lat, lng: position.lng },
        radius: 2000, // 2km radius
        type: type
      }, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(results.slice(0, 3).map(place => ({ ...place, searchType: type })));
        } else {
          resolve([]);
        }
      });
    });
  }

  /**
   * Generate mood suggestions based on nearby places
   */
  generateMoodSuggestions(nearbyPlaces) {
    const moodMap = {
      restaurant: ['foodie', 'social'],
      cafe: ['chill', 'cozy'],
      park: ['outdoorsy', 'adventurous', 'spiritual'],
      museum: ['historic', 'creative', 'curious'],
      tourist_attraction: ['adventurous', 'mystery'],
      art_gallery: ['creative', 'sophisticated'],
      shopping_mall: ['social', 'trendy'],
      church: ['spiritual', 'historic'],
      library: ['cozy', 'peaceful'],
      spa: ['chill', 'spiritual']
    };

    const moodCounts = {};
    const suggestions = [];

    // Count mood frequencies based on nearby places
    nearbyPlaces.forEach(place => {
      const moods = moodMap[place.searchType] || [];
      moods.forEach(mood => {
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      });
    });

    // Get top 3 most relevant moods
    const sortedMoods = Object.entries(moodCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    // Map internal mood names to display names
    const moodDisplayMap = {
      foodie: { value: 'foodie', label: 'Foodie', icon: '🍽️', reason: 'restaurants nearby' },
      chill: { value: 'chill', label: 'Chill', icon: '☕', reason: 'relaxing spots nearby' },
      outdoorsy: { value: 'outdoorsy', label: 'Outdoorsy', icon: '🌳', reason: 'parks and nature nearby' },
      adventurous: { value: 'adventurous', label: 'Adventurous', icon: '🗺️', reason: 'attractions nearby' },
      historic: { value: 'historic', label: 'Historic', icon: '🏛️', reason: 'historical sites nearby' },
      creative: { value: 'creative', label: 'Creative', icon: '🎨', reason: 'art and culture nearby' },
      spiritual: { value: 'spiritual', label: 'Spiritual', icon: '🧘', reason: 'peaceful places nearby' },
      cozy: { value: 'cozy', label: 'Cozy', icon: '🏠', reason: 'intimate spaces nearby' },
      social: { value: 'social', label: 'Social', icon: '👥', reason: 'social venues nearby' },
      mystery: { value: 'mystery', label: 'Mystery', icon: '🔍', reason: 'intriguing places nearby' }
    };

    return sortedMoods
      .map(([mood]) => moodDisplayMap[mood])
      .filter(Boolean);
  }

  /**
   * Handle and categorize location errors with user-friendly messages
   */
  handleLocationError(error) {
    let errorType = 'UNKNOWN_ERROR';
    let userMessage = 'Unable to get your location. Please try again.';
    let suggestions = [];
    let canRetry = true;

    if (error.code) {
      switch (error.code) {
        case 1: // PERMISSION_DENIED
          errorType = 'PERMISSION_DENIED';
          userMessage = 'Location access was denied. Please enable location permissions in your browser settings.';
          suggestions = [
            'Click the location icon in your browser\'s address bar',
            'Select "Allow" for location access',
            'Refresh the page and try again'
          ];
          canRetry = false;
          break;

        case 2: // POSITION_UNAVAILABLE
          errorType = 'POSITION_UNAVAILABLE';
          userMessage = 'Your location is currently unavailable. Please check your device\'s location settings.';
          suggestions = [
            'Make sure location services are enabled on your device',
            'Try moving to a location with better signal',
            'Enter your location manually instead'
          ];
          break;

        case 3: // TIMEOUT
          errorType = 'TIMEOUT';
          userMessage = 'Location detection timed out. This might be due to a weak signal.';
          suggestions = [
            'Try again in a few moments',
            'Move to a location with better signal',
            'Enter your location manually'
          ];
          break;
      }
    } else if (error.message) {
      switch (error.message) {
        case 'GEOLOCATION_NOT_SUPPORTED':
          errorType = 'NOT_SUPPORTED';
          userMessage = 'Your browser doesn\'t support location detection.';
          suggestions = ['Please enter your location manually'];
          canRetry = false;
          break;

        case 'GOOGLE_MAPS_NOT_LOADED':
          errorType = 'MAPS_API_ERROR';
          userMessage = 'Maps service is not available. Please refresh the page.';
          suggestions = [
            'Refresh the page and try again',
            'Check your internet connection',
            'Make sure you\'re not using an ad blocker that blocks Google services'
          ];
          break;

        default:
          if (error.message.includes('GEOCODING_FAILED')) {
            errorType = 'GEOCODING_ERROR';
            userMessage = 'Unable to determine your address. Please enter it manually.';
            suggestions = ['Use the search box to enter your location'];
          }
      }
    }

    return {
      type: errorType,
      message: userMessage,
      suggestions,
      canRetry,
      originalError: error
    };
  }

  /**
   * Check if location detection is currently supported and available
   */
  static isSupported() {
    return !!(navigator.geolocation);
  }

  /**
   * Reset the service state
   */
  reset() {
    this.currentPosition = null;
    this.geocodedAddress = null;
    this.nearbyPlaces = [];
    this.isDetecting = false;
    this.permissionStatus = null;
  }
}

// Export singleton instance
const locationService = new LocationService();
export default locationService;

// Export helper functions
export const { isSupported } = LocationService;