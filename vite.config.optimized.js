import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    // Gzip compression
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Brotli compression
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    // Bundle analyzer (only in build)
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // React and core libraries
          'react-vendor': ['react', 'react-dom'],
          // UI libraries
          'ui-vendor': ['lucide-react', 'react-hot-toast', 'react-dropzone'],
          // Chart libraries
          'charts': ['chart.js', 'react-chartjs-2'],
          // Socket.io
          'socket': ['socket.io-client'],
          // Utilities
          'utils': ['axios', 'uuid'],
        },
        // Optimize chunk names
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Target modern browsers
    target: 'es2020',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize assets
    assetsInlineLimit: 4096,
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'socket.io-client',
      'chart.js',
      'react-chartjs-2'
    ],
    exclude: [],
  },
  
  server: {
    port: 5173,
    strictPort: false,
    open: false,
    cors: true,
    // Enable HMR
    hmr: {
      overlay: true,
    },
    // Proxy API requests
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  
  preview: {
    port: 4173,
    strictPort: false,
    open: false,
    cors: true,
  },
  
  // Environment variables prefix
  envPrefix: 'VITE_',
  
  // Enable JSON imports
  json: {
    namedExports: true,
    stringify: false,
  },
  
  // CSS configuration
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
  },
  
  // Worker configuration
  worker: {
    format: 'es',
  },
});