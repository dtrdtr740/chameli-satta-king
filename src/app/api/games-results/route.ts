import { query } from '@/lib/db';
import { getActiveGames, type GameResult } from '@/lib/results';
import { istDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

// GET /api/games-results?date=YYYY-MM-DD — every active game with its result for that date.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get('date');
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : istDate();
  const games = await getActiveGames();
  const results = await query<GameResult>(
    'SELECT id, game_id, result_date, result, status, show_minutes, updated_at FROM game_results WHERE result_date = ?',
    [date],
  );
  const byGame = new Map(results.map((r) => [r.game_id, r]));
  return Response.json({
    success: true,
    date,
    games: games.map((g) => {
      const r = byGame.get(g.id);
      return {
        id: g.id,
        name: g.name,
        slug: g.slug,
        result_time: g.result_time,
        sort_order: g.sort_order,
        is_active: !!g.is_active,
        result: {
          id: r?.id ?? null,
          result_date: r?.result_date ?? date,
          result: r?.result ?? null,
          status: r?.status ?? 'waiting',
          show_minutes: r?.show_minutes || g.default_show_minutes,
          updated_at: r?.updated_at ?? null,
        },
      };
    }),
  });
}
