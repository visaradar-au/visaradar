// Deterministic ids for Term popovers within one build.
let n = 0;
export function nextTermId(key: string): string {
  n += 1;
  return `term-${key.toLowerCase().replace(/[^a-z0-9]/g, '')}-${n}`;
}
