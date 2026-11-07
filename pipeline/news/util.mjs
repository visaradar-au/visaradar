// Shared helpers for news parsers: canonical URLs, ids, date parsing, text cleanup.
// Dates are built as plain ISO strings from the page text (never via Date#toISOString),
// so an Australian local date never shifts back a day through UTC.

import { createHash } from 'node:crypto';

/**
 * Canonical form of a URL: https, lowercase host, no fragment, no trailing slash,
 * no tracking params (utm_*). Other query params are kept (sorted) because some
 * sources (Home Affairs itemId) put identity in the query string.
 */
export function canonicalUrl(url, base) {
  const u = new URL(url, base);
  u.protocol = 'https:';
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';
  const params = [...u.searchParams.entries()]
    .filter(([k]) => !/^utm_/i.test(k))
    .sort(([a], [b]) => a.localeCompare(b));
  u.search = '';
  for (const [k, v] of params) u.searchParams.append(k, v);
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
  return u.toString();
}

/**
 * Item id: first 12 hex of sha1(canonical URL). `key` is only used for sources whose
 * updates share one URL (ACT updates block, ACT round page): sha1(canonical + '#' + key).
 */
export function makeId(url, key) {
  const c = canonicalUrl(url);
  return createHash('sha1')
    .update(key ? `${c}#${key}` : c)
    .digest('hex')
    .slice(0, 12);
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n) => String(n).padStart(2, '0');

function iso(y, m, d) {
  y = Number(y);
  m = Number(m);
  d = Number(d);
  if (!y || !m || !d || m > 12 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Parse an Australian date written on a page into "YYYY-MM-DD", or null.
 * Handles "22nd Oct 2026", "27 September 2023", "Friday, 30 October 2026",
 * "03/07/2026" (DD/MM/YYYY), "7/9/2026", and ISO "2026-10-23T08:55:10+10:30"
 * (the local date part is kept as written).
 */
export function parseAuDate(text) {
  if (!text) return null;
  const s = String(text).trim();
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return iso(m[1], m[2], m[3]);
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) return iso(m[3], m[2], m[1]);
  m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase().slice(0, 4)] ?? MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (mon) return iso(m[3], mon, m[1]);
  }
  return null;
}

/** Collapse whitespace (incl. nbsp and zero-width) and trim. */
export function clean(text) {
  return String(text ?? '')
    .replace(/[​ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build a news item in the data/news/items.json shape (firstSeen/tags filled later). */
export function item({ source, title, url, published = null, excerpt = null, key }) {
  return {
    id: makeId(url, key),
    source,
    title: clean(title),
    url: canonicalUrl(url),
    published,
    firstSeen: null,
    tags: [],
    excerpt: excerpt ? clean(excerpt) : null,
  };
}

/**
 * Parse a sitemap <urlset> into [{loc, lastmod}] where lastmod is "YYYY-MM-DD" or null.
 * Regex-based on purpose: sitemaps are flat and this avoids namespace quirks.
 */
export function parseSitemap(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1];
    if (!loc) continue;
    const lastmod = m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1];
    out.push({ loc: loc.replace(/&amp;/g, '&'), lastmod: lastmod ? parseAuDate(lastmod) : null });
  }
  return out;
}

/** Text of a cheerio node with a space between elements ("news</h3><p>13 Oct" -> "news 13 Oct"). */
export function spacedText($, el) {
  return clean(($(el).html() ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '));
}
