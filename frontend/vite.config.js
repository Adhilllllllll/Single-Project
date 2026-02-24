import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // DEV STABILITY: If port 5173 is busy, auto-pick next available (5174, 5175...)
    // Set to true if you need strict port control
    strictPort: false,
    watch: {
      usePolling: true, // Fix for Windows OneDrive file watching issues
    },
  },
})

