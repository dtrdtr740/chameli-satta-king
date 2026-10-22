import { getHomeData } from '@/lib/results';
import { istDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

// GET /api/live-results — every active game with today's (working-date) result and yesterday's.
export async function GET() {
  const now = Date.now();
  const d = await getHomeData(now);
  const liveIds = new Set(d.liveGames.filter((g) => g.state === 'declared').map((g) => g.id));
  const time = new Date(now + 330 * 60000).toISOString().slice(11, 19);
  return Response.json(
    {
      success: true,
      date: istDate(now),
      time,
      games: d.games.map((g) => {
        const t = d.todayTable[g.id];
        return {
          id: g.id,
          name: g.name,
          slug: g.slug,
          result_time: g.result_time,
          sort_order: g.sort_order,
          is_active: !!g.is_active,
          result: {
            id: t?.id ?? null,
            result_date: t?.result_date ?? d.today,
            result: t?.result ?? null,
            status: t ? 'declared' : 'waiting',
            show_minutes: t?.show_minutes ?? g.default_show_minutes,
            updated_at: t?.updated_at ?? null,
            is_live: liveIds.has(g.id),
          },
          yesterday_result: d.yesterdayResults[g.id]?.result ?? null,
        };
      }),
    },
    { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } },
  );
}
