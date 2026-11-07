import type { APIRoute, GetStaticPaths } from 'astro';
import { getHistory, getMeta, getOccupation, getOccupations } from '../../../lib/data/eoi';

export const getStaticPaths: GetStaticPaths = () => getOccupations().map((o) => ({ params: { code: o.code } }));

// One occupation's pool and 13-month history, fetched on demand by interactive views.
export const GET: APIRoute = ({ params }) => {
  const code = params.code!;
  const occ = getOccupation(code);
  const meta = getMeta();
  const body = {
    code,
    name: occ?.name ?? '',
    asAt: occ?.asAt ?? meta.latestMonth,
    months: meta.months,
    rows: occ?.rows ?? [],
    history: getHistory(code).rows,
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
};
