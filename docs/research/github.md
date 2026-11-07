# GitHub research for VisaRadar (2026-11-07)

Read-only research with `gh` (search + repo metadata). No code from these repos was run.

## Is there an open-source competitor?

No. Searches for SkillSelect, Australian skilled migration, state nomination and visa
trackers return only tiny or stale projects:

| Repo | Stars | Last push | What it is | Verdict |
|---|---|---|---|---|
| [asinggih/skillselect-scraper](https://github.com/asinggih/skillselect-scraper) | 2 | 2022-12 | Scraped the old 189 invitation rounds page | Abandoned |
| [TomazMPP/Australian-Visa-Tracker](https://github.com/TomazMPP/Australian-Visa-Tracker) | 2 | 2026-08 | Visa processing times | Different topic, no licence |
| [priya11032001/australia-skilled-migration-dashboard](https://github.com/priya11032001/australia-skilled-migration-dashboard) | 0 | 2026-07 | Annual Home Affairs grant reports, ICT focus | Annual grants only, no EOI data, no licence |
| [nateruze/data_analysis_aus_migration](https://github.com/nateruze/data_analysis_aus_migration) | 0 | 2022-07 | D3 exploratory analysis | Stale |
| [govCMS/skillselect](https://github.com/govCMS/skillselect) | – | 2016 | Old SkillSelect govspace site | Archived |

None of them reads the SkillSelect EOI dashboard. That data pipeline is VisaRadar's edge.

## Libraries worth using

| Repo | Stars | Last push | Licence | Use |
|---|---|---|---|---|
| [withastro/astro](https://github.com/withastro/astro) | 63.8k | 2026-11-07 | MIT | Site framework (chosen) |
| [qlik-oss/enigma.js](https://github.com/qlik-oss/enigma.js) | 219 | 2026-11-06 | MIT | Official Qlik engine client. Our own 120-line client in `pipeline/lib/qlik.mjs` already works and is validated; switch only if the engine protocol changes or we need more of the API. |
| [mbloch/mapshaper](https://github.com/mbloch/mapshaper) | 4.2k | 2026-10-29 | MPL-2.0 | Best tool for simplifying the ABS state boundaries once at build time (dev-only, output committed). |
| [d3/d3-geo](https://github.com/d3/d3-geo) | 1.1k | 2026-11-03 | ISC | Project boundaries to SVG paths at build time. |
| [rowanhogan/australian-states](https://github.com/rowanhogan/australian-states) | 20 | 2014 | none stated | Avoid: no licence, old. Use ABS ASGS 2026 (CC BY 4.0). |

## Recommendation

Keep the current stack (Astro + our own Qlik client + ABS boundaries). Use mapshaper or d3-geo
only as dev tools for the one-off map build. There is no existing open-source project to fork or
contribute to; VisaRadar would be the first open, official-data tracker for SkillSelect EOIs.
