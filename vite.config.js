import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: [
      '.ngrok-free.dev'   // 👈 THIS IS THE REAL FIX
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    },
    hmr: {
      host: 'liberty-hypermystical-justice.ngrok-free.dev', // 👈 THE REAL FIX
      protocol: 'wss',
      clientPort: 443
    }
  }
})