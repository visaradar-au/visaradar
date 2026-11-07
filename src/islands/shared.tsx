import { useEffect, useState } from 'preact/hooks';
import type { MonthRow, OccRow, Visa } from '../lib/eoi';
import {
  STATES,
  STATE_NAMES,
  VISA_NAMES,
  isMasked,
  isStateCode,
  poolByPoints,
  positionAt,
  scopeLabel,
  scopesFor,
} from '../lib/eoi';
import { formatCell, formatNumber } from '../lib/format';
import { href } from '../lib/href';
import type { Profile } from '../lib/profile';

export interface OccData {
  code: string;
  name: string;
  asAt: string;
  months: string[];
  rows: OccRow[];
  history: MonthRow[];
}

type Load<T> = { state: 'idle' | 'loading' } | { state: 'error'; message: string } | { state: 'ok'; data: T };

const occCache = new Map<string, Promise<OccData>>();
export function fetchOccupation(code: string): Promise<OccData> {
  if (!occCache.has(code)) {
    occCache.set(
      code,
      fetch(href(`/data/occ/${code}.json`)).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    );
  }
  return occCache.get(code)!;
}

export function useOccupation(code: string | null): Load<OccData> {
  const [load, setLoad] = useState<Load<OccData>>({ state: 'idle' });
  useEffect(() => {
    if (!code) return setLoad({ state: 'idle' });
    let live = true;
    setLoad({ state: 'loading' });
    fetchOccupation(code)
      .then((data) => live && setLoad({ state: 'ok', data }))
      .catch((e) => {
        occCache.delete(code);
        if (live) setLoad({ state: 'error', message: (e as Error).message });
      });
    return () => {
      live = false;
    };
  }, [code]);
  return load;
}

let listPromise: Promise<[string, string][]> | null = null;
export function useOccupationList(): [string, string][] {
  const [list, setList] = useState<[string, string][]>([]);
  useEffect(() => {
    listPromise ??= fetch(href('/data/occupations.json')).then((r) => r.json());
    listPromise.then(setList).catch(() => (listPromise = null));
  }, []);
  return list;
}

export const optionLabel = (code: string, name: string) => `${name} (${code})`;

/** Find an occupation from what was typed: a 6-digit code, or the exact option label or name. */
export function matchOccupation(list: [string, string][], text: string): [string, string] | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  const code = t.match(/\b(\d{6})\b/)?.[1];
  return (
    list.find(([c]) => c === code) ??
    list.find(([c, n]) => optionLabel(c, n).toLowerCase() === t || n.toLowerCase() === t) ??
    null
  );
}

export function OccupationField(props: { id: string; value: string; onInput: (v: string) => void; invalid?: boolean }) {
  const list = useOccupationList();
  return (
    <div class="field">
      <label for={props.id}>Occupation</label>
      <input
        id={props.id}
        class="input"
        list={`${props.id}-list`}
        value={props.value}
        placeholder="Type a name or 6-digit code"
        autocomplete="off"
        aria-invalid={props.invalid ? 'true' : undefined}
        aria-describedby={`${props.id}-hint`}
        onInput={(e) => props.onInput((e.target as HTMLInputElement).value)}
      />
      <datalist id={`${props.id}-list`}>
        {list.map(([c, n]) => (
          <option key={c} value={optionLabel(c, n)} />
        ))}
      </datalist>
      <span id={`${props.id}-hint`} class={props.invalid ? 'hint error' : 'hint'}>
        {props.invalid ? 'Pick an occupation from the list, or type its 6-digit ANZSCO code.' : 'Its ANZSCO code, as in your skills assessment.'}
      </span>
    </div>
  );
}

export function VisaField(props: { id: string; value: Visa; onChange: (v: Visa) => void }) {
  return (
    <div class="field">
      <label for={props.id}>Visa</label>
      <select id={props.id} class="select" value={props.value} onChange={(e) => props.onChange((e.target as HTMLSelectElement).value as Visa)}>
        {(['189', '190', '491', '491F'] as Visa[]).map((v) => (
          <option key={v} value={v}>
            {VISA_NAMES[v]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PointsField(props: { id: string; value: string; onInput: (v: string) => void; invalid?: boolean }) {
  return (
    <div class="field">
      <label for={props.id}>Points</label>
      <input
        id={props.id}
        class="input"
        type="number"
        inputMode="numeric"
        min={0}
        max={200}
        step={5}
        value={props.value}
        aria-invalid={props.invalid ? 'true' : undefined}
        onInput={(e) => props.onInput((e.target as HTMLInputElement).value)}
      />
      {props.invalid && <span class="hint error">Enter your points score, for example 85.</span>}
    </div>
  );
}

export function StateField(props: { id: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div class="field">
      <label for={props.id}>State</label>
      <select
        id={props.id}
        class="select"
        value={props.disabled ? '' : props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange((e.target as HTMLSelectElement).value)}
      >
        <option value="">{props.disabled ? 'Not needed for this visa' : 'All states'}</option>
        {STATES.map((s) => (
          <option key={s} value={s}>
            {STATE_NAMES[s]}
          </option>
        ))}
        <option value="ANY">Any state</option>
      </select>
    </div>
  );
}

export const needsState = (v: Visa) => v === '190' || v === '491';

/** "N EOIs at your score, M above, K masked cells not counted" for one scope. */
export function PositionCard(props: { rows: OccRow[]; profile: Profile; scope: string; mine?: boolean; link?: boolean }) {
  const { rows, profile, scope, mine } = props;
  const pool = poolByPoints(rows, profile.visa, scope);
  const p = positionAt(pool, profile.points);
  const at = isMasked(p.at) ? 0 : p.at;
  const total = p.above + at + p.below;
  const pct = (n: number) => (total ? `${(n / total) * 100}%` : '0');
  return (
    <article class={`position-card${mine ? ' is-mine' : ''}`} data-scope={scope}>
      <h3>
        <span>{scopeLabel(scope)}</span>
        {mine && <span class="badge plain">Your state</span>}
      </h3>
      {pool.length === 0 ? (
        <p>No EOIs recorded for this occupation and visa here.</p>
      ) : (
        <>
          <p>
            <span class="big">{formatNumber(p.above)}</span> EOIs above your score
          </p>
          <div class="bar-split" aria-hidden="true">
            <span class="above" style={{ width: pct(p.above) }} />
            <span class="at" style={{ width: pct(at) }} />
            <span class="below" style={{ width: pct(p.below) }} />
          </div>
          <p>
            <strong>{formatCell(p.at)}</strong> at {profile.points} points · <strong>{formatNumber(p.below)}</strong> below
          </p>
          <p class="muted">
            {p.maskedExcluded === 0
              ? 'No masked cells.'
              : `${p.maskedExcluded} masked cell${p.maskedExcluded === 1 ? '' : 's'} (<20 each) not counted${
                  p.maskedAbove ? `, ${p.maskedAbove} of them above you` : ''
                }.`}
          </p>
        </>
      )}
      {props.link && isStateCode(scope) && (
        <p>
          <a href={href(`/states/${scope.toLowerCase()}/`)}>{STATE_NAMES[scope]} page</a>
        </p>
      )}
    </article>
  );
}

/** Scopes to show for a profile, the chosen state first. */
export function scopesForProfile(profile: Profile): string[] {
  const all = scopesFor(profile.visa);
  if (!needsState(profile.visa) || !profile.state) return all;
  return [profile.state, ...all.filter((s) => s !== profile.state)];
}

export function SplitLegend() {
  return (
    <ul class="chart-legend split-legend">
      <li><span class="key split-above" aria-hidden="true" /> Above your score</li>
      <li><span class="key you" aria-hidden="true" /> At your score</li>
      <li><span class="key split-below" aria-hidden="true" /> Below</li>
    </ul>
  );
}
