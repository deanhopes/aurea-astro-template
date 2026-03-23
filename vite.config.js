import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    dedupe: ['gsap'],
  },
  server: {
    port: 5173,
    cors: true,
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    outDir: 'dist',
  },
});
