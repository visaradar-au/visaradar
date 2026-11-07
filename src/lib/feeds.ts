import type { RSSFeedItem } from '@astrojs/rss';
import type { Change, NewsItem } from './data/types';
import { NEWS_SOURCES, TAG_LABELS, sourceLabel } from './official';
import { excerptToShow } from './news';

export function newsItems(items: NewsItem[]): RSSFeedItem[] {
  return items.slice(0, 100).map((n) => ({
    title: n.title,
    link: n.url,
    pubDate: new Date(n.published ?? n.firstSeen),
    description: [NEWS_SOURCES[n.source]?.label ?? n.source, (n.tags ?? []).map((t) => TAG_LABELS[t] ?? t).join(', '), excerptToShow(n.title, n.excerpt)]
      .filter(Boolean)
      .join(' · '),
    categories: n.tags ?? [],
    customData: `<guid isPermaLink="false">${n.id}</guid>`,
  }));
}

export function changeItems(items: Change[]): RSSFeedItem[] {
  return items.slice(0, 100).map((c) => ({
    title: c.title,
    link: c.url,
    pubDate: new Date(c.at),
    description: `${c.kind} · ${sourceLabel(c.source)}`,
    categories: [c.kind],
  }));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The channel logo. RSS wants its title and link to match the channel's own. */
export function channelImage(title: string, link: URL, image: URL): string {
  return `<image><url>${esc(image.href)}</url><title>${esc(title)}</title><link>${esc(link.href)}</link><width>144</width><height>144</height></image>`;
}
