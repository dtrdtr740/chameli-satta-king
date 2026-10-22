import { revalidatePath } from 'next/cache';
import { Flash, PageHead, one, type SP } from '@/components/admin/ui';
import { SUPER_ADMIN_ROLE, USER_MODEL_TYPE, requirePermission } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { done, fail, idList, intOrNull } from '@/lib/form';

async function saveUserPermissions(fd: FormData) {
  'use server';
  await requirePermission('manage permissions');
  const userId = intOrNull(fd, 'user_id');
  if (!userId) fail('/admin/user-permissions', 'Choose a user');
  const permissionIds = idList(fd, 'permission_ids');
  await transaction(async (conn) => {
    await conn.query('DELETE FROM model_has_permissions WHERE model_id = ? AND model_type = ?', [userId, USER_MODEL_TYPE]);
    for (const pid of permissionIds) {
      await conn.query('INSERT INTO model_has_permissions (permission_id, model_type, model_id) VALUES (?, ?, ?)', [pid, USER_MODEL_TYPE, userId]);
    }
  });
  revalidatePath('/admin', 'layout');
  done(`/admin/user-permissions?user_id=${userId}`, 'User permissions saved.');
}

export default async function UserPermissionsPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage permissions');
  const sp = await searchParams;
  const userId = Number(one(sp.user_id)) || null;

  const [users, perms, direct, viaRoles, roles] = await Promise.all([
    query<{ id: number; name: string; email: string }>('SELECT id, name, email FROM users ORDER BY name'),
    query<{ id: number; name: string }>("SELECT id, name FROM permissions WHERE guard_name = 'web' ORDER BY name"),
    userId
      ? query<{ permission_id: number }>('SELECT permission_id FROM model_has_permissions WHERE model_id = ? AND model_type = ?', [userId, USER_MODEL_TYPE])
      : Promise.resolve([]),
    userId
      ? query<{ permission_id: number; role: string }>(
          `SELECT rp.permission_id, r.name AS role FROM role_has_permissions rp
             JOIN roles r ON r.id = rp.role_id
             JOIN model_has_roles mr ON mr.role_id = r.id
            WHERE mr.model_id = ? AND mr.model_type = ?`,
          [userId, USER_MODEL_TYPE],
        )
      : Promise.resolve([]),
    userId
      ? query<{ name: string }>(
          'SELECT r.name FROM roles r JOIN model_has_roles mr ON mr.role_id = r.id WHERE mr.model_id = ? AND mr.model_type = ?',
          [userId, USER_MODEL_TYPE],
        )
      : Promise.resolve([]),
  ]);
  const directSet = new Set(direct.map((d) => d.permission_id));
  const fromRole = new Map<number, string[]>();
  for (const v of viaRoles) fromRole.set(v.permission_id, [...(fromRole.get(v.permission_id) ?? []), v.role]);
  const isSuper = roles.some((r) => r.name === SUPER_ADMIN_ROLE);

  return (
    <>
      <PageHead
        title="User Permissions"
        sub="Give permissions to one user, on top of whatever their roles give them."
      />
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
        <form action={saveUserPermissions} className="card">
          <input type="hidden" name="user_id" value={userId} />
          <p className="muted" style={{ marginTop: 0 }}>
            Roles: <strong>{roles.length ? roles.map((r) => r.name).join(', ') : 'none'}</strong>
            {isSuper ? ` — a ${SUPER_ADMIN_ROLE} already has every permission.` : ''}
          </p>
          <div className="check-grid">
            {perms.map((p) => {
              const roleNames = fromRole.get(p.id);
              return (
                <label key={p.id}>
                  <input type="checkbox" name="permission_ids" value={p.id} defaultChecked={directSet.has(p.id)} />
                  <span>
                    {p.name}
                    {roleNames ? <small className="muted" style={{ display: 'block' }}>already from role: {roleNames.join(', ')}</small> : null}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              Save user permissions
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}
