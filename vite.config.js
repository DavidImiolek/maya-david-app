import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages: App liegt unter https://davidimiolek.github.io/maya-david-app/
  base: '/maya-david-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Maya & David',
        short_name: 'Maya & David',
        description: 'Unser geteilter Kalender',
        lang: 'de',
        start_url: '/maya-david-app/',
        scope: '/maya-david-app/',
        display: 'standalone',
        background_color: '#FBF7F2',
        theme_color: '#FBF7F2',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
