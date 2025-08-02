// Professional Toast Notification System
// Enhanced with error categorization, accessibility, and state management

import { logError } from './errorLogger';

/**
 * Toast categories for different types of notifications
 */
export const TOAST_CATEGORIES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading',
  CONFIRMATION: 'confirmation'
};

/**
 * Error subcategories for better categorization
 */
export const ERROR_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  VALIDATION: 'validation',
  NETWORK: 'network',
  PERMISSION: 'permission',
  SYSTEM: 'system',
  USER_ACTION: 'user_action'
};

/**
 * Toast priorities for accessibility and display order
 */
export const TOAST_PRIORITIES = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

class ProfessionalToastManager {
  constructor() {
    this.toasts = new Map();
    this.toastQueue = [];
    this.container = null;
    this.maxToasts = 5;
    this.ariaLiveRegion = null;
    this.confirmationCallbacks = new Map();
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    this.createContainer();
    this.createAriaLiveRegion();
    this.setupKeyboardHandlers();
  }

  createContainer() {
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.id = 'professional-toast-container';
    this.container.className = `
      fixed top-4 right-4 z-[9999] space-y-3 max-w-sm w-full
      pointer-events-none transition-all duration-300 ease-in-out
    `.trim();
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(this.container);
  }

  createAriaLiveRegion() {
    this.ariaLiveRegion = document.createElement('div');
    this.ariaLiveRegion.className = 'sr-only';
    this.ariaLiveRegion.setAttribute('aria-live', 'assertive');
    this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.ariaLiveRegion);
  }

  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      // ESC key dismisses all toasts
      if (e.key === 'Escape') {
        this.dismissAll();
      }
    });
  }

  /**
   * Show a professional toast notification
   * @param {string} message - The message to display
   * @param {Object} options - Configuration options
   */
  show(message, options = {}) {
    const config = {
      category: TOAST_CATEGORIES.INFO,
      errorCategory: null,
      priority: TOAST_PRIORITIES.MEDIUM,
      duration: this.getDefaultDuration(options.category),
      dismissible: true,
      persistent: false,
      actions: [],
      metadata: {},
      position: 'top-right',
      ...options
    };

    // Generate unique ID
    const id = this.generateId();

    // Create toast element
    const toast = this.createToastElement(id, message, config);

    // Handle queue if max toasts exceeded
    if (this.toasts.size >= this.maxToasts) {
      this.queueToast({ id, message, config, element: toast });
      return id;
    }

    // Add to active toasts
    this.toasts.set(id, {
      element: toast,
      config,
      message,
      timestamp: Date.now()
    });

    // Append to container
    this.container.appendChild(toast);

    // Announce to screen readers
    this.announceToScreenReader(message, config);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('animate-in', 'slide-in-from-right-full', 'fade-in');
      toast.style.pointerEvents = 'auto';
    });

    // Auto-dismiss if not persistent
    if (!config.persistent && config.duration > 0) {
      setTimeout(() => this.dismiss(id), config.duration);
    }

    // Log for analytics
    this.logToastEvent('show', id, message, config);

    return id;
  }

  createToastElement(id, message, config) {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `
      relative p-4 rounded-lg shadow-lg border backdrop-blur-sm
      transition-all duration-300 ease-in-out transform
      pointer-events-none opacity-0
      ${this.getToastStyles(config.category)}
      ${config.priority === TOAST_PRIORITIES.CRITICAL ? 'ring-2 ring-red-400' : ''}
    `.trim();

    // Accessibility attributes
    toast.setAttribute('role', config.category === TOAST_CATEGORIES.ERROR ? 'alert' : 'status');
    toast.setAttribute('aria-live', config.priority >= TOAST_PRIORITIES.HIGH ? 'assertive' : 'polite');
    toast.setAttribute('aria-atomic', 'true');
    toast.setAttribute('tabindex', '0');

    // Create content
    const content = this.createToastContent(id, message, config);
    toast.appendChild(content);

    // Add focus handling
    toast.addEventListener('focus', () => {
      toast.classList.add('ring-2', 'ring-blue-400');
    });

    toast.addEventListener('blur', () => {
      toast.classList.remove('ring-2', 'ring-blue-400');
    });

    return toast;
  }

  createToastContent(id, message, config) {
    const content = document.createElement('div');
    content.className = 'flex items-start space-x-3';

    // Icon
    const iconContainer = document.createElement('div');
    iconContainer.className = 'flex-shrink-0 mt-0.5';
    iconContainer.innerHTML = this.getIcon(config.category, config.errorCategory);
    content.appendChild(iconContainer);

    // Message area
    const messageArea = document.createElement('div');
    messageArea.className = 'flex-1 min-w-0';

    // Title (for error categorization)
    if (config.errorCategory || config.category === TOAST_CATEGORIES.ERROR) {
      const title = document.createElement('h4');
      title.className = 'text-sm font-semibold';
      title.textContent = this.getErrorTitle(config.errorCategory) || this.getCategoryTitle(config.category);
      messageArea.appendChild(title);
    }

    // Message
    const messageEl = document.createElement('p');
    messageEl.className = `text-sm ${config.errorCategory ? 'mt-1' : ''}`;
    messageEl.textContent = message;
    messageArea.appendChild(messageEl);

    // Actions
    if (config.actions && config.actions.length > 0) {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'flex space-x-2 mt-3';
      
      config.actions.forEach(action => {
        const button = document.createElement('button');
        button.className = `px-3 py-1 text-xs font-medium rounded-md transition-colors
          ${action.style === 'primary' 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`;
        button.textContent = action.label;
        button.onclick = () => {
          action.handler(id);
          if (action.dismissOnClick !== false) {
            this.dismiss(id);
          }
        };
        actionsContainer.appendChild(button);
      });
      
      messageArea.appendChild(actionsContainer);
    }

    content.appendChild(messageArea);

    // Dismiss button
    if (config.dismissible) {
      const dismissButton = document.createElement('button');
      dismissButton.className = `
        flex-shrink-0 ml-2 p-1 rounded-md text-gray-400 hover:text-gray-600
        focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors
      `.trim();
      dismissButton.setAttribute('aria-label', 'Dismiss notification');
      dismissButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      `;
      dismissButton.onclick = () => this.dismiss(id);
      content.appendChild(dismissButton);
    }

    return content;
  }

  getToastStyles(category) {
    const styles = {
      [TOAST_CATEGORIES.SUCCESS]: 'bg-green-50 border-green-200 text-green-800',
      [TOAST_CATEGORIES.ERROR]: 'bg-red-50 border-red-200 text-red-800',
      [TOAST_CATEGORIES.WARNING]: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      [TOAST_CATEGORIES.INFO]: 'bg-blue-50 border-blue-200 text-blue-800',
      [TOAST_CATEGORIES.LOADING]: 'bg-gray-50 border-gray-200 text-gray-800',
      [TOAST_CATEGORIES.CONFIRMATION]: 'bg-purple-50 border-purple-200 text-purple-800'
    };
    return styles[category] || styles[TOAST_CATEGORIES.INFO];
  }

  getIcon(category, errorCategory) {
    if (category === TOAST_CATEGORIES.ERROR && errorCategory) {
      return this.getErrorIcon(errorCategory);
    }

    const icons = {
      [TOAST_CATEGORIES.SUCCESS]: `
        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      `,
      [TOAST_CATEGORIES.ERROR]: `
        <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
      `,
      [TOAST_CATEGORIES.WARNING]: `
        <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
      `,
      [TOAST_CATEGORIES.INFO]: `
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      `,
      [TOAST_CATEGORIES.LOADING]: `
        <svg class="w-5 h-5 text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      `,
      [TOAST_CATEGORIES.CONFIRMATION]: `
        <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      `
    };

    return icons[category] || icons[TOAST_CATEGORIES.INFO];
  }

  getErrorIcon(errorCategory) {
    const errorIcons = {
      [ERROR_CATEGORIES.AUTHENTICATION]: `
        <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      `,
      [ERROR_CATEGORIES.NETWORK]: `
        <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364"/>
        </svg>
      `,
      [ERROR_CATEGORIES.PERMISSION]: `
        <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"/>
        </svg>
      `,
      [ERROR_CATEGORIES.VALIDATION]: `
        <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      `
    };

    return errorIcons[errorCategory] || this.getIcon(TOAST_CATEGORIES.ERROR);
  }

  getErrorTitle(errorCategory) {
    const titles = {
      [ERROR_CATEGORIES.AUTHENTICATION]: 'Authentication Required',
      [ERROR_CATEGORIES.VALIDATION]: 'Invalid Input',
      [ERROR_CATEGORIES.NETWORK]: 'Connection Error',
      [ERROR_CATEGORIES.PERMISSION]: 'Permission Denied',
      [ERROR_CATEGORIES.SYSTEM]: 'System Error',
      [ERROR_CATEGORIES.USER_ACTION]: 'Action Failed'
    };
    return titles[errorCategory];
  }

  getCategoryTitle(category) {
    const titles = {
      [TOAST_CATEGORIES.SUCCESS]: 'Success',
      [TOAST_CATEGORIES.ERROR]: 'Error',
      [TOAST_CATEGORIES.WARNING]: 'Warning',
      [TOAST_CATEGORIES.INFO]: 'Information',
      [TOAST_CATEGORIES.LOADING]: 'Loading',
      [TOAST_CATEGORIES.CONFIRMATION]: 'Confirmation'
    };
    return titles[category];
  }

  getDefaultDuration(category) {
    const durations = {
      [TOAST_CATEGORIES.SUCCESS]: 4000,
      [TOAST_CATEGORIES.ERROR]: 8000,
      [TOAST_CATEGORIES.WARNING]: 6000,
      [TOAST_CATEGORIES.INFO]: 5000,
      [TOAST_CATEGORIES.LOADING]: 0, // Persistent until dismissed
      [TOAST_CATEGORIES.CONFIRMATION]: 0 // Persistent until action taken
    };
    return durations[category] || 5000;
  }

  announceToScreenReader(message, config) {
    if (this.ariaLiveRegion) {
      const announcement = config.errorCategory 
        ? `${this.getErrorTitle(config.errorCategory)}: ${message}`
        : message;
      
      this.ariaLiveRegion.textContent = announcement;
      
      // Clear after announcement
      setTimeout(() => {
        this.ariaLiveRegion.textContent = '';
      }, 1000);
    }
  }

  dismiss(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;

    const element = toast.element;
    
    // Animate out
    element.classList.add('animate-out', 'slide-out-to-right-full', 'fade-out');
    element.style.pointerEvents = 'none';

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.toasts.delete(id);
      
      // Process queue
      this.processQueue();
      
      // Log dismissal
      this.logToastEvent('dismiss', id, toast.message, toast.config);
    }, 300);
  }

  dismissAll() {
    Array.from(this.toasts.keys()).forEach(id => this.dismiss(id));
  }

  processQueue() {
    if (this.toastQueue.length > 0 && this.toasts.size < this.maxToasts) {
      const queued = this.toastQueue.shift();
      this.toasts.set(queued.id, {
        element: queued.element,
        config: queued.config,
        message: queued.message,
        timestamp: Date.now()
      });
      
      this.container.appendChild(queued.element);
      
      requestAnimationFrame(() => {
        queued.element.classList.add('animate-in', 'slide-in-from-right-full', 'fade-in');
        queued.element.style.pointerEvents = 'auto';
      });

      if (!queued.config.persistent && queued.config.duration > 0) {
        setTimeout(() => this.dismiss(queued.id), queued.config.duration);
      }
    }
  }

  queueToast(toastData) {
    // Remove oldest queued toast if queue is full
    if (this.toastQueue.length >= 3) {
      this.toastQueue.shift();
    }
    this.toastQueue.push(toastData);
  }

  generateId() {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  logToastEvent(event, id, message, config) {
    try {
      // Only log actual errors, not successful toasts
      if (event === 'show' && config.category === TOAST_CATEGORIES.ERROR) {
        logError(new Error(message), {
          type: 'toastError',
          event,
          toastId: id,
          category: config.category,
          errorCategory: config.errorCategory,
          priority: config.priority,
          messageLength: message.length
        });
      } else if (process.env.NODE_ENV === 'development') {
        // Log all events in development for debugging
        console.debug(`Toast ${event}:`, { id, message, config });
      }
    } catch (error) {
      console.warn('Failed to log toast event:', error);
    }
  }

  // Convenience methods for different categories
  success(message, options = {}) {
    return this.show(message, { ...options, category: TOAST_CATEGORIES.SUCCESS });
  }

  error(message, options = {}) {
    return this.show(message, { ...options, category: TOAST_CATEGORIES.ERROR, priority: TOAST_PRIORITIES.HIGH });
  }

  warning(message, options = {}) {
    return this.show(message, { ...options, category: TOAST_CATEGORIES.WARNING });
  }

  info(message, options = {}) {
    return this.show(message, { ...options, category: TOAST_CATEGORIES.INFO });
  }

  loading(message, options = {}) {
    return this.show(message, { ...options, category: TOAST_CATEGORIES.LOADING, persistent: true });
  }

  // Error category convenience methods
  authError(message, options = {}) {
    return this.error(message, { ...options, errorCategory: ERROR_CATEGORIES.AUTHENTICATION });
  }

  validationError(message, options = {}) {
    return this.error(message, { ...options, errorCategory: ERROR_CATEGORIES.VALIDATION });
  }

  networkError(message, options = {}) {
    return this.error(message, { ...options, errorCategory: ERROR_CATEGORIES.NETWORK });
  }

  permissionError(message, options = {}) {
    return this.error(message, { ...options, errorCategory: ERROR_CATEGORIES.PERMISSION });
  }

  // Confirmation method
  confirm(message, options = {}) {
    return new Promise((resolve) => {
      const confirmId = this.show(message, {
        ...options,
        category: TOAST_CATEGORIES.CONFIRMATION,
        persistent: true,
        actions: [
          {
            label: options.confirmLabel || 'Confirm',
            style: 'primary',
            handler: () => resolve(true)
          },
          {
            label: options.cancelLabel || 'Cancel',
            style: 'secondary',
            handler: () => resolve(false)
          }
        ]
      });
      
      this.confirmationCallbacks.set(confirmId, resolve);
    });
  }

  // Get toast statistics
  getStats() {
    return {
      active: this.toasts.size,
      queued: this.toastQueue.length,
      maxToasts: this.maxToasts
    };
  }
}

// Create singleton instance
const professionalToast = new ProfessionalToastManager();

// Export singleton and utilities
export default professionalToast;
export { 
  ProfessionalToastManager
};