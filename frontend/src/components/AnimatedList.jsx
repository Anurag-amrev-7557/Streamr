/**
 * Animated List Component
 * Provides stagger animations for lists and grids
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { listAnimations, staggerAnimations } from '../config/animations';

/**
 * AnimatedList
 * - Backwards compatible wrapper around a motion container that supports:
 *   - children (legacy) or items + renderItem API
 *   - enter/exit animations with AnimatePresence
 *   - prefers-reduced-motion handling
 *   - layout animations for re-ordering
 *   - forwardRef for DOM access
 */
export const AnimatedList = React.forwardRef(({
  children,
  className = '',
  type = 'list', // 'list' or 'grid'
  items = null,
  renderItem = null,
  itemKey = (item, idx) => (item && (item.id ?? item.key)) ?? idx,
  initial = 'hidden',
  animate = 'visible',
  exit = 'exit',
  layout = false,
  variants = null,
  stagger = null, // override stagger settings
  preserveInitialOnSSR = true, // avoid animation mismatch on SSR
  ...rest
}, ref) => {
  const prefersReducedMotion = useReducedMotion();
  const mounted = useRef(false);
  const [isMounted, setIsMounted] = useState(!preserveInitialOnSSR);

  useEffect(() => {
    // On the client, allow animations to run after mount to avoid SSR mismatch
    mounted.current = true;
    if (preserveInitialOnSSR) setIsMounted(true);
  }, [preserveInitialOnSSR]);

  const baseAnimations = type === 'grid' ? staggerAnimations.grid : staggerAnimations.list;

  const combined = useMemo(() => {
    // If caller provided variants, merge with defaults; else use defaults
    const container = variants?.container ?? (stagger ?? baseAnimations.container);
    const item = variants?.item ?? baseAnimations.item;

    // If user prefers reduced motion, use a minimal fade (or none)
    if (prefersReducedMotion) {
      return {
        container: { ...container, hidden: { opacity: 1 }, visible: { opacity: 1 } },
        item: {
          hidden: { opacity: 1, y: 0, scale: 1 },
          visible: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 1 }
        }
      };
    }

    return { container, item };
  }, [type, variants, baseAnimations, prefersReducedMotion, stagger]);

  // If items + renderItem provided, render via AnimatePresence to support exit animations.
  const renderChildren = () => {
    if (items && renderItem) {
      return (
        <AnimatePresence>
          {items.map((it, idx) => {
            const key = typeof itemKey === 'function' ? itemKey(it, idx) : it[itemKey];
            return (
              <AnimatedListItem
                key={key}
                type={type}
                layout={layout}
                variants={combined.item}
              >
                {renderItem(it, idx)}
              </AnimatedListItem>
            );
          })}
        </AnimatePresence>
      );
    }

    // Legacy: children passed directly. Wrap them with AnimatePresence if they are an array
    if (Array.isArray(children)) {
      return (
        <AnimatePresence>
          {children.map((child, i) => {
            // If child already has a key, keep it. Otherwise generate one to help AnimatePresence.
            const key = child?.key ?? `alist-child-${i}`;
            return (
              <AnimatedListItem
                key={key}
                type={type}
                layout={layout}
                variants={combined.item}
              >
                {child}
              </AnimatedListItem>
            );
          })}
        </AnimatePresence>
      );
    }

    // Single child: render as-is inside AnimatedListItem to normalize behavior
    if (children) {
      return (
        <AnimatedListItem type={type} layout={layout} variants={combined.item}>
          {children}
        </AnimatedListItem>
      );
    }

    return null;
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={combined.container}
      initial={isMounted ? initial : false}
      animate={isMounted ? animate : false}
      {...rest}
    >
      {renderChildren()}
    </motion.div>
  );
});

AnimatedList.displayName = 'AnimatedList';

export const AnimatedListItem = React.forwardRef(({
  children,
  className = '',
  type = 'list',
  variants = null,
  layout = false,
  style = {},
  ...props
}, ref) => {
  const baseAnimations = type === 'grid' ? staggerAnimations.grid : staggerAnimations.list;
  const itemVariants = variants ?? baseAnimations.item;

  // Small style hints to keep transforms on the compositor and avoid layout jank
  const mergedStyle = useMemo(() => ({
    transform: 'translateZ(0)',
    willChange: 'transform, opacity',
    ...style
  }), [style]);

  return (
    <motion.div
      ref={ref}
      variants={itemVariants}
      initial={itemVariants?.hidden ? 'hidden' : undefined}
      animate={itemVariants?.visible ? 'visible' : undefined}
      exit={itemVariants?.exit ? 'exit' : undefined}
      layout={layout}
      className={className}
      style={mergedStyle}
      {...props}
    >
      {children}
    </motion.div>
  );
});

AnimatedListItem.displayName = 'AnimatedListItem';

// PropTypes: keep them to help catch misuse. Not required but helpful in JS projects.
AnimatedList.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.arrayOf(PropTypes.node),
  ]),
  className: PropTypes.string,
  type: PropTypes.oneOf(['list', 'grid']),
  items: PropTypes.array,
  renderItem: PropTypes.func,
  itemKey: PropTypes.oneOfType([PropTypes.func, PropTypes.string]),
  initial: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  animate: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  exit: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  layout: PropTypes.bool,
  variants: PropTypes.object,
  stagger: PropTypes.object,
  preserveInitialOnSSR: PropTypes.bool,
};

AnimatedListItem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  type: PropTypes.oneOf(['list', 'grid']),
  variants: PropTypes.object,
  layout: PropTypes.bool,
  style: PropTypes.object,
};

export default React.memo(AnimatedList);
