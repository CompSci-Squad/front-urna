import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: {
      assert: 'assert/',
      buffer: 'buffer/',
      util: 'util/',
      process: 'process/browser'
    }
  },
  optimizeDeps: {
    include: ['assert', 'buffer', 'util', 'process']
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Urna Digital',
        short_name: 'Urna Digital',
        description: 'Urna eletrônica leve e offline-first',
        theme_color: '#84CC16',
        background_color: '#FAFAF9',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\.(?:js|css|html|svg|json|png|jpg|jpeg|wasm)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ]
})
