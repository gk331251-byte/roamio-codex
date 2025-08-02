// Quest Generation Debug Utility
// Comprehensive logging and monitoring for quest generation flow

import { logError } from '../lib/errorLogger';

class QuestDebugger {
  constructor() {
    this.questSteps = new Map();
    this.componentStates = new Map();
    this.asyncOperations = new Map();
    this.renderCycles = new Map();
    this.stateUpdates = new Map();
    this.currentQuestId = null;
    
    if (process.env.NODE_ENV === 'development') {
      this.initializeDebugMode();
    }
  }

  initializeDebugMode() {
    console.log('🔍 Quest Generation Debugger initialized');
    
    // Track React warnings and errors
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('React') || message.includes('Warning')) {
        this.logReactWarning(message);
      }
      originalWarn.apply(console, args);
    };
    
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Maximum update depth') || message.includes('Too many re-renders')) {
        this.logInfiniteLoop(message, new Error().stack);
      }
      originalError.apply(console, args);
    };
  }

  startQuestGeneration(questId = `quest_${Date.now()}`) {
    this.currentQuestId = questId;
    this.questSteps.set(questId, {
      startTime: Date.now(),
      steps: [],
      errors: [],
      stateUpdates: [],
      componentMounts: [],
      componentUnmounts: []
    });
    
    console.group(`🚀 Quest Generation Started: ${questId}`);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
    
    this.logStep('initialization', 'Quest generation started');
  }

  logStep(stepName, details = {}, component = 'Unknown') {
    if (!this.currentQuestId) return;
    
    const questData = this.questSteps.get(this.currentQuestId);
    if (!questData) return;
    
    const step = {
      name: stepName,
      timestamp: Date.now(),
      component,
      details,
      duration: Date.now() - questData.startTime
    };
    
    questData.steps.push(step);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📍 Quest Step: ${stepName}`, {
        component,
        details,
        duration: `${step.duration}ms`
      });
    }
  }

  logStateUpdate(component, stateName, oldValue, newValue) {
    if (!this.currentQuestId) return;
    
    const questData = this.questSteps.get(this.currentQuestId);
    if (!questData) return;
    
    const update = {
      component,
      stateName,
      oldValue: this.serializeState(oldValue),
      newValue: this.serializeState(newValue),
      timestamp: Date.now(),
      stack: new Error().stack
    };
    
    questData.stateUpdates.push(update);
    
    // Detect potential infinite loops
    const recentUpdates = questData.stateUpdates.filter(
      u => u.component === component && 
           u.stateName === stateName && 
           Date.now() - u.timestamp < 1000
    );
    
    if (recentUpdates.length > 10) {
      console.warn(`⚠️ Rapid state updates detected in ${component}.${stateName}:`, recentUpdates.length);
      this.logPotentialInfiniteLoop(component, stateName, recentUpdates);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 State Update: ${component}.${stateName}`, {
        from: this.serializeState(oldValue),
        to: this.serializeState(newValue)
      });
    }
  }

  logAsyncOperation(operationName, component, promise) {
    if (!this.currentQuestId) return;
    
    const operationId = `${operationName}_${Date.now()}`;
    const startTime = Date.now();
    
    this.asyncOperations.set(operationId, {
      name: operationName,
      component,
      startTime,
      status: 'pending'
    });
    
    console.log(`⏳ Async Operation Started: ${operationName} in ${component}`);
    
    promise
      .then((result) => {
        const operation = this.asyncOperations.get(operationId);
        if (operation) {
          operation.status = 'completed';
          operation.duration = Date.now() - startTime;
          operation.result = this.serializeState(result);
        }
        
        console.log(`✅ Async Operation Completed: ${operationName}`, {
          duration: `${Date.now() - startTime}ms`,
          component
        });
        
        this.logStep(`async_${operationName}_completed`, {
          duration: Date.now() - startTime,
          success: true
        }, component);
      })
      .catch((error) => {
        const operation = this.asyncOperations.get(operationId);
        if (operation) {
          operation.status = 'failed';
          operation.duration = Date.now() - startTime;
          operation.error = error.message;
        }
        
        console.error(`❌ Async Operation Failed: ${operationName}`, {
          duration: `${Date.now() - startTime}ms`,
          component,
          error: error.message
        });
        
        this.logStep(`async_${operationName}_failed`, {
          duration: Date.now() - startTime,
          error: error.message
        }, component);
        
        this.logError('asyncOperationFailed', error, {
          operationName,
          component,
          operationId
        });
      });
    
    return operationId;
  }

  logComponentMount(componentName) {
    if (!this.currentQuestId) return;
    
    const questData = this.questSteps.get(this.currentQuestId);
    if (questData) {
      questData.componentMounts.push({
        component: componentName,
        timestamp: Date.now()
      });
    }
    
    console.log(`🏗️ Component Mounted: ${componentName}`);
    this.logStep('component_mount', { componentName }, componentName);
  }

  logComponentUnmount(componentName) {
    if (!this.currentQuestId) return;
    
    const questData = this.questSteps.get(this.currentQuestId);
    if (questData) {
      questData.componentUnmounts.push({
        component: componentName,
        timestamp: Date.now()
      });
    }
    
    console.log(`🔥 Component Unmounted: ${componentName}`);
    this.logStep('component_unmount', { componentName }, componentName);
  }

  logError(errorType, error, context = {}) {
    if (!this.currentQuestId) return;
    
    const questData = this.questSteps.get(this.currentQuestId);
    if (questData) {
      questData.errors.push({
        type: errorType,
        message: error.message,
        stack: error.stack,
        context,
        timestamp: Date.now()
      });
    }
    
    console.error(`💥 Quest Error: ${errorType}`, {
      error: error.message,
      context,
      questId: this.currentQuestId
    });
    
    // Log to error tracking system
    logError(error, {
      type: `quest_${errorType}`,
      questId: this.currentQuestId,
      questStep: this.getCurrentStep(),
      ...context
    });
  }

  logReactWarning(message) {
    console.warn(`⚠️ React Warning during quest generation:`, message);
    this.logStep('react_warning', { message }, 'React');
  }

  logInfiniteLoop(message, stack) {
    console.error(`🔄 Infinite Loop Detected:`, message);
    console.error('Stack trace:', stack);
    
    this.logError('infiniteLoop', new Error(message), {
      stack,
      currentStep: this.getCurrentStep(),
      recentStateUpdates: this.getRecentStateUpdates(),
      componentStates: Object.fromEntries(this.componentStates)
    });
    
    // Generate detailed analysis
    this.analyzeInfiniteLoop();
  }

  logPotentialInfiniteLoop(component, stateName, updates) {
    console.group(`🔄 Potential Infinite Loop: ${component}.${stateName}`);
    console.log(`${updates.length} updates in the last second`);
    console.log('Recent updates:', updates.slice(-5));
    console.groupEnd();
    
    this.logError('potentialInfiniteLoop', new Error(`Rapid state updates in ${component}.${stateName}`), {
      component,
      stateName,
      updateCount: updates.length,
      recentUpdates: updates.slice(-5)
    });
  }

  analyzeInfiniteLoop() {
    const questData = this.questSteps.get(this.currentQuestId);
    if (!questData) return;
    
    console.group('🔍 Infinite Loop Analysis');
    
    // Analyze recent state updates
    const recentUpdates = this.getRecentStateUpdates(2000); // Last 2 seconds
    const updatesByComponent = {};
    
    recentUpdates.forEach(update => {
      if (!updatesByComponent[update.component]) {
        updatesByComponent[update.component] = {};
      }
      if (!updatesByComponent[update.component][update.stateName]) {
        updatesByComponent[update.component][update.stateName] = 0;
      }
      updatesByComponent[update.component][update.stateName]++;
    });
    
    console.log('State updates by component (last 2 seconds):', updatesByComponent);
    
    // Identify problematic components
    Object.entries(updatesByComponent).forEach(([component, states]) => {
      Object.entries(states).forEach(([stateName, count]) => {
        if (count > 5) {
          console.warn(`🚨 High frequency updates: ${component}.${stateName} (${count} times)`);
        }
      });
    });
    
    console.log('Recent quest steps:', questData.steps.slice(-10));
    console.log('Active async operations:', Array.from(this.asyncOperations.values()));
    
    console.groupEnd();
  }

  getCurrentStep() {
    if (!this.currentQuestId) return null;
    
    const questData = this.questSteps.get(this.currentQuestId);
    if (!questData || questData.steps.length === 0) return null;
    
    return questData.steps[questData.steps.length - 1];
  }

  getRecentStateUpdates(timeWindow = 1000) {
    if (!this.currentQuestId) return [];
    
    const questData = this.questSteps.get(this.currentQuestId);
    if (!questData) return [];
    
    const cutoff = Date.now() - timeWindow;
    return questData.stateUpdates.filter(update => update.timestamp > cutoff);
  }

  serializeState(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'function') return '[Function]';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '[Circular or Non-serializable Object]';
      }
    }
    return String(value);
  }

  finishQuestGeneration(success = true, result = null) {
    if (!this.currentQuestId) return;
    
    const questData = this.questSteps.get(this.currentQuestId);
    if (!questData) return;
    
    questData.endTime = Date.now();
    questData.totalDuration = questData.endTime - questData.startTime;
    questData.success = success;
    questData.result = this.serializeState(result);
    
    console.group(`${success ? '✅' : '❌'} Quest Generation ${success ? 'Completed' : 'Failed'}: ${this.currentQuestId}`);
    console.log('Total duration:', `${questData.totalDuration}ms`);
    console.log('Steps completed:', questData.steps.length);
    console.log('State updates:', questData.stateUpdates.length);
    console.log('Errors:', questData.errors.length);
    
    if (!success || questData.errors.length > 0) {
      console.log('Error summary:', questData.errors);
    }
    
    console.groupEnd();
    
    this.currentQuestId = null;
  }

  generateReport() {
    if (!this.currentQuestId) return null;
    
    const questData = this.questSteps.get(this.currentQuestId);
    if (!questData) return null;
    
    return {
      questId: this.currentQuestId,
      duration: questData.totalDuration || (Date.now() - questData.startTime),
      steps: questData.steps,
      stateUpdates: questData.stateUpdates,
      errors: questData.errors,
      componentMounts: questData.componentMounts,
      componentUnmounts: questData.componentUnmounts,
      asyncOperations: Array.from(this.asyncOperations.values()),
      summary: {
        totalSteps: questData.steps.length,
        totalStateUpdates: questData.stateUpdates.length,
        totalErrors: questData.errors.length,
        success: questData.success
      }
    };
  }
}

// Create singleton instance
const questDebugger = new QuestDebugger();

// Export utility functions
export const startQuestGeneration = (questId) => questDebugger.startQuestGeneration(questId);
export const logQuestStep = (step, details, component) => questDebugger.logStep(step, details, component);
export const logStateUpdate = (component, stateName, oldValue, newValue) => 
  questDebugger.logStateUpdate(component, stateName, oldValue, newValue);
export const logAsyncOperation = (name, component, promise) => 
  questDebugger.logAsyncOperation(name, component, promise);
export const logComponentMount = (componentName) => questDebugger.logComponentMount(componentName);
export const logComponentUnmount = (componentName) => questDebugger.logComponentUnmount(componentName);
export const logQuestError = (type, error, context) => questDebugger.logError(type, error, context);
export const finishQuestGeneration = (success, result) => questDebugger.finishQuestGeneration(success, result);
export const generateQuestReport = () => questDebugger.generateReport();

export default questDebugger;