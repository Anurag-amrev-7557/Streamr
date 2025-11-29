import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';

// Generate version once for consistency
const currentVersion = Date.now().toString();

// Custom plugin to generate version.json
const versionGenPlugin = (version) => {
  return {
    name: 'version-gen',
    writeBundle() {
      const versionInfo = { version, timestamp: new Date().toISOString() };
      const distPath = path.resolve(__dirname, 'dist');
      const versionFile = path.join(distPath, 'version.json');

      // Ensure dist exists (it should after build)
      if (fs.existsSync(distPath)) {
        fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));
        console.log(`Version file generated: ${version}`);
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Handle /version.json and /version.json?t=...
        const url = req.url.split('?')[0];
        if (url === '/version.json') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ version, timestamp: new Date().toISOString() }));
          return;
        }
        next();
      });
    }
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    versionGenPlugin(currentVersion),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Streamr',
        short_name: 'Streamr',
        description: 'Stream your favorite movies and TV shows',
        theme_color: '#000000',
        icons: [
          {
            src: 'pwa-logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/lh3\.googleusercontent\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-avatars',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(currentVersion),
  },
  server: {
    host: true, // Listen on all addresses to fix HMR issues
    proxy: {
      '/api': {
        target: 'https://streamrbackend.vercel.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'lucide-react', 'axios', 'zustand', 'clsx', 'tailwind-merge'],
        }
      }
    },
    // Increase chunk size warning limit to 600kb (our chunks will be smaller now)
    chunkSizeWarningLimit: 600,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  esbuild: {
    legalComments: 'none',
  },
})
