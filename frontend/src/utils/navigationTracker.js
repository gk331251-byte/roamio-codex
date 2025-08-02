// Navigation Tracker for React Error #185 Investigation
// Monitors component mounting/unmounting during navigation

import { trackComponentRender, trackComponentMount, trackComponentUnmount } from './reactError185Detector';

class NavigationTracker {
  constructor() {
    this.navigationHistory = [];
    this.componentStates = new Map();
    this.pendingNavigations = new Set();
    this.isTracking = false;
    
    if (process.env.NODE_ENV === 'development') {
      this.initializeTracker();
    }
  }
  
  initializeTracker() {
    this.isTracking = true;
    
    // Track browser navigation events
    window.addEventListener('popstate', (event) => {
      this.logNavigation('popstate', {
        state: event.state,
        url: window.location.href
      });
    });
    
    // Track page visibility changes (can trigger component unmounting issues)
    document.addEventListener('visibilitychange', () => {
      this.logNavigation('visibility_change', {
        hidden: document.hidden,
        visibilityState: document.visibilityState
      });
    });
    
    // Monitor for potential navigation-related errors
    window.addEventListener('error', (event) => {
      if (this.isNavigationRelatedError(event.error)) {
        this.logNavigationError(event.error, {
          filename: event.filename,
          lineno: event.lineno,
          type: 'navigation_error'
        });
      }
    });
    
    // Monitor unhandled promise rejections during navigation
    window.addEventListener('unhandledrejection', (event) => {
      if (this.pendingNavigations.size > 0) {
        this.logNavigationError(event.reason, {
          type: 'navigation_promise_rejection',
          pendingNavigations: Array.from(this.pendingNavigations)
        });
      }
    });
    
    console.log('🧭 Navigation Tracker initialized');
  }
  
  trackNavigation(fromPath, toPath, method = 'unknown') {
    const navigationId = `nav_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const navigation = {
      id: navigationId,
      fromPath,
      toPath,
      method, // 'navigate', 'replace', 'back', 'forward', etc.
      timestamp: Date.now(),
      componentStatesBeforeNav: this.captureComponentStates(),
      pendingAsyncOps: this.countPendingAsyncOps()
    };
    
    this.navigationHistory.push(navigation);
    this.pendingNavigations.add(navigationId);
    
    console.group(`🧭 NAVIGATION STARTED: ${navigationId}`);
    console.log('From:', fromPath);
    console.log('To:', toPath);
    console.log('Method:', method);
    console.log('Active Components:', navigation.componentStatesBeforeNav.length);
    console.log('Pending Async Ops:', navigation.pendingAsyncOps);
    console.groupEnd();
    
    // Set timeout to detect if navigation hangs
    setTimeout(() => {
      if (this.pendingNavigations.has(navigationId)) {
        this.logNavigationWarning('navigation_timeout', `Navigation ${navigationId} took longer than 5 seconds`, {
          navigationId,
          fromPath,
          toPath
        });
      }
    }, 5000);
    
    return navigationId;
  }
  
  completeNavigation(navigationId) {
    if (!this.pendingNavigations.has(navigationId)) return;
    
    const navigation = this.navigationHistory.find(nav => nav.id === navigationId);
    if (!navigation) return;
    
    navigation.completedAt = Date.now();
    navigation.duration = navigation.completedAt - navigation.timestamp;
    navigation.componentStatesAfterNav = this.captureComponentStates();
    
    this.pendingNavigations.delete(navigationId);
    
    console.log(`✅ NAVIGATION COMPLETED: ${navigationId}`, {
      duration: `${navigation.duration}ms`,
      componentsBeforeNav: navigation.componentStatesBeforeNav.length,
      componentsAfterNav: navigation.componentStatesAfterNav.length
    });
    
    // Analyze navigation for potential issues
    this.analyzeNavigation(navigation);
  }
  
  trackComponentMount(componentName, navigationId = null) {
    const componentState = {
      name: componentName,
      status: 'mounted',
      mountTime: Date.now(),
      navigationId,
      renderCount: 0,
      stateUpdates: []
    };
    
    this.componentStates.set(componentName, componentState);
    
    if (process.env.NODE_ENV === 'development') {
      trackComponentMount(componentName);
      console.log(`📦 COMPONENT MOUNTED: ${componentName}`, {
        navigationId,
        totalMountedComponents: this.componentStates.size
      });
    }
  }
  
  trackComponentUnmount(componentName) {
    const componentState = this.componentStates.get(componentName);
    if (componentState) {
      componentState.status = 'unmounted';
      componentState.unmountTime = Date.now();
      componentState.lifetimeDuration = componentState.unmountTime - componentState.mountTime;
      
      if (process.env.NODE_ENV === 'development') {
        trackComponentUnmount(componentName);
        console.log(`📤 COMPONENT UNMOUNTED: ${componentName}`, {
          lifetimeDuration: `${componentState.lifetimeDuration}ms`,
          renderCount: componentState.renderCount,
          navigationId: componentState.navigationId
        });
      }
      
      // Check for potential issues during unmount
      this.analyzeComponentUnmount(componentState);
    }
  }
  
  trackComponentRender(componentName, renderData = {}) {
    const componentState = this.componentStates.get(componentName);
    if (componentState) {
      componentState.renderCount++;
      componentState.lastRenderTime = Date.now();
    }
    
    if (process.env.NODE_ENV === 'development') {
      trackComponentRender(componentName, renderData);
    }
    
    // Check for excessive renders during navigation
    if (this.pendingNavigations.size > 0 && componentState?.renderCount > 10) {
      this.logNavigationWarning('excessive_renders_during_nav', 
        `Component ${componentName} rendered ${componentState.renderCount} times during navigation`, {
          componentName,
          renderCount: componentState.renderCount,
          pendingNavigations: Array.from(this.pendingNavigations)
        });
    }
  }
  
  logNavigation(type, data) {
    const navigation = {
      type,
      timestamp: Date.now(),
      data,
      url: window.location.href,
      pathname: window.location.pathname
    };
    
    console.log(`🧭 NAV EVENT: ${type}`, navigation);
  }
  
  logNavigationError(error, context = {}) {
    const errorEntry = {
      timestamp: Date.now(),
      message: error?.message || error,
      stack: error?.stack,
      context,
      pendingNavigations: Array.from(this.pendingNavigations),
      activeComponents: this.captureComponentStates().map(c => c.name)
    };
    
    console.error('🚨 NAVIGATION ERROR:', errorEntry);
    
    // Check if this could be React Error #185
    if (this.couldCauseReactError185(error)) {
      this.handlePotentialReactError185(errorEntry);
    }
  }
  
  logNavigationWarning(type, message, context = {}) {
    const warning = {
      type,
      timestamp: Date.now(),
      message,
      context,
      pendingNavigations: Array.from(this.pendingNavigations)
    };
    
    console.warn('⚠️ NAVIGATION WARNING:', warning);
  }
  
  captureComponentStates() {
    return Array.from(this.componentStates.values()).filter(state => 
      state.status === 'mounted'
    );
  }
  
  countPendingAsyncOps() {
    // This would ideally integrate with the async operation tracker
    // For now, return a rough estimate based on component states
    return this.captureComponentStates().reduce((count, state) => 
      count + (state.stateUpdates?.length || 0), 0
    );
  }
  
  analyzeNavigation(navigation) {
    const issues = [];
    
    // Check for long navigation times
    if (navigation.duration > 3000) {
      issues.push('Navigation took longer than 3 seconds');
    }
    
    // Check for component count changes
    const componentDelta = navigation.componentStatesAfterNav.length - navigation.componentStatesBeforeNav.length;
    if (Math.abs(componentDelta) > 5) {
      issues.push(`Large component count change: ${componentDelta > 0 ? '+' : ''}${componentDelta}`);
    }
    
    // Check for pending async operations
    if (navigation.pendingAsyncOps > 10) {
      issues.push(`High number of pending async operations: ${navigation.pendingAsyncOps}`);
    }
    
    if (issues.length > 0) {
      this.logNavigationWarning('navigation_analysis', 'Potential navigation issues detected', {
        navigationId: navigation.id,
        issues,
        navigation
      });
    }
  }
  
  analyzeComponentUnmount(componentState) {
    const issues = [];
    
    // Check for rapid mount/unmount cycles
    if (componentState.lifetimeDuration < 100) {
      issues.push('Component unmounted very quickly (< 100ms)');
    }
    
    // Check for excessive renders
    if (componentState.renderCount > 20) {
      issues.push(`High render count: ${componentState.renderCount}`);
    }
    
    // Check if unmounting during navigation
    if (this.pendingNavigations.size > 0) {
      issues.push('Component unmounted during pending navigation');
    }
    
    if (issues.length > 0) {
      this.logNavigationWarning('component_unmount_analysis', `Potential issues with ${componentState.name} unmount`, {
        componentName: componentState.name,
        issues,
        componentState
      });
    }
  }
  
  isNavigationRelatedError(error) {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const navigationErrorPatterns = [
      'Cannot update a component that is not mounted',
      'Warning: Can\'t perform a React state update',
      'Navigation',
      'router',
      'route',
      'history'
    ];
    
    return navigationErrorPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  couldCauseReactError185(error) {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const reactError185Patterns = [
      'Maximum update depth exceeded',
      'Too many re-renders',
      'setState',
      'state update'
    ];
    
    return reactError185Patterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  handlePotentialReactError185(errorEntry) {
    console.group('🚨 POTENTIAL REACT ERROR #185 FROM NAVIGATION!');
    console.error('Error Entry:', errorEntry);
    console.error('Navigation Context:', {
      pendingNavigations: errorEntry.pendingNavigations,
      activeComponents: errorEntry.activeComponents,
      recentNavigations: this.navigationHistory.slice(-3)
    });
    console.groupEnd();
  }
  
  // Public API methods
  getNavigationHistory(limit = 10) {
    return this.navigationHistory.slice(-limit);
  }
  
  getPendingNavigations() {
    return Array.from(this.pendingNavigations);
  }
  
  getActiveComponents() {
    return this.captureComponentStates();
  }
  
  generateNavigationReport() {
    return {
      totalNavigations: this.navigationHistory.length,
      pendingNavigations: this.getPendingNavigations(),
      activeComponents: this.getActiveComponents(),
      recentNavigations: this.getNavigationHistory(5),
      averageNavigationTime: this.calculateAverageNavigationTime(),
      navigationIssues: this.identifyNavigationIssues()
    };
  }
  
  calculateAverageNavigationTime() {
    const completedNavigations = this.navigationHistory.filter(nav => nav.duration);
    if (completedNavigations.length === 0) return 0;
    
    const totalTime = completedNavigations.reduce((sum, nav) => sum + nav.duration, 0);
    return totalTime / completedNavigations.length;
  }
  
  identifyNavigationIssues() {
    const issues = [];
    
    // Check for stuck navigations
    if (this.pendingNavigations.size > 0) {
      issues.push(`${this.pendingNavigations.size} navigation(s) still pending`);
    }
    
    // Check for component lifecycle issues
    const problematicComponents = this.captureComponentStates().filter(state => 
      state.renderCount > 15 || (Date.now() - state.mountTime) < 50
    );
    
    if (problematicComponents.length > 0) {
      issues.push(`${problematicComponents.length} component(s) with potential lifecycle issues`);
    }
    
    return issues;
  }
}

// Create singleton instance
const navigationTracker = new NavigationTracker();

// Export functions for React Router integration
export const trackNavigation = (from, to, method) => 
  navigationTracker.trackNavigation(from, to, method);

export const completeNavigation = (navigationId) => 
  navigationTracker.completeNavigation(navigationId);

export const trackNavComponentMount = (name, navId) => 
  navigationTracker.trackComponentMount(name, navId);

export const trackNavComponentUnmount = (name) => 
  navigationTracker.trackComponentUnmount(name);

export const trackNavComponentRender = (name, data) => 
  navigationTracker.trackComponentRender(name, data);

export const getNavigationReport = () => 
  navigationTracker.generateNavigationReport();

export default navigationTracker;