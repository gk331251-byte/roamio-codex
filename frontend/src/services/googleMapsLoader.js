// Google Maps API Loader Service
// Handles dynamic loading of Google Maps JavaScript API with proper error handling

class GoogleMapsLoader {
  constructor() {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * Load Google Maps JavaScript API dynamically
   * @param {Object} options - Configuration options
   * @returns {Promise<boolean>} - True if loaded successfully
   */
  async loadGoogleMaps(options = {}) {
    const {
      libraries = ['places', 'geometry'],
      version = 'weekly',
      callback = 'initGoogleMaps',
      timeout = 10000
    } = options;

    // Return existing promise if already loading
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // Return immediately if already loaded
    if (this.isLoaded && window.google && window.google.maps) {
      return true;
    }

    // Check if API key is available
    if (!this.apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured. Please check environment variables.');
    }

    this.isLoading = true;

    // Create load promise
    this.loadPromise = new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.isLoading = false;
        reject(new Error(`Google Maps API loading timeout after ${timeout}ms`));
      }, timeout);

      // Create global callback
      window[callback] = () => {
        clearTimeout(timeoutId);
        this.isLoaded = true;
        this.isLoading = false;
        delete window[callback];
        console.log('✅ Google Maps API loaded successfully');
        resolve(true);
      };

      // Handle script error
      const handleError = (error) => {
        clearTimeout(timeoutId);
        this.isLoading = false;
        delete window[callback];
        
        const errorMessage = this.getLoadErrorMessage(error);
        console.error('❌ Google Maps API loading failed:', errorMessage);
        
        // Retry logic
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`🔄 Retrying Google Maps API load (attempt ${this.retryCount}/${this.maxRetries})`);
          setTimeout(() => {
            this.loadPromise = null;
            this.loadGoogleMaps(options).then(resolve).catch(reject);
          }, 1000 * this.retryCount); // Exponential backoff
        } else {
          reject(new Error(errorMessage));
        }
      };

      // Create script element
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;
      
      // Construct URL with parameters
      const params = new URLSearchParams({
        key: this.apiKey,
        callback: callback,
        libraries: libraries.join(','),
        v: version
      });
      
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

      // Error handling
      script.onerror = handleError;
      script.onabort = () => handleError(new Error('Script loading aborted'));

      // Append to head
      document.head.appendChild(script);
    });

    try {
      await this.loadPromise;
      this.retryCount = 0; // Reset retry count on success
      return true;
    } catch (error) {
      this.loadPromise = null;
      throw error;
    }
  }

  /**
   * Get user-friendly error message based on the error type
   */
  getLoadErrorMessage(error) {
    // Common Google Maps API error patterns
    if (error?.message?.includes('InvalidKeyMapError')) {
      return 'Invalid Google Maps API key. Please check the API key configuration.';
    }
    
    if (error?.message?.includes('QuotaExceededError')) {
      return 'Google Maps API quota exceeded. Please try again later.';
    }
    
    if (error?.message?.includes('RequestDeniedError')) {
      return 'Google Maps API request denied. Please check API key permissions.';
    }
    
    if (error?.message?.includes('OverQueryLimitError')) {
      return 'Google Maps API query limit exceeded. Please try again later.';
    }

    // Network-related errors
    if (!navigator.onLine) {
      return 'No internet connection. Please check your network and try again.';
    }

    // Generic error
    return error?.message || 'Failed to load Google Maps API. Please try again.';
  }

  /**
   * Check if Google Maps API is loaded and ready
   */
  isReady() {
    return this.isLoaded && 
           window.google && 
           window.google.maps && 
           window.google.maps.places;
  }

  /**
   * Get the current API key
   */
  getApiKey() {
    return this.apiKey;
  }

  /**
   * Reset the loader state (useful for testing)
   */
  reset() {
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
    this.retryCount = 0;
    
    // Remove any existing callback
    if (window.initGoogleMaps) {
      delete window.initGoogleMaps;
    }
  }

  /**
   * Wait for Google Maps to be ready
   */
  async waitForReady(timeout = 15000) {
    if (this.isReady()) {
      return true;
    }

    // If not loading, start loading
    if (!this.isLoading) {
      await this.loadGoogleMaps();
    }

    // Wait for ready state
    const start = Date.now();
    while (!this.isReady() && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!this.isReady()) {
      throw new Error(`Google Maps API not ready after ${timeout}ms`);
    }

    return true;
  }
}

// Export singleton instance
const googleMapsLoader = new GoogleMapsLoader();
export default googleMapsLoader;

// Export helper functions
export const loadGoogleMaps = (options) => googleMapsLoader.loadGoogleMaps(options);
export const isGoogleMapsReady = () => googleMapsLoader.isReady();
export const waitForGoogleMaps = (timeout) => googleMapsLoader.waitForReady(timeout);