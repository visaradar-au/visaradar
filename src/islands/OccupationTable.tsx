import { useMemo, useState } from 'preact/hooks';
import { formatNumber } from '../lib/format';
import { href } from '../lib/href';

/** [code, name, pool189, pool190, state190, pool491, state491] */
export type OccRowLite = [string, string, number, number, string, number, string];

type SortKey = 'name' | 'code' | 'p189' | 'p190' | 'p491';
const COL: Record<SortKey, number> = { code: 0, name: 1, p189: 2, p190: 3, p491: 5 };

export default function OccupationTable({ rows }: { rows: OccRowLite[] }) {
  const [q, setQ] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'p190', dir: -1 });

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const c = COL[sort.key];
    return rows
      .filter((r) => (!t || r[0].startsWith(t) || r[1].toLowerCase().includes(t)) && (!onlyActive || r[2] + r[3] + r[5] > 0))
      .sort((a, b) => {
        const x = a[c];
        const y = b[c];
        const d = typeof x === 'number' ? (x as number) - (y as number) : String(x).localeCompare(String(y));
        return d * sort.dir || a[1].localeCompare(b[1]);
      });
  }, [rows, q, onlyActive, sort]);

  function header(key: SortKey, label: string, num = false) {
    const active = sort.key === key;
    return (
      <th scope="col" class={num ? 'num' : ''} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button
          type="button"
          class="sort-btn"
          onClick={() => setSort({ key, dir: active ? (sort.dir === 1 ? -1 : 1) : num ? -1 : 1 })}
        >
          {label}
          <svg viewBox="0 0 10 10" aria-hidden="true">
            {active ? (
              <path d={sort.dir === 1 ? 'M1 7 L5 2 L9 7Z' : 'M1 3 L5 8 L9 3Z'} fill="currentColor" />
            ) : (
              <path d="M2 4 L5 1 L8 4 M2 6 L5 9 L8 6" stroke="currentColor" fill="none" stroke-width="1.2" />
            )}
          </svg>
        </button>
      </th>
    );
  }

  return (
    <div>
      <div class="occ-search">
        <div class="field">
          <label for="occ-q">Search occupations</label>
          <input id="occ-q" class="input" type="search" placeholder="Name or ANZSCO code, e.g. 2613 or nurse" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        </div>
        <label class="check">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive((e.target as HTMLInputElement).checked)} /> Only with counted EOIs
        </label>
      </div>
      <p class="small muted" role="status">
        {shown.length === rows.length ? `${formatNumber(rows.length)} occupations` : `${formatNumber(shown.length)} of ${formatNumber(rows.length)} occupations`}
      </p>
      {shown.length ? (
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                {header('code', 'Code')}
                {header('name', 'Occupation')}
                {header('p189', '189 pool', true)}
                {header('p190', '190, largest state', true)}
                {header('p491', '491, largest state', true)}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const url = href(`/occupations/${r[0]}/`);
                return (
                  <tr key={r[0]} class="rowlink" onClick={(e) => (e.target as HTMLElement).tagName !== 'A' && (window.location.href = url)}>
                    <td>{r[0]}</td>
                    <th scope="row"><a href={url}>{r[1]}</a></th>
                    <td class="num">{r[2] ? formatNumber(r[2]) : <span class="muted">0</span>}</td>
                    <td class="num">{r[3] ? <>{formatNumber(r[3])} <span class="muted">{r[4]}</span></> : <span class="muted">0</span>}</td>
                    <td class="num">{r[5] ? <>{formatNumber(r[5])} <span class="muted">{r[6]}</span></> : <span class="muted">0</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div class="empty" role="status">
          <h3>No occupation matches "{q}"</h3>
          <p class="small">Try part of the name, or the first digits of the ANZSCO code.</p>
        </div>
      )}
    </div>
  );
}
