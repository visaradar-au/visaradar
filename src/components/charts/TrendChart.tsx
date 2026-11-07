import { useState } from 'preact/hooks';
import type { Cell } from '../../lib/eoi';
import { isMasked } from '../../lib/eoi';
import { formatCell, formatMonthShort } from '../../lib/format';
import { compact, ticks, useWidth } from './scale';

export interface Series {
  label: string;
  values: Cell[];
}

interface Props {
  months: string[];
  series: Series[]; // up to 2, drawn in series-1 / series-2
  label: string;
}

const H = 220;
const M = { top: 12, right: 12, bottom: 30, left: 44 };

/** Monthly lines. Masked months sit as hollow markers on a "<20" band and break the line. */
export default function TrendChart({ months, series, label }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth();
  const max = Math.max(20, ...series.flatMap((s) => s.values.map((v) => (isMasked(v) ? 0 : v))));
  const yTicks = ticks(max);
  const top = yTicks[yTicks.length - 1] || 1;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const step = months.length > 1 ? iw / (months.length - 1) : 0;
  const x = (i: number) => M.left + i * step;
  const y = (v: number) => M.top + ih - (v / top) * ih;
  const bandTop = Math.min(y(20), y(0) - 8);
  const maskedY = (y(0) + bandTop) / 2;
  // Leave about 56px per month label.
  const labelEvery = Math.max(1, Math.ceil((months.length * 56) / iw));
  const anyMasked = series.some((s) => s.values.some(isMasked));

  const paths = series.map((s) => {
    let d = '';
    let pen = false;
    s.values.forEach((v, i) => {
      if (isMasked(v)) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  });

  return (
    <div ref={ref}>
      <ul class="chart-legend">
        {series.map((s, i) => (
          <li key={s.label}>
            <span class={`key line s${i + 1}`} aria-hidden="true" /> {s.label}
          </li>
        ))}
        {anyMasked && (
          <li>
            <span class="key masked" aria-hidden="true" /> &lt;20 (masked)
          </li>
        )}
      </ul>
      <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {anyMasked && <rect class="masked-band" x={M.left} width={iw} y={bandTop} height={y(0) - bandTop} />}
        {yTicks.map((t) => (
          <g key={t}>
            <line class="grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text class="axis-label" x={M.left - 6} y={y(t) + 4} text-anchor="end">
              {compact(t)}
            </text>
          </g>
        ))}
        {months.map((m, i) =>
          i % labelEvery === 0 ? (
            <text key={m} class="axis-label" x={x(i)} y={H - M.bottom + 16} text-anchor="middle">
              {formatMonthShort(m).replace(' 20', " '")}
            </text>
          ) : null,
        )}
        {hover !== null && <line class="crosshair" x1={x(hover)} x2={x(hover)} y1={M.top} y2={y(0)} />}
        {paths.map((d, i) => (
          <path key={i} class={`line-${i + 1}`} d={d} />
        ))}
        {series.map((s, si) =>
          s.values.map((v, i) =>
            isMasked(v) ? (
              <circle key={`${si}-${i}`} class="dot-masked" cx={x(i)} cy={maskedY} r="4" style={{ stroke: `var(--series-${si + 1})` }} />
            ) : i === s.values.length - 1 || hover === i ? (
              <circle key={`${si}-${i}`} class={`dot-${si + 1}`} cx={x(i)} cy={y(v)} r="4.5" />
            ) : null,
          ),
        )}
        {months.map((m, i) => (
          <rect
            key={m}
            class="hit"
            x={x(i) - step / 2}
            y={M.top}
            width={Math.max(step, 12)}
            height={ih}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover(i)}
          />
        ))}
      </svg>
      <p class="chart-tip" aria-live="polite">
        {hover !== null ? (
          <>
            <strong>{formatMonthShort(months[hover])}:</strong>{' '}
            {series.map((s, i) => `${s.label} ${formatCell(s.values[hover])}`).join(' · ')}
          </>
        ) : (
          <span class="muted">Hover or tap a month for its numbers.</span>
        )}
      </p>
    </div>
  );
}
