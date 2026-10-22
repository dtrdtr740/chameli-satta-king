import { revalidatePath } from 'next/cache';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { Active, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { execute, query } from '@/lib/db';
import { bool, done, fail, intOrNull, isDuplicate } from '@/lib/form';
import { istYear } from '@/lib/time';

const P = 'manage chart years';

async function addYear(fd: FormData) {
  'use server';
  await requirePermission(P);
  const gameId = intOrNull(fd, 'game_id');
  const year = intOrNull(fd, 'year');
  if (!gameId || !year || year < 2000 || year > 2100) fail('/admin/chart-years', 'Choose a game and a year between 2000 and 2100');
  try {
    await execute(
      'INSERT INTO chart_years (game_id, year, is_active, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [gameId, year, bool(fd, 'is_active')],
    );
  } catch (e) {
    if (isDuplicate(e)) fail('/admin/chart-years', 'That game already has this year');
    throw e;
  }
  revalidatePath('/chart');
  done('/admin/chart-years', 'Chart year added.');
}

async function toggleYear(fd: FormData) {
  'use server';
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  if (id) await execute('UPDATE chart_years SET is_active = 1 - is_active, updated_at = NOW() WHERE id = ?', [id]);
  revalidatePath('/chart');
  done('/admin/chart-years', 'Updated.');
}

async function deleteYear(fd: FormData) {
  'use server';
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  if (id) await execute('DELETE FROM chart_years WHERE id = ?', [id]);
  revalidatePath('/chart');
  done('/admin/chart-years', 'Chart year deleted.');
}

export default async function ChartYearsPage({ searchParams }: { searchParams: SP }) {
  await requirePermission(P);
  const sp = await searchParams;
  const [games, rows] = await Promise.all([
    query<{ id: number; name: string }>('SELECT id, name FROM games ORDER BY sort_order, id'),
    query<{ id: number; name: string; year: number; is_active: number }>(
      `SELECT c.id, g.name, c.year, c.is_active FROM chart_years c JOIN games g ON g.id = c.game_id
        ORDER BY g.sort_order, c.year DESC`,
    ),
  ]);

  return (
    <>
      <PageHead
        title="Chart Years"
        sub="Years are listed automatically: the current year plus every year that has results. Use this page only to add a year with no results yet, or set a year Inactive to hide it."
      />
      <Flash sp={sp} />
      <form action={addYear} className="card filters">
        <div className="field">
          <label htmlFor="game_id">Game</label>
          <select id="game_id" name="game_id" className="select" required>
            <option value="">Choose…</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="year">Year</label>
          <input id="year" name="year" type="number" min={2000} max={2100} className="input" defaultValue={istYear() - 1} required />
        </div>
        <label className="check">
          <input type="checkbox" name="is_active" defaultChecked /> Active
        </label>
        <button className="btn btn-primary" type="submit">
          + Add
        </button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Game</th>
              <th>Year</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty">
                  No chart years yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.year}</td>
                  <td>
                    <Active on={r.is_active} />
                  </td>
                  <td className="actions">
                    <form action={toggleYear} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn btn-sm" type="submit">
                        {r.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    <form action={deleteYear} style={{ display: 'inline' }}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton message={`Delete ${r.name} ${r.year}?`}>Delete</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
