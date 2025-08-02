// React Error #185 Detection and Prevention Utility
// Development-only helper to catch infinite loop issues early

import { logError } from '../lib/errorLogger';

class ReactErrorDetector {
  constructor() {
    this.renderCount = new Map();
    this.lastRenderTime = new Map();
    this.maxRendersPerSecond = 50; // Threshold for detecting infinite loops
    this.monitoringInterval = null;
    
    if (process.env.NODE_ENV === 'development') {
      this.initializeMonitoring();
    }
  }

  initializeMonitoring() {
    // Override console.error to catch React Error #185
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Detect React Error #185 specifically
      if (message.includes('Maximum update depth exceeded') || 
          message.includes('Too many re-renders')) {
        this.handleInfiniteLoopDetected(message, args);
      }
      
      // Call original console.error
      originalConsoleError.apply(console, args);
    };

    // Monitor component render frequency
    this.startRenderMonitoring();
    
    console.log('🔍 React Error #185 detector initialized (development mode)');
  }

  startRenderMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.checkRenderFrequency();
    }, 1000); // Check every second
  }

  trackComponentRender(componentName) {
    if (process.env.NODE_ENV !== 'development') return;
    
    const now = Date.now();
    const currentCount = this.renderCount.get(componentName) || 0;
    const lastRender = this.lastRenderTime.get(componentName) || now;
    
    // Reset count if more than 1 second has passed
    if (now - lastRender > 1000) {
      this.renderCount.set(componentName, 1);
    } else {
      this.renderCount.set(componentName, currentCount + 1);
    }
    
    this.lastRenderTime.set(componentName, now);
    
    // Check if component is rendering too frequently
    const renders = this.renderCount.get(componentName);
    if (renders > this.maxRendersPerSecond) {
      this.handleHighFrequencyRenders(componentName, renders);
    }
  }

  handleInfiniteLoopDetected(message, args) {
    console.group('🚨 React Error #185 Detected');
    console.error('Infinite loop detected in React component rendering');
    console.error('Original error:', message);
    console.error('Full error args:', args);
    
    // Extract component information from error
    const componentMatch = message.match(/in (\w+)/);
    const componentName = componentMatch ? componentMatch[1] : 'Unknown';
    
    console.error(`Problematic component: ${componentName}`);
    console.error('Common causes:');
    console.error('  1. useEffect with incorrect dependencies');
    console.error('  2. State updates inside render');
    console.error('  3. Object/function dependencies without useMemo/useCallback');
    console.error('  4. Infinite loops in event handlers');
    
    // Provide debugging suggestions
    this.provideSolutions(componentName);
    
    console.groupEnd();
    
    // Log to error tracking
    logError(new Error('React Error #185 Detected'), {
      type: 'reactInfiniteLoop',
      component: componentName,
      originalMessage: message,
      renderCounts: Object.fromEntries(this.renderCount),
      detectTime: new Date().toISOString()
    });
  }

  handleHighFrequencyRenders(componentName, renderCount) {
    console.warn(`⚠️  High render frequency detected: ${componentName} rendered ${renderCount} times in 1 second`);
    console.warn('This may indicate an infinite loop or inefficient rendering');
    
    // Log as potential issue
    logError(new Error('High frequency rendering detected'), {
      type: 'highFrequencyRender',
      component: componentName,
      renderCount,
      threshold: this.maxRendersPerSecond
    });
  }

  checkRenderFrequency() {
    const now = Date.now();
    
    for (const [componentName, lastRender] of this.lastRenderTime.entries()) {
      // Clean up old entries
      if (now - lastRender > 5000) {
        this.renderCount.delete(componentName);
        this.lastRenderTime.delete(componentName);
      }
    }
  }

  provideSolutions(componentName) {
    console.group('💡 Debugging Solutions:');
    
    console.log('1. Check useEffect dependencies:');
    console.log('   - Remove object/array dependencies');
    console.log('   - Use useCallback/useMemo for functions/objects');
    console.log('   - Consider using useRef for values that don\'t need re-renders');
    
    console.log('2. State update patterns:');
    console.log('   - Use functional updates: setState(prev => prev + 1)');
    console.log('   - Avoid setState in render method');
    console.log('   - Check for conditional state updates');
    
    console.log('3. Event handler issues:');
    console.log('   - Don\'t call functions immediately: onClick={func} not onClick={func()}');
    console.log('   - Use useCallback for event handlers');
    
    console.log('4. Component-specific fixes:');
    if (componentName === 'QuestHome') {
      console.log('   - Check mood auto-selection logic');
      console.log('   - Verify location state management');
      console.log('   - Review auth state dependencies');
    }
    
    console.groupEnd();
  }

  // Method to manually check for potential issues
  analyzeComponent(componentName, dependencies = []) {
    if (process.env.NODE_ENV !== 'development') return;
    
    console.group(`🔍 Analyzing ${componentName} for potential issues`);
    
    // Check for common problematic patterns
    dependencies.forEach((dep, index) => {
      if (typeof dep === 'object' && dep !== null) {
        console.warn(`Dependency ${index} is an object - consider useMemo`);
      }
      if (typeof dep === 'function') {
        console.warn(`Dependency ${index} is a function - consider useCallback`);
      }
    });
    
    console.groupEnd();
  }

  cleanup() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.renderCount.clear();
    this.lastRenderTime.clear();
  }
}

// Create singleton instance
const reactErrorDetector = new ReactErrorDetector();

// Export for use in components
export const trackRender = (componentName) => {
  reactErrorDetector.trackComponentRender(componentName);
};

export const analyzeComponent = (componentName, dependencies) => {
  reactErrorDetector.analyzeComponent(componentName, dependencies);
};

export default reactErrorDetector;