import { revalidatePath } from 'next/cache';
import { Flash, PageHead, one, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { done, fail, idList, intOrNull } from '@/lib/form';

async function saveAssignments(fd: FormData) {
  'use server';
  await requirePermission('assign games to users');
  const userId = intOrNull(fd, 'user_id');
  if (!userId) fail('/admin/assign-games', 'Choose a user');
  const gameIds = idList(fd, 'game_ids');
  await transaction(async (conn) => {
    await conn.query('DELETE FROM game_user WHERE user_id = ?', [userId]);
    for (const gid of gameIds) {
      await conn.query('INSERT INTO game_user (user_id, game_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [userId, gid]);
    }
  });
  revalidatePath('/admin/assign-games');
  done(`/admin/assign-games?user_id=${userId}`, 'User games assigned successfully.');
}

export default async function AssignGamesPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('assign games to users');
  const sp = await searchParams;
  const userId = Number(one(sp.user_id)) || null;
  const [users, games, assigned] = await Promise.all([
    query<{ id: number; name: string; email: string }>('SELECT id, name, email FROM users ORDER BY name'),
    query<{ id: number; name: string }>('SELECT id, name FROM games WHERE is_active = 1 ORDER BY sort_order, id'),
    userId ? query<{ game_id: number }>('SELECT game_id FROM game_user WHERE user_id = ?', [userId]) : Promise.resolve([]),
  ]);
  const set = new Set(assigned.map((a) => a.game_id));

  return (
    <>
      <PageHead title="Assign Games" sub="Users only see their assigned games in Today Result Update. Super admins see all games." />
      <Flash sp={sp} />
      <form className="filters" method="get">
        <div className="field">
          <label htmlFor="user_id">User</label>
          <select id="user_id" name="user_id" className="select" defaultValue={userId ?? ''}>
            <option value="">Choose a user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>
        <button className="btn" type="submit">
          Load
        </button>
      </form>

      {userId ? (
        <form action={saveAssignments} className="card">
          <input type="hidden" name="user_id" value={userId} />
          <div className="check-grid">
            {games.map((g) => (
              <label key={g.id}>
                <input type="checkbox" name="game_ids" value={g.id} defaultChecked={set.has(g.id)} /> {g.name}
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              Save assignments
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}
