import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Prefer Vite-loaded envs; fall back to process.env for CI shells
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_BASE_URL || process.env.VITE_API_PROXY_TARGET || process.env.VITE_API_BASE_URL;
  const apiProxyOrigin = apiProxyTarget ? new URL(apiProxyTarget).origin : undefined;
  const shouldDebugProxy = (env.VITE_DEBUG_PROXY || process.env.VITE_DEBUG_PROXY) === 'true';
  const devServerOrigin =
    env.VITE_DEV_SERVER_ORIGIN || process.env.VITE_DEV_SERVER_ORIGIN ||
    ((env.E2E_FRONTEND_HOST && env.E2E_FRONTEND_PORT)
      ? `http://${env.E2E_FRONTEND_HOST}:${env.E2E_FRONTEND_PORT}`
      : (env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL) ||
        ((env.VITE_DEV_SERVER_PORT || process.env.VITE_DEV_SERVER_PORT)
          ? `http://127.0.0.1:${env.VITE_DEV_SERVER_PORT || process.env.VITE_DEV_SERVER_PORT}`
          : undefined));

  const buildProxyConfig = () => {
    if (!apiProxyTarget) {
      return undefined;
    }

    const applyProxyHeaders = (proxy: any) => {
      proxy.on('proxyReq', (proxyReq: any, req: any) => {
        const originHeader = req.headers?.origin ?? apiProxyOrigin ?? devServerOrigin;
        if (originHeader) {
          proxyReq.setHeader('origin', originHeader);
          if (shouldDebugProxy) {
            console.log(`[vite-proxy] ${req.method ?? 'GET'} ${req.url ?? ''} origin=${originHeader}`);
          }
        } else if (shouldDebugProxy) {
          console.log(`[vite-proxy] ${req.method ?? 'GET'} ${req.url ?? ''} origin=<unset>`);
        }
      });
    };

    return {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
        configure: applyProxyHeaders,
      },
      '/actuator': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
        configure: applyProxyHeaders,
      },
    } as const;
  };

  return {
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
        // Shared JSON Schemas (copied into image at /app/schema in Docker)
        "@schema": path.resolve(__dirname, "../schema"),
      },
    },
    server: {
      port: 5174,
      strictPort: true,
      allowedHosts: (env.VITE_E2E === 'true' || process.env.VITE_E2E === 'true')
        ? ['web', 'localhost', '127.0.0.1']
        : undefined,
      proxy: buildProxyConfig(),
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
      __DEV_CREDENTIALS__: process.env.NODE_ENV === 'development',
      __E2E_GLOBALS__: process.env.NODE_ENV === 'development' || (env.VITE_E2E === 'true' || process.env.VITE_E2E === 'true'),
      __DEBUG_LOGGING__: process.env.NODE_ENV === 'development' || (env.VITE_E2E === 'true' || process.env.VITE_E2E === 'true'),
      __TEST_UTILITIES__: process.env.NODE_ENV !== 'production',
      __PRODUCTION_BUILD__: process.env.NODE_ENV === 'production',
      __STRIP_SENSITIVE_DATA__: process.env.NODE_ENV === 'production'
    }
  }
})
