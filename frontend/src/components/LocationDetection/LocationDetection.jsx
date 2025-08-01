// LocationDetection Component - UI for location detection with feedback
import React from 'react';
import Button from '../design-system/Button';
import Card from '../design-system/Card';
import { useLocation } from '../../hooks/useLocation';

const LocationDetection = ({ 
  onLocationDetected, 
  onError, 
  className = '',
  showMoodSuggestions = true 
}) => {
  const {
    position,
    city,
    formattedAddress,
    isDetecting,
    hasLocation,
    isSupported,
    progress,
    error,
    canRetry,
    suggestedMoods,
    getCurrentLocation,
    resetLocation,
    getLocationForApi
  } = useLocation();

  // Handle successful location detection
  React.useEffect(() => {
    if (hasLocation && onLocationDetected) {
      const locationData = getLocationForApi();
      onLocationDetected({
        ...locationData,
        suggestedMoods
      });
    }
  }, [hasLocation, onLocationDetected, getLocationForApi, suggestedMoods]);

  // Handle errors
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleDetectLocation = async () => {
    try {
      await getCurrentLocation({
        timeout: 15000,
        enableHighAccuracy: true,
        maximumAge: 300000 // 5 minutes
      });
    } catch (err) {
      console.error('Location detection failed:', err);
    }
  };

  const handleRetry = () => {
    resetLocation();
    handleDetectLocation();
  };

  if (!isSupported) {
    return (
      <Card className={`p-4 border-amber-200 bg-amber-50 ${className}`}>
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="font-medium text-amber-800">Location Detection Unavailable</h3>
            <p className="text-sm text-amber-700 mt-1">
              Your browser doesn't support location detection. Please enter your location manually.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Location Detection Status */}
      {!hasLocation && !isDetecting && !error && (
        <div className="space-y-4">
          <Button
            onClick={handleDetectLocation}
            variant="secondary"
            className="w-full flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            </svg>
            <span>Use My Current Location</span>
          </Button>
          
          <p className="text-sm text-gray-500 text-center">
            We'll find nearby places to personalize your quest recommendations
          </p>
        </div>
      )}

      {/* Loading State */}
      {isDetecting && progress && (
        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-800">
                {progress.status === 'checking_support' && '🔍 Checking Support'}
                {progress.status === 'checking_permissions' && '🔒 Checking Permissions'}
                {progress.status === 'detecting_location' && '📍 Getting Location'}
                {progress.status === 'geocoding' && '🗺️ Finding Address'}
                {progress.status === 'analyzing_area' && '🏢 Analyzing Area'}
                {progress.status === 'complete' && '✅ Complete'}
              </h3>
              <p className="text-sm text-blue-700 mt-1">{progress.message}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-medium text-red-800">Location Detection Failed</h3>
                <p className="text-sm text-red-700 mt-1">{error.message}</p>
              </div>
            </div>

            {/* Error Suggestions */}
            {error.suggestions && error.suggestions.length > 0 && (
              <div className="ml-8">
                <p className="text-sm font-medium text-red-800 mb-2">Try these solutions:</p>
                <ul className="space-y-1">
                  {error.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-red-700 flex items-start space-x-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Retry Button */}
            {canRetry && (
              <div className="flex justify-end">
                <Button
                  onClick={handleRetry}
                  variant="secondary"
                  size="sm"
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Success State */}
      {hasLocation && (
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div className="flex-1">
                <h3 className="font-medium text-green-800">📍 Location Detected</h3>
                <p className="text-sm text-green-700 mt-1">{formattedAddress}</p>
                {position && (
                  <p className="text-xs text-green-600 mt-1">
                    Accuracy: ±{Math.round(position.accuracy)}m
                  </p>
                )}
              </div>
              <Button
                onClick={resetLocation}
                variant="ghost"
                size="sm"
                className="text-green-700 hover:bg-green-100"
              >
                Reset
              </Button>
            </div>

            {/* Mood Suggestions */}
            {showMoodSuggestions && suggestedMoods.length > 0 && (
              <div className="border-t border-green-200 pt-3">
                <h4 className="font-medium text-green-800 mb-2 flex items-center">
                  <span className="mr-2">💡</span>
                  Suggested moods for this area:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {suggestedMoods.map((mood, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 border border-green-300 rounded-full text-sm font-medium text-green-800"
                    >
                      <span>{mood.icon}</span>
                      <span>{mood.label}</span>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Based on {suggestedMoods[0]?.reason || 'nearby places'}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default LocationDetection;