// Prime Minister's media releases (RSS 2.0, supports ETag / Last-Modified). The feed covers
// everything the PM publishes, so only migration-related items are kept, by fixed keyword
// rules on the title and the feed's short description. Title, date and link are stored;
// the description is used for filtering only.
import { item, clean, parseAuDate, canonicalUrl } from './util.mjs';

export const id = 'pm';
export const name = 'Prime Minister of Australia';
export const urls = { rss: 'https://www.pm.gov.au/rss.xml' };

// Deterministic: an item is kept when any rule matches its title or description.
export const MIGRATION_RULES = [
  /\bmigra(tion|nts?)\b/,
  /\bimmigra(tion|nts?)\b/,
  /\bvisas?\b/,
  /\bskilled (migra\w*|visas?)\b/,
  /\bhome affairs\b/,
  /\binternational students?\b/,
  /\bnet overseas migration\b/,
];

export function isMigrationRelated(text) {
  const t = String(text ?? '').toLowerCase();
  return MIGRATION_RULES.some((re) => re.test(t));
}

const decode = (s) =>
  String(s ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ');

const tag = (block, name) => block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] ?? '';

/** Parse the feed and keep migration-related items. Regex-based: the feed is flat RSS 2.0. */
export function parse(xml) {
  const out = [];
  const seen = new Set();
  for (const m of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const title = clean(decode(tag(m[1], 'title')));
    const link = clean(decode(tag(m[1], 'link')));
    if (!title || !/^https?:\/\//.test(link)) continue;
    const desc = clean(decode(decode(tag(m[1], 'description')))); // the feed double-escapes
    if (!isMigrationRelated(`${title} ${desc}`)) continue;
    const url = canonicalUrl(link);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(item({ source: id, title, url, published: parseAuDate(tag(m[1], 'pubDate')) }));
  }
  return out;
}

export async function fetch(ctx) {
  const r = await ctx.get(urls.rss);
  return r.body ? parse(r.body) : [];
}
