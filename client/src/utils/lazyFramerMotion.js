/**
 * LAZY FRAMER MOTION WRAPPER
 *
 * Loads framer-motion dynamically to reduce main bundle size by ~80 KB
 * Falls back to non-animated components until loaded
 *
 * Usage:
 * import { motion, AnimatePresence } from './utils/lazyFramerMotion';
 *
 * Instead of:
 * import { motion, AnimatePresence } from 'framer-motion';
 */

import { lazy, Suspense, forwardRef, createElement } from 'react';

// Lazy load framer-motion
let framerMotionPromise = null;
let framerMotion = null;

function loadFramerMotion() {
  if (!framerMotionPromise) {
    framerMotionPromise = import('framer-motion').then(module => {
      framerMotion = module;
      return module;
    });
  }
  return framerMotionPromise;
}

// Preload framer-motion after initial render (non-blocking)
if (typeof window !== 'undefined') {
  // Wait 2 seconds after page load to preload
  setTimeout(() => {
    loadFramerMotion();
  }, 2000);
}

/**
 * Create a lazy motion component
 * Falls back to regular div until framer-motion loads
 */
function createLazyMotionComponent(type = 'div') {
  return forwardRef((props, ref) => {
    if (framerMotion && framerMotion.motion) {
      // Framer-motion loaded, use it
      return createElement(framerMotion.motion[type], { ...props, ref });
    }

    // Fallback: render without animation
    const {
      initial,
      animate,
      exit,
      whileHover,
      whileTap,
      transition,
      variants,
      ...restProps
    } = props;

    return createElement(type, { ...restProps, ref });
  });
}

// Export lazy motion components
export const motion = {
  div: createLazyMotionComponent('div'),
  span: createLazyMotionComponent('span'),
  button: createLazyMotionComponent('button'),
  section: createLazyMotionComponent('section'),
  article: createLazyMotionComponent('article'),
  nav: createLazyMotionComponent('nav'),
  header: createLazyMotionComponent('header'),
  footer: createLazyMotionComponent('footer'),
  ul: createLazyMotionComponent('ul'),
  li: createLazyMotionComponent('li'),
  p: createLazyMotionComponent('p'),
  h1: createLazyMotionComponent('h1'),
  h2: createLazyMotionComponent('h2'),
  h3: createLazyMotionComponent('h3'),
  a: createLazyMotionComponent('a'),
  img: createLazyMotionComponent('img'),
  svg: createLazyMotionComponent('svg'),
  path: createLazyMotionComponent('path'),
};

/**
 * AnimatePresence fallback
 * Just renders children if framer-motion not loaded
 */
export function AnimatePresence({ children, mode, ...props }) {
  if (framerMotion && framerMotion.AnimatePresence) {
    return createElement(framerMotion.AnimatePresence, { mode, ...props }, children);
  }

  // Fallback: just render children
  return children;
}

/**
 * Hook exports (load on demand)
 */
export const useSpring = (...args) => {
  if (framerMotion && framerMotion.useSpring) {
    return framerMotion.useSpring(...args);
  }
  // Fallback: return static value
  return { get: () => args[0] };
};

export const useTransform = (...args) => {
  if (framerMotion && framerMotion.useTransform) {
    return framerMotion.useTransform(...args);
  }
  // Fallback: return identity
  return { get: () => args[0] };
};

export const useAnimation = () => {
  if (framerMotion && framerMotion.useAnimation) {
    return framerMotion.useAnimation();
  }
  // Fallback: noop controls
  return {
    start: () => Promise.resolve(),
    stop: () => {},
    set: () => {},
  };
};

export const animate = (...args) => {
  if (framerMotion && framerMotion.animate) {
    return framerMotion.animate(...args);
  }
  // Fallback: noop
  return () => {};
};

// Utility to ensure framer-motion is loaded (for critical animations)
export async function ensureFramerMotionLoaded() {
  await loadFramerMotion();
}

export default motion;
