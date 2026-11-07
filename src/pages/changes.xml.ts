import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getChanges } from '../lib/data/sources';
import { changeItems, channelImage } from '../lib/feeds';
import { href } from '../lib/href';
import { site } from '../site.config';

export const GET: APIRoute = (context) => {
  const title = `${site.name}: what changed`;
  const link = new URL(href('/'), context.site);
  return rss({
    title,
    description: 'New EOI months, state program changes, allocations, rounds and news, as we detect them.',
    site: link,
    items: changeItems(getChanges()),
    customData: channelImage(title, link, new URL(href('/rss-icon.png'), context.site)),
  });
};
