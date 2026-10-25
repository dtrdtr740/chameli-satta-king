import { assignedGameIds, can, canUseGame, getCurrentUser } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { buildTemplate } from '@/lib/resultImport';
import { istYear } from '@/lib/time';

// GET /admin/results/import/template?game=<id>&year=<yyyy> — year chart .xlsx with the saved results filled in.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user, 'manage game results')) return new Response('Not allowed', { status: 403 });
  const url = new URL(req.url);
  const gameId = Number(url.searchParams.get('game'));
  const year = Number(url.searchParams.get('year')) || istYear();
  if (!Number.isInteger(year) || year < 2000 || year > istYear()) return new Response('Invalid year', { status: 400 });
  if (!canUseGame(await assignedGameIds(user), gameId)) return new Response('Not allowed', { status: 403 });
  const game = await queryOne<{ name: string; slug: string }>('SELECT name, slug FROM games WHERE id = ?', [gameId]);
  if (!game) return new Response('Game not found', { status: 404 });

  const rows = await query<{ result_date: string; result: string }>(
    `SELECT result_date, result FROM game_results
      WHERE game_id = ? AND result_date BETWEEN ? AND ? AND status = 'declared' AND result IS NOT NULL AND result <> ''`,
    [gameId, `${year}-01-01`, `${year}-12-31`],
  );
  const existing = Object.fromEntries(rows.map((r) => [r.result_date, r.result.padStart(2, '0')]));
  const file = await buildTemplate(game.name, year, existing);
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${game.slug}-${year}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
