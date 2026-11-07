import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getChanges, getNews } from '../../../lib/data/sources';
import { STATES, STATE_NAMES, type StateCode } from '../../../lib/eoi';
import { href } from '../../../lib/href';
import { site } from '../../../site.config';
import { changeItems, channelImage, newsItems } from '../../../lib/feeds';

export function getStaticPaths() {
  return STATES.map((s) => ({ params: { code: s.toLowerCase() } }));
}

export const GET: APIRoute = (context) => {
  const code = (context.params.code as string).toUpperCase() as StateCode;
  const title = `${site.name}: ${STATE_NAMES[code]} migration news`;
  const link = new URL(href(`/states/${code.toLowerCase()}/`), context.site);
  return rss({
    title,
    description: `Dated official migration news for ${STATE_NAMES[code]} and its monthly SkillSelect changes, collected by ${site.name}.`,
    site: link,
    items: [
      ...newsItems(getNews().filter((n) => n.source === code.toLowerCase())),
      // Monthly 190/491 changes for this state: EOIs in invited status and lodged at month end.
      ...changeItems(getChanges().filter((c) => c.kind === 'eoi-month' && c.state === code)),
    ].sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0)),
    customData: channelImage(title, link, new URL(href('/rss-icon.png'), context.site)),
  });
};
