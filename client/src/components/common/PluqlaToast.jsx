import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * Phase 2A PluqlaToast Component
 * Système de notifications toast avec identité Pluqla
 *
 * Features:
 * - Animations slide-up fluides (Phase 2A)
 * - Variants colorés (success, error, info, warning) (Phase 2A)
 * - Auto-dismiss avec progress bar (Phase 2A)
 * - Stack management pour multiple toasts
 * - Context API pour usage global
 */

// Toast Context
const ToastContext = createContext(null);

// Hook pour utiliser les toasts
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    console.warn('useToast must be used within ToastProvider. Returning no-op toast functions.');
    // Return fallback no-op functions to prevent crashes
    return {
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
      custom: () => {},
      dismiss: () => {}
    };
  }
  return context;
};

/**
 * Toast Provider - Wrapper pour toute l'app
 */
export const ToastProvider = ({ children, position = 'top-right', maxToasts = 5 }) => {
  const [toasts, setToasts] = useState([]);

  // Ajouter un toast
  const addToast = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type: options.type || 'info', // success | error | info | warning
      duration: options.duration || 5000,
      action: options.action,
      ...options
    };

    setToasts((prev) => {
      const newToasts = [toast, ...prev];
      // Limiter le nombre de toasts visibles
      return newToasts.slice(0, maxToasts);
    });

    // Auto-dismiss si durée définie
    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }

    return id;
  }, [maxToasts]);

  // Retirer un toast
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Méthodes de convenance
  const toast = {
    success: (message, options) => addToast(message, { ...options, type: 'success' }),
    error: (message, options) => addToast(message, { ...options, type: 'error' }),
    info: (message, options) => addToast(message, { ...options, type: 'info' }),
    warning: (message, options) => addToast(message, { ...options, type: 'warning' }),
    custom: (message, options) => addToast(message, options),
    dismiss: removeToast
  };

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast Container */}
      <div className={`fixed ${positionClasses[position]} z-[9999] pointer-events-none`}>
        <div className="flex flex-col gap-3 w-full max-w-sm pointer-events-auto">
          <AnimatePresence mode="popLayout">
            {toasts.map((toastItem) => (
              <Toast
                key={toastItem.id}
                {...toastItem}
                onClose={() => removeToast(toastItem.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
};

/**
 * Individual Toast Component
 */
const Toast = ({
  id,
  message,
  type = 'info',
  duration = 5000,
  action,
  onClose
}) => {
  // Type configurations
  const typeConfig = {
    success: {
      icon: CheckCircle,
      borderColor: 'border-l-pluqla-green',
      iconColor: 'text-pluqla-green',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    error: {
      icon: AlertCircle,
      borderColor: 'border-l-pluqla-red',
      iconColor: 'text-pluqla-red',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    },
    warning: {
      icon: AlertTriangle,
      borderColor: 'border-l-pluqla-orange',
      iconColor: 'text-pluqla-orange',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    info: {
      icon: Info,
      borderColor: 'border-l-pluqla-blue',
      iconColor: 'text-pluqla-blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const IconComponent = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25
      }}
      className={`
        relative
        pluqla-card
        ${config.bgColor}
        border-l-4 ${config.borderColor}
        shadow-xl
        overflow-hidden
        max-w-sm
        w-full
      `}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          <IconComponent size={20} strokeWidth={2} />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-white font-medium leading-relaxed">
            {message}
          </p>

          {/* Action button */}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-semibold text-pluqla-red hover:text-pluqla-red-hover transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Progress bar (auto-dismiss indicator) */}
      {duration > 0 && (
        <motion.div
          className={`absolute bottom-0 left-0 h-1 ${config.borderColor.replace('border-l-', 'bg-')}`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{
            duration: duration / 1000,
            ease: "linear"
          }}
        />
      )}
    </motion.div>
  );
};

/**
 * Standalone Toast component (sans provider)
 * Utilisé pour des cas spécifiques où le context n'est pas nécessaire
 */
export const StandaloneToast = Toast;

export default Toast;
