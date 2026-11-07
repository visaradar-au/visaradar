// Typed views of the data contracts in docs/DESIGN.md.
import type { MonthRow, OccRow, PathwayVisa } from '../eoi';

export interface EoiMeta {
  source: string;
  sourceUrl: string;
  lastReload: string;
  latestMonth: string;
  months: string[];
  fetchedAt: string;
  notes: string[];
}

export type StatusCounts = Partial<Record<'SUBMITTED' | 'INVITED' | 'LODGED' | 'HOLD', number | '<20'>>;

export interface OccupationSummary {
  code: string;
  name: string;
  /** Distinct EOIs per visa (an EOI naming several states counts once). A missing status means none. */
  byVisa?: Partial<Record<'189' | '190' | '491' | '491F', StatusCounts>>;
}

export interface OccupationDetail {
  asAt: string;
  code: string;
  name: string;
  rows: OccRow[];
}

export interface OccupationHistory {
  code: string;
  rows: MonthRow[];
}

/** data/eoi/pathways.json: national distinct EOI counts per visa and status, every status SkillSelect has. */
export interface Pathways {
  asAt: string;
  months: string[];
  visas: PathwayVisa[];
  /** [month "YYYY-MM", visa, status, count]; a missing row means none. */
  rows: [string, PathwayVisa, string, number | '<20'][];
}

export interface EoiSummary {
  months: string[];
  rows: MonthRow[];
}

export type NewsSource = 'homeaffairs' | 'qld' | 'nsw' | 'vic' | 'sa' | 'wa' | 'tas' | 'act' | 'nt' | 'legislation' | 'pm';
export const NEWS_TAGS = [
  'program-open', 'program-closed', 'allocation', 'round', 'invitations', 'occupation-list',
  'points-test', 'processing', 'fees', 'policy', 'other',
] as const;
export type NewsTag = (typeof NEWS_TAGS)[number];

export interface NewsItem {
  id: string;
  source: NewsSource;
  title: string;
  url: string;
  published: string | null;
  firstSeen: string;
  tags: NewsTag[];
  excerpt: string | null;
}

export interface FetchState {
  url: string;
  lastOk: string | null;
  /** Error message from the last failed fetch. */
  lastError: string | null;
  /** When the last failure happened. */
  lastErrorAt?: string | null;
  lastStatus: number | null;
  etag?: string | null;
  lastModified?: string | null;
  itemCount: number;
}

export type ProgramStatus = 'open' | 'closed' | 'paused' | 'not-yet-open' | 'unknown';

export interface StateProgram {
  code: string;
  name: string;
  site: string;
  programYear: string;
  status: ProgramStatus;
  /** Per-visa status where the state runs 190 and 491 differently. */
  statusByVisa?: Partial<Record<'190' | '491', ProgramStatus>> | null;
  model: string | null;
  opened: string | null;
  allocations: {
    '190': number | null;
    '491': number | null;
    source: string | null;
    sourceUrl: string | null;
    asAt: string | null;
  };
  invitedSoFar: {
    n: number;
    byVisa?: Partial<Record<'190' | '491', number>>;
    period: string;
    source: string;
    sourceUrl: string;
    asAt: string;
  } | null;
  links: { news: string | null; program: string | null; occupationList: string | null };
  lastVerified: string | null;
  notes: string | null;
}

export interface RoundCutoff {
  occupation: string;
  /** ANZSCO code: 6 digits for an occupation, 4 for a unit group. */
  code: string;
  points?: number | null;
  /** A single score, or scores per stream (e.g. ACT "canberra-190"). */
  matrix?: number | Record<string, { score: number | null; date: string | null } | null> | null;
}

export interface Round {
  id: string;
  /** "YYYY-MM-DD", or "YYYY-MM" when the source gives only a month. */
  date: string;
  scope: string;
  title: string;
  invitations: number | null;
  byVisa?: Partial<Record<string, number | null>> | null;
  cutoffs?: RoundCutoff[] | null;
  cutoffsSourceUrl?: string | null;
  source: string;
  sourceUrl: string;
  verified: boolean;
  notes?: string | null;
}

export interface ListSource {
  url: string;
  page?: string;
  parts?: Record<string, string>;
  asAt?: string | null;
  checked?: string | null;
  /** "unit-group" when the list holds 4-digit ANZSCO unit groups. */
  level?: string;
  note?: string;
  instrument?: string;
}

export interface OccupationLists {
  lists: Record<string, string[]>;
  /** Per list, codes split by part (e.g. QLD onshore/offshore) and visa, or by visa only. */
  byVisa?: Record<string, Record<string, string[] | Record<string, string[]>>>;
  sources: Record<string, ListSource>;
}

export interface Change {
  at: string;
  kind: 'news' | 'eoi-month' | 'state-status' | 'round' | 'allocation' | 'dataset';
  source: string;
  title: string;
  url: string;
}

export interface DatasetResource {
  name: string;
  format: string;
  lastModified: string | null;
  url: string;
}

/** One Home Affairs dataset on data.gov.au (data/datasets.json). */
export interface Dataset {
  name: string;
  title: string;
  summary: string;
  metadataModified: string | null;
  licence: { id: string | null; title: string | null; url: string | null };
  url: string;
  resources: DatasetResource[];
}

export interface Datasets {
  source: string;
  sourceUrl: string;
  apiUrl: string;
  lastModified: string | null;
  datasets: Dataset[];
}
