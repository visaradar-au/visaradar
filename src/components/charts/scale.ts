import { useLayoutEffect, useRef, useState } from 'preact/hooks';

/** Tidy y-axis ticks from 0 to at least `max`. */
export function ticks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 20];
  const raw = max / count;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  const out: number[] = [];
  for (let v = 0; v < max + step; v += step) out.push(Math.round(v));
  return out;
}

export function compact(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/** Arrow keys, Home and End step through `count` items; Escape clears. Returns the new index, or undefined if the key is not ours. */
export function stepKey(key: string, current: number | null, count: number): number | null | undefined {
  if (!count) return undefined;
  if (key === 'ArrowRight' || key === 'ArrowDown') return current === null ? 0 : Math.min(count - 1, current + 1);
  if (key === 'ArrowLeft' || key === 'ArrowUp') return current === null ? count - 1 : Math.max(0, current - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'Escape') return null;
  return undefined;
}

/** Track a container's width so charts draw at 1 unit = 1 CSS pixel and text stays readable. */
export function useWidth(initial = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
