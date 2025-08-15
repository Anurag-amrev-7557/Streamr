import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import { imagetools } from 'vite-imagetools';
import zlib from 'zlib';

export default defineConfig(({ command, mode }) => {
  const isDevelopment = command === 'serve' || mode === 'development';
  
  return {
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
        threshold: 1024, // Reduced threshold for better compression
        deleteOriginFile: false,
        filter: /\.(js|mjs|json|css|html|svg)$/i,
        compressionOptions: { level: 6 } // Reduced compression level for faster processing
      }),
      compression({
        algorithm: 'brotliCompress',
        exclude: [/\.(br|gz)$/],
        threshold: 1024, // Reduced threshold
        deleteOriginFile: false,
        filter: /\.(js|mjs|json|css|html|svg)$/i,
        compressionOptions: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 } } // Reduced quality for speed
      }),
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
        emitFile: true,
      }),
      imagetools({
        // Optimize images for slow networks
        defaultDirectives: new URLSearchParams({
          format: 'webp',
          quality: '60', // Reduced quality for faster loading
          w: '800', // Max width
          h: '600', // Max height
        })
      })
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
      target: 'es2018', // Changed from esnext for better compatibility
      minify: 'terser',
      outDir: 'dist',
      // Optimized for minimal network requirements
      rollupOptions: {
        output: {
          // Smaller chunks for better loading on slow networks
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.js')) {
              return 'assets/[name]-[hash].js';
            }
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'assets/[name]-[hash].css';
            }
            return 'assets/[name]-[hash].[ext]';
          },
          // Enhanced chunk splitting for minimal network requirements
          manualChunks: {
            // Core React libraries - keep small
            'react-core': ['react', 'react-dom'],
            // Routing - essential
            'router': ['react-router-dom'],
            // Animation libraries - load only when needed
            'animation': ['framer-motion'],
            // UI components - essential
            'ui-core': ['react-icons', 'react-hot-toast'],
            // Media libraries - load on demand
            'media': ['react-player', 'react-youtube'],
            // Utility libraries - essential
            'utils': ['lodash', 'axios'],
            // Socket and real-time - load when needed
            'realtime': ['socket.io-client'],
            // Virtualization - load on demand
            'virtualization': ['react-window', '@tanstack/react-virtual'],
            // Query management - essential
            'query': ['@tanstack/react-query'],
            // Rich text editor - load only when needed
            'editor': ['@tiptap/react', '@tiptap/starter-kit'],
            // Image optimization - load on demand
            'image-opt': ['imagemin', 'imagemin-mozjpeg']
          }
        }
      },
      chunkSizeWarningLimit: 500, // Reduced for better network performance
      cssCodeSplit: true,
      sourcemap: false, // Disabled for production to reduce size
      emptyOutDir: true,
      // Optimized terser configuration for minimal network
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          passes: 1, // Reduced passes for faster build
          dead_code: true,
          unused: true
        },
        mangle: {
          safari10: true
        }
      }
    },
    css: {
      devSourcemap: false,
      modules: {
        localsConvention: 'camelCaseOnly',
        generateScopedName: '[local]__[hash:base64:4]' // Shorter hash
      }
    },
    server: {
      hmr: {
        overlay: false,
        timeout: 30000
      },
      watch: {
        usePolling: false,
        interval: 100
      },
      port: 5173,
      strictPort: false,
      open: false,
      force: true,
      headers: {
        '*.js': {
          'Content-Type': 'application/javascript; charset=utf-8'
        },
        '*.mjs': {
          'Content-Type': 'application/javascript; charset=utf-8'
        },
        '*.jsx': {
          'Content-Type': 'application/javascript; charset=utf-8'
        }
      },
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
    // Optimized dependency optimization for minimal network
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'axios',
        'lodash'
      ],
      exclude: [
        'framer-motion',
        'react-player',
        'react-youtube',
        'socket.io-client',
        'react-window',
        '@tanstack/react-virtual'
      ],
      force: false,
      esbuildOptions: {
        target: 'es2018',
        supported: {
          'bigint': false // Disabled for better compatibility
        },
        legalComments: 'none'
      }
    },
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
      target: 'es2018',
      drop: ['console', 'debugger'],
      pure: ['console.log', 'console.info', 'console.debug']
    },
    clearScreen: false,
    logLevel: 'info',
    json: {
      namedExports: true,
      stringify: false
    },
    envPrefix: ['VITE_', 'REACT_APP_'],
    preview: {
      port: 4173,
      strictPort: false,
      open: false
    }
  };
});