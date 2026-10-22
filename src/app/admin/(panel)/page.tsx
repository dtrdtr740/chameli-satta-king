import Link from 'next/link';
import { Flash, PageHead, type SP } from '@/components/admin/ui';
import { assignedGameIds, can, gameScope, requirePermission } from '@/lib/auth';
import { MANAGES_SHARED } from '@/lib/site';
import { query, queryOne } from '@/lib/db';
import { DAY_MS, formatTime12, istDate, istToEpoch } from '@/lib/time';

export default async function Dashboard({ searchParams }: { searchParams: SP }) {
  const user = await requirePermission();
  const sp = await searchParams;
  const today = istDate();
  const yesterday = istDate(Date.now() - DAY_MS);

  // Everything on the dashboard is limited to the user's assigned games (all games for super admins).
  const allowed = await assignedGameIds(user);
  const scope = gameScope(allowed, 'game_id');
  const rScope = gameScope(allowed, 'r.game_id');
  const gScope = gameScope(allowed, 'id');
  const [games, declared, total, latest] = await Promise.all([
    query<{ id: number; name: string; result_time: string | null }>(
      `SELECT id, name, result_time FROM games WHERE is_active = 1 AND ${gScope.sql} ORDER BY sort_order, id`,
      gScope.params,
    ),
    query<{ game_id: number; result_date: string }>(
      `SELECT game_id, result_date FROM game_results
        WHERE result_date IN (?, ?) AND status = 'declared' AND result IS NOT NULL AND result <> '' AND ${scope.sql}`,
      [today, yesterday, ...scope.params],
    ),
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM game_results WHERE ${scope.sql}`, scope.params),
    query<{ id: number; name: string; result_date: string; result: string; updated_at: string }>(
      `SELECT r.id, g.name, r.result_date, r.result, r.updated_at FROM game_results r
         JOIN games g ON g.id = r.game_id
        WHERE r.status = 'declared' AND ${rScope.sql} ORDER BY r.updated_at DESC LIMIT 8`,
      rScope.params,
    ),
  ]);
  const declaredToday = new Set(declared.filter((d) => d.result_date === today).map((d) => d.game_id));
  const now = Date.now();
  const overdue = games.filter((g) => g.result_time && !declaredToday.has(g.id) && istToEpoch(today, g.result_time) < now);

  return (
    <>
      <PageHead
        title={`Welcome, ${user.name}`}
        sub={`Today (IST): ${today}`}
        actions={
          can(user, 'update today results') ? (
            <Link className="btn btn-primary" href="/admin/today-update">
              ⚡ Update today&apos;s results
            </Link>
          ) : null
        }
      />
      <Flash sp={sp} />
      {!MANAGES_SHARED ? (
        <div className="flash ok">
          This website shares its games and results with the main site. Add games and update results there; they
          appear here automatically. SEO, page content, blog, ads, WhatsApp sections and settings here are only for
          this website.
        </div>
      ) : null}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="stat">
          <b>{games.length}</b>
          <span>Active games</span>
        </div>
        <div className="stat">
          <b>{declaredToday.size}</b>
          <span>Declared today</span>
        </div>
        <div className="stat">
          <b>{games.length - declaredToday.size}</b>
          <span>Pending today</span>
        </div>
        <div className="stat">
          <b>{total?.n ?? 0}</b>
          <span>Total results stored</span>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Time passed, no result yet</h2>
          {overdue.length === 0 ? (
            <p className="muted">Nothing overdue.</p>
          ) : (
            <table className="table">
              <tbody>
                {overdue.map((g) => (
                  <tr key={g.id}>
                    <td>{g.name}</td>
                    <td className="muted">{formatTime12(g.result_time)}</td>
                    <td>
                      <span className="badge wait">Waiting</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h2>Latest updates</h2>
          {latest.length === 0 ? (
            <p className="muted">No results yet.</p>
          ) : (
            <table className="table">
              <tbody>
                {latest.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="muted">{r.result_date}</td>
                    <td>
                      <b>{r.result}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
