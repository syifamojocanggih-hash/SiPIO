import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      includeAssets: [
        'favicon.svg',
        'sipio-icon.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'apple-touch-icon.png',
        'camera/pond_latest.jpg',
        'camera/hopper_latest.jpg'
      ],
      manifest: {
        id: '/?source=pwa',
        name: 'SiPIO - Smart Fish Feeder & Pond Monitoring',
        short_name: 'SiPIO',
        description: 'Sistem Pemantau Ikan & Pemberi Pakan Otomatis Berbasis IoT dengan Sensor Suhu DS18B20, Float Switch, dan Kamera ESP32-CAM',
        theme_color: '#0284c7',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'window-controls-overlay'],
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'id',
        dir: 'ltr',
        categories: ['utilities', 'productivity', 'agriculture'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/sipio-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: '/screenshots/mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Tampilan Mobile Dasbor Telemetri Kolam dan Kontrol Pakan SiPIO'
          },
          {
            src: '/screenshots/desktop.png',
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Tampilan Desktop Dasbor SiPIO dengan Panel Pemantau Kamera dan Analitik Suhu'
          }
        ],
        shortcuts: [
          {
            name: 'Beri Pakan Cepat',
            short_name: 'Pakan',
            description: 'Beri pelet manual instan melalui servo feeder',
            url: '/#sec-feeder',
            icons: [{ src: '/sipio-icon.svg', sizes: '192x192' }]
          },
          {
            name: 'Kamera Kolam & Wadah',
            short_name: 'Kamera',
            description: 'Lihat kondisi air kolam dan wadah hopper',
            url: '/#sec-camera',
            icons: [{ src: '/sipio-icon.svg', sizes: '192x192' }]
          },
          {
            name: 'Tren Suhu Air',
            short_name: 'Suhu',
            description: 'Pantau riwayat suhu air sensor DS18B20',
            url: '/#sec-temp',
            icons: [{ src: '/sipio-icon.svg', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
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
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/camera\/.*\.(?:png|jpg|jpeg|svg|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'camera-snapshots-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days offline availability
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/telemetry|\/api\/status/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-telemetry-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true
      }
    }
  }
})
