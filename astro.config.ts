import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import snoot from '../snoot/src/index.js';

export default defineConfig({
  site: 'https://aurearesidences.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  prefetch: false,
  vite: {
    plugins: [snoot()],
  },
});
