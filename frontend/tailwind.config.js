/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // 🚀 Enhanced performance configuration
  future: {
    hoverOnlyWhenSupported: true,
    respectDefaultRingColor: true,
    disableColorOpacityUtilitiesByDefault: true,
    relativeContentPathsByDefault: true,
  },
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        '3xl': '1920px',
        'xs': '400px', // Custom breakpoint for extremely small screens
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        // 🚀 Performance-optimized animations
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'shimmer': {
          '0%': {
            'background-position': '-200% 0'
          },
          '100%': {
            'background-position': '200% 0'
          },
        },
        // 🚀 Performance-optimized keyframes
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slideUp': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'scaleIn': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'bounceSubtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' }
        }
      },
      // 🚀 Enhanced spacing for better performance
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // 🚀 Enhanced colors with better contrast ratios
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      },
      // 🚀 Enhanced transitions for better performance
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'transform-gpu': 'transform',
      },
      // 🚀 Enhanced backdrop blur for better performance
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [
    // 🚀 Custom plugin for performance optimizations
    function({ addUtilities, addComponents, theme }) {
      // Performance-optimized utilities
      const performanceUtilities = {
        '.will-change-transform': {
          'will-change': 'transform',
        },
        '.will-change-opacity': {
          'will-change': 'opacity',
        },
        '.will-change-scroll': {
          'will-change': 'scroll-position',
        },
        '.contain-layout': {
          'contain': 'layout',
        },
        '.contain-style': {
          'contain': 'style',
        },
        '.contain-paint': {
          'contain': 'paint',
        },
        '.contain-strict': {
          'contain': 'strict',
        },
        '.backface-hidden': {
          'backface-visibility': 'hidden',
        },
        '.transform-gpu': {
          'transform': 'translateZ(0)',
        },
        '.scroll-smooth': {
          'scroll-behavior': 'smooth',
        },
        '.scroll-auto': {
          'scroll-behavior': 'auto',
        },
        '.overscroll-contain': {
          'overscroll-behavior': 'contain',
        },
        '.overscroll-auto': {
          'overscroll-behavior': 'auto',
        },
        '.overscroll-none': {
          'overscroll-behavior': 'none',
        },
        '.touch-pan-x': {
          'touch-action': 'pan-x',
        },
        '.touch-pan-left': {
          'touch-action': 'pan-left',
        },
        '.touch-pan-right': {
          'touch-action': 'pan-right',
        },
        '.touch-pan-y': {
          'touch-action': 'pan-y',
        },
        '.touch-pan-up': {
          'touch-action': 'pan-up',
        },
        '.touch-pan-down': {
          'touch-action': 'pan-down',
        },
        '.touch-pinch-zoom': {
          'touch-action': 'pinch-zoom',
        },
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.touch-none': {
          'touch-action': 'none',
        },
      };

      // Performance-optimized components
      const performanceComponents = {
        '.performance-card': {
          'contain': 'layout style paint',
          'will-change': 'transform',
          'backface-visibility': 'hidden',
          'transform': 'translateZ(0)',
        },
        '.performance-image': {
          'contain': 'layout style paint',
          'will-change': 'opacity',
          'backface-visibility': 'hidden',
        },
        '.performance-button': {
          'contain': 'layout style',
          'will-change': 'transform',
          'backface-visibility': 'hidden',
          'transform': 'translateZ(0)',
        },
        '.performance-scroll': {
          'overscroll-behavior': 'contain',
          'scroll-behavior': 'smooth',
        },
      };

      addUtilities(performanceUtilities);
      addComponents(performanceComponents);
    }
  ],
  // 🚀 Enhanced core plugins for better performance
  corePlugins: {
    // Disable unused features for better performance
    container: false,
    preflight: true,
    // Enable modern CSS features
    aspectRatio: true,
    columns: true,
    breakBefore: true,
    breakAfter: true,
    breakInside: true,
    isolation: true,
    objectPosition: true,
    objectFit: true,
    overscrollBehavior: true,
    scrollBehavior: true,
    touchAction: true,
    willChange: true,
    contain: true,
    backfaceVisibility: true,
    transformStyle: true,
    perspective: true,
    perspectiveOrigin: true,
    transformOrigin: true,
    transformBox: true,
    transformGpu: true,
  }
} 