// Enhanced API wrapper with comprehensive error tracking for React Error #185 debugging
import { trackAsyncOp } from './reactError185Detector';

class APIWrapper {
  constructor() {
    this.pendingRequests = new Map();
    this.requestId = 0;
  }
  
  // Wrap any async function with comprehensive error tracking
  wrapAsyncFunction(originalFunction, functionName, componentName = 'Unknown') {
    return async (...args) => {
      const requestId = ++this.requestId;
      const startTime = Date.now();
      
      console.log(`🔄 Starting ${functionName} (ID: ${requestId})`, {
        args: args.map(arg => typeof arg === 'object' ? '[Object]' : arg),
        component: componentName,
        timestamp: startTime
      });
      
      // Create a promise wrapper for tracking
      const wrappedPromise = new Promise(async (resolve, reject) => {
        try {
          // Store request info
          this.pendingRequests.set(requestId, {
            functionName,
            componentName,
            startTime,
            args: args.slice(0, 3), // Don't store sensitive data
            status: 'pending'
          });
          
          // Execute the original function
          const result = await originalFunction.apply(this, args);
          
          // Update request status
          const requestInfo = this.pendingRequests.get(requestId);
          if (requestInfo) {
            requestInfo.status = 'completed';
            requestInfo.endTime = Date.now();
            requestInfo.duration = requestInfo.endTime - requestInfo.startTime;
          }
          
          console.log(`✅ Completed ${functionName} (ID: ${requestId})`, {
            duration: Date.now() - startTime,
            hasResult: !!result
          });
          
          resolve(result);
        } catch (error) {
          // Update request status
          const requestInfo = this.pendingRequests.get(requestId);
          if (requestInfo) {
            requestInfo.status = 'failed';
            requestInfo.endTime = Date.now();
            requestInfo.duration = requestInfo.endTime - requestInfo.startTime;
            requestInfo.error = error.message;
          }
          
          console.error(`❌ Failed ${functionName} (ID: ${requestId})`, {
            duration: Date.now() - startTime,
            error: error.message,
            stack: error.stack
          });
          
          // Enhanced error analysis
          this.analyzeError(error, functionName, componentName);
          
          reject(error);
        } finally {
          // Cleanup after a delay
          setTimeout(() => {
            this.pendingRequests.delete(requestId);
          }, 30000); // Keep for 30 seconds for debugging
        }
      });
      
      // Track with Error #185 detector
      if (process.env.NODE_ENV === 'development') {
        trackAsyncOp(functionName, componentName, wrappedPromise);
      }
      
      return wrappedPromise;
    };
  }
  
  analyzeError(error, functionName, componentName) {
    console.group(`🔍 Error Analysis: ${functionName}`);
    
    // Check for common React Error #185 triggers
    const errorMessage = error.message || error.toString();
    const problematicPatterns = [
      'Cannot update a component that is not mounted',
      'Warning: Can\'t perform a React state update',
      'setState',
      'forceUpdate',
      'Maximum update depth exceeded',
      'Too many re-renders'
    ];
    
    const matchedPatterns = problematicPatterns.filter(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (matchedPatterns.length > 0) {
      console.error('🚨 ERROR COULD TRIGGER REACT ERROR #185!');
      console.error('Matched patterns:', matchedPatterns);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        functionName,
        componentName,
        timestamp: Date.now()
      });
      
      // Additional analysis
      console.error('Recommendations:');
      console.error('- Check if component is still mounted before state updates');
      console.error('- Ensure all async operations are properly cancelled on unmount');
      console.error('- Verify useEffect dependencies and cleanup functions');
      console.error('- Check for circular state update patterns');
    }
    
    // Network-specific analysis
    if (error.name === 'TypeError' && errorMessage.includes('fetch')) {
      console.warn('Network error detected:', {
        message: error.message,
        recommendations: [
          'Check network connectivity',
          'Verify API endpoint availability',
          'Implement proper retry logic',
          'Add connection timeout handling'
        ]
      });
    }
    
    // Authentication-specific analysis
    if (errorMessage.includes('auth') || errorMessage.includes('token')) {
      console.warn('Authentication error detected:', {
        message: error.message,
        recommendations: [
          'Check Firebase auth state',
          'Verify token validity',
          'Implement token refresh logic',
          'Handle auth state changes properly'
        ]
      });
    }
    
    console.groupEnd();
  }
  
  // Get stats about pending/completed requests
  getRequestStats() {
    const stats = {
      pending: 0,
      completed: 0,
      failed: 0,
      total: this.pendingRequests.size
    };
    
    for (const request of this.pendingRequests.values()) {
      stats[request.status]++;
    }
    
    return stats;
  }
  
  // Get details about recent requests
  getRecentRequests(limit = 10) {
    const requests = Array.from(this.pendingRequests.entries())
      .map(([id, info]) => ({ id, ...info }))
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
      
    return requests;
  }
  
  // Clear completed requests older than specified time
  cleanupOldRequests(maxAge = 60000) { // 1 minute default
    const now = Date.now();
    for (const [id, request] of this.pendingRequests) {
      if (request.status !== 'pending' && (now - request.startTime) > maxAge) {
        this.pendingRequests.delete(id);
      }
    }
  }
}

// Create singleton instance
const apiWrapper = new APIWrapper();

// Enhanced wrapper function for existing API calls
export const wrapAPICall = (apiFunction, functionName, componentName) => {
  return apiWrapper.wrapAsyncFunction(apiFunction, functionName, componentName);
};

// Export utilities
export const getAPIStats = () => apiWrapper.getRequestStats();
export const getRecentAPIRequests = (limit) => apiWrapper.getRecentRequests(limit);
export const cleanupAPIHistory = (maxAge) => apiWrapper.cleanupOldRequests(maxAge);

export default apiWrapper;