import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';
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
    outDir: 'dist',
    rollupOptions: {
      output: {
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
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    sourcemap: process.env.NODE_ENV !== 'production',
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
      'axios',
      'react-hot-toast',
      'react-icons',
      'react-intersection-observer',
      'react-player',
      'react-window',
      'react-youtube',
      'socket.io-client'
    ],
    exclude: [
      '@headlessui/react',
      '@heroicons/react'
    ],
    force: false
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    target: 'esnext'
  },
  clearScreen: false,
  logLevel: 'info',
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