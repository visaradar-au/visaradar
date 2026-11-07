// ACT Government migration. No news list: the home page has an undated "Updates"
// block, and the invitation round page names each round in an H2. Both reuse one URL
// for many updates, so ids are keyed by bullet text / round date. CC BY 4.0
// (© Australian Capital Territory), so excerpts are kept. robots.txt: Crawl-delay 20.
import * as cheerio from 'cheerio';
import { item, parseAuDate, clean } from './util.mjs';

export const id = 'act';
export const name = 'ACT Government (migration)';
export const urls = {
  home: 'https://www.act.gov.au/migration',
  round: 'https://www.act.gov.au/migration/resources/canberra-matrix-invitation-round',
};

const TITLE_MAX = 90;

/**
 * Split an undated bullet into a title (its first sentence, cut on a word boundary at
 * about 90 characters) and an excerpt holding only the text the title doesn't show,
 * or null when nothing meaningful is left.
 */
export function splitBullet(text) {
  let body = text;
  let sentence = body.match(/^(.+?[.!?])(\s|$)/)?.[1] ?? body;
  // "Now available: Information on ..." -> drop the label when that makes it fit.
  const label = sentence.match(/^[^:.]{3,60}:\s+/)?.[0];
  if (sentence.length > TITLE_MAX && label && sentence.length - label.length <= TITLE_MAX) {
    body = text.slice(label.length);
    sentence = sentence.slice(label.length);
  }
  let title = sentence;
  let cut = false;
  if (title.length > TITLE_MAX) {
    const short = title.slice(0, title.lastIndexOf(' ', TITLE_MAX - 1)).replace(/[,;:–—]$/, '');
    // Don't strand a few words of the sentence in the excerpt.
    if (sentence.length - short.length >= 20) {
      title = short;
      cut = true;
    }
  }
  const rest = body.slice(title.length).replace(/^[\s,;:–—]+/, '').trim();
  return {
    title: cut ? `${title}…` : title.replace(/\.$/, ''),
    excerpt: rest.length >= 20 ? (cut ? `…${rest}` : rest) : null,
  };
}

/** Updates block bullets on the migration home page. */
export function parse(html, url) {
  const $ = cheerio.load(html);
  const out = [];
  const block = $('h1, h2')
    .filter((_, h) => clean($(h).text()) === 'Updates')
    .first()
    .parent();
  block.find('li').each((_, li) => {
    const text = clean($(li).text());
    if (!text) return;
    const href = $(li).find('a[href]').first().attr('href');
    const { title, excerpt } = splitBullet(text);
    out.push(
      item({
        source: id,
        title,
        url: href ? new URL(href, url).toString() : url,
        // Bullets carry no date; firstSeen records when we saw them.
        published: null,
        excerpt,
        key: text,
      }),
    );
  });
  return out;
}

/** Each "Canberra Matrix Invitation Round: <date>" H2 on the round page is one item. */
export function parseRoundPage(html, url) {
  const $ = cheerio.load(html);
  const out = [];
  $('h2').each((_, h) => {
    const title = clean($(h).text());
    if (!/invitation round/i.test(title) || /schedule/i.test(title)) return;
    const date = parseAuDate(title);
    if (!date) return;
    out.push(
      item({
        source: id,
        title,
        url,
        published: date,
        excerpt: clean($(h).nextAll('p').first().text()) || null,
        key: `round-${date}`,
      }),
    );
  });
  return out;
}

export async function fetch(ctx) {
  const out = [];
  const home = await ctx.get(urls.home);
  if (home.body) out.push(...parse(home.body, urls.home));
  const round = await ctx.get(urls.round);
  if (round.body) out.push(...parseRoundPage(round.body, urls.round));
  return out;
}
