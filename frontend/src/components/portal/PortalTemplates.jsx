import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Portal Templates
 * 
 * Reusable portal templates for common overlay patterns.
 * Features:
 * - Standardized layouts
 * - Consistent animations
 * - Accessibility features
 * - Customizable styling
 * - Performance optimizations
 */

// Base portal template with common functionality
export const BasePortalTemplate = ({
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
  ...props
}) => {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && onBackdropClick) {
      onBackdropClick();
    }
  };

  const getCloseButtonPosition = () => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4'
    };
    return positions[closeButtonPosition] || positions['top-right'];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 flex items-center justify-center p-4 ${overlayClassName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onClick={handleBackdropClick}
          style={{ zIndex: 1, pointerEvents: 'auto' }}
          {...props}
        >
          <motion.div
            className={`relative bg-black rounded-2xl shadow-2xl overflow-hidden ${contentClassName}`}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 2, pointerEvents: 'auto' }}
          >
            {showCloseButton && (
              <button
                onClick={onClose}
                className={`absolute ${getCloseButtonPosition()} p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-200`}
                aria-label="Close"
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
};

// Modal template for standard modals
export const ModalTemplate = ({
  title,
  children,
  footer,
  size = 'medium',
  ...props
}) => {
  const getSizeClasses = () => {
    const sizes = {
      small: 'max-w-md',
      medium: 'max-w-2xl',
      large: 'max-w-4xl',
      xlarge: 'max-w-6xl',
      full: 'max-w-full mx-4'
    };
    return sizes[size] || sizes.medium;
  };

  return (
    <BasePortalTemplate
      contentClassName={`w-full ${getSizeClasses()} max-h-[90vh] overflow-y-auto`}
      {...props}
    >
      <div className="flex flex-col h-full">
        {title && (
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
        )}
        
        <div className="flex-1 p-6">
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
};

// Fullscreen template for immersive experiences
export const FullscreenTemplate = ({
  children,
  header,
  footer,
  ...props
}) => {
  return (
    <BasePortalTemplate
      overlayClassName="p-0"
      contentClassName="w-full h-full max-w-none max-h-none rounded-none"
      {...props}
    >
      <div className="flex flex-col h-full">
        {header && (
          <div className="flex-shrink-0">
            {header}
          </div>
        )}
        
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
        
        {footer && (
          <div className="flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </BasePortalTemplate>
  );
};

// Sidebar template for slide-out panels
export const SidebarTemplate = ({
  children,
  position = 'right',
  width = 'md',
  ...props
}) => {
  const getPositionClasses = () => {
    const positions = {
      left: 'left-0',
      right: 'right-0'
    };
    return positions[position] || positions.right;
  };

  const getWidthClasses = () => {
    const widths = {
      sm: 'w-80',
      md: 'w-96',
      lg: 'w-[28rem]',
      xl: 'w-[32rem]'
    };
    return widths[width] || widths.md;
  };

  return (
    <AnimatePresence>
      {props.isOpen && (
        <motion.div
          className={`fixed inset-y-0 ${getPositionClasses()} ${getWidthClasses()} bg-black shadow-2xl`}
          initial={{ x: position === 'right' ? '100%' : '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: position === 'right' ? '100%' : '-100%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ zIndex: 2, pointerEvents: 'auto' }}
        >
          <div className="flex flex-col h-full">
            {props.showCloseButton && (
              <button
                onClick={props.onClose}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-200"
                aria-label="Close"
                style={{ zIndex: 10 }}
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
};

// Toast template for notifications
export const ToastTemplate = ({
  children,
  type = 'info',
  position = 'top-right',
  duration = 5000,
  ...props
}) => {
  const getPositionClasses = () => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
    };
    return positions[position] || positions['top-right'];
  };

  const getTypeClasses = () => {
    const types = {
      success: 'bg-green-500/90 border-green-400',
      error: 'bg-red-500/90 border-red-400',
      warning: 'bg-yellow-500/90 border-yellow-400',
      info: 'bg-blue-500/90 border-blue-400'
    };
    return types[type] || types.info;
  };

  return (
    <AnimatePresence>
      {props.isOpen && (
        <motion.div
          className={`fixed ${getPositionClasses()} z-50`}
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ pointerEvents: 'auto' }}
        >
          <div className={`px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm ${getTypeClasses()}`}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Drawer template for bottom sheets
export const DrawerTemplate = ({
  children,
  height = 'md',
  ...props
}) => {
  const getHeightClasses = () => {
    const heights = {
      sm: 'max-h-[50vh]',
      md: 'max-h-[70vh]',
      lg: 'max-h-[85vh]',
      full: 'max-h-[95vh]'
    };
    return heights[height] || heights.md;
  };

  return (
    <AnimatePresence>
      {props.isOpen && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-50"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          style={{ pointerEvents: 'auto' }}
        >
          <div className={`bg-black rounded-t-2xl shadow-2xl ${getHeightClasses()} overflow-hidden`}>
            <div className="flex flex-col h-full">
              {/* Handle */}
              <div className="flex justify-center p-2">
                <div className="w-12 h-1 bg-white/30 rounded-full"></div>
              </div>
              
              {props.showCloseButton && (
                <button
                  onClick={props.onClose}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors duration-200"
                  aria-label="Close"
                  style={{ zIndex: 10 }}
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
};

// Popover template for contextual overlays
export const PopoverTemplate = ({
  children,
  trigger,
  placement = 'bottom',
  offset = 8,
  ...props
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef(null);
  const popoverRef = React.useRef(null);

  const updatePosition = React.useCallback(() => {
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
    
    setPosition({ top, left });
  }, [placement, offset]);

  React.useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  return (
    <>
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            className="fixed z-50 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              top: position.top,
              left: position.left,
              pointerEvents: 'auto'
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
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
