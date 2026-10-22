import Link from 'next/link';
import { deleteUser } from './actions';
import { DeleteForm } from '@/components/admin/ConfirmButton';
import { Flash, PageHead, type SP } from '@/components/admin/ui';
import { SUPER_ADMIN_ROLE, USER_MODEL_TYPE, requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  const me = await requirePermission('manage users');
  const sp = await searchParams;
  const [users, grants] = await Promise.all([
    query<{ id: number; name: string; email: string; roles: string | null; games: number; created_at: string }>(
      `SELECT u.id, u.name, u.email, u.created_at,
              (SELECT GROUP_CONCAT(r.name SEPARATOR ', ') FROM model_has_roles mr JOIN roles r ON r.id = mr.role_id
                WHERE mr.model_id = u.id AND mr.model_type = ?) AS roles,
              (SELECT COUNT(*) FROM game_user gu WHERE gu.user_id = u.id) AS games
         FROM users u ORDER BY u.name`,
      [USER_MODEL_TYPE],
    ),
    // Role + direct permissions per user. Counted in JS: MariaDB (Hostinger) doesn't allow the outer
    // user id inside a derived table, which the single-query version needed.
    query<{ uid: number; pid: number }>(
      `SELECT mr.model_id AS uid, rp.permission_id AS pid FROM model_has_roles mr
         JOIN role_has_permissions rp ON rp.role_id = mr.role_id WHERE mr.model_type = ?
       UNION
       SELECT mp.model_id, mp.permission_id FROM model_has_permissions mp WHERE mp.model_type = ?`,
      [USER_MODEL_TYPE, USER_MODEL_TYPE],
    ),
  ]);
  const permCount = new Map<number, number>();
  for (const g of grants) permCount.set(g.uid, (permCount.get(g.uid) ?? 0) + 1);
  const rows = users.map((u) => ({ ...u, perms: permCount.get(u.id) ?? 0 }));
  return (
    <>
      <PageHead
        title="Users"
        actions={
          <Link className="btn btn-primary" href="/admin/users/new">
            + Add user
          </Link>
        }
      />
      <Flash sp={sp} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Permissions</th>
              <th>Assigned games</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                </td>
                <td>{u.email}</td>
                <td>{u.roles ?? <span className="muted">none</span>}</td>
                <td>
                  {u.roles?.split(', ').includes(SUPER_ADMIN_ROLE) ? (
                    'All'
                  ) : u.perms > 0 ? (
                    u.perms
                  ) : (
                    <span className="badge off">None – can&apos;t open anything</span>
                  )}
                </td>
                <td>
                  <Link href={`/admin/assign-games?user_id=${u.id}`}>{u.games}</Link>
                </td>
                <td className="actions">
                  <Link className="btn btn-sm" href={`/admin/user-permissions?user_id=${u.id}`}>
                    Permissions
                  </Link>
                  <Link className="btn btn-sm" href={`/admin/users/${u.id}`}>
                    Edit
                  </Link>
                  {u.id !== me.id ? <DeleteForm action={deleteUser} id={u.id} message={`Delete ${u.name}?`} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
