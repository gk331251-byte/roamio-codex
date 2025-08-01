// components/ErrorBoundary/ErrorBoundary.jsx
import React from 'react';
import { ErrorLogger } from '../../lib/errorLogger';
import Button from '../design-system/Button';
import Card from '../design-system/Card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error with comprehensive context
    const errorId = ErrorLogger.logError(error, {
      errorInfo,
      component: this.props.name || 'Unknown',
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      userId: this.props.userId,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name
    });

    this.setState({
      error,
      errorInfo,
      errorId,
      hasError: true
    });

    // Send error to monitoring service if configured
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/home';
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI based on error boundary level
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry, this.state.errorId);
      }

      // Default fallback UI based on boundary level
      switch (this.props.level) {
        case 'route':
          return <RouteLevelErrorFallback 
            error={this.state.error}
            errorId={this.state.errorId}
            onRetry={this.handleRetry}
            onGoHome={this.handleGoHome}
            retryCount={this.state.retryCount}
          />;
        
        case 'component':
          return <ComponentLevelErrorFallback 
            error={this.state.error}
            errorId={this.state.errorId}
            onRetry={this.handleRetry}
            componentName={this.props.name}
            retryCount={this.state.retryCount}
          />;
        
        case 'app':
        default:
          return <AppLevelErrorFallback 
            error={this.state.error}
            errorId={this.state.errorId}
            onReload={this.handleReload}
            retryCount={this.state.retryCount}
          />;
      }
    }

    return this.props.children;
  }
}

// App-level error fallback (critical errors)
const AppLevelErrorFallback = ({ error, errorId, onReload, retryCount }) => (
  <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
    <Card className="max-w-md w-full text-center p-8">
      <div className="mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-600 mb-4">
          We encountered an unexpected error. Our team has been notified and is working on a fix.
        </p>
        {retryCount > 2 && (
          <p className="text-sm text-amber-600 mb-4">
            Multiple retry attempts detected. Please try reloading the page.
          </p>
        )}
      </div>
      
      <div className="space-y-3">
        <Button 
          onClick={onReload}
          className="w-full"
          variant="primary"
        >
          Reload Page
        </Button>
        
        <div className="text-xs text-gray-500">
          Error ID: {errorId}
        </div>
      </div>
    </Card>
  </div>
);

// Route-level error fallback (page errors)
const RouteLevelErrorFallback = ({ error, errorId, onRetry, onGoHome, retryCount }) => (
  <div className="min-h-96 flex items-center justify-center p-4">
    <Card className="max-w-lg w-full text-center p-6">
      <div className="mb-6">
        <div className="w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Page Error
        </h2>
        <p className="text-gray-600 mb-4">
          This page encountered an error. You can try again or return to the main quest interface.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={onRetry}
          variant="primary"
          className="flex-1"
          disabled={retryCount > 3}
        >
          {retryCount > 3 ? 'Too many retries' : 'Try Again'}
        </Button>
        <Button 
          onClick={onGoHome}
          variant="secondary"
          className="flex-1"
        >
          Go to Quest Home
        </Button>
      </div>
      
      <div className="text-xs text-gray-500 mt-4">
        Error ID: {errorId}
      </div>
    </Card>
  </div>
);

// Component-level error fallback (individual component errors)
const ComponentLevelErrorFallback = ({ error, errorId, onRetry, componentName, retryCount }) => (
  <Card className="p-4 border-l-4 border-l-yellow-400 bg-yellow-50">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-yellow-800">
          Component Error
        </h3>
        <p className="text-sm text-yellow-700 mt-1">
          The {componentName || 'component'} couldn't load properly.
        </p>
        <div className="mt-3">
          <Button 
            onClick={onRetry}
            size="sm"
            variant="secondary"
            className="text-yellow-800 hover:bg-yellow-100"
            disabled={retryCount > 2}
          >
            {retryCount > 2 ? 'Component unavailable' : 'Retry'}
          </Button>
        </div>
        <div className="text-xs text-yellow-600 mt-2">
          Error ID: {errorId}
        </div>
      </div>
    </div>
  </Card>
);

export default ErrorBoundary;