// React Error #185 Deep Debugging Utility
// Specialized detector for "Maximum update depth exceeded" errors

class ReactError185Detector {
  constructor() {
    this.renderCounts = new Map();
    this.stateUpdateCounts = new Map();
    this.errorOccurrences = [];
    this.componentMountStates = new Map();
    this.asyncOperations = new Map();
    this.promiseRejections = [];
    this.isMonitoring = false;
    
    if (process.env.NODE_ENV === 'development') {
      this.initializeDetector();
    }
  }
  
  initializeDetector() {
    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const rejectionInfo = {
        timestamp: Date.now(),
        reason: event.reason,
        promise: event.promise,
        stack: event.reason?.stack || 'No stack trace',
        component: this.getCurrentComponent()
      };
      
      this.promiseRejections.push(rejectionInfo);
      console.error('🚨 Unhandled Promise Rejection detected:', rejectionInfo);
      
      // Check if this could lead to React Error #185
      if (this.couldCauseReactError185(event.reason)) {
        console.error('⚠️ This promise rejection could cause React Error #185!');
        this.reportPotentialError185('unhandledRejection', rejectionInfo);
      }
    });
    
    // Intercept React errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      
      // Detect React Error #185 specifically
      if (errorMessage.includes('Maximum update depth exceeded') || 
          errorMessage.includes('Too many re-renders')) {
        this.handleReactError185(errorMessage, args);
      }
      
      originalConsoleError.apply(console, args);
    };
    
    // Track component lifecycle
    this.interceptReactLifecycle();
    
    this.isMonitoring = true;
    console.log('🔍 React Error #185 Detector initialized');
  }
  
  interceptReactLifecycle() {
    // Hook into React DevTools if available
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      hook.onCommitFiberRoot = (id, root, priorityLevel) => {
        this.trackRender('React.Root', root);
      };
      
      hook.onCommitFiberUnmount = (id, fiber) => {
        this.trackUnmount(fiber.type?.name || 'Unknown');
      };
    }
  }
  
  trackComponent(componentName) {
    if (!this.componentMountStates.has(componentName)) {
      this.componentMountStates.set(componentName, {
        mounted: true,
        mountTime: Date.now(),
        renderCount: 0,
        stateUpdates: []
      });
    }
    
    const state = this.componentMountStates.get(componentName);
    state.renderCount++;
    
    // Check for excessive renders
    if (state.renderCount > 50) {
      console.warn(`🚨 Component ${componentName} has rendered ${state.renderCount} times!`);
      this.reportPotentialError185('excessiveRenders', {
        component: componentName,
        renderCount: state.renderCount,
        mountTime: state.mountTime
      });
    }
  }
  
  trackRender(componentName, additionalData = {}) {
    const now = Date.now();
    const renderKey = `${componentName}_${now}`;
    
    if (!this.renderCounts.has(componentName)) {
      this.renderCounts.set(componentName, []);
    }
    
    const renders = this.renderCounts.get(componentName);
    renders.push(now);
    
    // Keep only last 100 renders
    if (renders.length > 100) {
      renders.shift();
    }
    
    // Check for rapid renders (potential infinite loop)
    const recentRenders = renders.filter(time => now - time < 1000);
    if (recentRenders.length > 10) {
      console.error(`🚨 Potential infinite render loop detected in ${componentName}!`);
      console.error(`${recentRenders.length} renders in the last second`);
      this.reportPotentialError185('infiniteRenderLoop', {
        component: componentName,
        recentRenders: recentRenders.length,
        additionalData
      });
    }
  }
  
  trackStateUpdate(componentName, stateName, oldValue, newValue) {
    const updateKey = `${componentName}.${stateName}`;
    
    if (!this.stateUpdateCounts.has(updateKey)) {
      this.stateUpdateCounts.set(updateKey, []);
    }
    
    const updates = this.stateUpdateCounts.get(updateKey);
    const now = Date.now();
    
    updates.push({
      timestamp: now,
      oldValue,
      newValue,
      stack: new Error().stack
    });
    
    // Keep only last 50 updates
    if (updates.length > 50) {
      updates.shift();
    }
    
    // Check for rapid state updates
    const recentUpdates = updates.filter(update => now - update.timestamp < 1000);
    if (recentUpdates.length > 5) {
      console.error(`🚨 Rapid state updates detected in ${updateKey}!`);
      console.error(`${recentUpdates.length} updates in the last second`);
      this.reportPotentialError185('rapidStateUpdates', {
        component: componentName,
        stateName,
        recentUpdates: recentUpdates.length,
        updates: recentUpdates.slice(-3)
      });
    }
    
    // Check for value oscillation (A->B->A->B pattern)
    if (updates.length >= 4) {
      const last4 = updates.slice(-4);
      const isOscillating = last4[0].newValue === last4[2].newValue && 
                           last4[1].newValue === last4[3].newValue &&
                           last4[0].newValue !== last4[1].newValue;
      
      if (isOscillating) {
        console.error(`🚨 State oscillation detected in ${updateKey}!`);
        this.reportPotentialError185('stateOscillation', {
          component: componentName,
          stateName,
          oscillatingValues: [last4[0].newValue, last4[1].newValue]
        });
      }
    }
  }
  
  trackAsyncOperation(operationName, componentName, promise) {
    const operationId = `${operationName}_${Date.now()}_${Math.random()}`;
    
    this.asyncOperations.set(operationId, {
      name: operationName,
      component: componentName,
      startTime: Date.now(),
      status: 'pending'
    });
    
    promise
      .then((result) => {
        const operation = this.asyncOperations.get(operationId);
        if (operation) {
          operation.status = 'completed';
          operation.endTime = Date.now();
          operation.duration = operation.endTime - operation.startTime;
        }
      })
      .catch((error) => {
        const operation = this.asyncOperations.get(operationId);
        if (operation) {
          operation.status = 'failed';
          operation.endTime = Date.now();
          operation.duration = operation.endTime - operation.startTime;
          operation.error = error;
        }
        
        // Check if this error could cause React Error #185
        if (this.couldCauseReactError185(error)) {
          console.error('⚠️ Async operation failure could cause React Error #185!', {
            operation: operationName,
            component: componentName,
            error
          });
          this.reportPotentialError185('asyncOperationFailure', {
            operation: operationName,
            component: componentName,
            error: error.message,
            stack: error.stack
          });
        }
      });
  }
  
  trackUnmount(componentName) {
    const state = this.componentMountStates.get(componentName);
    if (state) {
      state.mounted = false;
      state.unmountTime = Date.now();
    }
  }
  
  isComponentMounted(componentName) {
    const state = this.componentMountStates.get(componentName);
    return state ? state.mounted : false;
  }
  
  couldCauseReactError185(error) {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const problematicPatterns = [
      'setState',
      'forceUpdate',
      'Cannot update',
      'component that is not mounted',
      'Warning: Can\'t perform a React state update',
      'async operation',
      'promise',
      'timeout'
    ];
    
    return problematicPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  handleReactError185(errorMessage, args) {
    const errorInfo = {
      timestamp: Date.now(),
      message: errorMessage,
      args,
      stack: new Error().stack,
      componentStates: this.getCurrentComponentStates(),
      recentPromiseRejections: this.promiseRejections.slice(-5),
      recentAsyncOperations: this.getRecentAsyncOperations()
    };
    
    this.errorOccurrences.push(errorInfo);
    
    console.group('🚨 REACT ERROR #185 DETECTED!');
    console.error('Full error details:', errorInfo);
    console.error('Recent component renders:', this.getRecentRenderStats());
    console.error('Recent state updates:', this.getRecentStateUpdateStats());
    console.error('Recent promise rejections:', this.promiseRejections.slice(-3));
    console.groupEnd();
    
    // Generate detailed report
    this.generateDetailedReport(errorInfo);
  }
  
  reportPotentialError185(cause, details) {
    console.group(`⚠️ POTENTIAL REACT ERROR #185 CAUSE: ${cause}`);
    console.error('Details:', details);
    console.error('Current component states:', this.getCurrentComponentStates());
    console.error('Recent renders:', this.getRecentRenderStats());
    console.groupEnd();
  }
  
  getCurrentComponent() {
    // Try to extract component name from stack trace
    const stack = new Error().stack;
    const reactComponentMatch = stack.match(/at (\w+)\s/);
    return reactComponentMatch ? reactComponentMatch[1] : 'Unknown';
  }
  
  getCurrentComponentStates() {
    const states = {};
    for (const [name, state] of this.componentMountStates) {
      states[name] = {
        mounted: state.mounted,
        renderCount: state.renderCount,
        recentStateUpdates: state.stateUpdates?.slice(-3) || []
      };
    }
    return states;
  }
  
  getRecentRenderStats() {
    const stats = {};
    for (const [component, renders] of this.renderCounts) {
      const now = Date.now();
      const recent = renders.filter(time => now - time < 5000);
      if (recent.length > 0) {
        stats[component] = {
          recentRenders: recent.length,
          averageInterval: recent.length > 1 ? 
            (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 0
        };
      }
    }
    return stats;
  }
  
  getRecentStateUpdateStats() {
    const stats = {};
    for (const [key, updates] of this.stateUpdateCounts) {
      const now = Date.now();
      const recent = updates.filter(update => now - update.timestamp < 5000);
      if (recent.length > 0) {
        stats[key] = {
          recentUpdates: recent.length,
          values: recent.map(u => ({ old: u.oldValue, new: u.newValue }))
        };
      }
    }
    return stats;
  }
  
  getRecentAsyncOperations() {
    const recent = [];
    for (const [id, operation] of this.asyncOperations) {
      const now = Date.now();
      if (now - operation.startTime < 10000) {
        recent.push(operation);
      }
    }
    return recent;
  }
  
  generateDetailedReport(errorInfo) {
    const report = {
      timestamp: errorInfo.timestamp,
      error: errorInfo.message,
      analysis: {
        likelyCauses: this.analyzeLikelyCauses(),
        recommendations: this.generateRecommendations(),
        componentStates: this.getCurrentComponentStates(),
        renderPatterns: this.getRecentRenderStats(),
        stateUpdatePatterns: this.getRecentStateUpdateStats(),
        asyncOperations: this.getRecentAsyncOperations(),
        promiseRejections: this.promiseRejections.slice(-5)
      }
    };
    
    console.group('📊 DETAILED REACT ERROR #185 ANALYSIS');
    console.log('Full Report:', report);
    console.groupEnd();
    
    // Store in session storage for debugging
    try {
      sessionStorage.setItem('reactError185Report', JSON.stringify(report, null, 2));
      console.log('💾 Report saved to sessionStorage.reactError185Report');
    } catch (e) {
      console.warn('Could not save report to sessionStorage:', e);
    }
    
    return report;
  }
  
  analyzeLikelyCauses() {
    const causes = [];
    
    // Check for infinite render loops
    const renderStats = this.getRecentRenderStats();
    for (const [component, stats] of Object.entries(renderStats)) {
      if (stats.recentRenders > 10 && stats.averageInterval < 100) {
        causes.push(`Infinite render loop in ${component}`);
      }
    }
    
    // Check for rapid state updates
    const stateStats = this.getRecentStateUpdateStats();
    for (const [key, stats] of Object.entries(stateStats)) {
      if (stats.recentUpdates > 5) {
        causes.push(`Rapid state updates in ${key}`);
      }
    }
    
    // Check for promise rejections
    if (this.promiseRejections.length > 0) {
      causes.push('Unhandled promise rejections causing state updates');
    }
    
    return causes;
  }
  
  generateRecommendations() {
    return [
      'Check useEffect dependency arrays for missing or incorrect dependencies',
      'Ensure all async operations check component mount state before updating state',
      'Add proper cleanup functions to useEffect hooks',
      'Wrap async operations in try-catch blocks',
      'Use useCallback and useMemo to prevent unnecessary re-renders',
      'Check for circular dependencies in component props',
      'Ensure promise rejections are properly handled'
    ];
  }
  
  getReport() {
    return {
      errorOccurrences: this.errorOccurrences,
      componentStates: this.getCurrentComponentStates(),
      renderStats: this.getRecentRenderStats(),
      stateUpdateStats: this.getRecentStateUpdateStats(),
      asyncOperations: this.getRecentAsyncOperations(),
      promiseRejections: this.promiseRejections
    };
  }
  
  clearData() {
    this.renderCounts.clear();
    this.stateUpdateCounts.clear();
    this.errorOccurrences = [];
    this.componentMountStates.clear();
    this.asyncOperations.clear();
    this.promiseRejections = [];
  }
}

// Create singleton instance
const reactError185Detector = new ReactError185Detector();

// Export tracking functions
export const trackComponentRender = (name, data) => reactError185Detector.trackRender(name, data);
export const trackStateUpdate = (component, state, oldVal, newVal) => 
  reactError185Detector.trackStateUpdate(component, state, oldVal, newVal);
export const trackAsyncOp = (name, component, promise) => 
  reactError185Detector.trackAsyncOperation(name, component, promise);
export const trackComponentMount = (name) => reactError185Detector.trackComponent(name);
export const trackComponentUnmount = (name) => reactError185Detector.trackUnmount(name);
export const isComponentMounted = (name) => reactError185Detector.isComponentMounted(name);
export const getError185Report = () => reactError185Detector.getReport();
export const clearError185Data = () => reactError185Detector.clearData();

export default reactError185Detector;