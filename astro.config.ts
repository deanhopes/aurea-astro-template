import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
export default defineConfig({
  site: 'https://aurearesidences.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  prefetch: false,
  vite: {
    server: {
      watch: {
        usePolling: true,
        interval: 300,
      },
    },
  },
});
