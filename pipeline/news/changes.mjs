// data/changes.json helper shared by every pipeline step: newest first, capped at 500,
// de-duplicated on kind + url + title.
import { readFile, writeFile } from 'node:fs/promises';

export const CHANGES_CAP = 500;

export function mergeChanges(existing, added) {
  const key = (c) => `${c.kind}|${c.url}|${c.title}`;
  const seen = new Set(existing.map(key));
  const fresh = added.filter((c) => !seen.has(key(c)) && seen.add(key(c)));
  return [...fresh, ...existing]
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, CHANGES_CAP);
}

export async function appendChanges(file, added) {
  if (!added.length) return 0;
  const existing = await readJson(file, []);
  const merged = mergeChanges(existing, added);
  await writeJson(file, merged);
  const before = new Set(existing);
  return merged.filter((c) => !before.has(c)).length;
}

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function writeJson(file, data) {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}
