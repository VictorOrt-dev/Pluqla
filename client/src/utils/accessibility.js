/**
 * Accessibility Utilities
 *
 * Helper functions for improving accessibility in the application
 */

/**
 * Generate unique ID for ARIA labels
 */
export const generateAriaId = (prefix = 'aria') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Handle keyboard navigation for interactive elements
 * @param {KeyboardEvent} event
 * @param {Function} onActivate - Function to call on Enter/Space
 */
export const handleKeyboardActivation = (event, onActivate) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate(event);
  }
};

/**
 * Handle keyboard navigation for lists/grids
 * @param {KeyboardEvent} event
 * @param {Object} options - Navigation options
 */
export const handleKeyboardNavigation = (event, options = {}) => {
  const {
    currentIndex,
    itemCount,
    onNavigate,
    orientation = 'vertical', // 'vertical' | 'horizontal' | 'grid'
    columnsPerRow = 3
  } = options;

  let newIndex = currentIndex;

  switch (orientation) {
    case 'vertical':
      if (event.key === 'ArrowDown') {
        newIndex = Math.min(currentIndex + 1, itemCount - 1);
      } else if (event.key === 'ArrowUp') {
        newIndex = Math.max(currentIndex - 1, 0);
      } else if (event.key === 'Home') {
        newIndex = 0;
      } else if (event.key === 'End') {
        newIndex = itemCount - 1;
      }
      break;

    case 'horizontal':
      if (event.key === 'ArrowRight') {
        newIndex = Math.min(currentIndex + 1, itemCount - 1);
      } else if (event.key === 'ArrowLeft') {
        newIndex = Math.max(currentIndex - 1, 0);
      } else if (event.key === 'Home') {
        newIndex = 0;
      } else if (event.key === 'End') {
        newIndex = itemCount - 1;
      }
      break;

    case 'grid':
      if (event.key === 'ArrowRight') {
        newIndex = Math.min(currentIndex + 1, itemCount - 1);
      } else if (event.key === 'ArrowLeft') {
        newIndex = Math.max(currentIndex - 1, 0);
      } else if (event.key === 'ArrowDown') {
        newIndex = Math.min(currentIndex + columnsPerRow, itemCount - 1);
      } else if (event.key === 'ArrowUp') {
        newIndex = Math.max(currentIndex - columnsPerRow, 0);
      } else if (event.key === 'Home') {
        newIndex = 0;
      } else if (event.key === 'End') {
        newIndex = itemCount - 1;
      }
      break;

    default:
      return;
  }

  if (newIndex !== currentIndex) {
    event.preventDefault();
    onNavigate(newIndex);
  }
};

/**
 * Create screen reader announcement
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' | 'assertive'
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only'; // Visually hidden
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Focus trap for modals
 * @param {HTMLElement} container - Container element
 */
export const createFocusTrap = (container) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (event) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Skip navigation helper
 */
export const skipToContent = (contentId) => {
  const content = document.getElementById(contentId);
  if (content) {
    content.setAttribute('tabindex', '-1');
    content.focus();
    content.removeAttribute('tabindex');
  }
};

/**
 * Check if element is visible in viewport
 */
export const isInViewport = (element) => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Scroll element into view if needed
 */
export const scrollIntoViewIfNeeded = (element, options = {}) => {
  if (!isInViewport(element)) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
      ...options
    });
  }
};

/**
 * Format date for screen readers
 */
export const formatDateForScreenReader = (date) => {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};

/**
 * Format time for screen readers
 */
export const formatTimeForScreenReader = (minutes) => {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} hours and ${mins} minutes` : `${hours} hours`;
};

/**
 * Format price for screen readers
 */
export const formatPriceForScreenReader = (price, currency = 'EUR') => {
  return `${price.toFixed(2)} ${currency}`;
};

/**
 * Get aria-label for action buttons
 */
export const getActionAriaLabel = (action, itemName) => {
  const actionLabels = {
    edit: `Edit ${itemName}`,
    delete: `Delete ${itemName}`,
    view: `View ${itemName}`,
    share: `Share ${itemName}`,
    favorite: `Add ${itemName} to favorites`,
    unfavorite: `Remove ${itemName} from favorites`,
    swap: `Swap ${itemName}`,
    copy: `Copy ${itemName}`,
    export: `Export ${itemName}`,
    print: `Print ${itemName}`
  };

  return actionLabels[action] || `Perform ${action} on ${itemName}`;
};

export default {
  generateAriaId,
  handleKeyboardActivation,
  handleKeyboardNavigation,
  announceToScreenReader,
  createFocusTrap,
  skipToContent,
  isInViewport,
  scrollIntoViewIfNeeded,
  formatDateForScreenReader,
  formatTimeForScreenReader,
  formatPriceForScreenReader,
  getActionAriaLabel
};
