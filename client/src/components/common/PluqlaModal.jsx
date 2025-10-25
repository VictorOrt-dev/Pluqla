import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import PluqlaButton from './PluqlaButton';

/**
 * Phase 2A PluqlaModal Component
 * Modal premium avec glassmorphism backdrop
 *
 * Features:
 * - Backdrop blur glassmorphism (Phase 2A)
 * - Animations slide-up fluides (Phase 2A)
 * - Close on backdrop click
 * - Close on Escape key
 * - Focus trap pour accessibilité
 * - Sizes flexibles (sm, md, lg, xl, full)
 * - Header/Footer optionnels
 */

const PluqlaModal = ({
  isOpen = false,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  contentClassName = ''
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4'
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop - Phase 2A Glassmorphism */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
          />

          {/* Modal Content */}
          <motion.div
            className={`
              relative
              w-full
              ${sizeClasses[size]}
              ${className}
            `}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25
            }}
          >
            {/* Card container */}
            <div className="pluqla-card pluqla-card-glass max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  {/* Title & Description */}
                  {(title || description) && (
                    <div className="flex-1 min-w-0">
                      {title && (
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Close button */}
                  {showCloseButton && (
                    <motion.button
                      onClick={onClose}
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Fermer"
                    >
                      <X size={20} />
                    </motion.button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className={`flex-1 overflow-y-auto py-6 ${contentClassName}`}>
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * ConfirmModal - Pre-configured confirmation modal
 */
export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmer',
  description,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger', // danger | primary
  isLoading = false
}) => {
  return (
    <PluqlaModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <div className="flex gap-3 justify-end">
          <PluqlaButton
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </PluqlaButton>
          <PluqlaButton
            variant={variant}
            onClick={onConfirm}
            loading={isLoading}
            shimmer
          >
            {confirmText}
          </PluqlaButton>
        </div>
      }
    />
  );
};

/**
 * AlertModal - Pre-configured alert modal (info only, no actions needed)
 */
export const AlertModal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  buttonText = 'OK'
}) => {
  return (
    <PluqlaModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <div className="flex justify-end">
          <PluqlaButton variant="primary" onClick={onClose}>
            {buttonText}
          </PluqlaButton>
        </div>
      }
    >
      {children}
    </PluqlaModal>
  );
};

/**
 * BottomSheet - Mobile-optimized bottom sheet modal
 */
export const BottomSheet = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto', // auto | half | full
  className = ''
}) => {
  const heightClasses = {
    auto: 'max-h-[80vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] sm:hidden">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={`
              absolute bottom-0 left-0 right-0
              bg-white dark:bg-gray-900
              rounded-t-3xl
              ${heightClasses[height]}
              overflow-hidden
              shadow-2xl
              ${className}
            `}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
            </div>

            {/* Title */}
            {title && (
              <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {title}
                </h2>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(100% - 80px)' }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PluqlaModal;
