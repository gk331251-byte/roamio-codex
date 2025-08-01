// contexts/ErrorContext.jsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { ErrorLogger } from '../lib/errorLogger';

const ErrorContext = createContext();

// Error states
const ERROR_TYPES = {
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  COMPONENT_ERROR: 'COMPONENT_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  GENERIC_ERROR: 'GENERIC_ERROR'
};

const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

// Initial state
const initialState = {
  errors: [],
  isLoading: false,
  hasNetworkError: false,
  lastErrorTime: null,
  errorStats: {
    total: 0,
    resolved: 0,
    pending: 0
  }
};

// Reducer
function errorReducer(state, action) {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [
          ...state.errors.slice(-19), // Keep only last 20 errors
          action.payload
        ],
        lastErrorTime: Date.now(),
        errorStats: {
          ...state.errorStats,
          total: state.errorStats.total + 1,
          pending: state.errorStats.pending + 1
        }
      };

    case 'RESOLVE_ERROR':
      return {
        ...state,
        errors: state.errors.map(error => 
          error.id === action.payload.id 
            ? { ...error, resolved: true, resolvedAt: Date.now() }
            : error
        ),
        errorStats: {
          ...state.errorStats,
          resolved: state.errorStats.resolved + 1,
          pending: Math.max(0, state.errorStats.pending - 1)
        }
      };

    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload.id)
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: []
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_NETWORK_ERROR':
      return {
        ...state,
        hasNetworkError: action.payload
      };

    case 'UPDATE_ERROR_STATS':
      return {
        ...state,
        errorStats: action.payload
      };

    default:
      return state;
  }
}

// Provider component
export function ErrorProvider({ children }) {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  // Add error with automatic logging
  const addError = useCallback(async (error, context = {}) => {
    const errorId = await ErrorLogger.logError(error, context);
    
    const errorEntry = {
      id: errorId,
      message: error.message || 'An unexpected error occurred',
      type: context.type || ERROR_TYPES.GENERIC_ERROR,
      severity: context.severity || ERROR_SEVERITY.MEDIUM,
      timestamp: Date.now(),
      context,
      resolved: false,
      retryCount: 0,
      dismissible: context.dismissible !== false, // Default to true
      autoResolve: context.autoResolve || false,
      component: context.component,
      action: context.action
    };

    dispatch({ type: 'ADD_ERROR', payload: errorEntry });

    // Auto-resolve after specified time
    if (errorEntry.autoResolve && typeof errorEntry.autoResolve === 'number') {
      setTimeout(() => {
        resolveError(errorId);
      }, errorEntry.autoResolve);
    }

    return errorId;
  }, []);

  // Resolve error
  const resolveError = useCallback((errorId) => {
    dispatch({ type: 'RESOLVE_ERROR', payload: { id: errorId } });
  }, []);

  // Remove error
  const removeError = useCallback((errorId) => {
    dispatch({ type: 'REMOVE_ERROR', payload: { id: errorId } });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  // Retry error action
  const retryError = useCallback(async (errorId, retryAction) => {
    const error = state.errors.find(e => e.id === errorId);
    if (!error) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await retryAction();
      resolveError(errorId);
    } catch (retryError) {
      // Update error with retry information
      const updatedError = {
        ...error,
        retryCount: error.retryCount + 1,
        lastRetryAt: Date.now()
      };
      
      // Log retry failure
      await ErrorLogger.logError(retryError, {
        type: 'retryError',
        originalErrorId: errorId,
        retryCount: updatedError.retryCount
      });
      
      dispatch({ type: 'ADD_ERROR', payload: updatedError });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.errors, resolveError]);

  // Specialized error handlers
  const handleApiError = useCallback(async (error, request = {}) => {
    const context = {
      type: ERROR_TYPES.API_ERROR,
      severity: error.status >= 500 ? ERROR_SEVERITY.HIGH : ERROR_SEVERITY.MEDIUM,
      url: request.url,
      method: request.method,
      status: error.status,
      dismissible: true,
      autoResolve: error.status < 500 ? 10000 : false // Auto-resolve client errors after 10s
    };

    return addError(error, context);
  }, [addError]);

  const handleNetworkError = useCallback(async (error) => {
    dispatch({ type: 'SET_NETWORK_ERROR', payload: true });
    
    const context = {
      type: ERROR_TYPES.NETWORK_ERROR,
      severity: ERROR_SEVERITY.HIGH,
      dismissible: false,
      autoResolve: false
    };

    return addError(error, context);
  }, [addError]);

  const handleValidationError = useCallback(async (error, field = null) => {
    const context = {
      type: ERROR_TYPES.VALIDATION_ERROR,
      severity: ERROR_SEVERITY.LOW,
      field,
      dismissible: true,
      autoResolve: 8000 // Auto-resolve after 8 seconds
    };

    return addError(error, context);
  }, [addError]);

  const handleAuthError = useCallback(async (error) => {
    const context = {
      type: ERROR_TYPES.AUTHENTICATION_ERROR,
      severity: ERROR_SEVERITY.HIGH,
      dismissible: false,
      autoResolve: false
    };

    return addError(error, context);
  }, [addError]);

  // Network status monitoring
  React.useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_NETWORK_ERROR', payload: false });
    };

    const handleOffline = () => {
      const error = new Error('No internet connection');
      handleNetworkError(error);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleNetworkError]);

  // Update error stats periodically
  React.useEffect(() => {
    const updateStats = () => {
      const stats = ErrorLogger.getErrorStats();
      dispatch({ type: 'UPDATE_ERROR_STATS', payload: stats });
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const value = {
    // State
    ...state,
    
    // Actions
    addError,
    resolveError,
    removeError,
    clearErrors,
    retryError,
    
    // Specialized handlers
    handleApiError,
    handleNetworkError,
    handleValidationError,
    handleAuthError,
    
    // Utilities
    getActiveErrors: () => state.errors.filter(error => !error.resolved),
    getErrorsByType: (type) => state.errors.filter(error => error.type === type),
    getErrorsBySeverity: (severity) => state.errors.filter(error => error.severity === severity),
    hasActiveErrors: () => state.errors.some(error => !error.resolved),
    hasErrorsOfType: (type) => state.errors.some(error => error.type === type && !error.resolved),
    
    // Constants
    ERROR_TYPES,
    ERROR_SEVERITY
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

// Custom hook
export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

export default ErrorContext;