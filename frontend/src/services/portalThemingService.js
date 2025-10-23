/**
 * Portal Theming Service
 * 
 * Provides comprehensive theming and customization for portal management.
 * Features:
 * - Dynamic theme switching
 * - Custom CSS variables
 * - Dark/light mode support
 * - High contrast mode
 * - Brand customization
 * - Animation theming
 * - Responsive theming
 */

class PortalThemingService {
  constructor() {
    this.currentTheme = 'default';
    this.themes = new Map();
    this.customProperties = new Map();
    this.isInitialized = false;
    this.mediaQueries = new Map();
    this.responsiveThemes = new Map();
    
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;
    
    this.isInitialized = true;
    this.createDefaultThemes();
    this.setupMediaQueryListeners();
    this.applyTheme(this.currentTheme);
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[PortalThemingService] Initialized');
    }
  }

  createDefaultThemes() {
    // Default theme
    this.addTheme('default', {
      name: 'Default',
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        background: 'rgba(0, 0, 0, 0.95)',
        surface: 'rgba(0, 0, 0, 0.8)',
        text: '#ffffff',
        textSecondary: 'rgba(255, 255, 255, 0.7)',
        border: 'rgba(255, 255, 255, 0.1)',
        shadow: 'rgba(0, 0, 0, 0.5)',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        xxl: '3rem'
      },
      typography: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          xxl: '1.5rem'
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700'
        }
      },
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px'
      },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.1)'
      },
      animations: {
        duration: {
          fast: '150ms',
          normal: '300ms',
          slow: '500ms'
        },
        easing: {
          ease: 'ease',
          easeIn: 'ease-in',
          easeOut: 'ease-out',
          easeInOut: 'ease-in-out'
        }
      }
    });

    // Dark theme
    this.addTheme('dark', {
      name: 'Dark',
      colors: {
        primary: '#60a5fa',
        secondary: '#94a3b8',
        background: 'rgba(0, 0, 0, 0.98)',
        surface: 'rgba(15, 23, 42, 0.9)',
        text: '#f8fafc',
        textSecondary: 'rgba(248, 250, 252, 0.6)',
        border: 'rgba(248, 250, 252, 0.1)',
        shadow: 'rgba(0, 0, 0, 0.8)',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa'
      },
      spacing: { ...this.themes.get('default').spacing },
      typography: { ...this.themes.get('default').typography },
      borderRadius: { ...this.themes.get('default').borderRadius },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px rgba(0, 0, 0, 0.4)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.4)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.4)'
      },
      animations: { ...this.themes.get('default').animations }
    });

    // Light theme
    this.addTheme('light', {
      name: 'Light',
      colors: {
        primary: '#2563eb',
        secondary: '#475569',
        background: 'rgba(255, 255, 255, 0.95)',
        surface: 'rgba(255, 255, 255, 0.9)',
        text: '#1e293b',
        textSecondary: 'rgba(30, 41, 59, 0.7)',
        border: 'rgba(30, 41, 59, 0.1)',
        shadow: 'rgba(0, 0, 0, 0.1)',
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
        info: '#2563eb'
      },
      spacing: { ...this.themes.get('default').spacing },
      typography: { ...this.themes.get('default').typography },
      borderRadius: { ...this.themes.get('default').borderRadius },
      shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px rgba(0, 0, 0, 0.1)'
      },
      animations: { ...this.themes.get('default').animations }
    });

    // High contrast theme
    this.addTheme('high-contrast', {
      name: 'High Contrast',
      colors: {
        primary: '#ffffff',
        secondary: '#ffffff',
        background: '#000000',
        surface: '#000000',
        text: '#ffffff',
        textSecondary: '#ffffff',
        border: '#ffffff',
        shadow: '#000000',
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff0000',
        info: '#00ffff'
      },
      spacing: { ...this.themes.get('default').spacing },
      typography: { ...this.themes.get('default').typography },
      borderRadius: { ...this.themes.get('default').borderRadius },
      shadows: {
        sm: '0 0 0 2px #ffffff',
        md: '0 0 0 3px #ffffff',
        lg: '0 0 0 4px #ffffff',
        xl: '0 0 0 5px #ffffff'
      },
      animations: { ...this.themes.get('default').animations }
    });
  }

  addTheme(themeId, themeConfig) {
    this.themes.set(themeId, {
      id: themeId,
      ...themeConfig,
      createdAt: Date.now()
    });
  }

  removeTheme(themeId) {
    this.themes.delete(themeId);
  }

  getTheme(themeId) {
    return this.themes.get(themeId);
  }

  getAllThemes() {
    return Array.from(this.themes.values());
  }

  applyTheme(themeId) {
    const theme = this.themes.get(themeId);
    if (!theme) {
      console.warn(`[PortalThemingService] Theme ${themeId} not found`);
      return false;
    }

    this.currentTheme = themeId;
    this.injectThemeCSS(theme);
    this.updatePortalContainers(theme);
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[PortalThemingService] Applied theme: ${theme.name}`);
    }
    
    return true;
  }

  injectThemeCSS(theme) {
    let styleElement = document.getElementById('portal-theme-styles');
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'portal-theme-styles';
      document.head.appendChild(styleElement);
    }

    const cssVariables = this.generateCSSVariables(theme);
    styleElement.textContent = `
      :root {
        ${cssVariables}
      }
      
      .portal-container {
        --portal-theme: ${theme.id};
        --portal-theme-name: "${theme.name}";
      }
      
      .portal-container.portal-dark-mode {
        ${this.generateDarkModeOverrides(theme)}
      }
      
      .portal-container.portal-high-contrast {
        ${this.generateHighContrastOverrides(theme)}
      }
      
      /* Removed reduced motion styles to enable animations on all devices */
    `;
  }

  generateCSSVariables(theme) {
    const variables = [];
    
    // Color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      variables.push(`--portal-color-${key}: ${value};`);
    });
    
    // Spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      variables.push(`--portal-spacing-${key}: ${value};`);
    });
    
    // Typography variables
    variables.push(`--portal-font-family: ${theme.typography.fontFamily};`);
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      variables.push(`--portal-font-size-${key}: ${value};`);
    });
    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      variables.push(`--portal-font-weight-${key}: ${value};`);
    });
    
    // Border radius variables
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      variables.push(`--portal-border-radius-${key}: ${value};`);
    });
    
    // Shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      variables.push(`--portal-shadow-${key}: ${value};`);
    });
    
    // Animation variables
    Object.entries(theme.animations.duration).forEach(([key, value]) => {
      variables.push(`--portal-duration-${key}: ${value};`);
    });
    Object.entries(theme.animations.easing).forEach(([key, value]) => {
      variables.push(`--portal-easing-${key}: ${value};`);
    });
    
    return variables.join('\n        ');
  }

  generateDarkModeOverrides(theme) {
    if (theme.id === 'dark') return '';
    
    const darkTheme = this.themes.get('dark');
    if (!darkTheme) return '';
    
    return `
      --portal-color-background: ${darkTheme.colors.background};
      --portal-color-surface: ${darkTheme.colors.surface};
      --portal-color-text: ${darkTheme.colors.text};
      --portal-color-textSecondary: ${darkTheme.colors.textSecondary};
      --portal-color-border: ${darkTheme.colors.border};
    `;
  }

  generateHighContrastOverrides(theme) {
    if (theme.id === 'high-contrast') return '';
    
    const highContrastTheme = this.themes.get('high-contrast');
    if (!highContrastTheme) return '';
    
    return `
      --portal-color-background: ${highContrastTheme.colors.background};
      --portal-color-surface: ${highContrastTheme.colors.surface};
      --portal-color-text: ${highContrastTheme.colors.text};
      --portal-color-textSecondary: ${highContrastTheme.colors.text};
      --portal-color-border: ${highContrastTheme.colors.border};
      --portal-color-primary: ${highContrastTheme.colors.primary};
      --portal-color-secondary: ${highContrastTheme.colors.secondary};
    `;
  }

  updatePortalContainers(theme) {
    const containers = document.querySelectorAll('.portal-container');
    containers.forEach(container => {
      container.setAttribute('data-theme', theme.id);
      container.setAttribute('data-theme-name', theme.name);
    });
  }

  // Custom properties management
  setCustomProperty(key, value, scope = 'global') {
    this.customProperties.set(key, { value, scope, timestamp: Date.now() });
    this.applyCustomProperty(key, value, scope);
  }

  getCustomProperty(key) {
    const property = this.customProperties.get(key);
    return property ? property.value : null;
  }

  removeCustomProperty(key) {
    this.customProperties.delete(key);
    this.removeCustomPropertyFromDOM(key);
  }

  applyCustomProperty(key, value, scope) {
    const selector = scope === 'global' ? ':root' : `.portal-container[data-theme="${scope}"]`;
    const styleElement = document.getElementById('portal-custom-properties');
    
    if (!styleElement) {
      const newStyleElement = document.createElement('style');
      newStyleElement.id = 'portal-custom-properties';
      document.head.appendChild(newStyleElement);
    }
    
    const existingStyle = document.getElementById('portal-custom-properties');
    const existingContent = existingStyle.textContent || '';
    const newRule = `${selector} { --portal-custom-${key}: ${value}; }`;
    
    // Remove existing rule for this key
    const updatedContent = existingContent.replace(
      new RegExp(`${selector}\\s*{[^}]*--portal-custom-${key}[^}]*}`, 'g'),
      ''
    );
    
    existingStyle.textContent = updatedContent + '\n' + newRule;
  }

  removeCustomPropertyFromDOM(key) {
    const styleElement = document.getElementById('portal-custom-properties');
    if (styleElement) {
      const content = styleElement.textContent;
      const updatedContent = content.replace(
        new RegExp(`[^{]*{[^}]*--portal-custom-${key}[^}]*}`, 'g'),
        ''
      );
      styleElement.textContent = updatedContent;
    }
  }

  // Responsive theming
  addResponsiveTheme(breakpoint, themeId, themeConfig) {
    if (!this.responsiveThemes.has(breakpoint)) {
      this.responsiveThemes.set(breakpoint, new Map());
    }
    
    this.responsiveThemes.get(breakpoint).set(themeId, themeConfig);
    this.setupResponsiveListener(breakpoint);
  }

  setupResponsiveListener(breakpoint) {
    if (this.mediaQueries.has(breakpoint)) return;
    
    const mediaQuery = window.matchMedia(breakpoint);
    this.mediaQueries.set(breakpoint, mediaQuery);
    
    const handleChange = (e) => {
      if (e.matches) {
        this.applyResponsiveTheme(breakpoint);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Store handler reference for cleanup
    this.mediaQueryHandlers = this.mediaQueryHandlers || new Map();
    this.mediaQueryHandlers.set(breakpoint, handleChange);
    
    // Apply immediately if already matching
    if (mediaQuery.matches) {
      this.applyResponsiveTheme(breakpoint);
    }
  }

  applyResponsiveTheme(breakpoint) {
    const responsiveTheme = this.responsiveThemes.get(breakpoint);
    if (!responsiveTheme) return;
    
    // Apply the first theme for this breakpoint
    const [themeId, themeConfig] = responsiveTheme.entries().next().value;
    if (themeConfig) {
      this.injectThemeCSS({ ...themeConfig, id: `${this.currentTheme}-${breakpoint}` });
    }
  }

  // Brand customization
  customizeBrand(brandConfig) {
    const {
      primaryColor,
      secondaryColor,
      logo,
      fontFamily,
      borderRadius
    } = brandConfig;
    
    if (primaryColor) {
      this.setCustomProperty('brand-primary', primaryColor);
    }
    
    if (secondaryColor) {
      this.setCustomProperty('brand-secondary', secondaryColor);
    }
    
    if (fontFamily) {
      this.setCustomProperty('brand-font-family', fontFamily);
    }
    
    if (borderRadius) {
      this.setCustomProperty('brand-border-radius', borderRadius);
    }
    
    if (logo) {
      this.setCustomProperty('brand-logo', `url(${logo})`);
    }
  }

  // Animation theming
  customizeAnimations(animationConfig) {
    const {
      duration,
      easing,
      reducedMotion
    } = animationConfig;
    
    if (duration) {
      Object.entries(duration).forEach(([key, value]) => {
        this.setCustomProperty(`animation-duration-${key}`, value);
      });
    }
    
    if (easing) {
      Object.entries(easing).forEach(([key, value]) => {
        this.setCustomProperty(`animation-easing-${key}`, value);
      });
    }
    
    if (reducedMotion) {
      this.setCustomProperty('animation-reduced-motion', reducedMotion);
    }
  }

  // Theme export/import
  exportTheme(themeId) {
    const theme = this.themes.get(themeId);
    if (!theme) return null;
    
    return {
      ...theme,
      customProperties: Object.fromEntries(this.customProperties),
      exportedAt: Date.now(),
      version: '1.0'
    };
  }

  importTheme(themeData) {
    try {
      const { id, ...themeConfig } = themeData;
      this.addTheme(id, themeConfig);
      
      if (themeData.customProperties) {
        Object.entries(themeData.customProperties).forEach(([key, { value, scope }]) => {
          this.setCustomProperty(key, value, scope);
        });
      }
      
      return true;
    } catch (error) {
      console.error('[PortalThemingService] Failed to import theme:', error);
      return false;
    }
  }

  // Utility methods
  getCurrentTheme() {
    return this.themes.get(this.currentTheme);
  }

  getCurrentThemeId() {
    return this.currentTheme;
  }

  isThemeApplied(themeId) {
    return this.currentTheme === themeId;
  }

  // Cleanup
  cleanup() {
    // Remove media query listeners
    if (this.mediaQueryHandlers) {
      this.mediaQueries.forEach((mediaQuery, breakpoint) => {
        const handler = this.mediaQueryHandlers.get(breakpoint);
        if (handler) {
          mediaQuery.removeEventListener('change', handler);
        }
      });
      this.mediaQueryHandlers.clear();
    }
    
    // Clear all data structures
    this.mediaQueries.clear();
    this.responsiveThemes.clear();
    this.customProperties.clear();
    this.themes.clear();
    
    // Remove injected styles
    const styleElement = document.getElementById('portal-theme-styles');
    if (styleElement) {
      styleElement.remove();
    }
    
    const customStyleElement = document.getElementById('portal-custom-properties');
    if (customStyleElement) {
      customStyleElement.remove();
    }
  }
}

// Create singleton instance
const portalThemingService = new PortalThemingService();

export default portalThemingService;
