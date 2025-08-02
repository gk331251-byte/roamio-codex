// Development Debug Monitor
// Real-time monitoring component for React Error #185 debugging

import { generateQuestReport } from './questDebugger';

class DebugMonitor {
  constructor() {
    this.isActive = false;
    this.monitorInterval = null;
    this.panel = null;
    
    if (process.env.NODE_ENV === 'development') {
      this.initializeMonitor();
    }
  }

  initializeMonitor() {
    // Only activate if debugging is enabled
    const urlParams = new URLSearchParams(window.location.search);
    const debugEnabled = urlParams.get('debug') === 'true' || 
                        localStorage.getItem('roamio_debug') === 'true';
    
    if (debugEnabled) {
      this.activate();
    }
    
    // Add keyboard shortcut to toggle debug mode
    document.addEventListener('keydown', (e) => {
      // Ctrl+Shift+D to toggle debug panel
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        this.toggle();
      }
    });
  }

  activate() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.createDebugPanel();
    this.startMonitoring();
    
    console.log('🔍 Debug Monitor activated - Press Ctrl+Shift+D to toggle panel');
  }

  deactivate() {
    if (!this.isActive) return;
    
    this.isActive = false;
    this.removeDebugPanel();
    this.stopMonitoring();
    
    console.log('🔍 Debug Monitor deactivated');
  }

  toggle() {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  createDebugPanel() {
    if (this.panel) return;
    
    this.panel = document.createElement('div');
    this.panel.id = 'roamio-debug-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 400px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border: 1px solid #333;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 10000;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    // Add header
    const header = document.createElement('div');
    header.style.cssText = `
      background: #1a1a1a;
      padding: 8px 12px;
      border-bottom: 1px solid #333;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>🔍 Quest Debug Monitor</span>
      <button id="close-debug" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">&times;</button>
    `;
    
    this.panel.appendChild(header);
    
    // Add content area
    const content = document.createElement('div');
    content.id = 'debug-content';
    content.style.cssText = `
      padding: 12px;
      max-height: calc(80vh - 40px);
      overflow-y: auto;
    `;
    
    this.panel.appendChild(content);
    
    // Add close handler
    header.querySelector('#close-debug').addEventListener('click', () => {
      this.deactivate();
    });
    
    document.body.appendChild(this.panel);
  }

  removeDebugPanel() {
    if (this.panel) {
      document.body.removeChild(this.panel);
      this.panel = null;
    }
  }

  startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.updatePanel();
    }, 1000);
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  updatePanel() {
    if (!this.panel) return;
    
    const content = this.panel.querySelector('#debug-content');
    if (!content) return;
    
    const report = generateQuestReport();
    const now = new Date().toLocaleTimeString();
    
    let html = `
      <div style="margin-bottom: 12px;">
        <strong>Last Update:</strong> ${now}
      </div>
    `;
    
    if (report) {
      html += `
        <div style="margin-bottom: 12px;">
          <strong>Active Quest:</strong> ${report.questId}
        </div>
        
        <div style="margin-bottom: 12px;">
          <strong>Duration:</strong> ${report.duration}ms
        </div>
        
        <div style="margin-bottom: 12px;">
          <strong>Status:</strong> 
          <span style="color: ${report.summary.success ? '#4ade80' : '#f87171'}">
            ${report.summary.success ? 'Success' : 'In Progress'}
          </span>
        </div>
        
        <div style="margin-bottom: 12px;">
          <strong>Steps:</strong> ${report.summary.totalSteps}
          <strong>State Updates:</strong> ${report.summary.totalStateUpdates}
          <strong>Errors:</strong> ${report.summary.totalErrors}
        </div>
      `;
      
      if (report.errors && report.errors.length > 0) {
        html += `
          <div style="margin-bottom: 12px;">
            <strong style="color: #f87171;">Recent Errors:</strong>
            <div style="max-height: 100px; overflow-y: auto; background: rgba(248, 113, 113, 0.1); padding: 8px; margin-top: 4px; border-radius: 4px;">
        `;
        
        report.errors.slice(-3).forEach(error => {
          html += `
            <div style="margin-bottom: 4px; font-size: 11px;">
              <strong>${error.type}:</strong> ${error.message}
            </div>
          `;
        });
        
        html += `</div></div>`;
      }
      
      if (report.steps && report.steps.length > 0) {
        html += `
          <div style="margin-bottom: 12px;">
            <strong>Recent Steps:</strong>
            <div style="max-height: 120px; overflow-y: auto; background: rgba(255, 255, 255, 0.05); padding: 8px; margin-top: 4px; border-radius: 4px;">
        `;
        
        report.steps.slice(-5).forEach(step => {
          html += `
            <div style="margin-bottom: 4px; font-size: 11px;">
              <span style="color: #60a5fa;">${step.name}</span>
              <span style="color: #9ca3af; margin-left: 8px;">${step.duration}ms</span>
            </div>
          `;
        });
        
        html += `</div></div>`;
      }
      
      // Add async operations status
      if (report.asyncOperations && report.asyncOperations.length > 0) {
        const pending = report.asyncOperations.filter(op => op.status === 'pending').length;
        const completed = report.asyncOperations.filter(op => op.status === 'completed').length;
        const failed = report.asyncOperations.filter(op => op.status === 'failed').length;
        
        html += `
          <div style="margin-bottom: 12px;">
            <strong>Async Operations:</strong>
            <div style="font-size: 11px; margin-top: 4px;">
              <span style="color: #fbbf24;">Pending: ${pending}</span>
              <span style="color: #4ade80; margin-left: 8px;">Completed: ${completed}</span>
              <span style="color: #f87171; margin-left: 8px;">Failed: ${failed}</span>
            </div>
          </div>
        `;
      }
    } else {
      html += `
        <div style="color: #9ca3af; font-style: italic;">
          No active quest generation
        </div>
      `;
    }
    
    // Add memory info if available
    if (performance.memory) {
      const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
      
      html += `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #333; font-size: 11px; color: #9ca3af;">
          <strong>Memory:</strong> ${memoryMB}MB / ${limitMB}MB
        </div>
      `;
    }
    
    // Add helpful commands
    html += `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #333; font-size: 11px; color: #9ca3af;">
        <strong>Debug Commands:</strong><br>
        • Ctrl+Shift+D: Toggle panel<br>
        • localStorage.setItem('roamio_debug', 'true'): Enable debug mode<br>
        • ?debug=true: Enable debug mode via URL
      </div>
    `;
    
    content.innerHTML = html;
  }

  logToPanel(message, type = 'info') {
    if (!this.panel) return;
    
    const content = this.panel.querySelector('#debug-content');
    if (!content) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: '#60a5fa',
      warn: '#fbbf24',
      error: '#f87171',
      success: '#4ade80'
    };
    
    const logEntry = document.createElement('div');
    logEntry.style.cssText = `
      margin-bottom: 4px;
      font-size: 11px;
      color: ${colors[type] || colors.info};
    `;
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    
    content.appendChild(logEntry);
    content.scrollTop = content.scrollHeight;
  }
}

// Create singleton instance
const debugMonitor = new DebugMonitor();

// Export for manual control
export const activateDebugMonitor = () => debugMonitor.activate();
export const deactivateDebugMonitor = () => debugMonitor.deactivate();
export const logToDebugPanel = (message, type) => debugMonitor.logToPanel(message, type);

export default debugMonitor;