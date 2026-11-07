import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getNews } from '../../../lib/data/sources';
import { STATES, STATE_NAMES, type StateCode } from '../../../lib/eoi';
import { href } from '../../../lib/href';
import { site } from '../../../site.config';
import { newsItems } from '../../../lib/feeds';

export function getStaticPaths() {
  return STATES.map((s) => ({ params: { code: s.toLowerCase() } }));
}

export const GET: APIRoute = (context) => {
  const code = (context.params.code as string).toUpperCase() as StateCode;
  return rss({
    title: `${site.name}: ${STATE_NAMES[code]} migration news`,
    description: `Dated official migration news for ${STATE_NAMES[code]}, collected by ${site.name}.`,
    site: new URL(href(`/states/${code.toLowerCase()}/`), context.site),
    items: newsItems(getNews().filter((n) => n.source === code.toLowerCase())),
  });
};
