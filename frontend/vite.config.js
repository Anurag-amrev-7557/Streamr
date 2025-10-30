import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import { imagetools } from 'vite-imagetools';
import zlib from 'zlib';

export default defineConfig(({ command, mode }) => {
  const isDevelopment = command === 'serve' || mode === 'development';
  const isProduction = command === 'build' || mode === 'production';
  
  return {
    plugins: (() => {
      const plugins = [
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
        })
      ];

      // Use heavy plugins only in production to keep dev fast and avoid optimize timeouts
      if (isProduction) {
        // Enhanced compression with better algorithms
        plugins.push(
          compression({
            algorithm: 'gzip',
            exclude: [/\.(br|gz)$/],
            threshold: 1024,
            deleteOriginFile: false,
            filter: /\.(js|mjs|json|css|html|svg|woff|woff2|ttf|eot)$/i,
            compressionOptions: {
              level: 9,
              memLevel: 9
            }
          })
        );
        plugins.push(
          compression({
            algorithm: 'brotliCompress',
            exclude: [/\.(br|gz)$/],
            threshold: 1024,
            deleteOriginFile: false,
            filter: /\.(js|mjs|json|css|html|svg|woff|woff2|ttf|eot)$/i,
            compressionOptions: {
              params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
                [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
                [zlib.constants.BROTLI_PARAM_SIZE_HINT]: 0
              }
            }
          })
        );
        // Enhanced bundle analyzer
        plugins.push(
          visualizer({
            filename: 'dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
            emitFile: true,
            metadata: true,
            title: 'Bundle Analysis Report'
          })
        );
      }

      // Keep imagetools in both envs, but keep defaults light for dev
      plugins.push(
        imagetools({
          defaultDirectives: new URLSearchParams(
            isProduction
              ? { format: 'webp', quality: '80', w: '1200', h: '800', as: 'picture' }
              : {}
          ),
          resolveConfigs: true
        })
      );

      return plugins;
    })(),
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
        '@root': path.resolve(__dirname, '.'),
        // Fix interop issue: some ESM builds import fast-deep-equal as default
        'fast-deep-equal': 'fast-deep-equal/es6',
        'fast-deep-equal/index.js': 'fast-deep-equal/es6/index.js'
      },
      // Enhanced module resolution
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
      preserveSymlinks: false
    },
    build: {
      outDir: 'dist',
      // Enhanced build optimizations
      rollupOptions: {
        output: {
          // Optimized chunk naming
          entryFileNames: 'assets/[name]-[hash:8].js',
          chunkFileNames: 'assets/[name]-[hash:8].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            if (/\.(css)$/.test(assetInfo.name || '')) {
              return 'assets/[name]-[hash:8].[ext]';
            }
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name || '')) {
              return 'assets/images/[name]-[hash:8].[ext]';
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name || '')) {
              return 'assets/fonts/[name]-[hash:8].[ext]';
            }
            return 'assets/[name]-[hash:8].[ext]';
          },
          // Enhanced chunk splitting strategy
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('react-router')) {
                return 'router-vendor';
              }
              if (id.includes('framer-motion')) {
                return 'animation-vendor';
              }
              if (id.includes('axios') || id.includes('lodash')) {
                return 'utils-vendor';
              }
              if (id.includes('socket.io')) {
                return 'realtime-vendor';
              }
              if (id.includes('react-player') || id.includes('react-youtube')) {
                return 'media-vendor';
              }
              if (id.includes('react-window') || id.includes('@tanstack/react-virtual')) {
                return 'virtualization-vendor';
              }
              if (id.includes('@tanstack/react-query')) {
                return 'query-vendor';
              }
              if (id.includes('@tiptap')) {
                return 'editor-vendor';
              }
              if (id.includes('imagemin')) {
                return 'image-vendor';
              }
              // Default vendor chunk for other dependencies
              return 'vendor';
            }
            // App chunks
            if (id.includes('/components/')) {
              return 'components';
            }
            if (id.includes('/pages/')) {
              return 'pages';
            }
            if (id.includes('/services/')) {
              return 'services';
            }
            if (id.includes('/hooks/')) {
              return 'hooks';
            }
          }
        },
        // Enhanced external handling
        external: [],
        // Better tree shaking
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          unknownGlobalSideEffects: false
        },
        // Better error handling
        onwarn(warning, warn) {
          // Suppress certain warnings
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
          warn(warning);
        }
      },
      chunkSizeWarningLimit: 1000, // Increased for better chunking
      cssCodeSplit: true,
      sourcemap: isDevelopment, // Source maps only in development
      emptyOutDir: true,
      // Enhanced performance optimizations
      target: 'es2022', // More modern target for better performance
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: !isDevelopment,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          passes: 2, // Multiple passes for better compression
          unsafe: true, // Enable unsafe optimizations
          unsafe_comps: true,
          unsafe_Function: true,
          unsafe_math: true,
          unsafe_proto: true,
          unsafe_regexp: true,
          unsafe_undefined: true
        },
        mangle: {
          safari10: true, // Better Safari compatibility
          toplevel: true // Mangle top-level names
        }
      },
      // Enhanced CSS optimization
      cssMinify: 'terser',
      // Better asset handling
      assetsInlineLimit: 4096, // 4KB inline limit
      // Enhanced reporting
      reportCompressedSize: true,
      // Better chunk loading
      dynamicImportVarsOptions: {
        warnOnError: false,
        exclude: []
      }
    },
    css: {
      devSourcemap: isDevelopment,
      modules: {
        localsConvention: 'camelCaseOnly',
        generateScopedName: '[local]__[hash:base64:6]'
      }
    },
    server: {
      hmr: {
        overlay: false,
        timeout: 30000,
        // Enhanced HMR
        port: 24678
      },
      watch: {
        usePolling: false,
        interval: 100,
        // Enhanced file watching
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**']
      },
      port: 5173,
      strictPort: false,
      open: false,
      // In dev, avoid aggressive caching to prevent stale optimized deps
      headers: isDevelopment ? { 'Cache-Control': 'no-store' } : {},
      // Enhanced proxy configuration
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
      },
      // Enhanced middleware
      middlewareMode: false,
      // Better error handling
      fs: {
        strict: false,
        allow: ['..']
      },
      // Performance optimizations
      cors: true,
      // Better compression
      compress: true,
      // Enhanced security
      https: false
    },
    // Enhanced asset handling
    assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
    // Enhanced dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'axios',
        'lodash',
        'react-hot-toast',
        'react-icons',
        'date-fns',
        'swiper',
  // removed plain 'firebase' because Vite cannot always pre-bundle the top-level
  // package (it uses subpath exports). If needed, add specific submodules like
  // 'firebase/app', 'firebase/auth', 'firebase/firestore' instead.
        'react-intersection-observer',
        // Ensure proper pre-bundling for interop
        'react-youtube',
        'fast-deep-equal'
      ],
      exclude: [
        'framer-motion',
        'react-player',
        'socket.io-client',
        'react-window',
        '@tanstack/react-virtual',
        '@tiptap/react',
        'imagemin'
      ],
      // Force optimize on dev server start to avoid outdated dep states
      force: true,
      // Clear cache on restart to prevent stale dependencies
      clearScreen: false,
      esbuildOptions: {
        target: 'es2022',
        supported: {
          'bigint': true,
          'decorators': true,
          'nullish-coalescing': true,
          'top-level-await': true,
          'async-await': true,
          'import-meta': true
        },
        legalComments: 'none',
        // Enhanced esbuild options
        minify: isProduction,
        minifyIdentifiers: isProduction,
        minifySyntax: isProduction,
        minifyWhitespace: isProduction,
        // Better tree shaking
        treeShaking: true,
        // JSX and TSX support is handled automatically by esbuild
      }
    },
    // Enhanced esbuild configuration
    esbuild: {
      logOverride: { 
        'this-is-undefined-in-esm': 'silent',
        'import-is-undefined': 'silent',
        'duplicate-object-key': 'silent'
      },
      target: 'es2022',
      drop: isProduction ? ['console', 'debugger'] : [],
      // Better performance optimizations
      keepNames: !isProduction, // Keep names in development for debugging
      minifyIdentifiers: isProduction,
      minifySyntax: isProduction,
      minifyWhitespace: isProduction,
      pure: isProduction ? ['console.log', 'console.info', 'console.debug', 'console.warn'] : [],
      // Enhanced esbuild options
      treeShaking: true
    },
    // Enhanced development experience
    clearScreen: false,
    logLevel: isDevelopment ? 'info' : 'warn',
    // Enhanced JSON handling
    json: {
      namedExports: true,
      stringify: false
    },
    // Enhanced environment handling
    envPrefix: ['VITE_', 'REACT_APP_'],
    // Enhanced preview configuration
    preview: {
      port: 4173,
      strictPort: false,
      open: false,
      // Enhanced preview headers
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    },
    // Enhanced experimental features
    experimental: {
      // Enable modern features
      renderBuiltUrl: (filename, { hostType }) => {
        if (hostType === 'js') {
          return { js: `/${filename}` };
        } else {
          return { relative: true };
        }
      },
      // Enable modern Vite features
      hmrPartialAccept: true,
      // Better module resolution
      skipSsrTransform: true
    },
    // Enhanced worker configuration
    worker: {
      format: 'es',
      plugins: () => [],
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash:8].js'
        }
      }
    },
    // Enhanced define configuration
    define: {
      __DEV__: isDevelopment,
      __PROD__: isProduction,
      __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
    }
  };
});