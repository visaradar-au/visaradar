# Visual design lane brief (queued 2026-11-07)

Request: "make ui attractive too". Today the site is clean and trustworthy, but plain: a
default-looking blue, a light grey page, flat cards. Goal: a distinctive, polished product
people want to share, without losing the calm, data-first trust.

## Direction
- Brand: a memorable identity for "VisaRadar". A radar or sweep motif in the logo and on the
  home hero, used sparingly. A confident colour palette (not default Bootstrap blue) with an
  accent for "invited" moments. Refined type pairing (keep the serif display + clean sans if
  it tests well). All values live in `src/styles/tokens.css`. Light and dark.
- Home hero: a striking first screen. A headline with a live-feeling "as at" stamp, the map
  as the hero visual, and 3 to 4 headline stat tiles: 189 invited this month, the state with
  the biggest invited jump, the latest news date, a link to the latest round. Every number is
  sourced from `data/` and carries its date.
- Map: richer styling (a subtle relief or shadow, smooth hover states, an animated metric
  switch, a better ACT inset), still with an accessible table.
- Cards, tables, charts: consistent elevation, radii and spacing scale. Charts get gradients
  or area fills, cleaner axes and hover callouts.
- Micro-interactions: tasteful transitions (respect `prefers-reduced-motion`), and skeletons
  instead of jumps.
- State pages: a coloured header band per state, with the program status as a prominent pill.
- Occupation pages: a "snapshot" summary strip at the top.
- News: source logos as neutral monograms (no government logos), tag chips, a sticky filter bar.
- Mobile first: bottom-friendly navigation, large tap targets.

## Must keep
- Every figure shows "as at" and its source. Nothing implies migration advice or predictions.
- AA contrast in both themes. The axe e2e suite must pass. Keyboard access everywhere.
- Performance: JS islands stay small, with no heavy animation libraries (CSS first; a tiny
  vanilla script at most). Home page under about 60 KB gzipped.
- No government logos or crests. It must not look like an official government site.

## Process
- Use the `ui:deck-radar` skill once for the hero and stat-tile pattern, then `ui:deck-design`
  to build it, then `ui:deck-review` as the ship gate. The `build-awwwards-quality-sites` and
  `beautiful-shadows` skills are available for polish ideas; take only what fits a calm data
  product.
- Before and after screenshots (desktop and mobile) of home, a state, an occupation and /me,
  saved in `docs/screenshots/` (replacing the old ones). Use the made-up persona: 233512, visa
  491, SA, 80 points.
- Run `npm run check`, `test:unit`, `test:e2e` (including axe) and `build`. All must pass.
