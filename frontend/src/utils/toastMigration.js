// Toast Migration Utility
// Use this to systematically replace alert() calls with professional toasts

import professionalToast from '../lib/professionalToast';

/**
 * Temporary global replacement functions
 * These override window.alert and window.confirm during migration
 */

// Store original functions for fallback
const originalAlert = window.alert;
const originalConfirm = window.confirm;

/**
 * Professional alert replacement
 */
window.alert = function(message) {
  console.warn('Using legacy alert() - consider migrating to useToast() hook');
  
  // Auto-categorize based on message content
  if (
    message.toLowerCase().includes('login') ||
    message.toLowerCase().includes('logged in') ||
    message.toLowerCase().includes('sign in')
  ) {
    return professionalToast.authError(message);
  }
  
  if (
    message.toLowerCase().includes('valid') ||
    message.toLowerCase().includes('select') ||
    message.toLowerCase().includes('required')
  ) {
    return professionalToast.validationError(message);
  }
  
  if (
    message.toLowerCase().includes('saved') ||
    message.toLowerCase().includes('submitted') ||
    message.toLowerCase().includes('copied') ||
    message.toLowerCase().includes('success')
  ) {
    return professionalToast.success(message);
  }
  
  if (
    message.toLowerCase().includes('error') ||
    message.toLowerCase().includes('failed')
  ) {
    return professionalToast.error(message);
  }
  
  if (
    message.toLowerCase().includes('short') ||
    message.toLowerCase().includes('limit')
  ) {
    return professionalToast.warning(message);
  }
  
  // Default to info toast
  return professionalToast.info(message);
};

/**
 * Professional confirm replacement
 * Returns a Promise for consistency
 */
window.confirm = async function(message) {
  console.warn('Using legacy confirm() - consider migrating to useToast() hook');
  
  return await professionalToast.confirm(message, {
    confirmLabel: message.toLowerCase().includes('delete') ? 'Delete' : 'OK',
    cancelLabel: message.toLowerCase().includes('delete') ? 'Cancel' : 'Cancel'
  });
};

/**
 * Restore original functions (for testing or fallback)
 */
export const restoreOriginalAlerts = () => {
  window.alert = originalAlert;
  window.confirm = originalConfirm;
};

/**
 * Migration status check
 */
export const checkMigrationStatus = () => {
  const alertUsage = document.body.innerHTML.match(/alert\(/g) || [];
  const confirmUsage = document.body.innerHTML.match(/window\.confirm\(/g) || [];
  
  return {
    alertCalls: alertUsage.length,
    confirmCalls: confirmUsage.length,
    migrationComplete: alertUsage.length === 0 && confirmUsage.length === 0
  };
};

console.log('🔄 Toast migration utility loaded - alert() and confirm() are now professional toasts');
console.log('⚠️  This is temporary - migrate to useToast() hook for production');

export default {
  restoreOriginalAlerts,
  checkMigrationStatus
};