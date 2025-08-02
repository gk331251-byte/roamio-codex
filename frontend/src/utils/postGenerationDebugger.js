// Post-Generation React Error #185 Debugger
// Specifically monitors the phase after successful quest generation

class PostGenerationDebugger {
  constructor() {
    this.isMonitoring = false;
    this.questGenerationEndTime = null;
    this.postGenerationEvents = [];
    this.componentRenderCounts = new Map();
    this.stateUpdateCounts = new Map();
    
    if (process.env.NODE_ENV === 'development') {
      this.initializeDebugger();
    }
  }
  
  initializeDebugger() {
    this.isMonitoring = true;
    console.log('🔍 Post-Generation Debugger initialized');
    
    // Monitor for React Error #185 specifically during post-generation
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      
      if (this.questGenerationEndTime && (Date.now() - this.questGenerationEndTime) < 10000) {
        if (errorMessage.includes('Maximum update depth exceeded') || 
            errorMessage.includes('Too many re-renders')) {
          this.handlePostGenerationReactError185(errorMessage, args);
        }
      }
      
      originalConsoleError.apply(console, args);
    };
  }
  
  markQuestGenerationComplete() {
    this.questGenerationEndTime = Date.now();
    this.postGenerationEvents = [];
    this.componentRenderCounts.clear();
    this.stateUpdateCounts.clear();
    
    console.group('🎯 QUEST GENERATION COMPLETED - Starting Post-Generation Monitoring');
    console.log('Monitoring for React Error #185 in the next 10 seconds...');
    console.groupEnd();
    
    // Start intensive monitoring for 10 seconds
    this.startIntensiveMonitoring();
  }
  
  startIntensiveMonitoring() {
    // Monitor every 100ms for the next 10 seconds
    const monitorInterval = setInterval(() => {
      this.checkForRapidStateUpdates();
      this.checkForExcessiveRenders();
    }, 100);
    
    setTimeout(() => {
      clearInterval(monitorInterval);
      this.generatePostGenerationReport();
    }, 10000);
  }
  
  logPostGenerationEvent(eventType, data = {}) {
    if (!this.questGenerationEndTime) return;
    
    const timeSinceGeneration = Date.now() - this.questGenerationEndTime;
    
    // Only log events within 10 seconds of quest generation
    if (timeSinceGeneration > 10000) return;
    
    const event = {
      type: eventType,
      timestamp: Date.now(),
      timeSinceGeneration,
      data,
      stack: new Error().stack
    };
    
    this.postGenerationEvents.push(event);
    
    console.log(`📍 POST-GEN EVENT: ${eventType} (+${timeSinceGeneration}ms)`, data);
    
    // Check for concerning patterns
    this.analyzeEvent(event);
  }
  
  logComponentRender(componentName, renderData = {}) {
    if (!this.questGenerationEndTime) return;
    
    const timeSinceGeneration = Date.now() - this.questGenerationEndTime;
    if (timeSinceGeneration > 10000) return;
    
    if (!this.componentRenderCounts.has(componentName)) {
      this.componentRenderCounts.set(componentName, []);
    }
    
    const renders = this.componentRenderCounts.get(componentName);
    renders.push({
      timestamp: Date.now(),
      timeSinceGeneration,
      data: renderData
    });
    
    console.log(`🔄 POST-GEN RENDER: ${componentName} (+${timeSinceGeneration}ms)`, renderData);
    
    // Check for excessive renders
    if (renders.length > 10) {
      this.logPostGenerationEvent('excessive_renders', {
        component: componentName,
        renderCount: renders.length,
        timeSpan: timeSinceGeneration
      });
    }
  }
  
  logStateUpdate(componentName, stateName, oldValue, newValue) {
    if (!this.questGenerationEndTime) return;
    
    const timeSinceGeneration = Date.now() - this.questGenerationEndTime;
    if (timeSinceGeneration > 10000) return;
    
    const stateKey = `${componentName}.${stateName}`;
    
    if (!this.stateUpdateCounts.has(stateKey)) {
      this.stateUpdateCounts.set(stateKey, []);
    }
    
    const updates = this.stateUpdateCounts.get(stateKey);
    updates.push({
      timestamp: Date.now(),
      timeSinceGeneration,
      oldValue,
      newValue
    });
    
    console.log(`📝 POST-GEN STATE: ${stateKey} (+${timeSinceGeneration}ms)`, {
      old: oldValue,
      new: newValue
    });
    
    // Check for rapid updates
    const recentUpdates = updates.filter(u => 
      (Date.now() - u.timestamp) < 1000
    );
    
    if (recentUpdates.length > 3) {
      this.logPostGenerationEvent('rapid_state_updates', {
        stateKey,
        updateCount: recentUpdates.length,
        updates: recentUpdates.slice(-3)
      });
    }
  }
  
  analyzeEvent(event) {
    const concerningEvents = [
      'quest_result_set',
      'route_map_mount',
      'route_map_render',
      'place_item_render',
      'navigation_attempt'
    ];
    
    if (concerningEvents.includes(event.type)) {
      // Check if this happens too quickly after generation
      if (event.timeSinceGeneration < 100) {
        this.logPostGenerationEvent('immediate_post_generation_activity', {
          originalEvent: event,
          warning: 'Event occurred very quickly after quest generation'
        });
      }
    }
  }
  
  checkForRapidStateUpdates() {
    const now = Date.now();
    
    for (const [stateKey, updates] of this.stateUpdateCounts) {
      const recentUpdates = updates.filter(u => (now - u.timestamp) < 500);
      
      if (recentUpdates.length > 5) {
        this.logPostGenerationEvent('potential_infinite_loop', {
          stateKey,
          recentUpdateCount: recentUpdates.length,
          updates: recentUpdates.slice(-3)
        });
      }
    }
  }
  
  checkForExcessiveRenders() {
    const now = Date.now();
    
    for (const [componentName, renders] of this.componentRenderCounts) {
      const recentRenders = renders.filter(r => (now - r.timestamp) < 500);
      
      if (recentRenders.length > 8) {
        this.logPostGenerationEvent('potential_render_loop', {
          component: componentName,
          recentRenderCount: recentRenders.length,
          timeSpan: '500ms'
        });
      }
    }
  }
  
  handlePostGenerationReactError185(errorMessage, args) {
    console.group('🚨 REACT ERROR #185 DETECTED DURING POST-GENERATION!');
    console.error('Error Message:', errorMessage);
    console.error('Time Since Quest Generation:', this.questGenerationEndTime ? 
      `${Date.now() - this.questGenerationEndTime}ms` : 'Unknown');
    console.error('Post-Generation Events:', this.postGenerationEvents.slice(-10));
    console.error('Component Render Counts:', Object.fromEntries(this.componentRenderCounts));
    console.error('State Update Counts:', Object.fromEntries(this.stateUpdateCounts));
    
    // Generate detailed analysis
    this.analyzeReactError185Context();
    
    console.groupEnd();
    
    // Save to session storage for analysis
    this.saveErrorAnalysisToStorage(errorMessage);
  }
  
  analyzeReactError185Context() {
    console.group('📊 REACT ERROR #185 ANALYSIS');
    
    // Find most active components
    const componentActivity = Array.from(this.componentRenderCounts.entries())
      .map(([name, renders]) => ({ name, renderCount: renders.length }))
      .sort((a, b) => b.renderCount - a.renderCount);
    
    console.log('Most Active Components:', componentActivity.slice(0, 5));
    
    // Find most active state updates
    const stateActivity = Array.from(this.stateUpdateCounts.entries())
      .map(([key, updates]) => ({ key, updateCount: updates.length }))
      .sort((a, b) => b.updateCount - a.updateCount);
    
    console.log('Most Active State Updates:', stateActivity.slice(0, 5));
    
    // Timeline of critical events
    const criticalEvents = this.postGenerationEvents.filter(e => 
      ['quest_result_set', 'excessive_renders', 'rapid_state_updates', 'potential_infinite_loop'].includes(e.type)
    );
    
    console.log('Critical Events Timeline:', criticalEvents);
    
    // Identify likely culprits
    const likelyCulprits = [];
    
    if (componentActivity.length > 0 && componentActivity[0].renderCount > 15) {
      likelyCulprits.push(`Component "${componentActivity[0].name}" with ${componentActivity[0].renderCount} renders`);
    }
    
    if (stateActivity.length > 0 && stateActivity[0].updateCount > 10) {
      likelyCulprits.push(`State "${stateActivity[0].key}" with ${stateActivity[0].updateCount} updates`);
    }
    
    console.log('🎯 Likely Culprits:', likelyCulprits);
    
    console.groupEnd();
  }
  
  generatePostGenerationReport() {
    if (!this.questGenerationEndTime) return;
    
    const report = {
      questGenerationEndTime: this.questGenerationEndTime,
      monitoringDuration: Date.now() - this.questGenerationEndTime,
      events: this.postGenerationEvents,
      componentRenders: Object.fromEntries(this.componentRenderCounts),
      stateUpdates: Object.fromEntries(this.stateUpdateCounts),
      summary: {
        totalEvents: this.postGenerationEvents.length,
        totalComponents: this.componentRenderCounts.size,
        totalStateKeys: this.stateUpdateCounts.size,
        criticalEvents: this.postGenerationEvents.filter(e => 
          e.type.includes('excessive') || e.type.includes('rapid') || e.type.includes('potential')
        ).length
      }
    };
    
    console.group('📋 POST-GENERATION MONITORING REPORT');
    console.log('Report:', report);
    
    if (report.summary.criticalEvents > 0) {
      console.warn(`⚠️ ${report.summary.criticalEvents} critical events detected that could lead to React Error #185`);
    } else {
      console.log('✅ No critical events detected during post-generation phase');
    }
    
    console.groupEnd();
    
    return report;
  }
  
  saveErrorAnalysisToStorage(errorMessage) {
    const analysis = {
      timestamp: Date.now(),
      errorMessage,
      timeSinceGeneration: this.questGenerationEndTime ? 
        Date.now() - this.questGenerationEndTime : null,
      events: this.postGenerationEvents,
      componentActivity: Object.fromEntries(this.componentRenderCounts),
      stateActivity: Object.fromEntries(this.stateUpdateCounts)
    };
    
    try {
      sessionStorage.setItem('reactError185PostGenAnalysis', JSON.stringify(analysis, null, 2));
      console.log('💾 Error analysis saved to sessionStorage.reactError185PostGenAnalysis');
    } catch (e) {
      console.warn('Could not save error analysis to sessionStorage:', e);
    }
  }
}

// Create singleton instance
const postGenerationDebugger = new PostGenerationDebugger();

// Export functions
export const markQuestGenerationComplete = () => 
  postGenerationDebugger.markQuestGenerationComplete();

export const logPostGenerationEvent = (type, data) => 
  postGenerationDebugger.logPostGenerationEvent(type, data);

export const logPostGenerationRender = (component, data) => 
  postGenerationDebugger.logComponentRender(component, data);

export const logPostGenerationStateUpdate = (component, state, oldVal, newVal) => 
  postGenerationDebugger.logStateUpdate(component, state, oldVal, newVal);

export default postGenerationDebugger;