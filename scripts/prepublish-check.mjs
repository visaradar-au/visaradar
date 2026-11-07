// Run before the first push to a public repo: `node scripts/prepublish-check.mjs`.
// Scans tracked files for secrets, personal identifiers and leftovers. Exits 1 on any hit.
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const SKIP = [/^package-lock\.json$/, /\.(png|jpg|jpeg|gif|webp|ico|docx|pdf|woff2?)$/i];

const CHECKS = [
  { name: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: 'AWS key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Slack/Google token', re: /\b(xox[abp]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35})\b/ },
  // Built from parts so this file doesn't match its own patterns.
  { name: 'Qlik session ticket', re: new RegExp(['qlik', 'Ticket='].join('') + '|X-Qlik-Session-[a-z]+=[A-Za-z0-9-]{20,}') },
  { name: 'unmasked Qlik measure', re: new RegExp(['cab884b7', 'bf50-450f-9dd3', '9e790051a719'].join('-')) },
  { name: 'SkillSelect EOI id', re: /\bE00\d{8}\b/ },
  { name: 'Australian phone number', re: /\b04\d{2}[ -]?\d{3}[ -]?\d{3}\b/ },
  { name: 'personal email address', re: /\b[A-Za-z0-9._%+-]+@(gmail|outlook|hotmail|yahoo|icloud)\.com\b/i },
  { name: 'absolute home path', re: /\/Users\/[a-z0-9_-]+\//i },
];
// Extra words to block, e.g. a maintainer's name: VR_BLOCK="name1,name2" node scripts/prepublish-check.mjs
const extra = (process.env.VR_BLOCK ?? '').split(',').map((s) => s.trim()).filter(Boolean);
for (const w of extra) CHECKS.push({ name: `blocked word "${w}"`, re: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });

let hits = 0;
for (const f of files) {
  if (SKIP.some((r) => r.test(f))) continue;
  if (statSync(f).size > 5_000_000) { console.log(`LARGE  ${f}`); continue; }
  const text = readFileSync(f, 'utf8');
  const lines = text.split('\n');
  for (const c of CHECKS) {
    lines.forEach((line, i) => {
      if (c.re.test(line)) { hits++; console.log(`HIT    ${c.name}: ${f}:${i + 1}`); }
    });
  }
}
console.log(hits ? `\n${hits} hit(s). Fix before publishing.` : 'Clean: no secrets or personal identifiers found.');
process.exit(hits ? 1 : 0);
