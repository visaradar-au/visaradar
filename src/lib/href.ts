// Build an internal link that respects the configured base path.
export function href(path = '/'): string {
  const base = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}` || '/';
}
