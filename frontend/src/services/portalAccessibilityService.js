/**
 * Portal Accessibility Service
 * 
 * Provides comprehensive accessibility features for portal management.
 * Features:
 * - Focus management and trapping
 * - Screen reader announcements
 * - Keyboard navigation
 * - ARIA attributes management
 * - High contrast mode support
 * - Reduced motion support
 */

class PortalAccessibilityService {
  constructor() {
    this.focusHistory = [];
    this.announcements = [];
    this.isInitialized = false;
    this.reducedMotion = false;
    this.highContrast = false;
    this.currentFocusTrap = null;
    this.announcementContainer = null;
    
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    this.isInitialized = true;
    this.setupAccessibilityFeatures();
    this.createAnnouncementContainer();
    this.detectUserPreferences();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PortalAccessibilityService] Initialized');
    }
  }

  setupAccessibilityFeatures() {
    // Create global styles for accessibility
    const style = document.createElement('style');
    style.id = 'portal-accessibility-styles';
    style.textContent = `
      /* Screen reader only content */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      /* Focus indicators */
      .portal-focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }
      
      /* High contrast mode */
      @media (prefers-contrast: high) {
        .portal-high-contrast {
          border: 2px solid currentColor;
          background: Canvas;
          color: CanvasText;
        }
      }
      
      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .portal-reduced-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      
      /* Portal announcement container */
      #portal-announcements {
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
    `;
    
    document.head.appendChild(style);
  }

  createAnnouncementContainer() {
    this.announcementContainer = document.createElement('div');
    this.announcementContainer.id = 'portal-announcements';
    this.announcementContainer.setAttribute('aria-live', 'polite');
    this.announcementContainer.setAttribute('aria-atomic', 'true');
    this.announcementContainer.className = 'sr-only';
    document.body.appendChild(this.announcementContainer);
  }

  detectUserPreferences() {
    // Detect reduced motion preference
    if (window.matchMedia) {
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = reducedMotionQuery.matches;
      
      this.reducedMotionHandler = (e) => {
        this.reducedMotion = e.matches;
        this.updateReducedMotionStyles();
      };
      reducedMotionQuery.addEventListener('change', this.reducedMotionHandler);
      
      // Detect high contrast preference
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      this.highContrast = highContrastQuery.matches;
      
      this.highContrastHandler = (e) => {
        this.highContrast = e.matches;
        this.updateHighContrastStyles();
      };
      highContrastQuery.addEventListener('change', this.highContrastHandler);
      
      // Store references for cleanup
      this.mediaQueryListeners = {
        reducedMotion: { query: reducedMotionQuery, handler: this.reducedMotionHandler },
        highContrast: { query: highContrastQuery, handler: this.highContrastHandler }
      };
    }
  }

  // Focus management
  saveFocus() {
    if (document.activeElement && document.activeElement !== document.body) {
      this.focusHistory.push(document.activeElement);
    }
  }

  restoreFocus() {
    if (this.focusHistory.length > 0) {
      const lastFocused = this.focusHistory.pop();
      if (lastFocused && document.contains(lastFocused)) {
        lastFocused.focus();
        return true;
      }
    }
    return false;
  }

  setupFocusTrap(container) {
    if (!container) return null;
    
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return null;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      } else if (e.key === 'Escape') {
        // Handle escape key
        this.handleEscapeKey(container);
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    // Focus first element
    setTimeout(() => firstElement.focus(), 100);
    
    const cleanup = () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
    
    this.currentFocusTrap = { container, cleanup };
    return cleanup;
  }

  getFocusableElements(container) {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');
    
    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(element => {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
  }

  handleEscapeKey(container) {
    // Find close button or trigger close event
    const closeButton = container.querySelector('[data-portal-close]');
    if (closeButton) {
      closeButton.click();
    } else {
      // Dispatch custom escape event
      const escapeEvent = new CustomEvent('portal-escape', {
        bubbles: true,
        detail: { container }
      });
      container.dispatchEvent(escapeEvent);
    }
  }

  // Screen reader announcements
  announce(message, priority = 'polite') {
    if (!this.announcementContainer) return;
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.textContent = message;
    
    this.announcementContainer.appendChild(announcement);
    
    // Remove announcement after it's been read
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
    
    this.announcements.push({
      message,
      priority,
      timestamp: Date.now()
    });
  }

  announcePortalOpen(portalId, title = '') {
    const message = title ? `${title} dialog opened` : 'Dialog opened';
    this.announce(message, 'assertive');
  }

  announcePortalClose(portalId, title = '') {
    const message = title ? `${title} dialog closed` : 'Dialog closed';
    this.announce(message, 'polite');
  }

  announcePortalContent(portalId, content) {
    this.announce(content, 'polite');
  }

  // ARIA attributes management
  setupPortalAttributes(container, options = {}) {
    const {
      role = 'dialog',
      ariaLabel = '',
      ariaDescribedBy = '',
      ariaLabelledBy = '',
      modal = true
    } = options;
    
    container.setAttribute('role', role);
    container.setAttribute('aria-modal', modal.toString());
    container.setAttribute('tabindex', '-1');
    
    if (ariaLabel) {
      container.setAttribute('aria-label', ariaLabel);
    }
    
    if (ariaDescribedBy) {
      container.setAttribute('aria-describedby', ariaDescribedBy);
    }
    
    if (ariaLabelledBy) {
      container.setAttribute('aria-labelledby', ariaLabelledBy);
    }
    
    // Add data attributes for styling
    container.setAttribute('data-portal-id', options.portalId || '');
    container.setAttribute('data-portal-role', role);
    
    // Add accessibility classes
    container.classList.add('portal-accessible');
    
    if (this.highContrast) {
      container.classList.add('portal-high-contrast');
    }
    
    if (this.reducedMotion) {
      container.classList.add('portal-reduced-motion');
    }
  }

  // Keyboard navigation helpers
  setupKeyboardNavigation(container) {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          this.navigateToNext(container, 'down');
          e.preventDefault();
          break;
        case 'ArrowUp':
          this.navigateToNext(container, 'up');
          e.preventDefault();
          break;
        case 'ArrowLeft':
          this.navigateToNext(container, 'left');
          e.preventDefault();
          break;
        case 'ArrowRight':
          this.navigateToNext(container, 'right');
          e.preventDefault();
          break;
        case 'Home':
          this.navigateToFirst(container);
          e.preventDefault();
          break;
        case 'End':
          this.navigateToLast(container);
          e.preventDefault();
          break;
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  navigateToNext(container, direction) {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(document.activeElement);
    
    if (currentIndex === -1) return;
    
    let nextIndex;
    switch (direction) {
      case 'down':
      case 'right':
        nextIndex = (currentIndex + 1) % focusableElements.length;
        break;
      case 'up':
      case 'left':
        nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
        break;
    }
    
    focusableElements[nextIndex]?.focus();
  }

  navigateToFirst(container) {
    const focusableElements = this.getFocusableElements(container);
    focusableElements[0]?.focus();
  }

  navigateToLast(container) {
    const focusableElements = this.getFocusableElements(container);
    focusableElements[focusableElements.length - 1]?.focus();
  }

  // High contrast and reduced motion support
  updateHighContrastStyles() {
    const containers = document.querySelectorAll('.portal-accessible');
    containers.forEach(container => {
      if (this.highContrast) {
        container.classList.add('portal-high-contrast');
      } else {
        container.classList.remove('portal-high-contrast');
      }
    });
  }

  updateReducedMotionStyles() {
    const containers = document.querySelectorAll('.portal-accessible');
    containers.forEach(container => {
      if (this.reducedMotion) {
        container.classList.add('portal-reduced-motion');
      } else {
        container.classList.remove('portal-reduced-motion');
      }
    });
  }

  // Accessibility testing helpers
  validateAccessibility(container) {
    const issues = [];
    
    // Check for required ARIA attributes
    if (!container.getAttribute('role')) {
      issues.push('Missing role attribute');
    }
    
    if (!container.getAttribute('aria-label') && !container.getAttribute('aria-labelledby')) {
      issues.push('Missing aria-label or aria-labelledby');
    }
    
    // Check for focusable elements
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) {
      issues.push('No focusable elements found');
    }
    
    // Check for proper heading structure
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      issues.push('No headings found for screen reader navigation');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // Cleanup
  cleanup() {
    if (this.currentFocusTrap) {
      this.currentFocusTrap.cleanup();
      this.currentFocusTrap = null;
    }
    
    if (this.announcementContainer && this.announcementContainer.parentNode) {
      this.announcementContainer.parentNode.removeChild(this.announcementContainer);
      this.announcementContainer = null;
    }
    
    // Cleanup media query listeners
    if (this.mediaQueryListeners) {
      Object.values(this.mediaQueryListeners).forEach(({ query, handler }) => {
        query.removeEventListener('change', handler);
      });
      this.mediaQueryListeners = null;
    }
    
    // Clear all data structures
    this.focusHistory = [];
    this.announcements = [];
    
    // Clear function references
    this.reducedMotionHandler = null;
    this.highContrastHandler = null;
  }
}

// Create singleton instance
const portalAccessibilityService = new PortalAccessibilityService();

export default portalAccessibilityService;
