// components/ErrorBoundary/ErrorBoundaryTest.jsx
import React, { useState } from 'react';
import { ComponentErrorBoundary } from './index';
import { useError } from '../../contexts/ErrorContext';
import Button from '../design-system/Button';
import Card from '../design-system/Card';

// Component that intentionally throws errors for testing
const ProblematicComponent = ({ shouldError, errorType }) => {
  if (shouldError) {
    switch (errorType) {
      case 'render':
        throw new Error('Intentional render error for testing');
      case 'null':
        const nullObject = null;
        return <div>{nullObject.someProperty}</div>;
      case 'undefined':
        const undefinedVar = undefined;
        return <div>{undefinedVar.method()}</div>;
      case 'async':
        setTimeout(() => {
          throw new Error('Async error for testing');
        }, 100);
        break;
      default:
        throw new Error('Generic test error');
    }
  }
  
  return (
    <Card className="p-4 bg-green-50 border-green-200">
      <h3 className="text-green-800 font-medium">✅ Component Working</h3>
      <p className="text-green-700 text-sm mt-1">
        This component is functioning normally. Use the buttons below to trigger different types of errors.
      </p>
    </Card>
  );
};

const ErrorBoundaryTest = () => {
  const [shouldError, setShouldError] = useState(false);
  const [errorType, setErrorType] = useState('render');
  const { 
    addError, 
    getActiveErrors, 
    clearErrors,
    handleApiError,
    handleValidationError,
    handleNetworkError
  } = useError();

  const triggerError = (type) => {
    setShouldError(true);
    setErrorType(type);
    // Reset after a short delay to allow testing multiple errors
    setTimeout(() => setShouldError(false), 2000);
  };

  const triggerContextError = async (type) => {
    switch (type) {
      case 'api':
        const apiError = new Error('API request failed');
        apiError.status = 500;
        await handleApiError(apiError, { url: '/api/test', method: 'GET' });
        break;
      
      case 'network':
        const networkError = new Error('Network connection failed');
        await handleNetworkError(networkError);
        break;
      
      case 'validation':
        const validationError = new Error('Email format is invalid');
        await handleValidationError(validationError, 'email');
        break;
      
      case 'generic':
        await addError(new Error('Generic error for testing'), {
          type: 'GENERIC_ERROR',
          severity: 'MEDIUM',
          component: 'ErrorBoundaryTest'
        });
        break;
    }
  };

  const activeErrors = getActiveErrors();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Error Boundary Test Suite
        </h1>
        <p className="text-gray-600">
          Test the error handling system by triggering different types of errors
        </p>
      </div>

      {/* Error Boundary Tests */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Error Boundary Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button 
            onClick={() => triggerError('render')}
            variant="destructive"
            size="sm"
          >
            Trigger Render Error
          </Button>
          <Button 
            onClick={() => triggerError('null')}
            variant="destructive"
            size="sm"
          >
            Trigger Null Reference
          </Button>
          <Button 
            onClick={() => triggerError('undefined')}
            variant="destructive"
            size="sm"
          >
            Trigger Undefined Method
          </Button>
          <Button 
            onClick={() => triggerError('async')}
            variant="destructive"
            size="sm"
          >
            Trigger Async Error
          </Button>
        </div>

        <ComponentErrorBoundary componentName="TestComponent">
          <ProblematicComponent 
            shouldError={shouldError} 
            errorType={errorType}
          />
        </ComponentErrorBoundary>
      </Card>

      {/* Context Error Tests */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Error Context Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Button 
            onClick={() => triggerContextError('api')}
            variant="secondary"
            size="sm"
          >
            Trigger API Error
          </Button>
          <Button 
            onClick={() => triggerContextError('network')}
            variant="secondary"
            size="sm"
          >
            Trigger Network Error
          </Button>
          <Button 
            onClick={() => triggerContextError('validation')}
            variant="secondary"
            size="sm"
          >
            Trigger Validation Error
          </Button>
          <Button 
            onClick={() => triggerContextError('generic')}
            variant="secondary"
            size="sm"
          >
            Trigger Generic Error
          </Button>
        </div>

        {activeErrors.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Active Errors ({activeErrors.length})</h3>
              <Button 
                onClick={clearErrors}
                variant="ghost"
                size="sm"
              >
                Clear All
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {activeErrors.map((error) => (
                <div 
                  key={error.id}
                  className="p-2 bg-red-50 border border-red-200 rounded text-sm"
                >
                  <div className="font-medium text-red-800">
                    {error.type} - {error.severity}
                  </div>
                  <div className="text-red-700">{error.message}</div>
                  <div className="text-red-600 text-xs mt-1">
                    ID: {error.id} | Component: {error.context?.component || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">Testing Instructions</h2>
        <div className="space-y-2 text-blue-800">
          <p><strong>Error Boundary Tests:</strong> These will trigger component-level errors that should be caught by error boundaries and display fallback UI.</p>
          <p><strong>Error Context Tests:</strong> These will add errors to the global error state and should appear as toast notifications.</p>
          <p><strong>Expected Behavior:</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Error boundaries should prevent app crashes and show recovery options</li>
            <li>Toast notifications should appear for context errors</li>
            <li>All errors should be logged to the console and local storage</li>
            <li>Error IDs should be generated for tracking</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default ErrorBoundaryTest;