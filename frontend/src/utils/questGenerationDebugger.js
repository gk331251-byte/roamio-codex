// Comprehensive Quest Generation Debugging System
// Specifically designed to catch React Error #185 during quest generation

class QuestGenerationDebugger {
  constructor() {
    this.sessions = new Map();
    this.currentSessionId = null;
    this.stepIndex = 0;
    this.isActive = false;
    
    if (process.env.NODE_ENV === 'development') {
      this.initializeDebugger();
    }
  }
  
  initializeDebugger() {
    this.isActive = true;
    console.log('🔍 Quest Generation Debugger initialized');
    
    // Add global error listener specifically for quest generation
    window.addEventListener('error', (event) => {
      if (this.currentSessionId) {
        this.logError('global_error', event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          message: event.message
        });
      }
    });
    
    // Add unhandled rejection listener
    window.addEventListener('unhandledrejection', (event) => {
      if (this.currentSessionId) {
        this.logError('unhandled_rejection', event.reason, {
          promise: event.promise,
          reason: event.reason
        });
      }
    });
  }
  
  startSession(userId, questParams) {
    this.currentSessionId = `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.stepIndex = 0;
    
    const session = {
      id: this.currentSessionId,
      userId,
      questParams,
      startTime: Date.now(),
      steps: [],
      errors: [],
      warnings: [],
      stateUpdates: [],
      asyncOperations: [],
      status: 'in_progress'
    };
    
    this.sessions.set(this.currentSessionId, session);
    
    console.group(`🚀 QUEST GENERATION SESSION STARTED: ${this.currentSessionId}`);
    console.log('User ID:', userId);
    console.log('Quest Parameters:', questParams);
    console.log('Session ID:', this.currentSessionId);
    console.groupEnd();
    
    return this.currentSessionId;
  }
  
  logStep(stepName, data = {}, level = 'info') {
    if (!this.currentSessionId) return;
    
    const session = this.sessions.get(this.currentSessionId);
    if (!session) return;
    
    this.stepIndex++;
    const step = {
      index: this.stepIndex,
      name: stepName,
      timestamp: Date.now(),
      relativeTime: Date.now() - session.startTime,
      data,
      level,
      stack: new Error().stack
    };
    
    session.steps.push(step);
    
    const emoji = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : '✅';
    console.log(`${emoji} STEP ${this.stepIndex}: ${stepName}`, {
      relativeTime: `+${step.relativeTime}ms`,
      data
    });
    
    // Check for potential issues
    this.analyzeStep(step, session);
  }
  
  logStateUpdate(componentName, stateName, oldValue, newValue) {
    if (!this.currentSessionId) return;
    
    const session = this.sessions.get(this.currentSessionId);
    if (!session) return;
    
    const update = {
      timestamp: Date.now(),
      relativeTime: Date.now() - session.startTime,
      component: componentName,
      state: stateName,
      oldValue,
      newValue,
      stack: new Error().stack
    };
    
    session.stateUpdates.push(update);
    
    console.log(`🔄 STATE UPDATE: ${componentName}.${stateName}`, {
      old: oldValue,
      new: newValue,
      relativeTime: `+${update.relativeTime}ms`
    });
    
    // Check for rapid state updates
    const recentUpdates = session.stateUpdates.filter(u => 
      u.component === componentName && 
      u.state === stateName && 
      (Date.now() - u.timestamp) < 1000
    );
    
    if (recentUpdates.length > 3) {
      this.logWarning('rapid_state_updates', `Rapid updates detected for ${componentName}.${stateName}`, {
        updateCount: recentUpdates.length,
        updates: recentUpdates.slice(-3)
      });
    }
  }
  
  logAsyncOperation(operationName, promise, data = {}) {
    if (!this.currentSessionId) return;
    
    const session = this.sessions.get(this.currentSessionId);
    if (!session) return;
    
    const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const operation = {
      id: operationId,
      name: operationName,
      startTime: Date.now(),
      relativeStartTime: Date.now() - session.startTime,
      status: 'pending',
      data
    };
    
    session.asyncOperations.push(operation);
    
    console.log(`🔄 ASYNC OP START: ${operationName} (${operationId})`, {
      relativeTime: `+${operation.relativeStartTime}ms`,
      data
    });
    
    // Track completion
    promise
      .then((result) => {
        operation.status = 'completed';
        operation.endTime = Date.now();
        operation.duration = operation.endTime - operation.startTime;
        operation.result = result;
        
        console.log(`✅ ASYNC OP COMPLETE: ${operationName} (${operationId})`, {
          duration: `${operation.duration}ms`,
          hasResult: !!result
        });
      })
      .catch((error) => {
        operation.status = 'failed';
        operation.endTime = Date.now();
        operation.duration = operation.endTime - operation.startTime;
        operation.error = error;
        
        console.error(`❌ ASYNC OP FAILED: ${operationName} (${operationId})`, {
          duration: `${operation.duration}ms`,
          error: error.message
        });
        
        this.logError('async_operation_failed', error, {
          operationName,
          operationId,
          duration: operation.duration
        });
      });
  }
  
  logError(errorType, error, context = {}) {
    if (!this.currentSessionId) return;
    
    const session = this.sessions.get(this.currentSessionId);
    if (!session) return;
    
    const errorEntry = {
      type: errorType,
      timestamp: Date.now(),
      relativeTime: Date.now() - session.startTime,
      message: error?.message || error,
      stack: error?.stack || new Error().stack,
      context,
      currentStep: this.stepIndex
    };
    
    session.errors.push(errorEntry);
    
    console.error(`🚨 ERROR: ${errorType}`, {
      message: errorEntry.message,
      relativeTime: `+${errorEntry.relativeTime}ms`,
      currentStep: this.stepIndex,
      context
    });
    
    // Check if this could be React Error #185
    if (this.couldBeReactError185(error)) {
      this.handlePotentialReactError185(errorEntry, session);
    }
  }
  
  logWarning(warningType, message, context = {}) {
    if (!this.currentSessionId) return;
    
    const session = this.sessions.get(this.currentSessionId);
    if (!session) return;
    
    const warning = {
      type: warningType,
      timestamp: Date.now(),
      relativeTime: Date.now() - session.startTime,
      message,
      context,
      currentStep: this.stepIndex
    };
    
    session.warnings.push(warning);
    
    console.warn(`⚠️ WARNING: ${warningType}`, {
      message,
      relativeTime: `+${warning.relativeTime}ms`,
      context
    });
  }
  
  finishSession(success = true, result = null) {
    if (!this.currentSessionId) return;
    
    const session = this.sessions.get(this.currentSessionId);
    if (!session) return;
    
    session.status = success ? 'completed' : 'failed';
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.result = result;
    
    console.group(`${success ? '✅' : '❌'} QUEST GENERATION SESSION ${success ? 'COMPLETED' : 'FAILED'}: ${this.currentSessionId}`);
    console.log('Duration:', `${session.duration}ms`);
    console.log('Steps:', session.steps.length);
    console.log('State Updates:', session.stateUpdates.length);
    console.log('Async Operations:', session.asyncOperations.length);
    console.log('Errors:', session.errors.length);
    console.log('Warnings:', session.warnings.length);
    
    if (session.errors.length > 0) {
      console.error('Session Errors:', session.errors);
    }
    
    if (session.warnings.length > 0) {
      console.warn('Session Warnings:', session.warnings);
    }
    
    console.groupEnd();
    
    // Generate comprehensive report
    const report = this.generateSessionReport(session);
    
    // Store in sessionStorage for later analysis
    try {
      sessionStorage.setItem(`questDebugSession_${this.currentSessionId}`, JSON.stringify(report, null, 2));
    } catch (e) {
      console.warn('Could not save session to sessionStorage:', e);
    }
    
    this.currentSessionId = null;
    this.stepIndex = 0;
    
    return report;
  }
  
  analyzeStep(step, session) {
    // Check for potential React Error #185 triggers
    const problematicSteps = [
      'api_call_start',
      'api_call_success',
      'quest_result_set',
      'setLoading_true',
      'setLoading_false'
    ];
    
    if (problematicSteps.includes(step.name)) {
      // Count recent state updates during this step
      const recentStateUpdates = session.stateUpdates.filter(u => 
        (step.timestamp - u.timestamp) < 100
      );
      
      if (recentStateUpdates.length > 2) {
        this.logWarning('potential_rapid_updates', `Multiple state updates detected around step: ${step.name}`, {
          stepName: step.name,
          recentUpdates: recentStateUpdates.length
        });
      }
    }
  }
  
  couldBeReactError185(error) {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const reactError185Indicators = [
      'Maximum update depth exceeded',
      'Too many re-renders',
      'Cannot update a component that is not mounted',
      'Warning: Can\'t perform a React state update'
    ];
    
    return reactError185Indicators.some(indicator => 
      errorMessage.includes(indicator)
    );
  }
  
  handlePotentialReactError185(errorEntry, session) {
    console.group('🚨 POTENTIAL REACT ERROR #185 DETECTED!');
    console.error('Error:', errorEntry);
    console.error('Session Analysis:', {
      totalSteps: session.steps.length,
      recentStateUpdates: session.stateUpdates.slice(-10),
      recentAsyncOps: session.asyncOperations.slice(-5),
      timelineSummary: this.generateTimeline(session)
    });
    console.groupEnd();
    
    // Mark session as critical
    session.criticalError = errorEntry;
  }
  
  generateTimeline(session) {
    const events = [];
    
    // Add steps
    session.steps.forEach(step => {
      events.push({
        type: 'step',
        time: step.relativeTime,
        name: step.name,
        level: step.level
      });
    });
    
    // Add state updates
    session.stateUpdates.forEach(update => {
      events.push({
        type: 'state_update',
        time: update.relativeTime,
        name: `${update.component}.${update.state}`,
        details: { old: update.oldValue, new: update.newValue }
      });
    });
    
    // Add errors
    session.errors.forEach(error => {
      events.push({
        type: 'error',
        time: error.relativeTime,
        name: error.type,
        message: error.message
      });
    });
    
    // Sort by time
    events.sort((a, b) => a.time - b.time);
    
    return events.slice(-20); // Last 20 events
  }
  
  generateSessionReport(session) {
    return {
      sessionId: session.id,
      userId: session.userId,
      questParams: session.questParams,
      duration: session.duration,
      status: session.status,
      result: session.result,
      summary: {
        totalSteps: session.steps.length,
        totalStateUpdates: session.stateUpdates.length,
        totalAsyncOperations: session.asyncOperations.length,
        totalErrors: session.errors.length,
        totalWarnings: session.warnings.length
      },
      timeline: this.generateTimeline(session),
      steps: session.steps,
      stateUpdates: session.stateUpdates,
      asyncOperations: session.asyncOperations,
      errors: session.errors,
      warnings: session.warnings,
      criticalError: session.criticalError || null,
      analysis: {
        potentialIssues: this.analyzeSession(session),
        recommendations: this.generateRecommendations(session)
      }
    };
  }
  
  analyzeSession(session) {
    const issues = [];
    
    // Check for rapid state updates
    if (session.stateUpdates.length > 20) {
      issues.push('High number of state updates detected');
    }
    
    // Check for failed async operations
    const failedOps = session.asyncOperations.filter(op => op.status === 'failed');
    if (failedOps.length > 0) {
      issues.push(`${failedOps.length} async operations failed`);
    }
    
    // Check for long duration
    if (session.duration > 10000) {
      issues.push('Quest generation took longer than 10 seconds');
    }
    
    return issues;
  }
  
  generateRecommendations(session) {
    const recommendations = [];
    
    if (session.errors.some(e => this.couldBeReactError185(e))) {
      recommendations.push('Potential React Error #185 detected - check for infinite render loops');
      recommendations.push('Verify useEffect dependencies and cleanup functions');
      recommendations.push('Ensure state updates check component mount status');
    }
    
    if (session.stateUpdates.length > 15) {
      recommendations.push('High number of state updates - consider optimizing with useCallback/useMemo');
    }
    
    return recommendations;
  }
  
  // Public API methods
  getCurrentSession() {
    return this.currentSessionId ? this.sessions.get(this.currentSessionId) : null;
  }
  
  getSessionHistory(limit = 10) {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }
  
  clearHistory() {
    this.sessions.clear();
  }
}

// Create singleton instance
const questGenerationDebugger = new QuestGenerationDebugger();

// Export functions
export const startQuestDebugSession = (userId, questParams) => 
  questGenerationDebugger.startSession(userId, questParams);

export const logQuestDebugStep = (stepName, data, level) => 
  questGenerationDebugger.logStep(stepName, data, level);

export const logQuestStateUpdate = (component, state, oldVal, newVal) => 
  questGenerationDebugger.logStateUpdate(component, state, oldVal, newVal);

export const logQuestAsyncOp = (name, promise, data) => 
  questGenerationDebugger.logAsyncOperation(name, promise, data);

export const logQuestDebugError = (type, error, context) => 
  questGenerationDebugger.logError(type, error, context);

export const logQuestDebugWarning = (type, message, context) => 
  questGenerationDebugger.logWarning(type, message, context);

export const finishQuestDebugSession = (success, result) => 
  questGenerationDebugger.finishSession(success, result);

export const getCurrentQuestSession = () => 
  questGenerationDebugger.getCurrentSession();

export const getQuestSessionHistory = (limit) => 
  questGenerationDebugger.getSessionHistory(limit);

export default questGenerationDebugger;