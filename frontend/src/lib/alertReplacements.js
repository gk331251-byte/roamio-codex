// Alert Replacement Utilities
// Professional replacements for window.alert() and window.confirm()

import professionalToast, { ERROR_CATEGORIES, TOAST_PRIORITIES } from './professionalToast';

/**
 * Professional replacement for window.alert()
 * Automatically categorizes alerts based on content and context
 */
export const showAlert = (message, context = {}) => {
  const { 
    type = 'auto', // 'auto', 'error', 'warning', 'info', 'success'
    priority = TOAST_PRIORITIES.MEDIUM,
    component = 'unknown',
    action = null
  } = context;

  // Auto-detect type based on message content if not specified
  let detectedType = type;
  let errorCategory = null;

  if (type === 'auto') {
    detectedType = detectAlertType(message);
    errorCategory = detectErrorCategory(message);
  }

  // Create appropriate toast based on detected type
  switch (detectedType) {
    case 'auth':
      return professionalToast.authError(message, {
        priority,
        metadata: { component, action }
      });
      
    case 'validation':
      return professionalToast.validationError(message, {
        priority,
        metadata: { component, action }
      });
      
    case 'network':
      return professionalToast.networkError(message, {
        priority,
        metadata: { component, action }
      });
      
    case 'permission':
      return professionalToast.permissionError(message, {
        priority,
        metadata: { component, action }
      });
      
    case 'error':
      return professionalToast.error(message, {
        errorCategory,
        priority,
        metadata: { component, action }
      });
      
    case 'warning':
      return professionalToast.warning(message, {
        priority,
        metadata: { component, action }
      });
      
    case 'success':
      return professionalToast.success(message, {
        priority,
        metadata: { component, action }
      });
      
    case 'info':
    default:
      return professionalToast.info(message, {
        priority,
        metadata: { component, action }
      });
  }
};

/**
 * Professional replacement for window.confirm()
 * Returns a Promise that resolves to boolean
 */
export const showConfirm = async (message, options = {}) => {
  const {
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    priority = TOAST_PRIORITIES.HIGH,
    type = 'confirmation'
  } = options;

  return await professionalToast.confirm(message, {
    confirmLabel,
    cancelLabel,
    priority,
    metadata: { type: 'confirm_replacement' }
  });
};

/**
 * Detect alert type based on message content
 */
function detectAlertType(message) {
  const lowerMessage = message.toLowerCase();
  
  // Authentication patterns
  if (
    lowerMessage.includes('login') ||
    lowerMessage.includes('sign in') ||
    lowerMessage.includes('logged in') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('unauthorized')
  ) {
    return 'auth';
  }
  
  // Validation patterns
  if (
    lowerMessage.includes('valid') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('select valid') ||
    lowerMessage.includes('enter') ||
    lowerMessage.includes('choose')
  ) {
    return 'validation';
  }
  
  // Network/connection patterns
  if (
    lowerMessage.includes('failed') ||
    lowerMessage.includes('error') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('timeout')
  ) {
    return 'network';
  }
  
  // Permission patterns
  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('not allowed') ||
    lowerMessage.includes('unauthorized')
  ) {
    return 'permission';
  }
  
  // Success patterns
  if (
    lowerMessage.includes('success') ||
    lowerMessage.includes('saved') ||
    lowerMessage.includes('completed') ||
    lowerMessage.includes('created') ||
    lowerMessage.includes('submitted')
  ) {
    return 'success';
  }
  
  // Error patterns (general)
  if (
    lowerMessage.includes('error') ||
    lowerMessage.includes('failed') ||
    lowerMessage.includes('problem') ||
    lowerMessage.includes('wrong')
  ) {
    return 'error';
  }
  
  // Default to info
  return 'info';
}

/**
 * Detect error category for better categorization
 */
function detectErrorCategory(message) {
  const lowerMessage = message.toLowerCase();
  
  if (
    lowerMessage.includes('login') ||
    lowerMessage.includes('sign in') ||
    lowerMessage.includes('authentication')
  ) {
    return ERROR_CATEGORIES.AUTHENTICATION;
  }
  
  if (
    lowerMessage.includes('valid') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('select valid')
  ) {
    return ERROR_CATEGORIES.VALIDATION;
  }
  
  if (
    lowerMessage.includes('connection') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('failed')
  ) {
    return ERROR_CATEGORIES.NETWORK;
  }
  
  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('access')
  ) {
    return ERROR_CATEGORIES.PERMISSION;
  }
  
  return ERROR_CATEGORIES.USER_ACTION;
}

/**
 * Context-aware alert functions for common scenarios
 */

// Authentication alerts
export const authAlert = (message = "Please sign in to continue") => {
  return professionalToast.authError(message, {
    actions: [
      {
        label: 'Sign In',
        style: 'primary',
        handler: () => {
          // This should be customized based on the app's auth flow
          window.location.href = '/login';
        }
      }
    ]
  });
};

// Validation alerts
export const validationAlert = (message) => {
  return professionalToast.validationError(message, {
    priority: TOAST_PRIORITIES.HIGH
  });
};

// Success alerts
export const successAlert = (message) => {
  return professionalToast.success(message);
};

// Error alerts
export const errorAlert = (message) => {
  return professionalToast.error(message, {
    priority: TOAST_PRIORITIES.HIGH
  });
};

// Copy to clipboard alert
export const copyAlert = (message = "Copied to clipboard") => {
  return professionalToast.success(message, {
    duration: 2000
  });
};

// Save/submit alerts
export const saveAlert = (message = "Saved successfully") => {
  return professionalToast.success(message);
};

// Delete confirmation
export const deleteConfirm = async (itemName = "this item") => {
  return await professionalToast.confirm(
    `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
    {
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      priority: TOAST_PRIORITIES.CRITICAL
    }
  );
};

// Leave confirmation
export const leaveConfirm = async (message = "Are you sure you want to leave?") => {
  return await professionalToast.confirm(message, {
    confirmLabel: 'Leave',
    cancelLabel: 'Stay',
    priority: TOAST_PRIORITIES.HIGH
  });
};

// Share confirmation
export const shareConfirm = async (message = "Share this quest publicly?") => {
  return await professionalToast.confirm(message, {
    confirmLabel: 'Share',
    cancelLabel: 'Cancel',
    priority: TOAST_PRIORITIES.MEDIUM
  });
};

// Report submission
export const reportAlert = (message = "Report submitted") => {
  return professionalToast.success(message, {
    duration: 3000
  });
};

/**
 * Global alert replacement - can be used to override window.alert
 * Only use this for gradual migration
 */
export const globalAlertReplacement = (message) => {
  console.warn('Using legacy alert replacement. Consider using showAlert() or useToast() instead.');
  return showAlert(message, { component: 'legacy' });
};

/**
 * Global confirm replacement - can be used to override window.confirm
 * Only use this for gradual migration
 */
export const globalConfirmReplacement = async (message) => {
  console.warn('Using legacy confirm replacement. Consider using showConfirm() or useToast() instead.');
  return await showConfirm(message);
};

// Export default functions for easy replacement
export default {
  alert: showAlert,
  confirm: showConfirm,
  authAlert,
  validationAlert,
  successAlert,
  errorAlert,
  copyAlert,
  saveAlert,
  deleteConfirm,
  leaveConfirm,
  shareConfirm,
  reportAlert
};