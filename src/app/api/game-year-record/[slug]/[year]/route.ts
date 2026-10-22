import { query } from '@/lib/db';
import { getGameBySlug } from '@/lib/results';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; year: string }> }) {
  const { slug, year: rawYear } = await params;
  const year = Number(rawYear);
  const game = await getGameBySlug(slug);
  if (!game || !Number.isInteger(year)) {
    return Response.json({ success: false, message: 'Game not found' }, { status: 404 });
  }
  const results = await query<{ result_date: string; result: string | null; status: string }>(
    `SELECT result_date, result, status FROM game_results
      WHERE game_id = ? AND result_date BETWEEN ? AND ? ORDER BY result_date`,
    [game.id, `${year}-01-01`, `${year}-12-31`],
  );
  return Response.json(
    {
      success: true,
      game: { id: game.id, name: game.name, slug: game.slug, result_time: game.result_time },
      year,
      results,
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}
