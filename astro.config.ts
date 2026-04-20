import process from 'node:process';

import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const isDev = process.env.NODE_ENV !== 'production' && !process.argv.includes('build');

export default defineConfig({
  site: 'https://aurearesidences.com',
  output: 'static',
  trailingSlash: 'never',
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  ...(isDev && {
    image: {
      // Skip sharp processing in dev — serve originals for fast HMR
      service: { entrypoint: 'astro/assets/services/noop' },
    },
  }),
});
