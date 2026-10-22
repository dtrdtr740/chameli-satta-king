import { saveTodayResults } from './actions';
import { TodayGrid } from './TodayGrid';
import { Flash, PageHead, one, type SP } from '@/components/admin/ui';
import { assignedGameIds, requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';
import { DATE_RE } from '@/lib/form';
import { DAY_MS, formatTime12, istDate } from '@/lib/time';

export default async function TodayUpdatePage({ searchParams }: { searchParams: SP }) {
  const user = await requirePermission('update today results');
  const sp = await searchParams;
  const raw = one(sp.date);
  const date = raw && DATE_RE.test(raw) ? raw : istDate();
  const allowed = await assignedGameIds(user);

  const games = (
    await query<{ id: number; name: string; result_time: string | null; default_show_minutes: number }>(
      'SELECT id, name, result_time, default_show_minutes FROM games WHERE is_active = 1 ORDER BY sort_order, id',
    )
  ).filter((g) => allowed === 'all' || allowed.has(g.id));
  const existing = await query<{ game_id: number; result: string | null; status: string; show_minutes: number }>(
    'SELECT game_id, result, status, show_minutes FROM game_results WHERE result_date = ?',
    [date],
  );
  const byGame = new Map(existing.map((r) => [r.game_id, r]));
  const today = istDate();
  const yesterday = istDate(Date.now() - DAY_MS);

  return (
    <>
      <PageHead
        title="Today Result Update"
        sub="Type the number and press Enter to jump to the next game. A filled result is saved as Declared."
      />
      <Flash sp={sp} />

      <form className="filters" method="get">
        <div className="field">
          <label htmlFor="date">Result date</label>
          <input id="date" className="input" type="date" name="date" defaultValue={date} />
        </div>
        <button className="btn" type="submit">
          Load
        </button>
        <a className="btn" href={`/admin/today-update?date=${today}`}>
          Today
        </a>
        <a className="btn" href={`/admin/today-update?date=${yesterday}`}>
          Yesterday
        </a>
      </form>

      {games.length === 0 ? (
        <div className="card empty">
          {allowed === 'all' ? 'No active games.' : 'No games are assigned to you. Ask an admin to assign games.'}
        </div>
      ) : (
        <form action={saveTodayResults}>
          <input type="hidden" name="result_date" value={date} />
          <TodayGrid
            rows={games.map((g) => {
              const r = byGame.get(g.id);
              return {
                id: g.id,
                name: g.name,
                time: formatTime12(g.result_time),
                result: r?.result ?? '',
                status: r?.status === 'declared' ? 'declared' : 'waiting',
                mins: r?.show_minutes || g.default_show_minutes || 15,
                existed: !!r,
              };
            })}
          />
          <div className="sticky-save">
            <button className="btn btn-primary" type="submit">
              💾 Save all results for {date}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
