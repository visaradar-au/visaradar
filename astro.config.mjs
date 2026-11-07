import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import { site } from './src/site.config.ts';

// SITE_BASE lets the site live under a sub-path (for example GitHub Pages project sites).
export default defineConfig({
  site: site.url,
  base: process.env.SITE_BASE ?? '/',
  trailingSlash: 'ignore',
  integrations: [preact()],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
