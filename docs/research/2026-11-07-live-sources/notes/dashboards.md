# Official dashboards and reports (sub-agent notes, 2026-11-07)

## Summary
- No anonymous machine-readable endpoint confirmed except the SkillSelect EOI Qlik app (already used). No other /anonap/ apps found.
- WebFetch got 403 from homeaffairs.gov.au, immi.homeaffairs.gov.au, data.gov.au CKAN, migration.tas.gov.au (tool-specific blocks are possible; Node fetch from the build runner should be tested).
- Home Affairs report PDFs at homeaffairs.gov.au/research-and-stats/files/: report-migration-program-2024-25.pdf (annual), temp-res-skilled-report-31-dec-2025.pdf and -30-jun-2025.PDF. Untested; static files may pass the WAF.
- Processing times: monthly 25/50/90 percentiles (third-party description); page 403.
- 189 rounds: 4 Jun 2026, 10,000 invitations (AHC Lawyers https://www.ahclawyers.com/news-articles/26/06/25/skillselect-invitation-round-results-subclass-189-4-june-2026, secondary). 15 Oct 2026 round reported by IDP with official totals "not yet published" (Low).
- TAS 2026-27: 1,250 (190) + 800 (491), ROIs opened 17 Aug 2026 (BAL, secondary).
- No Power BI / Tableau Public dashboards found for Home Affairs or states.
- 2020 FOI thread: dashboard intended for two-filter pairs (our engine access returns full cubes; masked measure still applied).

## Gaps
Processing-times data URL; other Qlik apps; direct PDF tests; VIC page; 2025-26 Migration Program report status.
