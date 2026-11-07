// Northern Territory (theterritory.com.au). Every path returns 403 to our honest UA and
// no news list is known (updates are Drupal nodes). fetch() records the block and
// returns []. The parser picks dated links from a listing and is tested on a synthetic
// fixture only. Licence unknown, so no excerpt.
import * as cheerio from 'cheerio';
import { item, parseAuDate, clean, spacedText, canonicalUrl } from './util.mjs';

export const id = 'nt';
export const name = 'NT Government (theterritory.com.au)';
// No news list URL is known; the home page is the one URL we try (403 as of 2026-11-07).
export const urls = { news: 'https://theterritory.com.au/' };

export function parse(html, url) {
  const $ = cheerio.load(html);
  const out = [];
  const seen = new Set();
  $('article, li, .views-row').each((_, el) => {
    const a = $(el).find('a[href]').first();
    if (!a.length) return;
    const href = canonicalUrl(a.attr('href'), url);
    if (new URL(href).host !== new URL(url).host || seen.has(href)) return;
    const published = parseAuDate($(el).find('time').attr('datetime') || spacedText($, el));
    const title = clean($(el).find('h2, h3').first().text()) || clean(a.text());
    if (!published || !title) return;
    seen.add(href);
    out.push(item({ source: id, title, url: href, published }));
  });
  return out;
}

export async function fetch(ctx) {
  const r = await ctx.get(urls.news);
  return r.body ? parse(r.body, urls.news) : [];
}
