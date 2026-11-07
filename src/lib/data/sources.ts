import { readData } from './read';
import type { Change, FetchState, ListSource, NewsItem, OccupationLists, Round, StateProgram } from './types';

export function getNews(): NewsItem[] {
  return readData<NewsItem[]>('news/items.json', []);
}

export function getFetchState(): Record<string, FetchState> {
  return readData<Record<string, FetchState>>('news/fetch-state.json', {});
}

export function getStates(): StateProgram[] {
  return readData<StateProgram[]>('states.json', []);
}

export function getStateProgram(code: string): StateProgram | null {
  return getStates().find((s) => s.code === code) ?? null;
}

export function getRounds(): Round[] {
  return [...readData<Round[]>('rounds.json', [])].sort((a, b) => b.date.localeCompare(a.date));
}

export function getOccupationLists(): OccupationLists {
  const v = readData<OccupationLists>('occupation-lists.json', { lists: {}, sources: {} });
  return { lists: v.lists ?? {}, byVisa: v.byVisa ?? {}, sources: v.sources ?? {} };
}

export const LIST_NAMES: Record<string, string> = {
  MLTSSL: 'Medium and Long-term Strategic Skills List (MLTSSL)',
  STSOL: 'Short-term Skilled Occupation List (STSOL)',
  ROL: 'Regional Occupation List (ROL)',
  CSOL: 'Core Skills Occupation List (CSOL)',
  ACT: 'ACT nominated occupation list',
  NSW: 'NSW skills list',
  NT: 'NT occupation list',
  QLD: 'Queensland skilled occupation lists',
  SA: 'South Australia occupation list',
  TAS: 'Tasmania occupation list',
  VIC: 'Victoria occupation list',
  WA: 'WA State Nominated Migration Program list (WASMOL)',
};

export interface ListMatch {
  key: string;
  name: string;
  /** false when we link the list but don't store it (e.g. WA). */
  stored: boolean;
  included: boolean;
  /** Set when the list holds 4-digit unit groups and matched on the first 4 digits. */
  unitGroup: string | null;
  /** Where the code appears inside the list, e.g. ["onshore 190", "offshore 491"]. */
  parts: string[];
  source: ListSource | null;
}

/** Walk byVisa for one list and name every part whose codes include `code`. */
function partsFor(tree: unknown, match: (codes: string[]) => boolean, path: string[] = []): string[] {
  if (Array.isArray(tree)) return match(tree as string[]) ? [path.join(' ')] : [];
  if (!tree || typeof tree !== 'object') return [];
  return Object.entries(tree).flatMap(([k, v]) => partsFor(v, match, [...path, k]));
}

/** Every list we know about and whether it includes an occupation. Nothing is guessed. */
export function listMatches(code: string): ListMatch[] {
  const { lists, byVisa = {}, sources } = getOccupationLists();
  const keys = [...new Set([...Object.keys(lists), ...Object.keys(sources)])];
  return keys.map((key) => {
    const source = sources[key] ?? null;
    const codes = lists[key];
    const unit = source?.level === 'unit-group';
    const target = unit ? code.slice(0, 4) : code;
    const match = (c: string[]) => c.includes(target);
    const stored = Array.isArray(codes);
    return {
      key,
      name: LIST_NAMES[key] ?? key,
      stored,
      included: stored && match(codes),
      unitGroup: unit ? target : null,
      parts: byVisa[key] ? partsFor(byVisa[key], match) : [],
      source,
    };
  });
}

/** Names of the lists that include an occupation code. */
export function listsFor(code: string): string[] {
  return listMatches(code).filter((m) => m.included).map((m) => m.key);
}

export function getChanges(): Change[] {
  return readData<Change[]>('changes.json', []);
}
