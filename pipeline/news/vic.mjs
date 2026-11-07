// Live in Melbourne (VIC). Every path, robots.txt included, returns 403 to our honest
// UA, so fetch() records the block and returns []. Article URLs follow
// /news-events/news/<YYYY>/<slug> (seen in search results only); the parser is tested
// on a synthetic fixture and is unvalidated. Licence unknown, so no excerpt.
import * as cheerio from 'cheerio';
import { item, parseAuDate, clean, spacedText, canonicalUrl } from './util.mjs';

export const id = 'vic';
export const name = 'Live in Melbourne (VIC)';
export const urls = { news: 'https://liveinmelbourne.vic.gov.au/news-events/news' };

export function parse(html, url) {
  const $ = cheerio.load(html);
  const out = [];
  const seen = new Set();
  $('a[href*="/news-events/news/"]').each((_, a) => {
    const href = canonicalUrl($(a).attr('href'), url);
    if (!/\/news-events\/news\/\d{4}\/[^/]+$/.test(new URL(href).pathname) || seen.has(href)) return;
    seen.add(href);
    const card = $(a).closest('article, li, div');
    const title = clean(card.find('h2, h3, h4').first().text()) || clean($(a).text());
    if (!title) return;
    const published = parseAuDate(card.find('time').attr('datetime') || spacedText($, card));
    out.push(item({ source: id, title, url: href, published }));
  });
  return out;
}

export async function fetch(ctx) {
  const r = await ctx.get(urls.news);
  return r.body ? parse(r.body, urls.news) : [];
}
