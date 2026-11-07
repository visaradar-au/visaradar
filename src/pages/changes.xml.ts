import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getChanges } from '../lib/data/sources';
import { changeItems } from '../lib/feeds';
import { href } from '../lib/href';
import { site } from '../site.config';

export const GET: APIRoute = (context) =>
  rss({
    title: `${site.name}: what changed`,
    description: 'New EOI months, state program changes, allocations, rounds and news, as we detect them.',
    site: new URL(href('/'), context.site),
    items: changeItems(getChanges()),
  });
