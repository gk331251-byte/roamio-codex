// components/ErrorToast/ErrorToast.jsx
import React, { useState, useEffect } from 'react';
import { useError } from '../../contexts/ErrorContext';
import Button from '../design-system/Button';

const ErrorToast = () => {
  const { 
    getActiveErrors, 
    resolveError, 
    removeError, 
    retryError,
    ERROR_TYPES,
    ERROR_SEVERITY 
  } = useError();
  
  const [visibleErrors, setVisibleErrors] = useState([]);
  const activeErrors = getActiveErrors();

  useEffect(() => {
    // Show only the most recent 3 errors
    const recentErrors = activeErrors
      .filter(error => error.dismissible)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
    
    setVisibleErrors(recentErrors);
  }, [activeErrors]);

  const getErrorIcon = (type, severity) => {
    if (severity === ERROR_SEVERITY.CRITICAL) {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }

    switch (type) {
      case ERROR_TYPES.API_ERROR:
        return (
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case ERROR_TYPES.NETWORK_ERROR:
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2v6m0 8v6M2 12h6m8 0h6" />
          </svg>
        );
      case ERROR_TYPES.VALIDATION_ERROR:
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getErrorStyles = (severity) => {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        return 'bg-red-50 border-red-200 text-red-800';
      case ERROR_SEVERITY.HIGH:
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case ERROR_SEVERITY.MEDIUM:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case ERROR_SEVERITY.LOW:
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getErrorTitle = (type) => {
    switch (type) {
      case ERROR_TYPES.API_ERROR:
        return 'Server Error';
      case ERROR_TYPES.NETWORK_ERROR:
        return 'Connection Error';
      case ERROR_TYPES.VALIDATION_ERROR:
        return 'Validation Error';
      case ERROR_TYPES.AUTHENTICATION_ERROR:
        return 'Authentication Error';
      case ERROR_TYPES.PERMISSION_ERROR:
        return 'Permission Error';
      case ERROR_TYPES.COMPONENT_ERROR:
        return 'Component Error';
      default:
        return 'Error';
    }
  };

  const handleDismiss = (errorId) => {
    resolveError(errorId);
    setTimeout(() => removeError(errorId), 300); // Allow fade out animation
  };

  const handleRetry = async (error) => {
    if (error.context?.retryAction) {
      await retryError(error.id, error.context.retryAction);
    } else {
      // Default retry action - reload the page
      window.location.reload();
    }
  };

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {visibleErrors.map((error) => (
        <div
          key={error.id}
          className={`p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-full ${getErrorStyles(error.severity)}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getErrorIcon(error.type, error.severity)}
            </div>
            
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium">
                {getErrorTitle(error.type)}
              </h3>
              <p className="text-sm opacity-90 mt-1">
                {error.message}
              </p>
              
              {error.context?.component && (
                <p className="text-xs opacity-75 mt-1">
                  in {error.context.component}
                </p>
              )}
              
              <div className="flex items-center gap-2 mt-3">
                {error.context?.retryAction && (
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => handleRetry(error)}
                    className="text-xs"
                  >
                    Retry
                  </Button>
                )}
                
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => handleDismiss(error.id)}
                  className="text-xs opacity-75 hover:opacity-100"
                >
                  Dismiss
                </Button>
              </div>
            </div>
            
            <button
              onClick={() => handleDismiss(error.id)}
              className="flex-shrink-0 ml-2 opacity-50 hover:opacity-75"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ErrorToast;