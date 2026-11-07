import { useState } from 'preact/hooks';
import type { PoolCell } from '../../lib/eoi';
import { isMasked } from '../../lib/eoi';
import { formatCell } from '../../lib/format';
import { compact, ticks } from './scale';

interface Props {
  axis: number[];
  pool: PoolCell[];
  /** Highlight the visitor's own score. */
  you?: number | null;
  label: string;
}

const W = 640;
const H = 220;
const M = { top: 12, right: 8, bottom: 34, left: 44 };
const MASKED_PX = 6;

/** EOIs by points score. Masked cells show as short hatched stubs, not to scale. */
export default function Histogram({ axis, pool, you, label }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const byScore = new Map(pool.map((c) => [c.score, c.count]));
  const max = Math.max(0, ...pool.map((c) => (isMasked(c.count) ? 0 : c.count)));
  const yTicks = ticks(max);
  const top = yTicks[yTicks.length - 1] || 1;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const band = axis.length ? iw / axis.length : iw;
  const barW = Math.max(2, band - 2); // 2px gap between bars
  const y = (v: number) => M.top + ih - (v / top) * ih;
  const labelEvery = axis.length > 14 ? 2 : 1;
  const hovered = hover === null ? null : { score: hover, count: byScore.get(hover) ?? 0 };

  return (
    <div>
      <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <defs>
          <pattern id="vr-chart-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="var(--surface-card)" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--masked)" stroke-width="1.5" />
          </pattern>
        </defs>
        {yTicks.map((t) => (
          <g key={t}>
            <line class="grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text class="axis-label" x={M.left - 6} y={y(t) + 4} text-anchor="end">
              {compact(t)}
            </text>
          </g>
        ))}
        {axis.map((score, i) => {
          const c = byScore.get(score);
          const x = M.left + i * band + 1;
          const isYou = you === score;
          return (
            <g key={score}>
              {c !== undefined && isMasked(c) ? (
                <rect class="bar-masked" x={x + 0.5} y={y(0) - MASKED_PX} width={barW - 1} height={MASKED_PX} rx="1.5" />
              ) : c ? (
                <path
                  class={`bar${isYou ? ' you' : ''}`}
                  d={roundedTop(x, y(c), barW, y(0) - y(c))}
                />
              ) : null}
              {isYou && <line class="marker-you" x1={x + barW / 2} x2={x + barW / 2} y1={M.top} y2={y(0)} />}
              {i % labelEvery === 0 && (
                <text class="axis-label" x={x + barW / 2} y={H - M.bottom + 16} text-anchor="middle">
                  {score}
                </text>
              )}
              <rect
                class="hit"
                x={M.left + i * band}
                y={M.top}
                width={band}
                height={ih}
                onMouseEnter={() => setHover(score)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover(score)}
              />
            </g>
          );
        })}
        <line class="grid" x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} style={{ stroke: 'var(--line-strong)' }} />
        <text class="axis-title" x={M.left + iw / 2} y={H - 2} text-anchor="middle">
          Points score
        </text>
      </svg>
      <p class="chart-tip" aria-live="polite">
        {hovered ? (
          <>
            <strong>{hovered.score} points:</strong> {formatCell(hovered.count)} EOIs
            {isMasked(hovered.count) && ' (masked, fewer than 20)'}
          </>
        ) : (
          <span class="muted">Hover or tap a bar for its count.</span>
        )}
      </p>
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
