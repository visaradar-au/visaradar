import { useMemo, useRef, useState } from 'preact/hooks';
import type { Change, StateMetric } from '../lib/eoi';
import { STATE_NAMES, isMasked, isStateCode, numeric } from '../lib/eoi';
import { formatCell, formatDelta, formatNumber } from '../lib/format';
// Imported here, not passed as a prop, so the geometry ships once in the cached JS
// bundle instead of being serialised into every page's HTML.
import geoData from '../data/au-states.json';

interface GeoState {
  code: string;
  name: string;
  d: string;
  centroid: number[];
}

const geo = geoData as { width: number; height: number; states: GeoState[] };

interface Props {
  metrics: Record<'190' | '491', Record<string, StateMetric>>;
  monthLabel: string;
  prevMonthLabel: string;
  stateHrefs: Record<string, string>;
}

type Metric = 'submitted' | 'invited' | 'change';
type MapVisa = '190' | '491';

const METRICS: { id: Metric; label: string; legend: string }[] = [
  { id: 'submitted', label: 'EOIs submitted', legend: 'EOIs waiting in the pool' },
  { id: 'invited', label: 'In invited status', legend: 'EOIs in invited status at month end' },
  { id: 'change', label: 'Change this month', legend: 'Change in EOIs submitted since last month' },
];

const SEQ = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)', 'var(--seq-6)'];
const DIV = ['var(--div-neg-2)', 'var(--div-neg-1)', 'var(--div-mid)', 'var(--div-pos-1)', 'var(--div-pos-2)'];
const HATCH = 'url(#vr-hatch)';
/** Each fill token has a matching label token (`--seq-3` -> `--seq-3-ink`) that keeps 4.5:1 in both themes. */
const inkFor = (fill: string) => (fill === HATCH ? 'var(--hatch-ink)' : fill.replace(')', '-ink)'));

const PAD_RIGHT = 110; // room for the ACT callout

function valueOf(m: StateMetric | undefined, metric: Metric): number | '<20' | null {
  if (!m) return null;
  if (metric === 'submitted') return m.submitted.current;
  if (metric === 'invited') return m.invited.current;
  return m.submitted.delta;
}

/** Round to 2 significant figures for legend ticks, e.g. 96,332 -> 96,000. */
function tick(n: number): number {
  if (n === 0) return 0;
  const p = 10 ** Math.max(0, Math.floor(Math.log10(Math.abs(n))) - 1);
  return Math.round(n / p) * p;
}

export default function StateMap({ metrics, monthLabel, prevMonthLabel, stateHrefs }: Props) {
  const [visa, setVisa] = useState<MapVisa>('190');
  const [metric, setMetric] = useState<Metric>('submitted');
  const [active, setActive] = useState<string | null>(null);
  const pointerType = useRef<string>('mouse');

  const data = metrics[visa];
  const { scaleMax, fillFor } = useMemo(() => {
    const values = geo.states.map((s) => numeric(valueOf(data[s.code], metric))).filter((v): v is number => v !== null);
    if (metric === 'change') {
      const max = Math.max(1, ...values.map(Math.abs));
      return {
        scaleMax: max,
        fillFor: (v: number) => {
          const t = v / max; // -1..1
          return DIV[t <= -0.5 ? 0 : t < -0.05 ? 1 : t <= 0.05 ? 2 : t < 0.5 ? 3 : 4];
        },
      };
    }
    const max = Math.max(1, ...values);
    return {
      scaleMax: max,
      fillFor: (v: number) => SEQ[Math.min(SEQ.length - 1, Math.floor((v / max) * SEQ.length))],
    };
  }, [data, metric, geo]);

  const metricInfo = METRICS.find((m) => m.id === metric)!;
  const act = geo.states.find((s) => s.code === 'ACT');
  const width = geo.width + PAD_RIGHT;

  function cellText(code: string): string {
    const v = valueOf(data[code], metric);
    if (v === null) return metric === 'change' ? 'n/a' : '0';
    if (isMasked(v)) return '<20';
    return metric === 'change' ? formatDelta(v) : formatNumber(v);
  }

  function fill(code: string): string {
    const v = valueOf(data[code], metric);
    if (v === null || isMasked(v)) return HATCH;
    return fillFor(v);
  }

  // Starts with the visible label ("NSW 1,234") so voice control users can say what they see.
  function ariaLabel(s: GeoState): string {
    return `${s.code} ${cellText(s.code)}, ${s.name}: ${metricInfo.label.toLowerCase()}, visa ${visa}. Open state page.`;
  }

  // Arrow keys move between states; Tab still visits each one in turn.
  function onKeyDown(e: KeyboardEvent) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    const svg = e.currentTarget as SVGSVGElement;
    const links = [...svg.querySelectorAll<SVGAElement>('a[data-state]')];
    const i = links.indexOf(document.activeElement as SVGAElement);
    if (!step || i < 0) return;
    e.preventDefault();
    links[(i + step + links.length) % links.length].focus();
  }

  function onClick(e: MouseEvent, code: string) {
    // On touch, the first tap shows the summary; a second tap opens the page.
    if (pointerType.current === 'touch' && active !== code) {
      e.preventDefault();
      setActive(code);
    }
  }

  const shown = active ?? null;

  return (
    <div class="vr-map">
      <div class="controls" role="group" aria-label="Map options">
        <fieldset class="field">
          <legend class="label">Visa</legend>
          <div class="seg">
            {(['190', '491'] as MapVisa[]).map((v) => (
              <label key={v}>
                <input type="radio" name="map-visa" value={v} checked={visa === v} onChange={() => setVisa(v)} />
                <span>{v}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset class="field">
          <legend class="label">Colour states by</legend>
          <div class="seg">
            {METRICS.map((m) => (
              <label key={m.id}>
                <input type="radio" name="map-metric" value={m.id} checked={metric === m.id} onChange={() => setMetric(m.id)} />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div class="vr-map-body">
        <figure class="vr-map-figure">
          <svg
            viewBox={`0 0 ${width} ${geo.height}`}
            role="group"
            aria-label={`Map of Australia's states and territories coloured by ${metricInfo.label.toLowerCase()}, visa ${visa}, ${monthLabel}`}
            onPointerDown={(e) => (pointerType.current = (e as PointerEvent).pointerType)}
            onKeyDown={onKeyDown}
          >
            <defs>
              <pattern id="vr-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="6" height="6" fill="var(--surface-sunk)" />
                <line x1="0" y1="0" x2="0" y2="6" stroke="var(--masked)" stroke-width="1.5" />
              </pattern>
            </defs>
            <g class="vr-land">
            {geo.states.map((s) => (
              <a
                key={s.code}
                href={stateHrefs[s.code]}
                data-state={s.code}
                aria-label={ariaLabel(s)}
                class={`vr-state${shown === s.code ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(s.code)}
                onFocus={() => setActive(s.code)}
                onClick={(e) => onClick(e as unknown as MouseEvent, s.code)}
              >
                <path d={s.d} fill={fill(s.code)} />
                {s.code !== 'ACT' && (
                  <text x={labelX(s)} y={s.centroid[1]} style={{ fill: inkFor(fill(s.code)) }} aria-hidden="true">
                    <tspan x={labelX(s)} class="abbr">{s.code}</tspan>{' '}
                    <tspan x={labelX(s)} dy="1.2em" class="val">{cellText(s.code)}</tspan>
                  </text>
                )}
              </a>
            ))}
            </g>
            {act && (
              <a
                href={stateHrefs.ACT}
                class={`vr-state vr-inset${shown === 'ACT' ? ' is-active' : ''}`}
                aria-hidden="true"
                tabIndex={-1}
                onMouseEnter={() => setActive('ACT')}
                onClick={(e) => onClick(e as unknown as MouseEvent, 'ACT')}
              >
                <circle cx={act.centroid[0]} cy={act.centroid[1]} r="7" class="act-ring" />
                <line x1={act.centroid[0] + 7} y1={act.centroid[1] + 1} x2={geo.width + 6} y2={act.centroid[1] + 30} class="leader" />
                <rect x={geo.width + 6} y={act.centroid[1] + 4} width={PAD_RIGHT - 10} height="56" rx="8" fill={fill('ACT')} />
                <text x={geo.width + 14} y={act.centroid[1] + 26} style={{ fill: inkFor(fill('ACT')) }}>
                  <tspan class="abbr">ACT</tspan>{' '}
                  <tspan x={geo.width + 14} dy="1.2em" class="val">{cellText('ACT')}</tspan>
                </text>
              </a>
            )}
          </svg>
          <figcaption class="vr-legend">
            <span class="legend-title">{metricInfo.legend}, visa {visa}</span>
            <span class="legend-scale" aria-hidden="true">
              {(metric === 'change' ? DIV : SEQ).map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </span>
            <span class="legend-ends">
              {metric === 'change' ? (
                <>
                  <span>{formatDelta(-tick(scaleMax))} fewer</span>
                  <span>no change</span>
                  <span>{formatDelta(tick(scaleMax))} more</span>
                </>
              ) : (
                <>
                  <span>0</span>
                  <span>{formatNumber(tick(scaleMax / 2))}</span>
                  <span>{formatNumber(scaleMax)}</span>
                </>
              )}
            </span>
            <span class="legend-note">EOIs that list this state. Many people list several states, so the states overlap.</span>
            <span class="legend-masked">
              <span class="swatch-hatch" aria-hidden="true" /> {metric === 'change' ? 'Not comparable (a month is <20)' : '<20 (masked by the department)'}
            </span>
          </figcaption>
        </figure>

        <aside class="vr-summary panel" aria-live="polite">
          {shown && isStateCode(shown) ? (
            <Summary
              name={STATE_NAMES[shown]}
              m={data[shown]}
              visa={visa}
              monthLabel={monthLabel}
              prevMonthLabel={prevMonthLabel}
              href={stateHrefs[shown]}
            />
          ) : (
            <div>
              <h3>Pick a state</h3>
              <p class="small muted">
                Hover, tap or tab to a state (arrow keys move between states) to see its numbers for {monthLabel}. Tap again, or use the link, to open its page.
              </p>
              {data.ANY && (
                <p class="small">
                  Separately, <strong>{formatCell(data.ANY.submitted.current)}</strong> visa {visa} EOIs said they would go to{' '}
                  <em>any state</em>. They are not part of any one state's number.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>

      <details class="vr-table">
        <summary>Show the map as a table</summary>
        <div class="table-wrap">
          <table>
            <caption>
              Visa {visa}, {monthLabel}. Changes compare with {prevMonthLabel}. States overlap, so the rows are not added up.
            </caption>
            <thead>
              <tr>
                <th scope="col">State</th>
                <th scope="col" class="num">Submitted</th>
                <th scope="col" class="num">Change</th>
                <th scope="col" class="num">Invited status</th>
                <th scope="col" class="num">Change</th>
                <th scope="col" class="num">Lodged</th>
                <th scope="col" class="num">Change</th>
              </tr>
            </thead>
            <tbody>
              {[...geo.states.map((s) => s.code), 'ANY'].map((code) => {
                const m = data[code];
                if (!m) return null;
                return (
                  <tr key={code} class={stateHrefs[code] ? 'rowlink' : undefined}>
                    <th scope="row">
                      {stateHrefs[code] ? <a href={stateHrefs[code]}>{isStateCode(code) ? STATE_NAMES[code] : code}</a> : 'Any state'}
                    </th>
                    <td class="num">{formatCell(m.submitted.current)}</td>
                    <td class="num">{deltaText(m.submitted)}</td>
                    <td class="num">{formatCell(m.invited.current)}</td>
                    <td class="num">{deltaText(m.invited)}</td>
                    <td class="num">{formatCell(m.lodged.current)}</td>
                    <td class="num">{deltaText(m.lodged)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// Nudge labels off the ACT inset and the coast.
const LABEL_NUDGE: Record<string, number> = { NSW: -14, VIC: 4 };
function labelX(s: GeoState): number {
  return s.centroid[0] + (LABEL_NUDGE[s.code] ?? 0);
}

function deltaText(c: Change): string {
  return c.delta === null ? 'n/a' : formatDelta(c.delta);
}

function Summary(props: { name: string; m: StateMetric; visa: string; monthLabel: string; prevMonthLabel: string; href: string }) {
  const { name, m, visa, monthLabel, prevMonthLabel, href } = props;
  return (
    <div>
      <h3>{name}</h3>
      <p class="small muted">
        Visa {visa}, {monthLabel}. Change since {prevMonthLabel}.
      </p>
      <dl class="vr-figures">
        <div>
          <dt>EOIs submitted</dt>
          <dd>
            <strong>{formatCell(m.submitted.current)}</strong> <span class="muted">{deltaText(m.submitted)}</span>
          </dd>
        </div>
        <div>
          <dt>In invited status</dt>
          <dd>
            <strong>{formatCell(m.invited.current)}</strong> <span class="muted">{deltaText(m.invited)}</span>
          </dd>
        </div>
        <div>
          <dt>Lodged after invite</dt>
          <dd>
            <strong>{formatCell(m.lodged.current)}</strong> <span class="muted">{deltaText(m.lodged)}</span>
          </dd>
        </div>
      </dl>
      <p class="small muted">Invited status drops when people lodge, so read it with lodged.</p>
      <a class="btn btn-quiet" href={href}>
        Open {name}
      </a>
    </div>
  );
}
