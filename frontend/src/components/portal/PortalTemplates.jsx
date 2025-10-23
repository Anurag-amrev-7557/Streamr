import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';

/**
 * Portal Templates
 * 
 * Reusable portal templates for common overlay patterns.
 * Features:
 * - Standardized layouts with performance optimizations
 * - Consistent animations - ENABLED on all devices including mobile
 * - Enhanced accessibility (ARIA attributes, keyboard navigation, focus trap)
 * - Customizable styling with theme support
 * - Memory leak prevention
 * - SSR safety
 */

// Animation variants - always use full animations on all devices
const createAnimationVariants = (prefersReducedMotion = false) => ({
  overlay: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  },
  modal: {
    hidden: { 
      scale: 0.95, 
      opacity: 0, 
      y: 20 
    },
    visible: { 
      scale: 1, 
      opacity: 1, 
      y: 0 
    },
    exit: { 
      scale: 0.95, 
      opacity: 0, 
      y: 20 
    }
  },
  slide: {
    hidden: (direction) => ({ 
      x: (direction === 'right' ? '100%' : '-100%'),
      opacity: 1
    }),
    visible: { x: 0, opacity: 1 },
    exit: (direction) => ({ 
      x: (direction === 'right' ? '100%' : '-100%'),
      opacity: 1
    }),
    visible: { x: 0, opacity: 1 },
    exit: (direction) => ({ 
      x: (direction === 'right' ? '100%' : '-100%'),
      opacity: 1
    })
  },
  toast: {
    hidden: { 
      opacity: 0, 
      y: -50, 
      scale: 0.9 
    },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { 
      opacity: 0, 
      y: -50, 
      scale: 0.9 
    }
  },
  drawer: {
    hidden: { y: '100%', opacity: 1 },
    visible: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 1 }
  }
});

// Hook to detect reduced motion preference - always returns false to enable animations
const usePrefersReducedMotion = () => {
  return false; // Force animations on all devices
};

// Hook for keyboard event handling (Escape key)
const useKeyboardHandler = (onEscape, isOpen) => {
  useEffect(() => {
    if (!isOpen || !onEscape) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, isOpen]);
};

// Hook for focus trap
const useFocusTrap = (containerRef, isOpen) => {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element on open
    firstElement?.focus();

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [containerRef, isOpen]);
};

// Base portal template with common functionality
export const BasePortalTemplate = memo(({
  children,
  isOpen,
  onClose,
  className = '',
  overlayClassName = '',
  contentClassName = '',
  showCloseButton = true,
  closeButtonPosition = 'top-right',
  onBackdropClick = null,
  animationType = 'modal',
  priority = 'normal',
  enableFocusTrap = true,
  closeOnEscape = true,
  ariaLabel = 'Dialog',
  ariaDescribedBy,
  ...props
}) => {
  const containerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const animations = useMemo(() => createAnimationVariants(prefersReducedMotion), [prefersReducedMotion]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      if (onBackdropClick) {
        onBackdropClick();
      } else if (onClose) {
        onClose();
      }
    }
  }, [onBackdropClick, onClose]);

  // Handle escape key
  useKeyboardHandler(
    closeOnEscape ? onClose : null,
    isOpen
  );

  // Enable focus trap
  useFocusTrap(containerRef, enableFocusTrap && isOpen);

  // Memoize close button position
  const closeButtonPositionClass = useMemo(() => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4'
    };
    return positions[closeButtonPosition] || positions['top-right'];
  }, [closeButtonPosition]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={`fixed inset-0 flex items-center justify-center p-4 ${overlayClassName}`}
          variants={animations.overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={handleBackdropClick}
          style={{ zIndex: 1, pointerEvents: 'auto' }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          {...props}
        >
          <motion.div
            ref={containerRef}
            className={`relative bg-black rounded-2xl shadow-2xl overflow-hidden ${contentClassName}`}
            variants={animations.modal}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 2, pointerEvents: 'auto' }}
          >
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                className={`absolute ${closeButtonPositionClass} p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50`}
                aria-label="Close dialog"
                style={{ zIndex: 10 }}
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            )}
            
            <div className={className}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

BasePortalTemplate.displayName = 'BasePortalTemplate';

BasePortalTemplate.propTypes = {
  children: PropTypes.node.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  className: PropTypes.string,
  overlayClassName: PropTypes.string,
  contentClassName: PropTypes.string,
  showCloseButton: PropTypes.bool,
  closeButtonPosition: PropTypes.oneOf(['top-right', 'top-left', 'bottom-right', 'bottom-left']),
  onBackdropClick: PropTypes.func,
  animationType: PropTypes.string,
  priority: PropTypes.string,
  enableFocusTrap: PropTypes.bool,
  closeOnEscape: PropTypes.bool,
  ariaLabel: PropTypes.string,
  ariaDescribedBy: PropTypes.string
};

// Modal template for standard modals
export const ModalTemplate = memo(({
  title,
  children,
  footer,
  size = 'medium',
  ...props
}) => {
  const sizeClasses = useMemo(() => {
    const sizes = {
      small: 'max-w-md',
      medium: 'max-w-2xl',
      large: 'max-w-4xl',
      xlarge: 'max-w-6xl',
      full: 'max-w-full mx-4'
    };
    return sizes[size] || sizes.medium;
  }, [size]);

  return (
    <BasePortalTemplate
      contentClassName={`w-full ${sizeClasses} max-h-[90vh] overflow-y-auto`}
      ariaLabel={typeof title === 'string' ? title : 'Modal dialog'}
      {...props}
    >
      <div className="flex flex-col h-full">
        {title && (
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white" id="modal-title">
              {title}
            </h2>
          </div>
        )}
        
        <div className="flex-1 p-6" role="document">
          {children}
        </div>
        
        {footer && (
          <div className="p-6 border-t border-white/10">
            {footer}
          </div>
        )}
      </div>
    </BasePortalTemplate>
  );
});

ModalTemplate.displayName = 'ModalTemplate';

ModalTemplate.propTypes = {
  title: PropTypes.node,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge', 'full'])
};

// Fullscreen template for immersive experiences
export const FullscreenTemplate = memo(({
  children,
  header,
  footer,
  ...props
}) => {
  return (
    <BasePortalTemplate
      overlayClassName="p-0"
      contentClassName="w-full h-full max-w-none max-h-none rounded-none"
      ariaLabel="Fullscreen dialog"
      {...props}
    >
      <div className="flex flex-col h-full">
        {header && (
          <div className="flex-shrink-0" role="banner">
            {header}
          </div>
        )}
        
        <div className="flex-1 overflow-hidden" role="main">
          {children}
        </div>
        
        {footer && (
          <div className="flex-shrink-0" role="contentinfo">
            {footer}
          </div>
        )}
      </div>
    </BasePortalTemplate>
  );
});

FullscreenTemplate.displayName = 'FullscreenTemplate';

FullscreenTemplate.propTypes = {
  children: PropTypes.node.isRequired,
  header: PropTypes.node,
  footer: PropTypes.node
};

// Sidebar template for slide-out panels
export const SidebarTemplate = memo(({
  children,
  position = 'right',
  width = 'md',
  isOpen,
  onClose,
  showCloseButton = true,
  ...props
}) => {
  const containerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const animations = useMemo(() => createAnimationVariants(prefersReducedMotion), [prefersReducedMotion]);

  useKeyboardHandler(onClose, isOpen);
  useFocusTrap(containerRef, isOpen);

  const positionClass = useMemo(() => {
    const positions = {
      left: 'left-0',
      right: 'right-0'
    };
    return positions[position] || positions.right;
  }, [position]);

  const widthClass = useMemo(() => {
    const widths = {
      sm: 'w-80',
      md: 'w-96',
      lg: 'w-[28rem]',
      xl: 'w-[32rem]'
    };
    return widths[width] || widths.md;
  }, [width]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          ref={containerRef}
          className={`fixed inset-y-0 ${positionClass} ${widthClass} bg-black shadow-2xl`}
          custom={position}
          variants={animations.slide}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ zIndex: 2, pointerEvents: 'auto' }}
          role="dialog"
          aria-modal="true"
          aria-label="Sidebar panel"
        >
          <div className="flex flex-col h-full">
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 z-10"
                aria-label="Close sidebar"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            )}
            
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

SidebarTemplate.displayName = 'SidebarTemplate';

SidebarTemplate.propTypes = {
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf(['left', 'right']),
  width: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  showCloseButton: PropTypes.bool
};

// Toast template for notifications
export const ToastTemplate = memo(({
  children,
  type = 'info',
  position = 'top-right',
  duration = 5000,
  isOpen,
  onClose,
  autoClose = true,
  ...props
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const animations = useMemo(() => createAnimationVariants(prefersReducedMotion), [prefersReducedMotion]);

  // Auto-close timer
  useEffect(() => {
    if (!isOpen || !autoClose || !onClose || duration <= 0) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, autoClose, onClose, duration]);

  const positionClass = useMemo(() => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
    };
    return positions[position] || positions['top-right'];
  }, [position]);

  const typeClass = useMemo(() => {
    const types = {
      success: 'bg-green-500/90 border-green-400 text-white',
      error: 'bg-red-500/90 border-red-400 text-white',
      warning: 'bg-yellow-500/90 border-yellow-400 text-gray-900',
      info: 'bg-blue-500/90 border-blue-400 text-white'
    };
    return types[type] || types.info;
  }, [type]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className={`fixed ${positionClass} z-50`}
          variants={animations.toast}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ pointerEvents: 'auto' }}
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className={`px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm ${typeClass} min-w-[200px] max-w-md`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                {children}
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-shrink-0 p-1 hover:bg-black/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label="Close notification"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ToastTemplate.displayName = 'ToastTemplate';

ToastTemplate.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  position: PropTypes.oneOf(['top-right', 'top-left', 'bottom-right', 'bottom-left', 'top-center', 'bottom-center']),
  duration: PropTypes.number,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  autoClose: PropTypes.bool
};

// Drawer template for bottom sheets
export const DrawerTemplate = memo(({
  children,
  height = 'md',
  isOpen,
  onClose,
  showCloseButton = true,
  showHandle = true,
  ...props
}) => {
  const containerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const animations = useMemo(() => createAnimationVariants(prefersReducedMotion), [prefersReducedMotion]);

  useKeyboardHandler(onClose, isOpen);
  useFocusTrap(containerRef, isOpen);

  const heightClass = useMemo(() => {
    const heights = {
      sm: 'max-h-[50vh]',
      md: 'max-h-[70vh]',
      lg: 'max-h-[85vh]',
      full: 'max-h-[95vh]'
    };
    return heights[height] || heights.md;
  }, [height]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          ref={containerRef}
          className="fixed inset-x-0 bottom-0 z-50"
          variants={animations.drawer}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ pointerEvents: 'auto' }}
          role="dialog"
          aria-modal="true"
          aria-label="Drawer panel"
        >
          <div className={`bg-black rounded-t-2xl shadow-2xl ${heightClass} overflow-hidden`}>
            <div className="flex flex-col h-full">
              {/* Handle */}
              {showHandle && (
                <div className="flex justify-center p-2">
                  <div 
                    className="w-12 h-1 bg-white/30 rounded-full cursor-grab active:cursor-grabbing"
                    role="presentation"
                  ></div>
                </div>
              )}
              
              {showCloseButton && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 z-10"
                  aria-label="Close drawer"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              )}
              
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

DrawerTemplate.displayName = 'DrawerTemplate';

DrawerTemplate.propTypes = {
  children: PropTypes.node.isRequired,
  height: PropTypes.oneOf(['sm', 'md', 'lg', 'full']),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  showCloseButton: PropTypes.bool,
  showHandle: PropTypes.bool
};

// Popover template for contextual overlays
export const PopoverTemplate = memo(({
  children,
  trigger,
  placement = 'bottom',
  offset = 8,
  closeOnClickOutside = true,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    
    let top, left;
    
    switch (placement) {
      case 'top':
        top = triggerRect.top - popoverRect.height - offset;
        left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
        left = triggerRect.left - popoverRect.width - offset;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - popoverRect.height) / 2;
        left = triggerRect.right + offset;
        break;
      default:
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - popoverRect.width) / 2;
    }
    
    // Boundary detection - keep popover in viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left < 0) left = 8;
    if (left + popoverRect.width > viewportWidth) {
      left = viewportWidth - popoverRect.width - 8;
    }
    if (top < 0) top = 8;
    if (top + popoverRect.height > viewportHeight) {
      top = viewportHeight - popoverRect.height - 8;
    }
    
    setPosition({ top, left });
  }, [placement, offset]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen || !closeOnClickOutside) return;

    const handleClickOutside = (event) => {
      if (
        popoverRef.current &&
        triggerRef.current &&
        !popoverRef.current.contains(event.target) &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeOnClickOutside]);

  // Handle escape key
  useKeyboardHandler(() => setIsOpen(false), isOpen);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      <div 
        ref={triggerRef} 
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {trigger}
      </div>
      
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            ref={popoverRef}
            className="fixed z-50 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl"
            initial={{ 
              opacity: 0, 
              scale: prefersReducedMotion ? 1 : 0.95 
            }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ 
              opacity: 0, 
              scale: prefersReducedMotion ? 1 : 0.95 
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              top: position.top,
              left: position.left,
              pointerEvents: 'auto'
            }}
            role="dialog"
            aria-modal="false"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

PopoverTemplate.displayName = 'PopoverTemplate';

PopoverTemplate.propTypes = {
  children: PropTypes.node.isRequired,
  trigger: PropTypes.node.isRequired,
  placement: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
  offset: PropTypes.number,
  closeOnClickOutside: PropTypes.bool
};

// Export all templates
export const PortalTemplates = {
  Base: BasePortalTemplate,
  Modal: ModalTemplate,
  Fullscreen: FullscreenTemplate,
  Sidebar: SidebarTemplate,
  Toast: ToastTemplate,
  Drawer: DrawerTemplate,
  Popover: PopoverTemplate
};

export default PortalTemplates;
