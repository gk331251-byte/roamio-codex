// useLocation Hook - React hook for location detection with loading states
import { useState, useCallback, useEffect } from 'react';
import locationService from '../services/locationService';
import { logUserActionError } from '../lib/errorLogger';

/**
 * React hook for robust location detection with loading states,
 * error handling, and mood recommendations
 */
export const useLocation = () => {
  const [state, setState] = useState({
    // Location data
    position: null,
    address: null,
    city: null,
    formattedAddress: null,
    placeId: null,
    nearbyPlaces: [],
    suggestedMoods: [],
    
    // Loading states
    isDetecting: false,
    progress: null,
    
    // Error handling
    error: null,
    canRetry: true,
    
    // Permission status
    permissionStatus: null,
    
    // Success state
    hasLocation: false,
    lastUpdated: null
  });

  /**
   * Reset all location state
   */
  const resetLocation = useCallback(() => {
    setState({
      position: null,
      address: null,
      city: null,
      formattedAddress: null,
      placeId: null,
      nearbyPlaces: [],
      suggestedMoods: [],
      isDetecting: false,
      progress: null,
      error: null,
      canRetry: true,
      permissionStatus: null,
      hasLocation: false,
      lastUpdated: null
    });
    locationService.reset();
  }, []);

  /**
   * Handle progress updates during location detection
   */
  const handleProgress = useCallback((progressData) => {
    setState(prev => ({
      ...prev,
      progress: progressData,
      error: null
    }));
  }, []);

  /**
   * Handle errors during location detection
   */
  const handleError = useCallback((error) => {
    setState(prev => ({
      ...prev,
      error,
      canRetry: error.canRetry,
      isDetecting: false,
      progress: null
    }));
  }, []);

  /**
   * Get current location with comprehensive error handling
   */
  const getCurrentLocation = useCallback(async (options = {}) => {
    if (state.isDetecting) {
      return;
    }

    setState(prev => ({
      ...prev,
      isDetecting: true,
      error: null,
      progress: { status: 'starting', message: 'Starting location detection...' }
    }));

    try {
      const result = await locationService.getCurrentLocation({
        ...options,
        onProgress: handleProgress,
        onError: handleError
      });

      setState(prev => ({
        ...prev,
        position: result.position,
        address: result.address,
        city: result.city,
        formattedAddress: result.formattedAddress,
        placeId: result.placeId,
        nearbyPlaces: result.nearbyPlaces,
        suggestedMoods: result.suggestedMoods,
        hasLocation: true,
        lastUpdated: result.timestamp,
        isDetecting: false,
        progress: null,
        error: null
      }));

      return result;

    } catch (error) {
      logUserActionError(error, 'useLocation.getCurrentLocation', { options });
      // Error handling is done in the handleError callback
      throw error;
    }
  }, [state.isDetecting, handleProgress, handleError]);

  /**
   * Check if location services are supported
   */
  const isSupported = locationService.constructor.isSupported();

  /**
   * Get a formatted location string suitable for the API
   */
  const getApiLocationString = useCallback(() => {
    if (!state.city) return null;
    return state.city;
  }, [state.city]);

  /**
   * Get location data formatted for the quest generation API
   */
  const getLocationForApi = useCallback(() => {
    if (!state.hasLocation) return null;

    return {
      city: state.city,
      address: state.formattedAddress,
      lat: state.position?.lat,
      lng: state.position?.lng,
      placeId: state.placeId
    };
  }, [state.hasLocation, state.city, state.formattedAddress, state.position, state.placeId]);

  /**
   * Check if we have a valid location for quest generation
   */
  const hasValidLocation = useCallback(() => {
    return !!(state.city && state.position);
  }, [state.city, state.position]);

  /**
   * Get mood suggestions with additional context
   */
  const getMoodSuggestions = useCallback(() => {
    return state.suggestedMoods.map(mood => ({
      ...mood,
      isRecommended: true,
      source: 'location_based'
    }));
  }, [state.suggestedMoods]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isDetecting) {
        locationService.reset();
      }
    };
  }, [state.isDetecting]);

  return {
    // Location data
    position: state.position,
    address: state.address,
    city: state.city,
    formattedAddress: state.formattedAddress,
    placeId: state.placeId,
    nearbyPlaces: state.nearbyPlaces,
    suggestedMoods: state.suggestedMoods,
    
    // Status
    isDetecting: state.isDetecting,
    hasLocation: state.hasLocation,
    isSupported,
    lastUpdated: state.lastUpdated,
    
    // Progress and errors
    progress: state.progress,
    error: state.error,
    canRetry: state.canRetry,
    
    // Actions
    getCurrentLocation,
    resetLocation,
    
    // Helper methods
    getApiLocationString,
    getLocationForApi,
    hasValidLocation,
    getMoodSuggestions
  };
};

export default useLocation;