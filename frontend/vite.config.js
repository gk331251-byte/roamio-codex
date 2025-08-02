import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwind()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  build: {
    // Don't minify in development for better error tracking
    minify: process.env.NODE_ENV === 'production',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Preserve function names for better error traces
        preserveEntrySignatures: 'exports-only'
      }
    }
  },
  esbuild: {
    // Keep function names for debugging
    keepNames: true
  }
})
