import type { RSSFeedItem } from '@astrojs/rss';
import type { Change, NewsItem } from './data/types';
import { NEWS_SOURCES, TAG_LABELS } from './official';

export function newsItems(items: NewsItem[]): RSSFeedItem[] {
  return items.slice(0, 100).map((n) => ({
    title: n.title,
    link: n.url,
    pubDate: new Date(n.published ?? n.firstSeen),
    description: [NEWS_SOURCES[n.source]?.label ?? n.source, (n.tags ?? []).map((t) => TAG_LABELS[t] ?? t).join(', '), n.excerpt]
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
    description: `${c.kind} · ${NEWS_SOURCES[c.source]?.label ?? c.source}`,
    categories: [c.kind],
  }));
}
