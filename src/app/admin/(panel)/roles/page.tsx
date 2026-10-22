import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { DeleteForm } from '@/components/admin/ConfirmButton';
import { Flash, PageHead, type SP } from '@/components/admin/ui';
import { SUPER_ADMIN_ROLE, USER_MODEL_TYPE, requirePermission } from '@/lib/auth';
import { execute, query, queryOne } from '@/lib/db';
import { done, fail, intOrNull } from '@/lib/form';

async function deleteRole(fd: FormData) {
  'use server';
  await requirePermission('manage roles');
  const id = intOrNull(fd, 'id');
  const role = id ? await queryOne<{ name: string }>('SELECT name FROM roles WHERE id = ?', [id]) : null;
  if (role?.name === SUPER_ADMIN_ROLE) fail('/admin/roles', 'The super admin role cannot be deleted');
  if (id) await execute('DELETE FROM roles WHERE id = ?', [id]);
  revalidatePath('/admin/roles');
  done('/admin/roles', 'Role deleted.');
}

export default async function RolesPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage roles');
  const sp = await searchParams;
  const rows = await query<{ id: number; name: string; perms: number; users: number }>(
    `SELECT r.id, r.name,
            (SELECT COUNT(*) FROM role_has_permissions rp WHERE rp.role_id = r.id) AS perms,
            (SELECT COUNT(*) FROM model_has_roles mr WHERE mr.role_id = r.id AND mr.model_type = ?) AS users
       FROM roles r ORDER BY r.name`,
    [USER_MODEL_TYPE],
  );
  return (
    <>
      <PageHead
        title="Roles"
        sub={`"${SUPER_ADMIN_ROLE}" always has every permission.`}
        actions={
          <Link className="btn btn-primary" href="/admin/roles/new">
            + Add role
          </Link>
        }
      />
      <Flash sp={sp} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Permissions</th>
              <th>Users</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name}</strong>
                </td>
                <td>{r.name === SUPER_ADMIN_ROLE ? 'All' : r.perms}</td>
                <td>{r.users}</td>
                <td className="actions">
                  <Link className="btn btn-sm" href={`/admin/roles/${r.id}`}>
                    Edit
                  </Link>
                  {r.name !== SUPER_ADMIN_ROLE ? <DeleteForm action={deleteRole} id={r.id} message={`Delete role ${r.name}?`} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
