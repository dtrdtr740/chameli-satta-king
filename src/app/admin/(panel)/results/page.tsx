import Link from 'next/link';
import { deleteResult } from './actions';
import { DeleteForm } from '@/components/admin/ConfirmButton';
import { Flash, PageHead, Pager, one, pageNum, type SP } from '@/components/admin/ui';
import { assignedGameIds, gameScope, requirePermission } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { DATE_RE } from '@/lib/form';

const PER_PAGE = 30;

export default async function ResultsPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePermission('manage game results');
  const sp = await searchParams;
  const page = pageNum(sp.page);
  const gameId = Number(one(sp.game)) || null;
  const from = one(sp.from);
  const to = one(sp.to);
  const allowed = await assignedGameIds(user);
  const rScope = gameScope(allowed, 'r.game_id');
  const gScope = gameScope(allowed, 'id');

  // Only the user's assigned games (all for super admins).
  const where: string[] = [rScope.sql];
  const params: unknown[] = [...rScope.params];
  if (gameId) {
    where.push('r.game_id = ?');
    params.push(gameId);
  }
  if (from && DATE_RE.test(from)) {
    where.push('r.result_date >= ?');
    params.push(from);
  }
  if (to && DATE_RE.test(to)) {
    where.push('r.result_date <= ?');
    params.push(to);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [games, total, rows] = await Promise.all([
    query<{ id: number; name: string }>(`SELECT id, name FROM games WHERE ${gScope.sql} ORDER BY sort_order, id`, gScope.params),
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM game_results r ${w}`, params),
    query<{ id: number; name: string; result_date: string; result: string | null; status: string; show_minutes: number; updated_at: string }>(
      `SELECT r.id, g.name, r.result_date, r.result, r.status, r.show_minutes, r.updated_at
         FROM game_results r JOIN games g ON g.id = r.game_id ${w}
        ORDER BY r.result_date DESC, g.sort_order LIMIT ? OFFSET ?`,
      [...params, PER_PAGE, (page - 1) * PER_PAGE],
    ),
  ]);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PER_PAGE));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (gameId) u.set('game', String(gameId));
    if (from) u.set('from', from);
    if (to) u.set('to', to);
    u.set('page', String(p));
    return `/admin/results?${u}`;
  };

  return (
    <>
      <PageHead
        title="Game Results"
        sub={`${total?.n ?? 0} results`}
        actions={
          <Link className="btn btn-primary" href="/admin/results/new">
            + Add result
          </Link>
        }
      />
      <Flash sp={sp} />
      <form className="filters" method="get">
        <div className="field">
          <label htmlFor="game">Game</label>
          <select id="game" name="game" className="select" defaultValue={gameId ?? ''}>
            <option value="">All games</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="from">From</label>
          <input id="from" type="date" name="from" className="input" defaultValue={from} />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <input id="to" type="date" name="to" className="input" defaultValue={to} />
        </div>
        <button className="btn" type="submit">
          Filter
        </button>
        <Link className="btn" href="/admin/results">
          Reset
        </Link>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Game</th>
              <th>Result</th>
              <th>Status</th>
              <th>Live min</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  No results found.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.result_date}</td>
                  <td>{r.name}</td>
                  <td>
                    <b>{r.result || '—'}</b>
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'declared' ? 'ok' : 'wait'}`}>{r.status}</span>
                  </td>
                  <td>{r.show_minutes}</td>
                  <td className="muted">{r.updated_at}</td>
                  <td className="actions">
                    <Link className="btn btn-sm" href={`/admin/results/${r.id}`}>
                      Edit
                    </Link>
                    <DeleteForm action={deleteResult} id={r.id} message={`Delete ${r.name} result for ${r.result_date}?`} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} href={qs} />
    </>
  );
}
