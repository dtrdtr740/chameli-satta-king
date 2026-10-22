import Link from 'next/link';
import { deleteGame, saveOrder } from './actions';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { Active, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatTime12 } from '@/lib/time';

export default async function GamesPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage games');
  const sp = await searchParams;
  const games = await query<{
    id: number;
    name: string;
    slug: string;
    result_time: string | null;
    is_active: number;
    sort_order: number;
    default_show_minutes: number;
    last_date: string | null;
    last_result: string | null;
  }>(
    `SELECT g.*, lr.result_date AS last_date, lr.result AS last_result
       FROM games g
       LEFT JOIN game_results lr ON lr.id = (
         SELECT id FROM game_results WHERE game_id = g.id AND status = 'declared' ORDER BY result_date DESC LIMIT 1)
      ORDER BY g.sort_order, g.id`,
  );

  return (
    <>
      <PageHead
        title="Games"
        sub="Sort order controls the order on the home page tables and charts."
        actions={
          <Link className="btn btn-primary" href="/admin/games/new">
            + Add game
          </Link>
        }
      />
      <Flash sp={sp} />
      <form action={saveOrder}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Time</th>
                <th>Live (min)</th>
                <th>Latest result</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {games.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    No games yet.
                  </td>
                </tr>
              ) : (
                games.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <input type="hidden" name="ids" value={g.id} />
                      <input
                        className="input"
                        style={{ width: 70 }}
                        type="number"
                        name={`order_${g.id}`}
                        defaultValue={g.sort_order}
                        aria-label={`${g.name} order`}
                      />
                    </td>
                    <td>
                      <strong>{g.name}</strong>
                    </td>
                    <td className="muted">{g.slug}</td>
                    <td>{formatTime12(g.result_time) || '—'}</td>
                    <td>{g.default_show_minutes}</td>
                    <td>{g.last_result ? `${g.last_result} (${g.last_date})` : '—'}</td>
                    <td>
                      <Active on={g.is_active} />
                    </td>
                    <td className="actions">
                      <a className="btn btn-sm" href={`/records/${g.slug}`} target="_blank" rel="noopener">
                        View
                      </a>
                      <Link className="btn btn-sm" href={`/admin/games/${g.id}`}>
                        Edit
                      </Link>
                      <ConfirmButton
                        formAction={deleteGame}
                        name="id"
                        value={g.id}
                        message={`Delete ${g.name}? All of its results will be deleted too.`}
                      >
                        Delete
                      </ConfirmButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {games.length > 0 ? (
          <div className="form-actions">
            <button className="btn" type="submit">
              Save order
            </button>
          </div>
        ) : null}
      </form>
    </>
  );
}
