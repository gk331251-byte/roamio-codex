// Error Boundary for Form Validation Components
import React from 'react';

class ValidationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    console.error('ValidationErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log to external service if available
    if (typeof window !== 'undefined' && window.logError) {
      window.logError('validation_error_boundary', error, {
        errorInfo,
        component: this.props.componentName || 'unknown'
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      const { fallback: Fallback, componentName } = this.props;
      
      if (Fallback) {
        return <Fallback error={this.state.error} />;
      }
      
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 14.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Validation Component Error
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {componentName ? `${componentName} validation` : 'Form validation'} encountered an error. 
                The form will continue to work, but some validation features may be unavailable.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 cursor-pointer">Technical Details</summary>
                  <pre className="text-xs text-red-600 mt-1 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component to wrap validation components
export const withValidationErrorBoundary = (Component, componentName) => {
  const WrappedComponent = (props) => (
    <ValidationErrorBoundary componentName={componentName}>
      <Component {...props} />
    </ValidationErrorBoundary>
  );
  
  WrappedComponent.displayName = `withValidationErrorBoundary(${componentName || Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ValidationErrorBoundary;