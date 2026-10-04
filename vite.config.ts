
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env variables from .env files
  const env = loadEnv(mode, process.cwd(), '');
  !!env;

  return {
    base: './',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,ttf,woff,woff2}'],
        },
        manifest: {
          name: 'B.Manager App',
          short_name: 'B.Manager',
          description: 'A comprehensive app for managing buildings, reports, and maintenance.',
          theme_color: '#0f172a',
          background_color: '#f8fafc',
          display: 'standalone',
          start_url: '.',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/maskable_icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        }
      })
    ],
    define: {
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || ''),
        // These are for the Google Drive service
        VITE_GOOGLE_API_KEY: JSON.stringify(env.VITE_GOOGLE_API_KEY || ''),
        VITE_GOOGLE_CLIENT_ID: JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || ''),
      }
    },
    build: {
      chunkSizeWarningLimit: 1000, // Increase chunk size warning limit
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  }
})