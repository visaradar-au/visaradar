// Migration Queensland. News cards carry no dates, so each /news/<slug> is joined to
// its sitemap <lastmod>. Copyright: all rights reserved, so title/date/link only.
import * as cheerio from 'cheerio';
import { item, parseSitemap, canonicalUrl } from './util.mjs';

export const id = 'qld';
export const name = 'Migration Queensland';
export const urls = {
  news: 'https://migration.qld.gov.au/news',
  sitemap: 'https://migration.qld.gov.au/sitemap.xml',
};

/** Map canonical URL -> lastmod for real news pages (sandbox/test pages dropped). */
export function parseLastmods(xml) {
  const map = new Map();
  for (const { loc, lastmod } of parseSitemap(xml)) {
    const u = new URL(loc);
    if (!/^\/news\/[^/]+$/.test(u.pathname)) continue;
    map.set(canonicalUrl(loc), lastmod);
  }
  return map;
}

/** @param {string} html news page @param {string} url @param {Map<string,string>} [lastmods] */
export function parse(html, url, lastmods = new Map()) {
  const $ = cheerio.load(html);
  const out = [];
  $('a[href^="/news/"], a[href^="https://migration.qld.gov.au/news/"]').each((_, a) => {
    const href = new URL($(a).attr('href'), url).toString();
    const title = $(a).find('h5').first().text() || $(a).text();
    if (!title.trim()) return;
    out.push(item({ source: id, title, url: href, published: lastmods.get(canonicalUrl(href)) ?? null }));
  });
  return out;
}

export async function fetch(ctx) {
  const news = await ctx.get(urls.news);
  if (!news.body) return [];
  const sm = await ctx.get(urls.sitemap, { conditional: false });
  return parse(news.body, urls.news, sm.body ? parseLastmods(sm.body) : new Map());
}
