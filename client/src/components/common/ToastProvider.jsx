/**
 * Toast Notification Provider - Premium toast notifications
 * Wraps react-hot-toast with Pluqla design system
 * Accessible, mobile-optimized, brand-consistent
 */

import React from 'react';
import { Toaster } from 'react-hot-toast';
import PropTypes from 'prop-types';

const ToastProvider = ({ darkMode = false, children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{
          /* ✅ FIX: iOS notch/Dynamic Island safe area - ensures toast clears status bar */
          top: 'max(env(safe-area-inset-top, 20px), 60px)',
        }}
        toastOptions={{
          // Default options
          duration: 4000,
          style: {
            background: darkMode ? '#1e293b' : '#ffffff',
            color: darkMode ? '#f1f5f9' : '#0f172a',
            borderRadius: '16px',
            border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
            backdropFilter: 'blur(12px)',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: darkMode
              ? '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)'
              : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            maxWidth: '420px',
          },

          // Success toast
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
            style: {
              background: darkMode
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(236, 253, 245, 0.95) 0%, rgba(209, 250, 229, 0.95) 100%)',
              border: darkMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid #d1fae5',
              color: darkMode ? '#6ee7b7' : '#047857',
            },
          },

          // Error toast
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#F14545',
              secondary: '#ffffff',
            },
            style: {
              background: darkMode
                ? 'linear-gradient(135deg, rgba(241, 69, 69, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 226, 226, 0.95) 100%)',
              border: darkMode ? '1px solid rgba(241, 69, 69, 0.3)' : '1px solid #fecaca',
              color: darkMode ? '#fca5a5' : '#991b1b',
            },
          },

          // Loading toast
          loading: {
            iconTheme: {
              primary: '#F14545',
              secondary: '#ffffff',
            },
            style: {
              background: darkMode
                ? 'linear-gradient(135deg, rgba(241, 69, 69, 0.1) 0%, rgba(255, 107, 107, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(254, 242, 242, 0.9) 0%, rgba(254, 226, 226, 0.9) 100%)',
              border: darkMode ? '1px solid rgba(241, 69, 69, 0.2)' : '1px solid #fecaca',
            },
          },

          // Custom info/warning toast
          custom: {
            duration: 4000,
          },
        }}
      />

      {/* Custom toast animation styles */}
      <style>{`
        /* Toast enter animation */
        @keyframes toast-enter {
          from {
            transform: translate3d(0, -100%, 0) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }

        /* Toast exit animation */
        @keyframes toast-exit {
          from {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
          to {
            transform: translate3d(0, -100%, 0) scale(0.95);
            opacity: 0;
          }
        }

        /* Apply animations */
        [data-sonner-toast] {
          animation: toast-enter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        [data-sonner-toast][data-exit='true'] {
          animation: toast-exit 0.2s cubic-bezier(0.4, 0, 1, 1);
        }

        /* Mobile optimization */
        @media (max-width: 640px) {
          [data-sonner-toast] {
            left: 16px !important;
            right: 16px !important;
            max-width: calc(100vw - 32px) !important;
          }
        }

        /* Ensure GPU acceleration */
        [data-sonner-toast] {
          will-change: transform, opacity;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </>
  );
};

ToastProvider.propTypes = {
  darkMode: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default ToastProvider;
