import type { APIRoute } from 'astro';
import { getOccupations } from '../../lib/data/eoi';

// Small list for occupation pickers: [[code, name], ...]
export const GET: APIRoute = () =>
  new Response(JSON.stringify(getOccupations().map((o) => [o.code, o.name])), {
    headers: { 'Content-Type': 'application/json' },
  });
