import { getActiveGames, getGameYears } from '@/lib/results';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [games, years] = await Promise.all([getActiveGames(), getGameYears()]);
  return Response.json(
    {
      success: true,
      games: games.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        result_time: g.result_time,
        sort_order: g.sort_order,
        chart_years: (years.get(g.id) ?? []).map((year) => ({ year })),
      })),
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}
