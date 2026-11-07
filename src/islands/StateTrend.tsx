import { useState } from 'preact/hooks';
import TrendChart from '../components/charts/TrendChart';
import type { MonthRow } from '../lib/eoi';
import { lastChange, monthSeries } from '../lib/eoi';
import { formatCell, formatDelta } from '../lib/format';

/** A state's EOIs over 13 months, per visa. Rows are that state's summary rows only. */
export default function StateTrend({ state, name, rows, months }: { state: string; name: string; rows: MonthRow[]; months: string[] }) {
  const [visa, setVisa] = useState<'190' | '491'>('190');
  const submitted = monthSeries(rows, months, visa, state, 'SUBMITTED');
  const sub = lastChange(submitted);
  return (
    <div class="panel">
      <div class="controls">
        <fieldset class="field">
          <legend class="label">Visa</legend>
          <div class="seg">
            {(['190', '491'] as const).map((v) => (
              <label key={v}>
                <input type="radio" name="st-visa" value={v} checked={visa === v} onChange={() => setVisa(v)} />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <p>
        <strong class="big-num">{formatCell(sub.current)}</strong> visa {visa} EOIs named {name} at the latest month end
        {sub.delta !== null && <span class="muted"> ({formatDelta(sub.delta)} on the month before)</span>}.
      </p>
      <TrendChart
        months={months}
        series={[
          { label: 'In invited status', values: monthSeries(rows, months, visa, state, 'INVITED') },
          { label: 'Lodged', values: monthSeries(rows, months, visa, state, 'LODGED') },
        ]}
        label={`Visa ${visa} EOIs naming ${name} in invited status and lodged, per month`}
      />
    </div>
  );
}
