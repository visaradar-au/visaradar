import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getNews } from '../lib/data/sources';
import { channelImage, newsItems } from '../lib/feeds';
import { href } from '../lib/href';
import { site } from '../site.config';

export const GET: APIRoute = (context) => {
  const title = `${site.name}: skilled migration news`;
  const link = new URL(href('/news/'), context.site);
  return rss({
    title,
    description: 'Dated official news from Home Affairs and every state and territory.',
    site: link,
    items: newsItems(getNews()),
    customData: channelImage(title, link, new URL(href('/rss-icon.png'), context.site)),
  });
};
