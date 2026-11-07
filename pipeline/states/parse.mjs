// Pure parsers for state program pages, round data and occupation lists.
// Each takes fetched HTML (or DOCX-converted HTML) and returns plain data. Tested on
// trimmed real fixtures in tests/pipeline/fixtures/states/.
import * as cheerio from 'cheerio';
import { clean, parseAuDate, canonicalUrl } from '../news/util.mjs';

const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const num = (s) => {
  const t = clean(s).replace(/,/g, '');
  return /^\d+$/.test(t) ? Number(t) : null;
};

/** "2026-27" + "Oct" -> "2026-10"; "Jan" -> "2027-01". */
export function programMonth(programYear, mon) {
  const start = Number(programYear.slice(0, 4));
  const i = MONTHS.indexOf(mon);
  const y = i >= 6 ? start + 1 : start;
  const m = ((i + 6) % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- WA

/**
 * WA SNMP page: the "<year> program year — Invitations issued" tables.
 * @returns {{years: Array<{programYear, months: Array<{month, total, v190, v491}>, total, v190, v491}>,
 *   issuedOn: string[]}}
 */
export function parseWaSnmp(html) {
  const $ = cheerio.load(html);
  const years = [];
  let pending = null;
  $('strong, table').each((_, el) => {
    if (el.tagName === 'strong') {
      const m = clean($(el).text()).match(/^(\d{4})\s*[-–—]\s*(\d{2}) program year\s*[-–—]\s*Invitations issued$/i);
      if (m) pending = `${m[1]}-${m[2]}`;
      return;
    }
    if (!pending) return;
    const programYear = pending;
    pending = null;
    const head = $(el).find('thead th, tr').first().find('th, td').map((_, c) => clean($(c).text())).get();
    if (head[0] !== 'Visa type') return;
    const monthCols = head.slice(1, 13).map((h) => h.slice(0, 3));
    const sums = { 190: Array(12).fill(0), 491: Array(12).fill(0) };
    const totals = { 190: 0, 491: 0 };
    let totalRow = null;
    $(el)
      .find('tbody tr')
      .each((_, tr) => {
        const cells = $(tr).find('th, td').map((_, c) => clean($(c).text())).get();
        const label = cells[0];
        if (label === '190' || label === '491') {
          cells.slice(1, 13).forEach((c, i) => (sums[label][i] += num(c) ?? 0));
          totals[label] += num(cells[13]) ?? 0;
        } else if (/^Total to date$/i.test(label)) {
          totalRow = cells;
        }
      });
    const months = [];
    monthCols.forEach((mon, i) => {
      const total = totalRow ? num(totalRow[i + 1]) : null;
      if (total == null) return;
      months.push({ month: programMonth(programYear, mon), total, v190: sums[190][i], v491: sums[491][i] });
    });
    years.push({
      programYear,
      months,
      total: totalRow ? num(totalRow[13]) : null,
      v190: totals[190],
      v491: totals[491],
    });
  });
  const issuedOn = $('p')
    .map((_, p) => clean($(p).text()))
    .get()
    .filter((t) => /were issued on \d{1,2} [A-Z][a-z]+/.test(t));
  return { years, issuedOn };
}

// ---------------------------------------------------------------- ACT

/**
 * ACT round page: each "Canberra Matrix Invitation Round: <date>" section, the
 * tentative schedule and the allocation paragraphs.
 */
export function parseActRoundPage(html) {
  const $ = cheerio.load(html);
  const rounds = [];
  const schedule = [];
  let allocationText = [];
  $('h2').each((_, h) => {
    const title = clean($(h).text());
    if (/schedule/i.test(title)) {
      $(h)
        .next('ul')
        .find('li')
        .each((_, li) => schedule.push(clean($(li).text())));
      return;
    }
    if (/allocation/i.test(title)) {
      allocationText.push(title);
      $(h)
        .nextUntil('h2, h3')
        .each((_, p) => allocationText.push(clean($(p).text())));
      return;
    }
    const date = /invitation round/i.test(title) ? parseAuDate(title) : null;
    if (!date) return;
    const groups = [];
    let section = null;
    $(h)
      .nextUntil('h2, hr')
      .each((_, el) => {
        if (el.tagName === 'h3') section = clean($(el).text());
        if (el.tagName !== 'h4') return;
        const group = clean($(el).text()).replace(/:$/, '');
        const counts = { 190: null, 491: null };
        const minScore = { 190: null, 491: null };
        $(el)
          .next('ul')
          .find('li')
          .each((_, li) => {
            const t = clean($(li).text());
            let m = t.match(/^(190|491) nominations: (\d+) invitation/i);
            if (m) counts[m[1]] = Number(m[2]);
            m = t.match(/^(190|491) minimum matrix score: (\d+)/i);
            if (m) minScore[m[1]] = Number(m[2]);
          });
        if (counts[190] == null && counts[491] == null) return;
        groups.push({ section: /request/i.test(section ?? '') ? null : section, group, counts, minScore });
      });
    const sum = (v) => groups.reduce((a, g) => a + (g.counts[v] ?? 0), 0);
    rounds.push({ date, title, v190: sum(190), v491: sum(491), invitations: sum(190) + sum(491), groups });
  });
  return { rounds, schedule, allocationText };
}

/** ACT library page: absolute URL of the current "Invitation Round Rankings" DOCX. */
export function findActRankingsDocx(html, base) {
  const $ = cheerio.load(html);
  const href = $('a[href$=".docx"]')
    .map((_, a) => $(a).attr('href'))
    .get()
    .find((h) => /Invitation-Round-Rankings/i.test(h));
  return href ? canonicalUrl(href, base) : null;
}

/** "135 (1/10/2026)" -> {score:135, date:"2026-10-01"}; "N/A"/"-"/"" -> null. */
export function parseMatrixCell(text) {
  const t = clean(text);
  const m = t.match(/^(\d+)\s*(?:\(([^)]+)\))?/);
  if (!m) return null;
  return { score: Number(m[1]), date: m[2] ? parseAuDate(m[2]) : null };
}

const ACT_COLS = ['canberra-491', 'canberra-190', 'overseas-491', 'overseas-190'];

/** ACT rankings DOCX (as HTML from mammoth): round date + per unit group minimum Matrix scores. */
export function parseActRankings(html) {
  const $ = cheerio.load(html);
  const title = clean($('table tr').first().text());
  const date = parseAuDate(title);
  const cutoffs = [];
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td').map((_, c) => clean($(c).text())).get();
    if (cells.length < 6 || !/^\d{4}$/.test(cells[0])) return;
    const matrix = {};
    ACT_COLS.forEach((k, i) => (matrix[k] = parseMatrixCell(cells[i + 2])));
    cutoffs.push({ occupation: cells[1], code: cells[0], matrix });
  });
  return { date, title, cutoffs };
}

// ---------------------------------------------------------------- SA

const MONTH_IDX = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** "Invitations on 21 May 2026" -> "2026-05-21"; "Invitations in April 2026" -> "2026-04". */
export function parseDateOrMonth(text) {
  const d = parseAuDate(text);
  if (d) return d;
  const m = clean(text).match(/\b([A-Za-z]{3,9})\s+(\d{4})\b/);
  const mon = m && MONTH_IDX[m[1].toLowerCase().slice(0, 3)];
  return mon ? `${m[2]}-${String(mon).padStart(2, '0')}` : null;
}

/**
 * SA "Invitations issued" post. The table has two column blocks (190 / 491 / Total each).
 * Usually: "Invitations on|in <date>" then "<year> invitations issued (to date)". The
 * Dec 2025 post instead pairs "Interim invitations to 1 November 2025" with
 * "Invitations in December 2025" and has no year-to-date block; the non-round block is
 * kept as `other`.
 */
export function parseSaInvitations(html) {
  const $ = cheerio.load(html);
  const table = $('table').first();
  if (!table.length) return null;
  const labels = table
    .find('tr')
    .first()
    .find('th, td')
    .map((_, c) => clean($(c).text()))
    .get()
    .filter(Boolean);
  if (labels.length < 2) return null;
  const roundIdx = labels.findIndex((l) => /^Invitations (on|in) /i.test(l));
  const ytdIdx = labels.findIndex((l) => /to date/i.test(l));
  if (roundIdx < 0) return null;
  const otherIdx = [0, 1].find((i) => i !== roundIdx && i !== ytdIdx);
  const date = parseDateOrMonth(labels[roundIdx]);
  const programYear = ytdIdx >= 0 ? labels[ytdIdx].match(/(\d{4}-\d{2})/)?.[1] ?? null : null;
  const block = (cells, i) => (i == null || i < 0 ? null : { v190: num(cells[1 + i * 3]), v491: num(cells[2 + i * 3]), total: num(cells[3 + i * 3]) });
  const groups = [];
  let totalCells = null;
  table.find('tr').each((_, tr) => {
    const cells = $(tr).find('th, td').map((_, c) => clean($(c).text())).get();
    if (cells.length < 7) return;
    if (/^Total$/i.test(cells[0])) totalCells = cells;
    else if (/^\d{2}\s/.test(cells[0])) {
      groups.push({ group: cells[0], ...block(cells, roundIdx), ytd: block(cells, ytdIdx) });
    }
  });
  if (!date || !totalCells) return null;
  const other = otherIdx != null ? { label: labels[otherIdx], ...block(totalCells, otherIdx) } : null;
  return { date, roundLabel: labels[roundIdx], programYear, ...block(totalCells, roundIdx), ytd: block(totalCells, ytdIdx), other, groups };
}

/** SA news listing filtered to invitations: URLs of "Invitations issued" posts. */
export function findSaInvitationPosts(html, base) {
  const $ = cheerio.load(html);
  const out = new Set();
  $('a[href*="/news/invitations-issued"]').each((_, a) => out.add(canonicalUrl($(a).attr('href'), base)));
  return [...out];
}

// ---------------------------------------------------------------- occupation lists

/** LIN 19/051 compilation text: {MLTSSL, STSOL, ROL} as ANZSCO codes (sections 8, 9, 10). */
export function parseLin19051(html) {
  const $ = cheerio.load(html);
  const want = { 8: 'MLTSSL', 9: 'STSOL', 10: 'ROL' };
  const lists = {};
  $('p.ActHead5').each((_, h) => {
    const n = clean($(h).text()).match(/^(\d+)\s/)?.[1];
    if (!want[n]) return;
    const table = $(h).nextAll('table').first();
    const codes = [];
    table.find('tr').each((_, tr) => {
      const cells = $(tr).find('td').map((_, c) => clean($(c).text())).get();
      const code = cells.find((c) => /^\d{6}$/.test(c));
      if (code) codes.push(code);
    });
    lists[want[n]] = [...new Set(codes)];
  });
  return lists;
}

/**
 * legislation.gov.au "/latest" page: current compilation id (e.g. F2026C00265) and the
 * URL of its HTML text, so we only fetch the 800 KB text when the compilation changes.
 */
export function parseLegislationLatest(html, base) {
  const $ = cheerio.load(html);
  const compilation = $.root().html().match(/F20\d{2}C\d{5}/)?.[0] ?? null;
  const href = $('a[href*="/text/original/epub/OEBPS/document_1/document_1.html"]').first().attr('href');
  const textUrl = href ? canonicalUrl(href, base) : null;
  const asAt = textUrl?.match(/\/(\d{4}-\d{2}-\d{2})\/\d{4}-\d{2}-\d{2}\/text\//)?.[1] ?? null;
  return { compilation, textUrl, asAt };
}

const tick = (s) => /tick|✓|✔|yes/i.test(s);

/**
 * QLD onshore / offshore list table. Columns: code, occupation, 491, 190, extra.
 * Ticks are text ("tick") in the cells.
 */
export function parseQldList(html) {
  const $ = cheerio.load(html);
  const out = { all: [], 190: [], 491: [] };
  const head = $('table tr').first().find('th, td').map((_, c) => clean($(c).text())).get();
  const i491 = head.findIndex((h) => /491/.test(h));
  const i190 = head.findIndex((h) => /190/.test(h));
  $('table tr')
    .slice(1)
    .each((_, tr) => {
      const cells = $(tr).find('th, td').map((_, c) => clean($(c).text())).get();
      if (!/^\d{6}$/.test(cells[0])) return;
      out.all.push(cells[0]);
      if (i491 >= 0 && tick(cells[i491])) out[491].push(cells[0]);
      if (i190 >= 0 && tick(cells[i190])) out[190].push(cells[0]);
    });
  return out;
}

/** SA occupation list: every data-occupation-anzsco attribute. */
export function parseSaList(html) {
  const $ = cheerio.load(html);
  const codes = $('[data-occupation-anzsco]')
    .map((_, e) => clean($(e).attr('data-occupation-anzsco')))
    .get()
    .filter((c) => /^\d{6}$/.test(c));
  return [...new Set(codes)];
}

/** ACT occupation list page: 6-digit codes, with "(491 Only)" marking 491-only rows. */
export function parseActList(html) {
  const $ = cheerio.load(html);
  const out = { all: [], 190: [], 491: [], asAt: null };
  out.asAt = clean($('table').first().prevAll().filter((_, e) => /Occupation List/i.test($(e).text())).first().text()).match(
    /(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}/,
  )?.[0] ?? null;
  $('table tr').each((_, tr) => {
    const cells = $(tr).find('td').map((_, c) => clean($(c).text())).get();
    const idx = cells.findIndex((c) => /^\d{6}$/.test(c));
    if (idx < 0) return;
    const code = cells[idx];
    const name = cells[idx + 1] ?? '';
    out.all.push(code);
    out[491].push(code);
    if (!/491 only/i.test(name)) out[190].push(code);
  });
  return out;
}

/** NSW skills list: 4-digit ANZSCO unit groups. */
export function parseNswList(html) {
  const $ = cheerio.load(html);
  const codes = [];
  $('table tr').each((_, tr) => {
    const c = clean($(tr).find('td, th').first().text());
    if (/^\d{4}$/.test(c)) codes.push(c);
  });
  return [...new Set(codes)];
}
