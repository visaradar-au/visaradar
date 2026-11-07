// Display rules for news items.

const clean = (s: string) =>
  s
    .toLowerCase()
    .replace(/^[\s.…]+|[\s.…]+$/g, '')
    .replace(/\s+/g, ' ');

/** The excerpt to show, or null when it only repeats the title. */
export function excerptToShow(title: string, excerpt: string | null | undefined): string | null {
  if (!excerpt) return null;
  const t = clean(title);
  const e = clean(excerpt);
  if (!e || e === t || e.startsWith(t) || t.startsWith(e)) return null;
  return excerpt;
}

/** A neutral text monogram for a news source ("HA", "NSW"), shown instead of any government logo. */
export function monogram(source: string): string {
  return source === 'homeaffairs' ? 'HA' : source.slice(0, 3).toUpperCase();
}
