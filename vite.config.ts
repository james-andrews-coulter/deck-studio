import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          radix: [
            '@radix-ui/react-slot',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
          ],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
