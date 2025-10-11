/**
 * ConfirmModal - Custom confirmation modal for Pluqla
 * Replaces window.confirm() with mobile-friendly, accessible modal
 * Matches Pluqla DA design system
 */

import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const ConfirmModal = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmColor = 'red', // 'red' or 'green'
  darkMode = false,
}) => {
  // ✅ FIX: Handle ESC key to close modal (accessibility)
  const handleEscKey = useCallback(
    (e) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    },
    [isOpen, onCancel]
  );

  useEffect(() => {
    if (isOpen) {
      // Add ESC key listener
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    // ✅ FIX: Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscKey]);

  if (!isOpen) return null;

  return (
    // Backdrop overlay
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop blur */}
      <div
        className={`absolute inset-0 transition-opacity ${
          darkMode ? 'bg-black/70' : 'bg-black/50'
        } backdrop-blur-sm`}
      />

      {/* Modal content */}
      <div
        className={`relative w-full max-w-md transform transition-all ${
          darkMode
            ? 'bg-slate-900/95 border-slate-700'
            : 'bg-white/95 border-gray-200'
        } border backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 mb-4 sm:mb-0`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
            confirmColor === 'red'
              ? 'bg-red-500/10'
              : 'bg-green-500/10'
          }`}
        >
          {confirmColor === 'red' ? (
            <svg
              className="w-8 h-8 text-[#F14545]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <h3
          id="modal-title"
          className={`text-xl font-bold text-center mb-2 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          className={`text-center mb-6 ${
            darkMode ? 'text-slate-300' : 'text-gray-600'
          }`}
        >
          {message}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Cancel button */}
          <button
            onClick={onCancel}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all min-h-[44px] ${
              darkMode
                ? 'bg-slate-800 text-white hover:bg-slate-700 active:bg-slate-600'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300'
            }`}
            autoFocus
          >
            {cancelText}
          </button>

          {/* Confirm button */}
          <button
            onClick={onConfirm}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-all shadow-lg min-h-[44px] ${
              confirmColor === 'red'
                ? 'bg-[#F14545] hover:bg-[#d93d3d] active:bg-[#c13535]'
                : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmColor: PropTypes.oneOf(['red', 'green']),
  darkMode: PropTypes.bool,
};

ConfirmModal.defaultProps = {
  confirmText: 'Confirmer',
  cancelText: 'Annuler',
  confirmColor: 'red',
  darkMode: false,
};

export default ConfirmModal;
