import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    cors: true,
  },
  optimizeDeps: {
    include: ['gsap'],
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: undefined,
      },
    },
    outDir: 'dist',
  },
});
