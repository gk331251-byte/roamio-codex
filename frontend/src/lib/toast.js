// Modern toast notification system
import { ErrorLogger } from './errorLogger';

class ToastManager {
  constructor() {
    this.toasts = new Map();
    this.container = null;
    this.init();
  }

  init() {
    // Create toast container if it doesn't exist
    if (typeof window !== 'undefined' && !this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 max-w-md w-full px-4';
      document.body.appendChild(this.container);
    }
  }

  generateId() {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  show(message, type = 'info', options = {}) {
    if (!this.container) this.init();
    
    const id = this.generateId();
    const duration = options.duration || (type === 'error' ? 6000 : 4000);
    const dismissible = options.dismissible !== false;

    const toast = this.createToast(id, message, type, dismissible);
    this.container.appendChild(toast);
    this.toasts.set(id, toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('animate-in', 'slide-in-from-top-2', 'fade-in');
    });

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  createToast(id, message, type, dismissible) {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = `relative p-4 rounded-lg shadow-lg border ${this.getToastStyles(type)} transition-all duration-300`;

    const icon = this.getIcon(type);
    const dismissButton = dismissible ? `
      <button 
        class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 p-1"
        onclick="window.toastManager.dismiss('${id}')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    ` : '';

    toast.innerHTML = `
      <div class="flex items-start ${dismissible ? 'pr-8' : ''}">
        <div class="flex-shrink-0 mr-3">
          ${icon}
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium">${message}</p>
        </div>
      </div>
      ${dismissButton}
    `;

    return toast;
  }

  getToastStyles(type) {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  }

  getIcon(type) {
    const iconClass = 'w-5 h-5';
    
    switch (type) {
      case 'success':
        return `
          <svg class="${iconClass} text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        `;
      case 'error':
        return `
          <svg class="${iconClass} text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        `;
      case 'warning':
        return `
          <svg class="${iconClass} text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        `;
      case 'info':
      default:
        return `
          <svg class="${iconClass} text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        `;
    }
  }

  dismiss(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;

    // Animate out
    toast.classList.add('animate-out', 'slide-out-to-top-2', 'fade-out');
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts.delete(id);
    }, 300);
  }

  dismissAll() {
    this.toasts.forEach((_, id) => this.dismiss(id));
  }

  // Legacy support for existing code
  error(message, options = {}) {
    // Log error for tracking
    ErrorLogger.logError(new Error(message), {
      type: 'userToastError',
      source: 'toast.error'
    });
    
    return this.show(message, 'error', options);
  }

  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }
}

// Create global instance
const toastManager = new ToastManager();

// Make it globally available for dismiss buttons
if (typeof window !== 'undefined') {
  window.toastManager = toastManager;
}

// Export main function for backward compatibility
export function toast(message) {
  return toastManager.info(message);
}

// Export specialized functions
export const showToast = (message, type, options) => toastManager.show(message, type, options);
export const dismissToast = (id) => toastManager.dismiss(id);
export const dismissAllToasts = () => toastManager.dismissAll();

// Export toast type functions
export const toastError = (message, options) => toastManager.error(message, options);
export const toastSuccess = (message, options) => toastManager.success(message, options);
export const toastWarning = (message, options) => toastManager.warning(message, options);
export const toastInfo = (message, options) => toastManager.info(message, options);

export default toastManager;
