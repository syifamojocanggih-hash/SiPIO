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
        theme_color: '#0f172a',
        background_color: '#0b1120',
        display: 'standalone',
        start_url: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/sipio-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
})
