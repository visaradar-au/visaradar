// Build-time file access for data/**. Only import from .astro pages and endpoints.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'data');
const cache = new Map<string, unknown>();

/** Read a JSON file under data/. Returns `fallback` if it is missing or unreadable. */
export function readData<T>(path: string, fallback: T): T {
  if (cache.has(path)) return cache.get(path) as T;
  const file = join(ROOT, path);
  let value = fallback;
  if (existsSync(file)) {
    try {
      value = JSON.parse(readFileSync(file, 'utf8')) as T;
    } catch (err) {
      console.warn(`[data] could not parse ${path}: ${(err as Error).message}`);
    }
  }
  cache.set(path, value);
  return value;
}
