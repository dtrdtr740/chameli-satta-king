import Link from 'next/link';
import { deleteUser } from './actions';
import { DeleteForm } from '@/components/admin/ConfirmButton';
import { Flash, PageHead, type SP } from '@/components/admin/ui';
import { SUPER_ADMIN_ROLE, USER_MODEL_TYPE, requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function UsersPage({ searchParams }: { searchParams: SP }) {
  const me = await requirePermission('manage users');
  const sp = await searchParams;
  const rows = await query<{ id: number; name: string; email: string; roles: string | null; games: number; perms: number; created_at: string }>(
    `SELECT u.id, u.name, u.email, u.created_at,
            (SELECT GROUP_CONCAT(r.name SEPARATOR ', ') FROM model_has_roles mr JOIN roles r ON r.id = mr.role_id
              WHERE mr.model_id = u.id AND mr.model_type = ?) AS roles,
            (SELECT COUNT(*) FROM game_user gu WHERE gu.user_id = u.id) AS games,
            (SELECT COUNT(*) FROM (
               SELECT rp.permission_id FROM role_has_permissions rp JOIN model_has_roles mr ON mr.role_id = rp.role_id
                WHERE mr.model_id = u.id AND mr.model_type = ?
               UNION
               SELECT mp.permission_id FROM model_has_permissions mp WHERE mp.model_id = u.id AND mp.model_type = ?
             ) p) AS perms
       FROM users u ORDER BY u.name`,
    [USER_MODEL_TYPE, USER_MODEL_TYPE, USER_MODEL_TYPE],
  );
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
