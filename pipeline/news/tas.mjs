// Migration Tasmania (Squiz Matrix). /news answers our fetcher; most other paths
// (robots.txt, the stats page, the copyright page) return 403. Cards carry no date.
// Licence unconfirmed, so no excerpt.
import * as cheerio from 'cheerio';
import { item } from './util.mjs';

export const id = 'tas';
export const name = 'Migration Tasmania';
export const urls = { news: 'https://www.migration.tas.gov.au/news' };

export function parse(html, url) {
  const $ = cheerio.load(html);
  const out = [];
  $('li.article-item').each((_, li) => {
    const a = $(li).find('a[href]').first();
    const title = $(li).find('h2, h3').first().text();
    if (!a.length || !title.trim()) return;
    out.push(item({ source: id, title, url: new URL(a.attr('href'), url).toString(), published: null }));
  });
  return out;
}

export async function fetch(ctx) {
  const r = await ctx.get(urls.news);
  return r.body ? parse(r.body, urls.news) : [];
}
