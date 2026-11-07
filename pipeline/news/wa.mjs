// Migration WA (Drupal). Cards: h2 title, "Fri, 03/07/2026 - 10:40" (DD/MM/YYYY) and a
// link to /news/<slug>. Copyright forbids reuse: title, date and link only.
import * as cheerio from 'cheerio';
import { item, parseAuDate } from './util.mjs';

export const id = 'wa';
export const name = 'Migration WA';
export const urls = { news: 'https://migration.wa.gov.au/news' };

export function parse(html, url) {
  const $ = cheerio.load(html);
  const out = [];
  $('.news-content-section').each((_, sec) => {
    const a = $(sec).find('a[href^="/news/"], a[href*="migration.wa.gov.au/news/"]').first();
    const title = $(sec).find('.news-title').text();
    if (!a.length || !title.trim()) return;
    out.push(
      item({
        source: id,
        title,
        url: new URL(a.attr('href'), url).toString(),
        published: parseAuDate($(sec).find('time').first().text()),
      }),
    );
  });
  return out;
}

export async function fetch(ctx) {
  const r = await ctx.get(urls.news);
  return r.body ? parse(r.body, urls.news) : [];
}
