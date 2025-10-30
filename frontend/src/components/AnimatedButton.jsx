/**
 * Animated Button Component
 * Provides consistent button animations and micro-interactions
 */
import React, { forwardRef, useCallback, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import PropTypes from 'prop-types';
import { buttonAnimations } from '../config/animations';

// tiny classNames helper (avoid adding dependency)
const cx = (...parts) => parts.filter(Boolean).join(' ');

/**
 * AnimatedButton
 * - Polymorphic: use `as` to render 'button' (default) or 'a'
 * - Accessibility: handles keyboard activation for non-button elements
 * - Reduced motion: respects user's preference
 * - Loading / disabled handling
 * - Forward ref + memo-friendly
 */
const AnimatedButton = forwardRef((props, ref) => {
  const {
    as: Component = 'button',
    children,
    className = '',
    onClick,
    disabled = false,
    loading = false,
    variant = 'default',
    pulse = false,
    iconLeft = null,
    iconRight = null,
    type = 'button', // only relevant when as === 'button'
    href,
    target,
    rel,
    ...rest
  } = props;

  const reduceMotion = useReducedMotion();

  // variant styles (Tailwind utility examples used across repo)
  const variantClasses = useMemo(() => {
    const map = {
      default: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      danger: 'bg-red-600 text-white hover:bg-red-700',
      ghost: 'bg-transparent text-gray-900 hover:bg-gray-100',
      outline: 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50',
      link: 'bg-transparent text-blue-600 underline',
    };
    return map[variant] || map.default;
  }, [variant]);

  const baseClasses = 'relative inline-flex items-center justify-center select-none transition-all duration-150 focus:outline-none';

  const disabledOrLoading = disabled || loading;

  // Motion props - respect reduced motion and disabled state
  const motionProps = useMemo(() => {
    if (reduceMotion) return {};
    return {
      whileHover: !disabledOrLoading ? buttonAnimations.hover : undefined,
      whileTap: !disabledOrLoading ? buttonAnimations.tap : undefined,
      animate: pulse && !disabledOrLoading ? buttonAnimations.pulse : undefined,
    };
  }, [reduceMotion, disabledOrLoading, pulse]);

  const handleClick = useCallback(
    (e) => {
      if (disabledOrLoading) {
        e.preventDefault();
        return;
      }
      if (typeof onClick === 'function') onClick(e);
    },
    [disabledOrLoading, onClick]
  );

  // For non-button (e.g., <a>) emulate button keyboard behavior
  const handleKeyDown = useCallback(
    (e) => {
      if (disabledOrLoading) return;
      if (Component !== 'button') {
        if (e.key === 'Enter' || e.key === ' ') {
          // Space should also trigger activation
          e.preventDefault();
          if (typeof onClick === 'function') onClick(e);
        }
      }
    },
    [Component, disabledOrLoading, onClick]
  );

  const sharedProps = {
    ref,
    className: cx(baseClasses, variantClasses, className, disabledOrLoading && 'opacity-60 pointer-events-none'),
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    style: {
      transform: 'translateZ(0)',
      willChange: 'transform',
    },
    'aria-disabled': disabled ? true : undefined,
    ...(Component === 'a' && href ? { href, target, rel } : {}),
    ...rest,
  };

  // Ensure correct type for native button
  if (Component === 'button') {
    sharedProps.type = type;
    sharedProps.disabled = disabledOrLoading;
  } else {
    // Ensure anchor is focusable if no href (acts like a button)
    if (!href) sharedProps.role = 'button';
    if (!rest.tabIndex && !disabled) sharedProps.tabIndex = 0;
  }

  return (
    <motion.div {...motionProps} style={{ display: 'inline-block' }}>
      <Component {...sharedProps}>
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
              <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="sr-only">Loading</span>
            {children}
          </span>
        ) : (
          <>
            {iconLeft && <span className="mr-2 flex items-center">{iconLeft}</span>}
            <span>{children}</span>
            {iconRight && <span className="ml-2 flex items-center">{iconRight}</span>}
          </>
        )}
      </Component>
    </motion.div>
  );
});

AnimatedButton.displayName = 'AnimatedButton';

AnimatedButton.propTypes = {
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  children: PropTypes.node,
  className: PropTypes.string,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  variant: PropTypes.string,
  pulse: PropTypes.bool,
  iconLeft: PropTypes.node,
  iconRight: PropTypes.node,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  href: PropTypes.string,
  target: PropTypes.string,
  rel: PropTypes.string,
};

export default React.memo(AnimatedButton);
