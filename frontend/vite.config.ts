import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Environment-based configuration
  const isDevelopment = mode === 'development';
  const isProduction = mode === 'production';
  
  return {
    plugins: [react()],
    
    // Server configuration
    server: {
      port: parseInt(env.VITE_DEV_SERVER_PORT || '3000'),
      host: env.VITE_DEV_SERVER_HOST || 'localhost',
      https: env.VITE_DEV_SERVER_HTTPS === 'true',
      hmr: {
        port: parseInt(env.VITE_HMR_PORT || '3000'),
      },
      open: true, // Auto-open browser in development
    },
    
    // Build configuration
    build: {
      outDir: env.VITE_BUILD_OUTDIR || 'dist',
      sourcemap: env.VITE_BUILD_SOURCEMAP === 'true' || isDevelopment,
      minify: env.VITE_BUILD_MINIFY !== 'false' && isProduction,
      assetsInlineLimit: parseInt(env.VITE_ASSET_INLINE_LIMIT || '4096'),
      chunkSizeWarningLimit: parseInt(env.VITE_CHUNK_SIZE_WARNING_LIMIT || '500'),
      rollupOptions: {
        output: {
          // Chunk splitting for better caching
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['lucide-react'],
            three: ['three'],
          },
        },
      },
      target: 'esnext', // Modern browsers
    },
    
    // Base URL configuration
    base: env.VITE_BASE_URL || '/',
    publicDir: 'public',
    
    // Dependency optimization
    optimizeDeps: {
      exclude: ['lucide-react'],
      include: env.VITE_LAZY_LOAD_COMPONENTS === 'false' ? ['react', 'react-dom'] : [],
    },
    
    // CSS configuration
    css: {
      devSourcemap: env.VITE_ENABLE_CSS_SOURCE_MAPS === 'true' || isDevelopment,
      preprocessorOptions: {
        scss: {
          additionalData: `$env: ${mode};`,
        },
      },
    },
    
    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@pages': resolve(__dirname, 'src/pages'),
        '@services': resolve(__dirname, 'src/services'),
        '@assets': resolve(__dirname, 'src/assets'),
      },
    },
    
    // Environment variables configuration
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: isDevelopment,
      __PROD__: isProduction,
    },
    
    // Preview configuration (for build preview)
    preview: {
      port: parseInt(env.VITE_DEV_SERVER_PORT || '3000'),
      host: env.VITE_DEV_SERVER_HOST || 'localhost',
      https: env.VITE_DEV_SERVER_HTTPS === 'true',
    },
    
    // Performance optimizations
    esbuild: {
      // Remove console.log in production
      drop: isProduction ? ['console', 'debugger'] : [],
    },
  };
});
