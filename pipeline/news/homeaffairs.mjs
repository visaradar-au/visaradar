// Department of Home Affairs (immi). Every host returns 403 to our honest UA, so in
// practice fetch() records the block and returns []. The parser targets the archive's
// known URL pattern (/news-media/archive/article?itemId=N) but has only been tested on
// a synthetic fixture: treat it as unvalidated until a real page is seen.
import * as cheerio from 'cheerio';
import { item, parseAuDate, clean, spacedText, canonicalUrl } from './util.mjs';

export const id = 'homeaffairs';
export const name = 'Department of Home Affairs';
export const urls = { news: 'https://immi.homeaffairs.gov.au/news-media/archive' };

export function parse(html, url) {
  const $ = cheerio.load(html);
  const out = [];
  const seen = new Set();
  $('a[href*="/news-media/archive/article"]').each((_, a) => {
    const href = canonicalUrl($(a).attr('href'), url);
    if (!new URL(href).searchParams.get('itemId') || seen.has(href)) return;
    seen.add(href);
    const title = clean($(a).text());
    if (!title) return;
    const row = $(a).closest('tr, li, article, div');
    out.push(item({ source: id, title, url: href, published: parseAuDate(spacedText($, row)) }));
  });
  return out;
}

export async function fetch(ctx) {
  const r = await ctx.get(urls.news);
  return r.body ? parse(r.body, urls.news) : [];
}
