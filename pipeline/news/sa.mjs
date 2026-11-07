// Migration SA. Listing cards give "22nd Oct 2026", a title and a "Read More" link.
// Page 1 holds the 18 newest posts, which is all a 30-minute poll needs. Cards have no
// summary, so excerpt stays null.
import * as cheerio from 'cheerio';
import { item, parseAuDate } from './util.mjs';

export const id = 'sa';
export const name = 'Migration SA';
export const urls = {
  news: 'https://migration.sa.gov.au/news',
};

export function parse(html, url) {
  const $ = cheerio.load(html);
  const out = [];
  $('a[href*="/news/"]').each((_, a) => {
    const href = new URL($(a).attr('href'), url).toString();
    if (!/\/news\/[^/?#]+$/.test(new URL(href).pathname)) return;
    const card = $(a).closest('div:has(h3)');
    const title = card.find('h3').first().text();
    if (!title.trim()) return;
    const date = card.find('span').filter((_, s) => parseAuDate($(s).text())).first().text();
    out.push(item({ source: id, title, url: href, published: parseAuDate(date) }));
  });
  return out;
}

export async function fetch(ctx) {
  const r = await ctx.get(urls.news);
  return r.body ? parse(r.body, urls.news) : [];
}
