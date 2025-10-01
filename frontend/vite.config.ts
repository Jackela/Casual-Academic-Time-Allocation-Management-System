import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/lib": path.resolve(__dirname, "./src/lib"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/services": path.resolve(__dirname, "./src/services"),
      "@/contexts": path.resolve(__dirname, "./src/contexts"),
    },
  },
  server: {
    port: 5174,
    strictPort: true
  },
  build: {
    // Performance optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          api: ['axios'],
          ui: ['@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge'],
        }
      }
    },
    // Enable minification and tree shaking
    minify: true,
    // Source maps for debugging in production (disable in production)
    sourcemap: process.env.NODE_ENV !== 'production'
  },
  // Environment-specific compilation flags
  define: {
    // Development-only flags
    __DEV_CREDENTIALS__: process.env.NODE_ENV === 'development',
    __E2E_GLOBALS__: process.env.NODE_ENV === 'development' || process.env.VITE_E2E === 'true',
    __DEBUG_LOGGING__: process.env.NODE_ENV === 'development' || process.env.VITE_E2E === 'true',
    __TEST_UTILITIES__: process.env.NODE_ENV !== 'production',
    
    // Production safety flags
    __PRODUCTION_BUILD__: process.env.NODE_ENV === 'production',
    __STRIP_SENSITIVE_DATA__: process.env.NODE_ENV === 'production'
  }
})