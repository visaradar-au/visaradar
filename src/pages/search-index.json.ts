import type { APIRoute } from 'astro';
import { buildSearchIndex } from '../lib/data/search-index';

// Loaded by the search palette on first open, never bundled into pages.
export const GET: APIRoute = () => new Response(JSON.stringify(buildSearchIndex()), { headers: { 'Content-Type': 'application/json' } });
