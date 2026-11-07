import { useEffect, useMemo, useState } from 'preact/hooks';
import Histogram from '../components/charts/Histogram';
import TrendChart from '../components/charts/TrendChart';
import type { MonthRow, OccRow, Visa } from '../lib/eoi';
import {
  VISAS,
  VISA_NAMES,
  lastChange,
  monthSeries,
  poolByPoints,
  poolTotal,
  scopeLabel,
  scopesFor,
  scoreAxis,
} from '../lib/eoi';
import { formatCell, formatDelta, formatMonth, formatNumber } from '../lib/format';
import { PROFILE_EVENT, loadProfile, type Profile } from '../lib/profile';

interface Props {
  code: string;
  name: string;
  rows: OccRow[];
  history: MonthRow[];
  months: string[];
}

function bestScope(rows: OccRow[], visa: Visa): string {
  let best = scopesFor(visa)[0];
  let max = -1;
  for (const s of scopesFor(visa)) {
    const t = poolTotal(poolByPoints(rows, visa, s)).counted;
    if (t > max) {
      max = t;
      best = s;
    }
  }
  return best;
}

export default function OccupationExplorer({ code, name, rows, history, months }: Props) {
  const visas = useMemo(() => VISAS.filter((v) => rows.some((r) => r[0] === v)), [rows]);
  const [visa, setVisa] = useState<Visa>(visas.includes('190') ? '190' : visas[0] ?? '190');
  const [scope, setScope] = useState(() => bestScope(rows, visa));
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const sync = () => setProfile(loadProfile());
    sync();
    window.addEventListener(PROFILE_EVENT, sync);
    return () => window.removeEventListener(PROFILE_EVENT, sync);
  }, []);

  function pickVisa(v: Visa) {
    setVisa(v);
    if (!scopesFor(v).includes(scope)) setScope(bestScope(rows, v));
  }

  const axis = scoreAxis(rows, visa);
  const pool = poolByPoints(rows, visa, scope);
  const total = poolTotal(pool);
  const invited = monthSeries(history, months, visa, scope, 'INVITED');
  const lodged = monthSeries(history, months, visa, scope, 'LODGED');
  const submitted = lastChange(monthSeries(history, months, visa, scope, 'SUBMITTED'));
  const latest = months[months.length - 1] ?? '';
  const where = `${scopeLabel(scope)}, visa ${visa === '491F' ? '491 family' : visa}`;
  const mine = profile && profile.code === code && profile.visa === visa ? profile.points : null;


  if (!visas.length) {
    return (
      <div class="empty" role="status">
        <h3>No EOIs recorded for this occupation</h3>
        <p class="small">SkillSelect had no EOIs for {name} in {formatMonth(latest)}, or every count was too small to publish.</p>
      </div>
    );
  }

  return (
    <div class="occ-explorer" data-testid="occ-explorer">
      <div class="controls">
        <fieldset class="field">
          <legend class="label">Visa</legend>
          <div class="seg">
            {visas.map((v) => (
              <label key={v}>
                <input type="radio" name="occ-visa" value={v} checked={visa === v} onChange={() => pickVisa(v)} />
                <span>{v === '491F' ? '491 family' : v}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {scopesFor(visa).length > 1 && (
          <div class="field">
            <label for="occ-scope">State</label>
            <select id="occ-scope" class="select" value={scope} onChange={(e) => setScope((e.target as HTMLSelectElement).value)}>
              {scopesFor(visa).map((s) => (
                <option key={s} value={s}>
                  {scopeLabel(s)}
                  {poolByPoints(rows, visa, s).length === 0 ? ' (none)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div class="occ-charts">
      <section class="panel" aria-labelledby="pool-title">
        <h3 id="pool-title">EOIs waiting, by points score</h3>
        <p class="small muted">
          {VISA_NAMES[visa]}, {scopeLabel(scope)}. <Strong n={total.counted} /> EOIs counted
          {total.maskedCells > 0 && `, plus ${total.maskedCells} masked score${total.maskedCells === 1 ? '' : 's'} with fewer than 20 each (not counted)`}.
          {submitted.delta !== null && ` ${formatDelta(submitted.delta)} since last month.`}
        </p>
        <ul class="chart-legend">
          <li><span class="key bar" aria-hidden="true" /> EOIs at that score</li>
          <li><span class="key masked" aria-hidden="true" /> &lt;20, masked (height not to scale)</li>
          {mine !== null && <li><span class="key you" aria-hidden="true" /> Your points ({mine})</li>}
        </ul>
        {pool.length ? (
          <Histogram axis={axis} pool={pool} you={mine} label={`EOIs submitted by points score for ${name}, ${where}, ${formatMonth(latest)}`} />
        ) : (
          <p class="empty small">No EOIs for {name} in {where}.</p>
        )}
        <details class="vr-table">
          <summary>Show as a table</summary>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th scope="col">Points</th><th scope="col" class="num">EOIs submitted</th></tr>
              </thead>
              <tbody>
                {pool.map((c) => (
                  <tr key={c.score}><th scope="row">{c.score}</th><td class="num">{formatCell(c.count)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section class="panel" aria-labelledby="trend-title">
        <h3 id="trend-title">Invited and lodged, last {months.length} months</h3>
        <p class="small muted">
          {where}. Invited counts EOIs still in invited status at each month end. It falls as people lodge, so the two lines
          belong together.
        </p>
        <TrendChart
          months={months}
          series={[
            { label: 'In invited status', values: invited },
            { label: 'Lodged', values: lodged },
          ]}
          label={`Invited and lodged EOIs per month for ${name}, ${where}`}
        />
        <details class="vr-table">
          <summary>Show as a table</summary>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th scope="col">Month</th><th scope="col" class="num">In invited status</th><th scope="col" class="num">Lodged</th></tr>
              </thead>
              <tbody>
                {months.map((m, i) => (
                  <tr key={m}><th scope="row">{formatMonth(m)}</th><td class="num">{formatCell(invited[i])}</td><td class="num">{formatCell(lodged[i])}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      </div>
    </div>
  );
}

function Strong({ n }: { n: number }) {
  return <strong>{formatNumber(n)}</strong>;
}

