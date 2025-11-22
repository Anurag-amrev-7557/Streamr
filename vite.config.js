import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate React and related libraries
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }

            // Separate query library
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }

            // Separate animation libraries
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }

            // Separate state management
            if (id.includes('zustand')) {
              return 'state-vendor';
            }

            // Separate icons
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }

            // All other node_modules into vendor chunk
            return 'vendor';
          }
        }
      }
    },
    // Increase chunk size warning limit to 600kb (our chunks will be smaller now)
    chunkSizeWarningLimit: 600,
  }
})
