/**
 * 🚀 Pluqla Performance Optimizer
 * Premium performance utilities for 90+ Lighthouse score
 */

// Web Vitals tracking for performance monitoring
export const trackWebVitals = (metric) => {
  // Only track in production
  if (process.env.NODE_ENV === 'production') {
    console.log(`[Performance] ${metric.name}:`, metric.value);

    // Send to analytics service in production
    if (window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Performance',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      });
    }
  }
};

// Image optimization utility
export const optimizeImage = (src, options = {}) => {
  const {
    width,
    height,
    quality = 85,
    format = 'webp'
  } = options;

  // Return optimized image URL
  if (src?.includes('unsplash') || src?.includes('cloudinary')) {
    // Use service-specific optimizations
    let optimizedSrc = src;

    if (width || height) {
      optimizedSrc += `?w=${width || 'auto'}&h=${height || 'auto'}`;
    }

    if (quality < 100) {
      optimizedSrc += `&q=${quality}`;
    }

    return optimizedSrc;
  }

  return src;
};

// Debounce utility for performance
export const debounce = (func, wait, immediate) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

// Throttle utility for scroll/resize events
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Bundle size analyzer helper
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    import('webpack-bundle-analyzer').then(({ BundleAnalyzerPlugin }) => {
      console.log('Bundle analyzer available in development mode');
    }).catch(() => {
      console.log('Bundle analyzer not available');
    });
  }
};

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
  fontLink.as = 'style';
  fontLink.crossOrigin = 'anonymous';
  document.head.appendChild(fontLink);

  // Preload critical CSS
  const criticalCSS = document.createElement('link');
  criticalCSS.rel = 'preload';
  criticalCSS.href = '/static/css/unified-theme.css';
  criticalCSS.as = 'style';
  document.head.appendChild(criticalCSS);
};

// Intersection Observer for lazy loading
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };

  if ('IntersectionObserver' in window) {
    return new IntersectionObserver(callback, defaultOptions);
  }

  // Fallback for older browsers
  return {
    observe: () => {},
    disconnect: () => {},
    unobserve: () => {}
  };
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if (performance.memory && process.env.NODE_ENV === 'development') {
    const memInfo = performance.memory;
    console.log('[Memory] Used:', Math.round(memInfo.usedJSHeapSize / 1024 / 1024), 'MB');
    console.log('[Memory] Total:', Math.round(memInfo.totalJSHeapSize / 1024 / 1024), 'MB');
    console.log('[Memory] Limit:', Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024), 'MB');
  }
};

// Critical rendering path optimization
export const optimizeCriticalRenderingPath = () => {
  // Remove non-critical CSS from initial load
  const nonCriticalCSS = document.querySelectorAll('link[rel="stylesheet"][data-non-critical]');
  nonCriticalCSS.forEach(link => {
    link.media = 'print';
    link.onload = function() {
      this.media = 'all';
    };
  });

  // Defer non-critical JavaScript
  const nonCriticalJS = document.querySelectorAll('script[data-non-critical]');
  nonCriticalJS.forEach(script => {
    script.defer = true;
  });
};

// Service Worker registration for PWA
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[SW] Registered successfully:', registration.scope);
        })
        .catch((error) => {
          console.log('[SW] Registration failed:', error);
        });
    });
  }
};

// Performance budget checker
export const checkPerformanceBudget = () => {
  if (process.env.NODE_ENV === 'development') {
    // Check bundle size
    fetch('/static/js/main.[hash].js', { method: 'HEAD' })
      .then(response => {
        const size = response.headers.get('content-length');
        const sizeKB = Math.round(size / 1024);

        if (sizeKB > 500) { // 500KB budget
          console.warn(`[Performance] Bundle size: ${sizeKB}KB exceeds 500KB budget`);
        } else {
          console.log(`[Performance] Bundle size: ${sizeKB}KB (within budget)`);
        }
      })
      .catch(() => {
        console.log('[Performance] Could not check bundle size');
      });
  }
};

// Accessibility helpers
export const announceToScreenReader = (message) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'pluqla-sr-only');
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Focus management for accessibility
export const trapFocus = (element) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

export default {
  trackWebVitals,
  optimizeImage,
  debounce,
  throttle,
  preloadCriticalResources,
  createIntersectionObserver,
  monitorMemoryUsage,
  optimizeCriticalRenderingPath,
  registerServiceWorker,
  checkPerformanceBudget,
  announceToScreenReader,
  trapFocus
};