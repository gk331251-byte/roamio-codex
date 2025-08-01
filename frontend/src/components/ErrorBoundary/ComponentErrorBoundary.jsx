// components/ErrorBoundary/ComponentErrorBoundary.jsx
import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { useError } from '../../contexts/ErrorContext';

const ComponentErrorBoundary = ({ children, componentName, fallback = null }) => {
  const { addError } = useError();

  const handleError = async (error, errorInfo, errorId) => {
    // Add to global error state for tracking
    await addError(error, {
      type: 'COMPONENT_ERROR',
      severity: 'MEDIUM',
      component: componentName,
      route: window.location.pathname,
      errorBoundary: 'ComponentErrorBoundary',
      errorId,
      dismissible: true,
      autoResolve: 30000 // Auto-resolve after 30 seconds
    });
  };

  return (
    <ErrorBoundary
      name={`ComponentErrorBoundary-${componentName}`}
      level="component"
      onError={handleError}
      fallback={fallback}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ComponentErrorBoundary;