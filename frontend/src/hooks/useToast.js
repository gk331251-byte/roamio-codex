// useToast Hook - React integration for professional toast system
import { useCallback, useRef, useEffect } from 'react';
import professionalToast, { 
  TOAST_CATEGORIES, 
  ERROR_CATEGORIES, 
  TOAST_PRIORITIES 
} from '../lib/professionalToast';

/**
 * React hook for professional toast notifications
 * @param {Object} defaultOptions - Default configuration for all toasts from this hook
 * @returns {Object} - Toast methods and utilities
 */
export const useToast = (defaultOptions = {}) => {
  const activeToasts = useRef(new Set());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Dismiss all toasts created by this hook instance
      activeToasts.current.forEach((toastId) => {
        professionalToast.dismiss(toastId);
      });
      activeToasts.current.clear();
    };
  }, []);

  // Track toast creation
  const trackToast = useCallback((toastId) => {
    activeToasts.current.add(toastId);
    
    // Auto-remove from tracking after it's dismissed
    setTimeout(() => {
      activeToasts.current.delete(toastId);
    }, 10000); // Max toast lifetime
  }, []);

  // Base show method
  const show = useCallback((message, options = {}) => {
    const mergedOptions = { ...defaultOptions, ...options };
    const toastId = professionalToast.show(message, mergedOptions);
    trackToast(toastId);
    return toastId;
  }, [defaultOptions, trackToast]);

  // Category methods
  const success = useCallback((message, options = {}) => {
    const toastId = professionalToast.success(message, { ...defaultOptions, ...options });
    trackToast(toastId);
    return toastId;
  }, [defaultOptions, trackToast]);

  const error = useCallback((message, options = {}) => {
    const toastId = professionalToast.error(message, { ...defaultOptions, ...options });
    trackToast(toastId);
    return toastId;
  }, [defaultOptions, trackToast]);

  const warning = useCallback((message, options = {}) => {
    const toastId = professionalToast.warning(message, { ...defaultOptions, ...options });
    trackToast(toastId);
    return toastId;
  }, [defaultOptions, trackToast]);

  const info = useCallback((message, options = {}) => {
    const toastId = professionalToast.info(message, { ...defaultOptions, ...options });
    trackToast(toastId);
    return toastId;
  }, [defaultOptions, trackToast]);

  const loading = useCallback((message, options = {}) => {
    const toastId = professionalToast.loading(message, { ...defaultOptions, ...options });
    trackToast(toastId);
    return toastId;
  }, [defaultOptions, trackToast]);

  // Error category methods
  const authError = useCallback((message = "Please sign in to continue", options = {}) => {
    const toastId = professionalToast.authError(message, { 
      ...defaultOptions, 
      ...options,
      actions: [
        {
          label: 'Sign In',
          style: 'primary',
          handler: () => {
            // This can be overridden by the component
            if (options.onSignIn) {
              options.onSignIn();
            } else {
              window.location.href = '/login';
            }
          }
        }
      ]
    });
    trackToast(toastId);
    return toastId;
  }, [defaultOptions, trackToast]);

  const validationError = useCallback((message, options = {}) => {
    const toastId = professionalToast.validationError(message, { ...defaultOptions, ...options });
    trackToast(toastId);
    return toastId;
  }, [defaultOptions, trackToast]);

  const networkError = useCallback((message = "Connection failed. Please check your internet and try again.", options = {}) => {
    const toastId = professionalToast.networkError(message, { 
      ...defaultOptions, 
      ...options,
      actions: [
        {
          label: 'Retry',
          style: 'primary',
          handler: () => {
            if (options.onRetry) {
              options.onRetry();
            }
          }
        }
      ]
    });
    trackToast(toastId);
    return toastId;
  }, [defaultOptions, trackToast]);

  const permissionError = useCallback((message = "You don't have permission to perform this action", options = {}) => {
    const toastId = professionalToast.permissionError(message, { ...defaultOptions, ...options });
    trackToast(toastId);
    return toastId;
  }, [defaultOptions, trackToast]);

  // Confirmation method (replaces window.confirm)
  const confirm = useCallback(async (message, options = {}) => {
    const mergedOptions = {
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      ...defaultOptions,
      ...options
    };
    
    return await professionalToast.confirm(message, mergedOptions);
  }, [defaultOptions]);

  // Specialized confirmation methods
  const confirmDelete = useCallback(async (itemName = "this item", options = {}) => {
    return await confirm(`Are you sure you want to delete ${itemName}? This action cannot be undone.`, {
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      priority: TOAST_PRIORITIES.HIGH,
      ...options
    });
  }, [confirm]);

  const confirmLogout = useCallback(async (options = {}) => {
    return await confirm("Are you sure you want to sign out?", {
      confirmLabel: 'Sign Out',
      cancelLabel: 'Stay',
      ...options
    });
  }, [confirm]);

  const confirmLeave = useCallback(async (options = {}) => {
    return await confirm("You have unsaved changes. Are you sure you want to leave?", {
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
      priority: TOAST_PRIORITIES.HIGH,
      ...options
    });
  }, [confirm]);

  // Loading states with updates
  const showLoading = useCallback((message = "Loading...", options = {}) => {
    return loading(message, options);
  }, [loading]);

  const updateLoading = useCallback((toastId, newMessage, options = {}) => {
    // Dismiss old and show new (since we can't update existing toast content easily)
    professionalToast.dismiss(toastId);
    return showLoading(newMessage, options);
  }, [showLoading]);

  const dismissLoading = useCallback((toastId, successMessage) => {
    professionalToast.dismiss(toastId);
    if (successMessage) {
      return success(successMessage);
    }
  }, [success]);

  // Utilities
  const dismiss = useCallback((toastId) => {
    professionalToast.dismiss(toastId);
    activeToasts.current.delete(toastId);
  }, []);

  const dismissAll = useCallback(() => {
    professionalToast.dismissAll();
    activeToasts.current.clear();
  }, []);

  const getStats = useCallback(() => {
    return professionalToast.getStats();
  }, []);

  // Batch operations
  const showMultiple = useCallback((messages = []) => {
    const toastIds = messages.map(({ message, options = {} }) => {
      const toastId = show(message, options);
      return toastId;
    });
    return toastIds;
  }, [show]);

  // Progress notification (for long operations)
  const showProgress = useCallback((initialMessage, steps = []) => {
    let currentToastId = showLoading(initialMessage);
    let currentStep = 0;

    const updateProgress = (stepMessage) => {
      if (currentStep < steps.length) {
        dismiss(currentToastId);
        currentToastId = showLoading(stepMessage || steps[currentStep]);
        currentStep++;
      }
    };

    const completeProgress = (successMessage = "Completed successfully") => {
      dismiss(currentToastId);
      return success(successMessage);
    };

    const failProgress = (errorMessage = "Operation failed") => {
      dismiss(currentToastId);
      return error(errorMessage);
    };

    return {
      update: updateProgress,
      complete: completeProgress,
      fail: failProgress,
      dismiss: () => dismiss(currentToastId)
    };
  }, [showLoading, dismiss, success, error]);

  return {
    // Basic methods
    show,
    success,
    error,
    warning,
    info,
    loading,

    // Error category methods
    authError,
    validationError,
    networkError,
    permissionError,

    // Confirmation methods
    confirm,
    confirmDelete,
    confirmLogout,
    confirmLeave,

    // Loading methods
    showLoading,
    updateLoading,
    dismissLoading,

    // Progress methods
    showProgress,

    // Utilities
    dismiss,
    dismissAll,
    getStats,
    showMultiple,

    // Constants for component use
    CATEGORIES: TOAST_CATEGORIES,
    ERROR_CATEGORIES,
    PRIORITIES: TOAST_PRIORITIES
  };
};

export default useToast;