import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({
      // Enable React development mode with detailed errors
      jsxRuntime: 'automatic'
    }), 
    tailwind()
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__DEV__': process.env.NODE_ENV !== 'production'
  },
  build: {
    // Don't minify in development for better error tracking
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    sourcemap: true,
    rollupOptions: {
      output: {
        // Preserve function names for better error traces
        preserveEntrySignatures: 'exports-only'
      }
    }
  },
  esbuild: {
    // Keep function names and detailed source info for debugging
    keepNames: true,
    minifyIdentifiers: process.env.NODE_ENV === 'production',
    minifySyntax: process.env.NODE_ENV === 'production'
  },
  server: {
    // Enable HMR with error overlay
    hmr: {
      overlay: true
    }
  }
})
