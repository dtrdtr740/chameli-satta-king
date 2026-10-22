import { revalidatePath } from 'next/cache';
import { DeleteForm } from '@/components/admin/ConfirmButton';
import { Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { execute, query } from '@/lib/db';
import { done, fail, intOrNull, isDuplicate, str } from '@/lib/form';

async function addPermission(fd: FormData) {
  'use server';
  await requirePermission('manage permissions');
  const name = str(fd, 'name');
  if (!name) fail('/admin/permissions', 'Name is required');
  try {
    await execute("INSERT INTO permissions (name, guard_name, created_at, updated_at) VALUES (?, 'web', NOW(), NOW())", [name]);
  } catch (e) {
    if (isDuplicate(e)) fail('/admin/permissions', 'That permission already exists');
    throw e;
  }
  revalidatePath('/admin/permissions');
  done('/admin/permissions', 'Permission added.');
}

async function deletePermission(fd: FormData) {
  'use server';
  await requirePermission('manage permissions');
  const id = intOrNull(fd, 'id');
  if (id) await execute('DELETE FROM permissions WHERE id = ?', [id]);
  revalidatePath('/admin/permissions');
  done('/admin/permissions', 'Permission deleted.');
}

export default async function PermissionsPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage permissions');
  const sp = await searchParams;
  const rows = await query<{ id: number; name: string; roles: string | null }>(
    `SELECT p.id, p.name,
            (SELECT GROUP_CONCAT(r.name SEPARATOR ', ') FROM role_has_permissions rp JOIN roles r ON r.id = rp.role_id WHERE rp.permission_id = p.id) AS roles
       FROM permissions p ORDER BY p.name`,
  );
  return (
    <>
      <PageHead title="Permissions" sub="Give permissions to a role on the Roles page, or to a single user on the User Permissions page." />
      <Flash sp={sp} />
      <form action={addPermission} className="card filters">
        <div className="field">
          <label htmlFor="name">New permission</label>
          <input id="name" name="name" className="input" placeholder="e.g. reports view" required />
        </div>
        <button className="btn btn-primary" type="submit">
          + Add
        </button>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Permission</th>
              <th>Roles</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <code>{p.name}</code>
                </td>
                <td className="muted">{p.roles ?? '—'}</td>
                <td className="actions">
                  <DeleteForm action={deletePermission} id={p.id} message={`Delete permission "${p.name}"?`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
