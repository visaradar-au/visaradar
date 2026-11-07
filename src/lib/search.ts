// Site search: a small index built at build time and a light fuzzy matcher. Pure: no file or DOM access.

/** o occupation · s state · v visa · p page · n news (external link) */
export type SearchKind = 'o' | 's' | 'v' | 'p' | 'n';
/** [kind, label, detail, href, extra words to match] */
export type SearchEntry = [SearchKind, string, string, string, string?];

export interface SearchIndex {
  v: 1;
  items: SearchEntry[];
}

export const KIND_LABELS: Record<SearchKind, string> = {
  o: 'Occupation',
  s: 'State',
  v: 'Visa',
  p: 'Page',
  n: 'News',
};

/** Lower case, no accents, punctuation to spaces. */
export function normalise(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Whether every character of `q` appears in `s` in order (a loose typo-tolerant fallback). */
function subsequence(q: string, s: string): boolean {
  let i = 0;
  for (let j = 0; j < s.length && i < q.length; j++) if (s[j] === q[i]) i++;
  return i === q.length;
}

/** Score one query token against a prepared haystack. 0 means no match. */
function tokenScore(t: string, hay: string, words: string[]): number {
  if (words.includes(t)) return 10;
  if (words.some((w) => w.startsWith(t))) return 7;
  if (t.length >= 3 && hay.includes(t)) return 4;
  if (t.length >= 4 && words.some((w) => w.length >= t.length && w[0] === t[0] && subsequence(t, w))) return 2;
  return 0;
}

// Equal matches list occupations and states before pages and news.
const KIND_WEIGHT: Record<SearchKind, number> = { s: 3, v: 3, o: 2, p: 1, n: 0 };

export interface Prepared {
  entry: SearchEntry;
  hay: string;
  words: string[];
}

export function prepare(items: SearchEntry[]): Prepared[] {
  return items.map((entry) => {
    const hay = normalise(`${entry[1]} ${entry[2]} ${entry[4] ?? ''}`);
    return { entry, hay, words: hay.split(' ') };
  });
}

/** Best matches for a query, best first. Every token must match. Empty query: nothing. */
export function search(prepared: Prepared[], query: string, limit = 12): SearchEntry[] {
  const q = normalise(query);
  if (!q) return [];
  const tokens = q.split(' ');
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const p of prepared) {
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      const s = tokenScore(t, p.hay, p.words);
      if (!s) {
        ok = false;
        break;
      }
      score += s;
    }
    if (!ok) continue;
    const label = normalise(p.entry[1]);
    if (label === q) score += 20;
    else if (label.startsWith(q)) score += 8;
    // Typing digits is almost always an ANZSCO code.
    if (/^\d+$/.test(q) && p.entry[0] === 'o' && p.hay.includes(q)) score += 15;
    scored.push({ e: p.entry, score: score * 10 + KIND_WEIGHT[p.entry[0]] });
  }
  scored.sort((a, b) => b.score - a.score || a.e[1].localeCompare(b.e[1]));
  return scored.slice(0, limit).map((s) => s.e);
}
