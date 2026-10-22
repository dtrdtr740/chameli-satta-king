import { getHomeData } from '@/lib/results';

export const dynamic = 'force-dynamic';

// GET /api/home-live-results — the (max 4) games shown in the home page live box.
export async function GET() {
  const now = Date.now();
  const d = await getHomeData(now);
  return Response.json(
    {
      success: true,
      date: d.today,
      time: new Date(now + 330 * 60000).toISOString().slice(11, 19),
      games: d.liveGames.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        result_time: g.result_time,
        sort_order: g.sort_order,
        state: g.state,
        result: {
          result: g.result,
          status: g.state === 'declared' ? 'declared' : 'waiting',
          is_live: g.state === 'declared',
        },
      })),
    },
    { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } },
  );
}
