import React from 'react';
import { logError } from '../../lib/errorLogger';

class QuestGenerationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error('Quest Generation Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to error tracking system
    logError(error, {
      type: 'questGenerationReactError',
      component: 'QuestGenerationErrorBoundary',
      errorInfo: errorInfo,
      retryCount: this.state.retryCount,
      // Check for infinite loop errors specifically
      isInfiniteLoop: error.message && error.message.includes('Maximum update depth exceeded'),
      errorCode: error.name === 'Invariant Violation' ? 'react-error-185' : 'unknown'
    });
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isInfiniteLoop = this.state.error?.message?.includes('Maximum update depth exceeded');
      const maxRetries = 2;
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-stone-50 to-sage-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-red-200 p-8 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>

            {/* Error Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {isInfiniteLoop ? 'Quest Generation Stuck' : 'Something Went Wrong'}
            </h2>

            {/* Error Description */}
            <p className="text-gray-600 mb-6 leading-relaxed">
              {isInfiniteLoop 
                ? 'The quest generation got stuck in a loop. This usually happens when location or mood data conflicts. Try refreshing the page.'
                : 'There was an unexpected error while generating your quest. We\'ve logged the issue and will fix it soon.'
              }
            </p>

            {/* Technical Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-gray-50 rounded-xl text-left">
                <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                  Technical Details
                </summary>
                <div className="text-sm text-gray-600 space-y-2">
                  <div>
                    <strong>Error:</strong> {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {this.state.retryCount < maxRetries ? (
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  Try Again ({maxRetries - this.state.retryCount} attempts left)
                </button>
              ) : (
                <button
                  onClick={this.handleReload}
                  className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  Refresh Page
                </button>
              )}
              
              <a
                href="/home"
                className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Start Over
              </a>
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 mt-4">
              Error ID: quest-gen-{Date.now()}
              {isInfiniteLoop && ' (React Error #185)'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default QuestGenerationErrorBoundary;