/**
 * Toast Notification Utilities
 * Centralized toast notification helpers for consistent UX
 * Provides success, error, info, warning, and loading toasts
 */

import toast from 'react-hot-toast';

/**
 * Show success toast
 * @param {string} message - Success message
 * @param {object} options - Additional toast options
 */
export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    duration: 3000,
    ...options,
  });
};

/**
 * Show error toast
 * @param {string} message - Error message
 * @param {object} options - Additional toast options
 */
export const showError = (message, options = {}) => {
  return toast.error(message, {
    duration: 5000,
    ...options,
  });
};

/**
 * Show info toast (custom blue theme)
 * @param {string} message - Info message
 * @param {object} options - Additional toast options
 */
export const showInfo = (message, options = {}) => {
  return toast(message, {
    icon: 'ℹ️',
    duration: 4000,
    style: {
      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      color: '#3b82f6',
    },
    ...options,
  });
};

/**
 * Show warning toast (custom orange theme)
 * @param {string} message - Warning message
 * @param {object} options - Additional toast options
 */
export const showWarning = (message, options = {}) => {
  return toast(message, {
    icon: '⚠️',
    duration: 4500,
    style: {
      background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
      border: '1px solid rgba(251, 146, 60, 0.2)',
      color: '#f97316',
    },
    ...options,
  });
};

/**
 * Show loading toast
 * @param {string} message - Loading message
 * @param {object} options - Additional toast options
 * @returns {string} - Toast ID for later dismissal
 */
export const showLoading = (message, options = {}) => {
  return toast.loading(message, {
    ...options,
  });
};

/**
 * Dismiss a specific toast
 * @param {string} toastId - Toast ID to dismiss
 */
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

/**
 * Dismiss all toasts
 */
export const dismissAll = () => {
  toast.dismiss();
};

/**
 * Promise-based toast (shows loading, then success/error)
 * @param {Promise} promise - Promise to track
 * @param {object} messages - Messages for loading, success, error states
 * @param {object} options - Additional toast options
 */
export const showPromise = (
  promise,
  messages = {
    loading: 'Chargement...',
    success: 'Terminé !',
    error: 'Une erreur est survenue',
  },
  options = {}
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    options
  );
};

/**
 * Show transaction action toast (custom transaction theme)
 * @param {string} action - Action type (added, updated, deleted)
 * @param {string} description - Transaction description
 * @param {number} amount - Transaction amount
 */
export const showTransactionToast = (action, description, amount) => {
  const icons = {
    added: '➕',
    updated: '✏️',
    deleted: '🗑️',
  };

  const messages = {
    added: 'Transaction ajoutée',
    updated: 'Transaction mise à jour',
    deleted: 'Transaction supprimée',
  };

  return toast.success(
    `${messages[action]}: ${description} (${new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)})`,
    {
      icon: icons[action],
      duration: 3000,
    }
  );
};

/**
 * Show budget alert toast
 * @param {string} category - Budget category
 * @param {number} percentage - Budget usage percentage
 */
export const showBudgetAlert = (category, percentage) => {
  if (percentage >= 100) {
    return showError(`Budget ${category} dépassé (${percentage.toFixed(0)}%)`, {
      duration: 6000,
    });
  } else if (percentage >= 90) {
    return showWarning(`Budget ${category} presque atteint (${percentage.toFixed(0)}%)`, {
      duration: 5000,
    });
  }
};

/**
 * Show offline mode toast
 */
export const showOfflineToast = () => {
  return toast('Vous êtes hors ligne', {
    icon: '📡',
    duration: Infinity,
    style: {
      background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(100, 116, 139, 0.1) 100%)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      color: '#64748b',
    },
  });
};

/**
 * Show online mode toast
 */
export const showOnlineToast = () => {
  return showSuccess('Connexion rétablie', {
    icon: '✅',
    duration: 2000,
  });
};

export default {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  loading: showLoading,
  promise: showPromise,
  dismiss: dismissToast,
  dismissAll,
  transaction: showTransactionToast,
  budgetAlert: showBudgetAlert,
  offline: showOfflineToast,
  online: showOnlineToast,
};
