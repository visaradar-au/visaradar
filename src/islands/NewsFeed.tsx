import { useMemo, useState } from 'preact/hooks';
import type { NewsItem } from '../lib/data/types';
import { formatDate } from '../lib/format';
import { excerptToShow, monogram } from '../lib/news';

interface Props {
  items: NewsItem[];
  sources: Record<string, string>;
  tags: Record<string, string>;
}

export default function NewsFeed({ items, sources, tags }: Props) {
  const [source, setSource] = useState('');
  const [tag, setTag] = useState('');
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(
      (n) => (!source || n.source === source) && (!tag || (n.tags ?? []).includes(tag as never)) && (!t || n.title.toLowerCase().includes(t)),
    );
  }, [items, source, tag, q]);

  return (
    <div>
      <div class="news-filters">
        <div class="field">
          <label for="nf-q">Search titles</label>
          <input id="nf-q" class="input" type="search" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        </div>
        <div class="field">
          <label for="nf-source">Source</label>
          <select id="nf-source" class="select" value={source} onChange={(e) => setSource((e.target as HTMLSelectElement).value)}>
            <option value="">All sources</option>
            {Object.entries(sources).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div class="field">
          <label for="nf-tag">Topic</label>
          <select id="nf-tag" class="select" value={tag} onChange={(e) => setTag((e.target as HTMLSelectElement).value)}>
            <option value="">All topics</option>
            {Object.entries(tags).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <p class="small muted" role="status">
        {shown.length} of {items.length} items
        {tag && (
          <>
            {' '}· topic <strong>{tags[tag] ?? tag}</strong>{' '}
            <button type="button" class="chip chip-btn" onClick={() => setTag('')}>Clear topic</button>
          </>
        )}
      </p>
      {shown.length ? (
        <ul class="news-list">
          {shown.map((n) => (
            <li key={n.id}>
              <span class="meta">
                <span class="mono" aria-hidden="true" title={sources[n.source] ?? n.source}>{monogram(n.source)}</span>
                <span class="visually-hidden">{sources[n.source] ?? n.source}.</span>
                {n.published ? <time dateTime={n.published}>{formatDate(n.published)}</time> : <span>First seen {formatDate(n.firstSeen)}</span>}
                {(n.tags ?? []).map((t) => (
                  <button key={t} type="button" class="chip chip-btn" aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)}>
                    {tags[t] ?? t}
                  </button>
                ))}
              </span>
              <a class="title" href={n.url} rel="noopener">{n.title}</a>
              {excerptToShow(n.title, n.excerpt) && <p class="excerpt">{excerptToShow(n.title, n.excerpt)}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <div class="empty" role="status">
          <h3>Nothing matches these filters</h3>
          <p class="small">Clear the search or pick "All sources" and "All topics".</p>
        </div>
      )}
    </div>
  );
}
