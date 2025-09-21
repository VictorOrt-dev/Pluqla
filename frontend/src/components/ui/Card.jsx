/**
 * Composant Card unifié pour l'application +Clair
 * Assure la cohérence des cartes dans toute l'application
 */

import React, { memo } from 'react';
import { useThemedClasses } from '../../contexts/ThemeContext';

const CARD_VARIANTS = {
  default: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
  elevated: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg',
  outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
  gradient: 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800'
};

const CARD_PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8'
};

const Card = memo(({
  children,
  variant = 'default',
  padding = 'md',
  rounded = 'lg',
  hover = false,
  clickable = false,
  className = '',
  onClick,
  ...props
}) => {
  const { cx } = useThemedClasses();

  const baseClasses = 'transition-all duration-200';
  const variantClasses = CARD_VARIANTS[variant] || CARD_VARIANTS.default;
  const paddingClasses = CARD_PADDING[padding] || CARD_PADDING.md;
  const roundedClass = `rounded-${rounded}`;
  const hoverClasses = hover || clickable ? 'hover:shadow-md hover:scale-[1.02] transform' : '';
  const clickableClasses = clickable ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' : '';

  const cardClasses = cx(
    baseClasses,
    variantClasses,
    paddingClasses,
    roundedClass,
    hoverClasses,
    clickableClasses,
    className
  );

  const handleClick = (e) => {
    if (clickable && onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

// Composant CardHeader
export const CardHeader = memo(({ children, className = '', ...props }) => {
  const { cx } = useThemedClasses();

  return (
    <div
      className={cx('mb-4 pb-3 border-b border-gray-200 dark:border-gray-700', className)}
      {...props}
    >
      {children}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

// Composant CardTitle
export const CardTitle = memo(({ children, className = '', ...props }) => {
  const { cx } = useThemedClasses();

  return (
    <h3
      className={cx('text-lg font-semibold text-gray-900 dark:text-white', className)}
      {...props}
    >
      {children}
    </h3>
  );
});

CardTitle.displayName = 'CardTitle';

// Composant CardDescription
export const CardDescription = memo(({ children, className = '', ...props }) => {
  const { cx } = useThemedClasses();

  return (
    <p
      className={cx('text-sm text-gray-600 dark:text-gray-400 mt-1', className)}
      {...props}
    >
      {children}
    </p>
  );
});

CardDescription.displayName = 'CardDescription';

// Composant CardContent
export const CardContent = memo(({ children, className = '', ...props }) => {
  const { cx } = useThemedClasses();

  return (
    <div
      className={cx('', className)}
      {...props}
    >
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

// Composant CardFooter
export const CardFooter = memo(({ children, className = '', ...props }) => {
  const { cx } = useThemedClasses();

  return (
    <div
      className={cx('mt-4 pt-3 border-t border-gray-200 dark:border-gray-700', className)}
      {...props}
    >
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';

// Cartes spécialisées
export const StatsCard = memo(({ title, value, icon, trend, trendValue, className = '', ...props }) => {
  const { cx } = useThemedClasses();

  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';
  const trendIcon = trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '→';

  return (
    <Card variant="elevated" className={cx('relative overflow-hidden', className)} {...props}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && trendValue && (
            <div className={cx('flex items-center mt-2 text-sm', trendColor)}>
              <span className="mr-1">{trendIcon}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-80">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
});

StatsCard.displayName = 'StatsCard';

export default Card;