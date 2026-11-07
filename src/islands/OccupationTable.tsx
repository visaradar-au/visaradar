import { useMemo, useState } from 'preact/hooks';
import type { Cell } from '../lib/eoi';
import { formatCell, formatNumber } from '../lib/format';
import { href } from '../lib/href';

/** [code, name, 189, 190, 491, 491F] distinct SUBMITTED EOIs per visa */
export type OccRowLite = [string, string, Cell, Cell, Cell, Cell];

type SortKey = 'code' | 'name' | '189' | '190' | '491' | '491F';
const COL: Record<SortKey, number> = { code: 0, name: 1, '189': 2, '190': 3, '491': 4, '491F': 5 };

/** Masked cells sort between 0 and 20, without pretending to know the number. */
const sortValue = (c: Cell) => (c === '<20' ? 10 : c);
const hasEois = (r: OccRowLite) => r.slice(2).some((c) => c === '<20' || (c as number) > 0);

export default function OccupationTable({ rows }: { rows: OccRowLite[] }) {
  const [q, setQ] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: '190', dir: -1 });

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const c = COL[sort.key];
    return rows
      .filter((r) => (!t || r[0].startsWith(t) || r[1].toLowerCase().includes(t)) && (!onlyActive || hasEois(r)))
      .sort((a, b) => {
        const d = c < 2 ? String(a[c]).localeCompare(String(b[c])) : sortValue(a[c] as Cell) - sortValue(b[c] as Cell);
        return d * sort.dir || a[1].localeCompare(b[1]);
      });
  }, [rows, q, onlyActive, sort]);

  function header(key: SortKey, label: string, num = false) {
    const active = sort.key === key;
    return (
      <th scope="col" class={num ? 'num' : ''} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button type="button" class="sort-btn" onClick={() => setSort({ key, dir: active ? (sort.dir === 1 ? -1 : 1) : num ? -1 : 1 })}>
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

  const cell = (c: Cell) => (c === 0 ? <span class="muted">0</span> : formatCell(c));

  return (
    <div>
      <div class="occ-search">
        <div class="field">
          <label for="occ-q">Search occupations</label>
          <input id="occ-q" class="input" type="search" placeholder="Name or ANZSCO code, e.g. 2613 or nurse" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        </div>
        <label class="check">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive((e.target as HTMLInputElement).checked)} /> Only with EOIs
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
                {header('189', '189', true)}
                {header('190', '190', true)}
                {header('491', '491', true)}
                {header('491F', '491 family', true)}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r[0]} class="rowlink">
                  <td>{r[0]}</td>
                  <th scope="row"><a href={href(`/occupations/${r[0]}/`)}>{r[1]}</a></th>
                  <td class="num">{cell(r[2])}</td>
                  <td class="num">{cell(r[3])}</td>
                  <td class="num">{cell(r[4])}</td>
                  <td class="num">{cell(r[5])}</td>
                </tr>
              ))}
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
