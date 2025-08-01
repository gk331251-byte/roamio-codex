// lib/errorLogger.js
import { getAuth } from 'firebase/auth';

class ErrorLogger {
  constructor() {
    this.errorQueue = [];
    this.isOnline = navigator.onLine;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Listen for global JavaScript errors
    window.addEventListener('error', this.handleGlobalError.bind(this));
  }

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getCurrentUser() {
    try {
      const auth = getAuth();
      return auth.currentUser;
    } catch (error) {
      return null;
    }
  }

  async logError(error, context = {}) {
    const errorId = this.generateErrorId();
    const currentUser = await this.getCurrentUser();
    
    const errorData = {
      id: errorId,
      message: error.message || 'Unknown error',
      stack: error.stack || '',
      name: error.name || 'Error',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: currentUser?.uid || 'anonymous',
      sessionId: this.getSessionId(),
      buildVersion: this.getBuildVersion(),
      context: {
        ...context,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height
        },
        memory: this.getMemoryInfo(),
        connection: this.getConnectionInfo()
      }
    };

    // Store error locally
    this.storeErrorLocally(errorData);

    // Try to send error immediately if online
    if (this.isOnline) {
      await this.sendError(errorData);
    } else {
      // Queue for later sending
      this.errorQueue.push(errorData);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔴 Error Logged: ${errorId}`);
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Full Error Data:', errorData);
      console.groupEnd();
    }

    return errorId;
  }

  async sendError(errorData, retryCount = 0) {
    try {
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.warn(`Failed to send error report (attempt ${retryCount + 1}):`, error);
      
      // Retry logic
      if (retryCount < this.maxRetries) {
        setTimeout(() => {
          this.sendError(errorData, retryCount + 1);
        }, this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      } else {
        // Store in queue for later retry
        this.errorQueue.push(errorData);
      }
      
      return false;
    }
  }

  storeErrorLocally(errorData) {
    try {
      const stored = JSON.parse(localStorage.getItem('roamio_errors') || '[]');
      stored.push(errorData);
      
      // Keep only last 50 errors
      const recentErrors = stored.slice(-50);
      localStorage.setItem('roamio_errors', JSON.stringify(recentErrors));
    } catch (error) {
      console.warn('Failed to store error locally:', error);
    }
  }

  getStoredErrors() {
    try {
      return JSON.parse(localStorage.getItem('roamio_errors') || '[]');
    } catch (error) {
      return [];
    }
  }

  clearStoredErrors() {
    try {
      localStorage.removeItem('roamio_errors');
    } catch (error) {
      console.warn('Failed to clear stored errors:', error);
    }
  }

  handleOnline() {
    this.isOnline = true;
    this.flushErrorQueue();
  }

  handleOffline() {
    this.isOnline = false;
  }

  async flushErrorQueue() {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    for (const errorData of errors) {
      const success = await this.sendError(errorData);
      if (!success) {
        // If sending fails, put it back in queue
        this.errorQueue.push(errorData);
      }
    }
  }

  handleUnhandledRejection(event) {
    const error = event.reason || new Error('Unhandled Promise Rejection');
    this.logError(error, {
      type: 'unhandledRejection',
      promise: event.promise?.toString() || 'Unknown promise'
    });
  }

  handleGlobalError(event) {
    const error = event.error || new Error(event.message || 'Global JavaScript Error');
    this.logError(error, {
      type: 'globalError',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('roamio_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('roamio_session_id', sessionId);
    }
    return sessionId;
  }

  getBuildVersion() {
    // This would typically come from your build process
    return process.env.REACT_APP_VERSION || 'development';
  }

  getMemoryInfo() {
    if ('memory' in performance) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  getConnectionInfo() {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      return {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      };
    }
    return null;
  }

  // React component error logging
  logReactError(error, errorInfo, componentName) {
    return this.logError(error, {
      type: 'reactError',
      component: componentName,
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
  }

  // API error logging
  logApiError(error, request) {
    return this.logError(error, {
      type: 'apiError',
      url: request.url,
      method: request.method,
      status: error.status,
      statusText: error.statusText
    });
  }

  // User action error logging
  logUserActionError(error, action, data = {}) {
    return this.logError(error, {
      type: 'userActionError',
      action,
      data
    });
  }

  // Performance issue logging
  logPerformanceIssue(metric, value, threshold) {
    const error = new Error(`Performance threshold exceeded: ${metric}`);
    return this.logError(error, {
      type: 'performanceIssue',
      metric,
      value,
      threshold,
      timing: performance.getEntriesByType('navigation')[0]
    });
  }

  // Get error statistics
  getErrorStats() {
    const errors = this.getStoredErrors();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;

    const stats = {
      total: errors.length,
      lastHour: 0,
      lastDay: 0,
      byType: {},
      byComponent: {},
      mostRecent: null
    };

    errors.forEach(error => {
      const errorTime = new Date(error.timestamp).getTime();
      const age = now - errorTime;

      if (age <= oneHour) stats.lastHour++;
      if (age <= oneDay) stats.lastDay++;

      const type = error.context?.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      const component = error.context?.component || 'unknown';
      stats.byComponent[component] = (stats.byComponent[component] || 0) + 1;

      if (!stats.mostRecent || errorTime > new Date(stats.mostRecent.timestamp).getTime()) {
        stats.mostRecent = error;
      }
    });

    return stats;
  }
}

// Create singleton instance
const errorLoggerInstance = new ErrorLogger();

// Export convenience functions
export const logError = (error, context) => errorLoggerInstance.logError(error, context);
export const logReactError = (error, errorInfo, componentName) => 
  errorLoggerInstance.logReactError(error, errorInfo, componentName);
export const logApiError = (error, request) => errorLoggerInstance.logApiError(error, request);
export const logUserActionError = (error, action, data) => 
  errorLoggerInstance.logUserActionError(error, action, data);
export const logPerformanceIssue = (metric, value, threshold) => 
  errorLoggerInstance.logPerformanceIssue(metric, value, threshold);

// Export the instance for direct use
export { errorLoggerInstance as ErrorLogger };

export default errorLoggerInstance;