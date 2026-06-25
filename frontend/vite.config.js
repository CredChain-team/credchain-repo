import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend dev server pinned to port 3000 (the CORS-whitelisted origin).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
