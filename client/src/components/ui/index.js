/**
 * Export centralisé pour tous les composants UI
 * Design System de l'application Pluqla
 */

// Composants de base
export { default as Button, PrimaryButton, SecondaryButton, DangerButton, GhostButton, OutlineButton } from './Button';
export { default as Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatsCard } from './Card';
export { default as Input, TextArea, Select } from './Input';

// Composants de layout (à créer)
// export { default as Container } from './Container';
// export { default as Grid } from './Grid';
// export { default as Stack } from './Stack';

// Composants de feedback (à créer)
// export { default as Alert } from './Alert';
// export { default as Toast } from './Toast';
// export { default as Modal } from './Modal';

// Composants de navigation (à créer)
// export { default as Tabs } from './Tabs';
// export { default as Breadcrumb } from './Breadcrumb';

// Composants de données (à créer)
// export { default as Table } from './Table';
// export { default as DataList } from './DataList';

// Utilitaires
export const UI_CONSTANTS = {
  BREAKPOINTS: {
    xs: '480px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  SPACING: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  COLORS: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8'
    },
    success: {
      50: '#f0fdf4',
      500: '#22c55e',
      600: '#16a34a'
    },
    danger: {
      50: '#fef2f2',
      500: '#ef4444',
      600: '#dc2626'
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      600: '#d97706'
    }
  },
  TRANSITIONS: {
    default: 'all 0.2s ease-in-out',
    fast: 'all 0.1s ease-in-out',
    slow: 'all 0.3s ease-in-out'
  }
};

// Helper functions pour le Design System
export const createResponsiveClasses = (prefix, values) => {
  const breakpoints = ['', 'sm:', 'md:', 'lg:', 'xl:', '2xl:'];
  const classes = [];

  values.forEach((value, index) => {
    if (value && breakpoints[index] !== undefined) {
      classes.push(`${breakpoints[index]}${prefix}${value}`);
    }
  });

  return classes.join(' ');
};

export const createSpacingClasses = (type, values) => {
  return createResponsiveClasses(`${type}-`, values);
};

// Hook pour la gestion responsive
import { useState, useEffect } from 'react';

export const useResponsive = () => {
  const [breakpoint, setBreakpoint] = useState('md');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 480) setBreakpoint('xs');
      else if (width < 640) setBreakpoint('sm');
      else if (width < 768) setBreakpoint('md');
      else if (width < 1024) setBreakpoint('lg');
      else if (width < 1280) setBreakpoint('xl');
      else setBreakpoint('2xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: ['xs', 'sm'].includes(breakpoint),
    isTablet: ['md'].includes(breakpoint),
    isDesktop: ['lg', 'xl', '2xl'].includes(breakpoint),
    isSmallScreen: ['xs', 'sm', 'md'].includes(breakpoint),
    isLargeScreen: ['lg', 'xl', '2xl'].includes(breakpoint)
  };
};