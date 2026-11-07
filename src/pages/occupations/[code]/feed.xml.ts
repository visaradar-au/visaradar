import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getHistory, getMeta, getOccupations } from '../../../lib/data/eoi';
import { channelImage } from '../../../lib/feeds';
import { href } from '../../../lib/href';
import { occupationFeedItems } from '../../../lib/occupation-feed';
import { site } from '../../../site.config';

export function getStaticPaths() {
  return getOccupations().map((o) => ({ params: { code: o.code }, props: { name: o.name } }));
}

export const GET: APIRoute = (context) => {
  const code = context.params.code as string;
  const name = (context.props as { name: string }).name;
  const title = `${site.name}: ${name} (${code}) monthly changes`;
  const link = new URL(href(`/occupations/${code}/`), context.site);
  return rss({
    title,
    description: `Month-on-month changes in SkillSelect EOIs in invited status and lodged for ${name} (ANZSCO ${code}), per state for 190 and 491 and nationally for 189.`,
    site: link,
    items: occupationFeedItems(code, name, getHistory(code).rows, getMeta().months.slice(-13), link.href),
    customData: channelImage(title, link, new URL(href('/rss-icon.png'), context.site)),
  });
};
