import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { query, queryOne, transaction } from '@/lib/db';
import { done, fail, idList, intOrNull, isDuplicate, str } from '@/lib/form';

async function saveRole(fd: FormData) {
  'use server';
  await requirePermission('manage roles');
  const id = intOrNull(fd, 'id');
  const back = `/admin/roles/${id ?? 'new'}`;
  const name = str(fd, 'name');
  if (!name) fail(back, 'Name is required');
  const permIds = idList(fd, 'permission_ids');
  try {
    await transaction(async (conn) => {
      let roleId = id;
      if (id) {
        await conn.query('UPDATE roles SET name=?, updated_at=NOW() WHERE id=?', [name, id]);
      } else {
        const [res] = await conn.query("INSERT INTO roles (name, guard_name, created_at, updated_at) VALUES (?, 'web', NOW(), NOW())", [name]);
        roleId = (res as { insertId: number }).insertId;
      }
      await conn.query('DELETE FROM role_has_permissions WHERE role_id = ?', [roleId]);
      for (const pid of permIds) await conn.query('INSERT INTO role_has_permissions (permission_id, role_id) VALUES (?, ?)', [pid, roleId]);
    });
  } catch (e) {
    if (isDuplicate(e)) fail(back, 'A role with that name already exists');
    throw e;
  }
  revalidatePath('/admin', 'layout');
  done('/admin/roles', 'Role saved.');
}

export default async function RoleForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requirePermission('manage roles');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const role = id === 'new' ? null : await queryOne<{ id: number; name: string }>('SELECT id, name FROM roles WHERE id = ?', [Number(id)]);
  if (id !== 'new' && !role) notFound();
  const [perms, mine] = await Promise.all([
    query<{ id: number; name: string }>("SELECT id, name FROM permissions WHERE guard_name = 'web' ORDER BY name"),
    role ? query<{ permission_id: number }>('SELECT permission_id FROM role_has_permissions WHERE role_id = ?', [role.id]) : Promise.resolve([]),
  ]);
  const has = new Set(mine.map((m) => m.permission_id));

  return (
    <>
      <PageHead title={role ? `Edit role: ${role.name}` : 'Add role'} />
      <Flash sp={sp} />
      <form action={saveRole} className="card">
        {role ? <input type="hidden" name="id" value={role.id} /> : null}
        <div style={{ maxWidth: 360 }}>
          <Field label="Role name" htmlFor="name">
            <input id="name" name="name" className="input" required defaultValue={role?.name} />
          </Field>
        </div>
        <h2 style={{ marginTop: 16 }}>Permissions</h2>
        <div className="check-grid">
          {perms.map((p) => (
            <label key={p.id}>
              <input type="checkbox" name="permission_ids" value={p.id} defaultChecked={has.has(p.id)} /> {p.name}
            </label>
          ))}
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <Link className="btn" href="/admin/roles">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
