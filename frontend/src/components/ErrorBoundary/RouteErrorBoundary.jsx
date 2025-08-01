// components/ErrorBoundary/RouteErrorBoundary.jsx
import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { useError } from '../../contexts/ErrorContext';

const RouteErrorBoundary = ({ children, routeName }) => {
  const { addError } = useError();

  const handleError = async (error, errorInfo, errorId) => {
    // Add to global error state for tracking
    await addError(error, {
      type: 'COMPONENT_ERROR',
      severity: 'HIGH',
      component: `Route: ${routeName}`,
      route: window.location.pathname,
      errorBoundary: 'RouteErrorBoundary',
      errorId
    });
  };

  return (
    <ErrorBoundary
      name={`RouteErrorBoundary-${routeName}`}
      level="route"
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default RouteErrorBoundary;