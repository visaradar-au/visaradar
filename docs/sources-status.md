# Sources status (sources lane)

Checked 2026-11-07 with plain Node `fetch` and the honest UA `VisaRadar/0.1 (public data aggregator)`.
No browser fingerprints, headless browsers or proxies. A blocked host is tried once per run
and recorded in `data/news/fetch-state.json`.

## Run

- `npm run pipeline:news`: news from 9 sources into `data/news/items.json`, `fetch-state.json`, `data/changes.json`.
- `npm run pipeline:states`: `data/states.json`, `data/rounds.json`, `data/occupation-lists.json`
  (`--no-lists` skips the lists). About 70 s because of crawl delays (ACT 20 s, legislation.gov.au 10 s).
  Run it hourly or daily. It is not meant for the 30-minute news cadence.
- `npm run test:pipeline`: offline, fixtures in `tests/pipeline/fixtures/`.

## Reachability

| Source | Status | What we use |
|---|---|---|
| Home Affairs (immi, www, minister) | 403 everywhere, robots.txt included | Nothing. Parser exists, tested on a synthetic fixture only |
| VIC liveinmelbourne.vic.gov.au | 403 everywhere | Nothing. Synthetic-fixture parser |
| NT theterritory.com.au | 403 everywhere | Nothing. Synthetic-fixture parser |
| TAS migration.tas.gov.au | `/news` returned 200 once, then 403; stats, copyright and robots.txt are 403 | News titles when reachable (no dates) |
| QLD migration.qld.gov.au | OK | News (dates from sitemap lastmod), onshore and offshore lists |
| NSW nsw.gov.au | OK | Stale news list, 3 program pages (modified meta), skills list |
| SA migration.sa.gov.au | OK | News, "Invitations issued" posts, occupation list |
| WA migration.wa.gov.au | OK (the WASMOL CSV export returns an empty body) | News, SNMP invitations tables |
| ACT act.gov.au | OK | Updates block, round page, rankings DOCX, occupation list |
| legislation.gov.au | OK | LIN 19/051 compilation: MLTSSL, STSOL, ROL |

## Licences (checked on each site's copyright page, 2026-11-07)

- **CC BY 4.0:** ACT ("© Australian Capital Territory") and NSW ("© State of New South Wales").
  Excerpts are allowed and kept.
- **SA:** the copyright page allows reproduction with acknowledgement, but not alteration. It does
  not state CC BY, so SA is not on the excerpt allowlist in `pipeline/news.mjs`. SA cards have no
  summary anyway. Facts and round tables are stored with attribution.
- **QLD, WA:** reuse is forbidden without permission. We store title, date, link and numbers only.
  Fixtures keep markup and titles, not body text. WA occupation codes are not stored.
- **TAS, VIC, NT, Home Affairs:** unknown (blocked). No excerpts.
- **legislation.gov.au:** the copyright page is rendered by JavaScript, so its licence wasn't read.
  We store ANZSCO codes only (facts) and link to the instrument.

## Data notes

- Item ids are `sha1(canonical URL)[:12]`. For ACT updates and the ACT round page, which reuse
  one URL, the id is `sha1(canonical URL + "#" + key)`, where the key is the bullet text or the round date.
- NSW "Page updated: …" items are watched program pages, dated by their modified meta. They are
  not news posts.
- QLD `published` is the sitemap lastmod, which is a modification date, not a publication date.
  It also runs about 10 hours ahead: the 2026-27 SNMP post shows "Last published: 4:28 pm, Friday,
  30 October 2026", but its lastmod is `2026-10-31T02:28:12+10:00`. So QLD dates can be one day late.
  The fix would be to read each recent article's footer (one extra request per item); not done yet.
- States `lastVerified` is the newest hand-check date in `manual.json`. Scraped counts carry their
  own `invitedSoFar.asAt`. Manual statuses don't update themselves: re-check them by hand.
- The first news run adds only items from the last 30 days to `changes.json`. The first states run
  adds only rounds from the current program year.
- States `statusByVisa` and `evidence` (URL, verified date and quote per value) are additions to the contract.
- Rounds: WA monthly totals (2024-25 to 2026-27) have month-precision dates. ACT 12 Oct 2026
  includes per unit group Matrix cut-offs. SA 2025-26 posts are included; there are no 2026-27
  SA posts yet. No 189 or 491F rounds are included because Home Affairs is blocked (see
  `pipeline/states/rounds-manual.json`).
