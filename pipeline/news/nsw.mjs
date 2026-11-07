// NSW Government. The news list is stale (latest 2023), so we also watch the key
// program pages and report each one's "modified" meta date. CC BY 4.0, so card
// summaries are kept as excerpts. robots.txt disallows query strings: never add any.
import * as cheerio from 'cheerio';
import { item, parseAuDate, clean } from './util.mjs';

export const id = 'nsw';
export const name = 'NSW Government (visas and migration)';
export const urls = {
  news: 'https://www.nsw.gov.au/visas-and-migration/news-and-updates',
  pages: [
    'https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-nominated-visa-subclass-190',
    'https://www.nsw.gov.au/visas-and-migration/skilled-visas/skilled-work-regional-visa-subclass-491',
    'https://www.nsw.gov.au/visas-and-migration/skilled-visas/nsw-skills-lists',
  ],
};

export function parse(html, url) {
  const $ = cheerio.load(html);
  const out = [];
  $('.nsw-card--news').each((_, card) => {
    const a = $(card).find('.nsw-card__title a').first();
    if (!a.length) return;
    out.push(
      item({
        source: id,
        title: a.text(),
        url: new URL(a.attr('href'), url).toString(),
        published: parseAuDate($(card).find('.nsw-card__date').text()),
        excerpt: $(card).find('.nsw-card__copy').text() || null,
      }),
    );
  });
  return out;
}

/** A watched program page becomes one item dated by its modified meta. */
export function parsePage(html, url) {
  const $ = cheerio.load(html);
  const modified =
    $('meta[property="article:modified_time"]').attr('content') ||
    $('meta[name="dcterms.modified"]').attr('content') ||
    $('meta[name*="modified"], meta[property*="modified"]').first().attr('content');
  const h1 = clean($('h1').first().text()) || clean($('title').text());
  if (!h1) return null;
  return item({
    source: id,
    title: `Page updated: ${h1}`,
    url,
    published: parseAuDate(modified),
    key: modified ? `modified-${parseAuDate(modified)}` : undefined,
  });
}

export async function fetch(ctx) {
  const out = [];
  const news = await ctx.get(urls.news);
  if (news.body) out.push(...parse(news.body, urls.news));
  for (const p of urls.pages) {
    const r = await ctx.get(p);
    const it = r.body && parsePage(r.body, p);
    if (it) out.push(it);
  }
  return out;
}
