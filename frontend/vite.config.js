import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { imagetools } from 'vite-imagetools';
import zlib from 'zlib';

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          [
            '@babel/plugin-transform-react-jsx',
            { runtime: 'automatic' }
          ]
        ]
      }
    }),
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br|gz)$/],
      threshold: 8192,
      deleteOriginFile: false,
      filter: /\.(js|mjs|json|css|html|svg)$/i,
      compressionOptions: { level: 9 }
    }),
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br|gz)$/],
      threshold: 8192,
      deleteOriginFile: false,
      filter: /\.(js|mjs|json|css|html|svg)$/i,
      compressionOptions: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }
    }),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
      emitFile: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Streamr',
        short_name: 'Streamr',
        description: 'A modern streaming and community platform',
        theme_color: '#121417',
        background_color: '#121417',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/offline.html',
        runtimeCaching: [
          // Frequently updated: NetworkFirst
          {
            urlPattern: /\/api\/community\/discussions/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'discussions-api-cache-v2',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 30 },
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Rarely updated: StaleWhileRevalidate
          {
            urlPattern: /\/api\/user\/profile/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'user-profile-cache-v2',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          // Background sync for all critical POSTs
          {
            urlPattern: /\/api\/(community|watchlist|user)/,
            handler: 'NetworkFirst',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'critical-post-queue',
                options: { maxRetentionTime: 24 * 60 }
              },
              cacheName: 'critical-post-cache-v2',
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif|ico|avif|mp4|webm)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    }),
    imagetools()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@context': path.resolve(__dirname, './src/context'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@config': path.resolve(__dirname, './src/config'),
      '@types': path.resolve(__dirname, './src/types'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@providers': path.resolve(__dirname, './src/providers'),
      '@store': path.resolve(__dirname, './src/store'),
      '@api': path.resolve(__dirname, './src/api'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@tests': path.resolve(__dirname, './src/tests'),
      '@mocks': path.resolve(__dirname, './src/mocks'),
      '@fixtures': path.resolve(__dirname, './src/fixtures'),
      '@public': path.resolve(__dirname, './public'),
      '@root': path.resolve(__dirname, '.')
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 3,
        pure_funcs: ['console.info', 'console.warn'],
        ecma: 2020,
        keep_fargs: false,
        keep_infinity: true,
        module: true,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_undefined: true,
      },
      format: {
        comments: false,
      }
    },
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Enhanced chunk splitting for better performance
        manualChunks: {
          // Core React libraries
          'react-core': ['react', 'react-dom'],
          
          // Routing
          'router': ['react-router-dom'],
          
          // UI Libraries (heavy)
          'ui-animations': ['framer-motion'],
          'ui-components': ['swiper', 'react-intersection-observer'],
          
          // Utilities
          'utils': ['lodash', 'axios'],
          
          // Media players
          'media': ['react-player', 'react-youtube'],
          
          // Icons and UI elements
          'icons': ['react-icons', '@heroicons/react'],
          
          // Each major page gets its own chunk
          'home': ['./src/components/HomePage.jsx'],
          'movies': ['./src/components/MoviesPage.jsx'],
          'series': ['./src/components/SeriesPage.jsx'],
          'community': ['./src/components/CommunityPage.jsx'],
          'profile': ['./src/pages/ProfilePage.jsx'],
          'watchlist': ['./src/pages/WatchlistPage.jsx'],
          
          // Authentication pages
          'auth': [
            './src/pages/LoginPage.jsx',
            './src/pages/SignupPage.jsx',
            './src/pages/ForgotPasswordPage.jsx',
            './src/pages/ResetPasswordPage.jsx',
            './src/pages/VerifyEmailPage.jsx',
            './src/pages/OAuthSuccessPage.jsx'
          ],
          
          // Services
          'services': [
            './src/services/tmdbService.js',
            './src/services/enhancedApiService.js',
            './src/services/communityService.js'
          ],
          
          // Context providers
          'context': [
            './src/contexts/AuthContext.jsx',
            './src/contexts/LoadingContext.jsx',
            './src/contexts/WatchlistContext.jsx',
            './src/contexts/ThemeContext.jsx',
            './src/contexts/SocketContext.jsx'
          ]
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(css)$/.test(name ?? '')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          if (/\.(png|jpe?g|svg|gif|webp|ico|avif)$/.test(name ?? '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          return 'assets/[ext]/[name]-[hash][extname]';
        }
      }
    },
    chunkSizeWarningLimit: 500, // Reduced from 700
    cssCodeSplit: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    brotliSize: true,
    reportCompressedSize: true,
    emptyOutDir: true
  },
  css: {
    devSourcemap: false,
    modules: {
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[local]__[hash:base64:6]'
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  server: {
    hmr: {
      overlay: false,
      timeout: 20000
    },
    watch: {
      usePolling: false,
      interval: 100
    },
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      '/api': {
        target: 'https://streamr-jjj9.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('[Proxy Error]', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (process.env.NODE_ENV === 'development') {
              console.info('[Proxy Request]', req.method, req.url);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            if (process.env.NODE_ENV === 'development') {
              console.info('[Proxy Response]', proxyRes.statusCode, req.url);
            }
          });
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'swiper',
      'lodash',
      'axios'
    ],
    exclude: [
      '@headlessui/react',
      '@heroicons/react'
    ]
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'esnext',
    minify: true,
    legalComments: 'none'
  },
  json: {
    namedExports: true,
    stringify: false
  },
  envPrefix: ['VITE_', 'REACT_APP_']
});

// Additional Recommendations:
// 1. For Tailwind CSS, ensure purge is enabled in tailwind.config.js:
//    purge: ['./src/**/*.{js,jsx,ts,tsx,html}'],
// 2. For React code-splitting, use React.lazy and Suspense for large pages/components.
// 3. Consider lazy loading images and using modern formats (WebP/AVIF) in your components.