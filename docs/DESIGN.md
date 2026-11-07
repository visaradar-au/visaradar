# VisaRadar: design and lane contract

Working name: **VisaRadar** (placeholder; lives only in `src/site.config.ts`).

## What it is

A free public website for anyone pursuing Australian skilled migration (189, 190, 491).
It brings the official numbers and news into one fast, visual place:

- a map of the eight states and territories, coloured by what matters this month;
- an occupation explorer (all ~480 occupations in SkillSelect) with the EOI pool by points,
  per state and visa, and the invited trend;
- one dated news feed across Home Affairs and every state, with filters and RSS;
- state programs: open or closed, allocations, invitations where the state publishes them;
- invitation rounds: 189 / 491 Family rounds and state rounds (ACT, SA, WA...);
- **Where I stand:** the visitor enters occupation, visa, state and points once. It is kept in
  their own browser (localStorage) and every page answers for them;
- **Has my EOI been invited?** An honest guide: there is no public API. Explains the real
  signals (SkillSelect email, EOI status change, state email, agent forwarding), how to set up
  an email filter, and our RSS / change feed for "is my state inviting people like me".

Why it beats existing tools (see `research/competitors.md`): an 8-state map, every number
carries its official source and as-at date, a dated multi-source news feed, no lead forms,
no ads, no accounts.

## Anti-goals (never)

- Migration advice or predictions of anyone's chances (s280 Migration Act). We show facts and
  positions ("391 EOIs above your score"), never "you will / won't be invited".
- Accounts, logins, or storing personal data on any server. No analytics that track profiles.
- Logging in to SkillSelect / ImmiAccount for users, or asking for their credentials.
- Republishing unmasked counts. The department masks cells under 20; we keep "<20".
- Copying article bodies from sites whose terms forbid reuse (WA, QLD). Store title, date,
  link and our own one-line tag only.
- Government logos or anything that looks like an official government site.
- Showing a monthly snapshot as "live". Every figure shows "as at" + source link.

## Stack

- **Astro 5** static site, TypeScript, **Preact** islands for interactive parts.
- Plain CSS with design tokens (`src/styles/tokens.css`). No CSS framework.
- Map: ABS ASGS 2026 STE boundaries (CC BY 4.0), simplified once and committed as
  pre-projected SVG paths. No map tiles, no runtime map library.
- Charts: small hand-built SVG components. No chart library.
- Data pipeline: Node 22 scripts in `pipeline/` (ESM `.mjs`), output committed JSON in `data/`.
- Tests: **vitest** for parsers/pipeline (offline fixtures only), **Playwright** smoke tests
  against the built site.
- Hosting: GitHub Pages, GitHub Actions cron.
  - news + state pages: every 30 minutes (polite: ETag/Last-Modified, sitemaps, crawl delays);
  - SkillSelect dashboard: daily check of `qLastReloadTime`, pull only when it changes;
  - rebuild + deploy when `data/` changes.

## Data contracts (`data/`)

All dates ISO 8601. Every dataset carries its source URL and as-at/fetched date.

### `data/eoi/` (owner: main; done)
- `meta.json`: `{source, sourceUrl, lastReload, latestMonth:"2026-10", months:[...], fetchedAt, notes[]}`
- `occupations.json`: `[{code:"261313", name, submitted, invited}]` (latest month, numeric cells only)
- `occ/<code>.json`: `{asAt, code, name, rows:[[visa, state, status, score, count]]}`
  - `visa` ∈ `189 | 190 | 491 | 491F`; `state` ∈ `ACT ANY NSW NT QLD SA TAS VIC WA N/A AUSTRADE`;
  - `status` ∈ `SUBMITTED INVITED LODGED HOLD`; `count` is a number or the string `"<20"`.
- `pathways.json`: `{asAt, months, visas, rows:[[month, visa, status, count]]}`: national distinct
  counts for every SkillSelect visa, every status the dashboard has (incl. `CLOSED`).
  - `visa` ∈ `189 190 491 491F 132 188BI 188EV 188INV 188SIG`. The business visas (132, 188) have
    no occupation or points rows, so they appear only here and on `/pathways/`. Selectors on
    occupation pages and `/me` keep `189 190 491 491F` (defaults 189/190/491).
- `history/<code>.json`: `{code, rows:[[month "YYYY-MM", visa, state, status, count]]}` (13 months)
- `summary.json`: `{months, rows:[[month, visa, state, status, count]]}` (distinct counts per state)

Interpretation rules the UI must show near the numbers: EOIs are not people; "<20" is masked
and excluded from totals; INVITED is EOIs still in invited status at month end (a stock, not a
flow), so show INVITED and LODGED changes together; an EOI can name several states, so never
sum across states.

### `data/news/items.json` (owner: sources lane)
`[{id, source, title, url, published, firstSeen, tags[], excerpt}]`, newest first.
- `id` = sha1 of canonical URL (first 12 hex chars).
- `source` ∈ `homeaffairs | qld | nsw | vic | sa | wa | tas | act | nt | legislation | pm`.
  - `legislation`: Federal Register of Legislation OData API, titles starting "Migration", newest
    first by `asMadeRegisteredAt`, `$top=20`, 10 s crawl delay. `url` = `https://www.legislation.gov.au/<id>/asmade`,
    `published` = registration date as written. Tagged `occupation-list` (title mentions occupations)
    or `policy`, plus keyword tags. CC BY 4.0 with the terms-of-use attribution.
  - `pm`: `https://www.pm.gov.au/rss.xml` (ETag), only items whose title or description matches the
    fixed migration keyword rules in `pipeline/news/pm.mjs`. Title, date and link only.
  - A source's first successful run only adds its last 30 days to `changes.json`.
- `published`: date from the page, sitemap lastmod, or null. `firstSeen`: when we first saw it.
- `tags` from a fixed set: `program-open program-closed allocation round invitations occupation-list
  points-test processing fees policy other` (keyword rules, deterministic, tested).
- `excerpt`: only for CC BY sources (SA, ACT, Home Affairs if CC BY); else null.

### `data/news/fetch-state.json` (owner: sources lane)
`{<source>: {url, lastOk, lastError, lastStatus, etag, lastModified, itemCount}}`. The UI shows
a source as "not reachable since X" instead of hiding stale data.

### `data/states.json` (owner: sources lane, hand-curated + scraped)
`[{code, name, site, programYear, status: open|closed|paused|not-yet-open|unknown, model, opened,
  allocations:{"190": n|null, "491": n|null, source, sourceUrl, asAt},
  invitedSoFar:{n, period, source, sourceUrl, asAt}|null,
  links:{news, program, occupationList}, lastVerified, notes}]`
Only official sources count as `source`; third-party figures go in `notes` labelled as such.

### `data/rounds.json` (owner: sources lane)
`[{id, date, scope: "189"|"491F"|"ACT"|"SA"|"WA"|"VIC"|"NSW"|"QLD"|"TAS"|"NT", title,
  invitations: n|null, cutoffs:[{occupation, code, points|matrix}], source, sourceUrl, verified}]`
`verified:false` when only third-party reports exist; the UI labels those clearly.

### `data/occupation-lists.json` (owner: sources lane)
`{lists: {MLTSSL:[codes], STSOL:[codes], ROL:[codes], CSOL:[codes]?, QLD:[...], SA:[...], ...},
  sources: {<list>: {url, asAt}}}`. Missing lists are absent, never guessed.

### `data/datasets.json` (owner: live-data lane)
`{source, sourceUrl, apiUrl, lastModified, datasets:[{name, title, summary, metadataModified,
  licence:{id, title, url}, url, resources:[{name, format, lastModified, url}]}]}` from
`https://data.gov.au/data/api/3/action/package_search?fq=organization:immi`, newest first. Times are
UTC (`Z`). `summary` is the first line of the CKAN notes. The file has no fetch timestamp and is
rewritten only when its content changes. A change entry (kind `dataset`, source `datagov`) is added
when a dataset is new, its `metadata_modified` moves or its resource list changes.

### `data/changes.json` (written by every pipeline step)
`[{at, kind: news|eoi-month|state-status|round|allocation|dataset, source, title, url}]`, newest first,
capped at 500. Powers "What changed" on the home page and `/changes.xml` RSS.

## Pages (owner: site lane)

| Route | Purpose |
|---|---|
| `/` | What changed (latest changes), the map, "Where I stand" summary if a profile exists, else a 3-field setup |
| `/states/` and `/states/[code]/` | Map + per-state program card, allocations, invitations, pool chart, news |
| `/occupations/` | Search and filter all occupations (code or name), sortable |
| `/occupations/[code]/` | Static page per occupation: pool by points (per state/visa), invited trend, which lists include it |
| `/me/` | Where I stand: profile form (localStorage), position per state/visa, what changed for me |
| `/news/` | Unified feed, filter by source/tag, search; RSS `/news.xml`, `/states/[code]/news.xml` |
| `/rounds/` | 189/491F rounds and state rounds, cut-offs, verified flag |
| `/eoi-check/` | "Has my EOI been invited?" honest guide |
| `/pathways/` | One card per SkillSelect visa (189, 190, 491, 491F, 188 streams, 132): plain line, official page, latest national pool counts |
| `/datasets/` | Home Affairs datasets on data.gov.au: last update, files, licence |
| `/about/` | Sources, method, masking, disclaimer, licence attributions |

UX bar: every number has "as at" + source link; dates formatted ("1 Nov 2026"); every table row
clickable to a detail page; no jargon without an inline explanation (EOI, ROI, ANZSCO, 190/491);
every page ends with a clear next step; mobile first; accessible (keyboard, contrast, the map has
a table alternative). Visual style: calm, data-dense, trustworthy; not a government clone.

## Lanes

| Lane | Branch / worktree | Owns |
|---|---|---|
| main (Claude) | `main` | `pipeline/lib/qlik.mjs`, `pipeline/skillselect.mjs`, `data/eoi/`, `docs/`, `.github/`, integration |
| sources | `lane/sources` in `.worktrees/sources` | `pipeline/news/**`, `pipeline/states/**`, `pipeline/news.mjs`, `data/news/`, `data/states.json`, `data/rounds.json`, `data/occupation-lists.json`, `data/changes.json`, `tests/pipeline/**` |
| site | `lane/site` in `.worktrees/site` | `src/**`, `public/**`, `astro.config.*`, `tests/e2e/**`, `pipeline/geo/**` |

Shared rules: don't edit files another lane owns; `package.json` changes go in small separate
commits so merges are easy; use the repo's commit identity; never push from a lane;
no personal data (use a made-up persona in fixtures); hand back a tested checkpoint per finished
area.
