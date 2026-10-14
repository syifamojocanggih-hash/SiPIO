import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'sipio-icon.svg'],
      manifest: {
        name: 'SiPio - Smart Fish Feeder & Pond Monitor',
        short_name: 'SiPio',
        description: 'Sistem Pemberi Pakan Ikan Otomatis Berbasis IoT dengan Sensor Suhu, Level Air, dan Kamera Pemantau',
        theme_color: '#0284c7',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        categories: ['utilities', 'productivity'],
        icons: [
          {
            src: '/sipio-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/sipio-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Beri Pakan Cepat',
            short_name: 'Pakan',
            description: 'Pemberian pakan pelet instan via servo',
            url: '/#sec-feeder',
            icons: [{ src: '/sipio-icon.svg', sizes: '192x192' }]
          },
          {
            name: 'Pantau Kamera Kolam',
            short_name: 'Kamera',
            description: 'Lihat kondisi air kolam dan hopper pakan',
            url: '/#sec-camera',
            icons: [{ src: '/sipio-icon.svg', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
})
