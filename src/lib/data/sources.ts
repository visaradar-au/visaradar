import { readData } from './read';
import type { Change, FetchState, NewsItem, OccupationLists, Round, StateProgram } from './types';

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
  return { lists: v.lists ?? {}, sources: v.sources ?? {} };
}

/** Names of the lists that include an occupation code. */
export function listsFor(code: string): string[] {
  const { lists } = getOccupationLists();
  return Object.entries(lists)
    .filter(([, codes]) => Array.isArray(codes) && codes.includes(code))
    .map(([name]) => name);
}

export function getChanges(): Change[] {
  return readData<Change[]>('changes.json', []);
}
