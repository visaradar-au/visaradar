# VisaRadar

A free website for anyone pursuing Australian skilled migration (subclasses 189, 190, 491).
It shows the official SkillSelect EOI numbers, a map of the states and territories, every
occupation, state programs, invitation rounds and one dated news feed, with the source and
"as at" date on every figure.

General information, not migration advice.

## Run it

```sh
npm install
npm run dev            # http://localhost:4321
npm run build          # static site in dist/ (SITE_BASE=/visaradar/ for a sub-path)
npm run preview        # serve dist/ on port 4391
```

## Update the data

```sh
node pipeline/skillselect.mjs      # SkillSelect EOI dashboard; skips if it hasn't reloaded (--force to pull)
npm run pipeline:news              # news: Home Affairs, the 8 states, Federal Register of Legislation, PM media (migration items)
npm run pipeline:datasets          # Home Affairs datasets on data.gov.au -> data/datasets.json
npm run pipeline:states            # state programs, rounds, occupation lists (~70 s of crawl delays)
npm run build:map                  # one-off: ABS state boundaries -> src/data/au-states.json
```

All output goes to `data/` and is committed, so a build never needs the network.

## Tests

```sh
npm run test:pipeline   # parsers and pipeline, offline fixtures
npm run test:unit       # site helpers
npm run test:e2e        # Playwright against the built site (desktop + mobile)
npm run check           # astro check (types)
node pipeline/qlik-validate.mjs   # live check: reproduces hand-verified SkillSelect totals
node scripts/prepublish-check.mjs # before any push: secrets, personal identifiers, home paths
```

## Where things are

| Path | What |
|---|---|
| `pipeline/lib/qlik.mjs` | Client for the public SkillSelect Qlik dashboard (anonymous session, masked counts only) |
| `pipeline/skillselect.mjs` | Pulls the latest month by points plus 13 months of history (189, 190, 491, 491F), and national counts for every SkillSelect visa incl. 132 and the 188 streams (`data/eoi/pathways.json`) |
| `pipeline/datasets.mjs` | data.gov.au CKAN API, organisation `immi`: dataset list, last update, licence, files |
| `pipeline/news/`, `pipeline/news.mjs` | One fetcher per source, polite HTTP, tagging, change log |
| `pipeline/states.mjs`, `pipeline/states/` | State programs, rounds, occupation lists; hand-checked values in `manual.json` |
| `data/` | All published data (see `docs/DESIGN.md` for the contracts) |
| `src/` | Astro site, Preact islands, data layer in `src/lib/` |
| `.github/workflows/update-data.yml` | Scheduled updates and GitHub Pages deploy (not enabled: no remote yet) |
| `docs/` | Design, research, source status, screenshots |

## Ground rules

- Only official sources count as a source. Third-party figures are labelled as such or left out.
- Counts under 20 stay masked as "<20". Never use the dashboard's unmasked measure.
- EOIs are not people; an EOI can name several states, so state figures are never added up.
- No accounts, no tracking. A visitor's profile stays in their browser.
- Never log in to SkillSelect or ImmiAccount for anyone, and never ask for credentials.
- Respect each site's terms: titles, dates and links only for sites that forbid reuse (QLD, WA).
- Federal Register of Legislation material (CC BY 4.0) carries the attribution its terms of use
  require; it is shown on /about with the date we last read the register.
- Sites that block automated requests (Home Affairs, VIC, NT, TAS at last check) are recorded as
  blocked, not worked around.
