// useGoogleMaps Hook - React hook for Google Maps API initialization
import { useState, useEffect, useCallback } from 'react';
import googleMapsLoader from '../services/googleMapsLoader';
import { logError } from '../lib/errorLogger';

/**
 * React hook for managing Google Maps API loading
 * @param {Object} options - Configuration options
 * @returns {Object} - Maps API state and methods
 */
export const useGoogleMaps = (options = {}) => {
  const [state, setState] = useState({
    isLoaded: false,
    isLoading: false,
    error: null,
    apiKey: null
  });

  const {
    libraries = ['places', 'geometry'],
    autoLoad = true,
    retryOnError = true
  } = options;

  /**
   * Load Google Maps API
   */
  const loadMaps = useCallback(async () => {
    if (state.isLoading) {
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      await googleMapsLoader.loadGoogleMaps({ libraries });
      
      setState(prev => ({
        ...prev,
        isLoaded: true,
        isLoading: false,
        error: null,
        apiKey: googleMapsLoader.getApiKey()
      }));

    } catch (error) {
      console.error('Google Maps loading failed:', error);
      
      setState(prev => ({
        ...prev,
        isLoaded: false,
        isLoading: false,
        error: {
          message: error.message,
          canRetry: retryOnError,
          type: 'MAPS_LOAD_ERROR'
        }
      }));

      logError(error, {
        type: 'googleMapsLoadError',
        libraries,
        apiKey: googleMapsLoader.getApiKey() ? 'present' : 'missing'
      });
    }
  }, [libraries, retryOnError, state.isLoading]);

  /**
   * Check if Maps API is ready
   */
  const isReady = useCallback(() => {
    return googleMapsLoader.isReady();
  }, []);

  /**
   * Reset the Maps loader
   */
  const reset = useCallback(() => {
    googleMapsLoader.reset();
    setState({
      isLoaded: false,
      isLoading: false,
      error: null,
      apiKey: null
    });
  }, []);

  /**
   * Wait for Maps to be ready
   */
  const waitForReady = useCallback(async (timeout = 15000) => {
    try {
      await googleMapsLoader.waitForReady(timeout);
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: {
          message: error.message,
          canRetry: true,
          type: 'MAPS_TIMEOUT_ERROR'
        }
      }));
      throw error;
    }
  }, []);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && !state.isLoaded && !state.isLoading) {
      loadMaps();
    }
  }, [autoLoad, loadMaps, state.isLoaded, state.isLoading]);

  // Check for existing Maps API on mount
  useEffect(() => {
    if (googleMapsLoader.isReady()) {
      setState(prev => ({
        ...prev,
        isLoaded: true,
        isLoading: false,
        error: null,
        apiKey: googleMapsLoader.getApiKey()
      }));
    }
  }, []);

  return {
    // State
    isLoaded: state.isLoaded,
    isLoading: state.isLoading,
    error: state.error,
    apiKey: state.apiKey,
    
    // Methods
    loadMaps,
    isReady,
    reset,
    waitForReady,
    
    // Helper
    hasApiKey: !!googleMapsLoader.getApiKey()
  };
};

export default useGoogleMaps;