import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getNews } from '../lib/data/sources';
import { newsItems } from '../lib/feeds';
import { href } from '../lib/href';
import { site } from '../site.config';

export const GET: APIRoute = (context) =>
  rss({
    title: `${site.name}: skilled migration news`,
    description: 'Dated official news from Home Affairs and every state and territory.',
    site: new URL(href('/news/'), context.site),
    items: newsItems(getNews()),
  });
