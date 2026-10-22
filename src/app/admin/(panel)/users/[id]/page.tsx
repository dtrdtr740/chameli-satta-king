import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveUser } from '../actions';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { SUPER_ADMIN_ROLE, USER_MODEL_TYPE, requirePermission } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export default async function UserForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requirePermission('manage users');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = id === 'new' ? null : await queryOne<{ id: number; name: string; email: string }>('SELECT id, name, email FROM users WHERE id = ?', [Number(id)]);
  if (id !== 'new' && !user) notFound();
  const [roles, mine, perms, direct, viaRoles] = await Promise.all([
    query<{ id: number; name: string }>("SELECT id, name FROM roles WHERE guard_name = 'web' ORDER BY name"),
    user ? query<{ role_id: number }>('SELECT role_id FROM model_has_roles WHERE model_id = ? AND model_type = ?', [user.id, USER_MODEL_TYPE]) : Promise.resolve([]),
    query<{ id: number; name: string }>("SELECT id, name FROM permissions WHERE guard_name = 'web' ORDER BY name"),
    user
      ? query<{ permission_id: number }>('SELECT permission_id FROM model_has_permissions WHERE model_id = ? AND model_type = ?', [user.id, USER_MODEL_TYPE])
      : Promise.resolve([]),
    user
      ? query<{ permission_id: number; role: string }>(
          `SELECT rp.permission_id, r.name AS role FROM role_has_permissions rp
             JOIN roles r ON r.id = rp.role_id
             JOIN model_has_roles mr ON mr.role_id = r.id
            WHERE mr.model_id = ? AND mr.model_type = ?`,
          [user.id, USER_MODEL_TYPE],
        )
      : Promise.resolve([]),
  ]);
  const has = new Set(mine.map((m) => m.role_id));
  const directSet = new Set(direct.map((d) => d.permission_id));
  const fromRole = new Map<number, string[]>();
  for (const v of viaRoles) fromRole.set(v.permission_id, [...(fromRole.get(v.permission_id) ?? []), v.role]);
  const isSuper = roles.some((r) => r.name === SUPER_ADMIN_ROLE && has.has(r.id));

  return (
    <>
      <PageHead title={user ? `Edit ${user.name}` : 'Add user'} />
      <Flash sp={sp} />
      <form action={saveUser} className="card">
        {user ? <input type="hidden" name="id" value={user.id} /> : null}
        <div className="grid grid-3">
          <Field label="Name" htmlFor="name">
            <input id="name" name="name" className="input" required defaultValue={user?.name} />
          </Field>
          <Field label="Email" htmlFor="email">
            <input id="email" name="email" type="email" className="input" required defaultValue={user?.email} />
          </Field>
          <Field label={user ? 'New password' : 'Password'} htmlFor="password" hint={user ? 'Leave empty to keep the current password.' : 'At least 8 characters.'}>
            <input id="password" name="password" type="password" className="input" autoComplete="new-password" required={!user} minLength={8} />
          </Field>
        </div>
        <h2 style={{ marginTop: 16 }}>Roles</h2>
        <div className="check-grid">
          {roles.map((r) => (
            <label key={r.id}>
              <input type="checkbox" name="role_ids" value={r.id} defaultChecked={has.has(r.id)} /> {r.name}
            </label>
          ))}
        </div>

        <h2 style={{ marginTop: 16 }}>Permissions</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          {isSuper
            ? `This user is a ${SUPER_ADMIN_ROLE} and already has every permission.`
            : 'Tick extra permissions for this user only. Permissions marked "from role" come from the roles above; change those on the Roles page.'}
        </p>
        <div className="check-grid">
          {perms.map((p) => {
            const roleNames = fromRole.get(p.id);
            return (
              <label key={p.id}>
                <input type="checkbox" name="permission_ids" value={p.id} defaultChecked={directSet.has(p.id)} />
                <span>
                  {p.name}
                  {roleNames ? <small className="muted" style={{ display: 'block' }}>from role: {roleNames.join(', ')}</small> : null}
                </span>
              </label>
            );
          })}
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <Link className="btn" href="/admin/users">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
