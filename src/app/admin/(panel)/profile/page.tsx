import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { checkPassword, hashPassword, requirePermission } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { done, fail, isDuplicate, str } from '@/lib/form';

async function saveProfile(fd: FormData) {
  'use server';
  const me = await requirePermission();
  const name = str(fd, 'name');
  const email = str(fd, 'email').toLowerCase();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('/admin/profile', 'Enter a name and a valid email');
  try {
    await execute('UPDATE users SET name=?, email=?, updated_at=NOW() WHERE id=?', [name, email, me.id]);
  } catch (e) {
    if (isDuplicate(e)) fail('/admin/profile', 'That email is already used');
    throw e;
  }
  done('/admin/profile', 'Profile updated.');
}

async function changePassword(fd: FormData) {
  'use server';
  const me = await requirePermission();
  const current = str(fd, 'current_password');
  const next = str(fd, 'password');
  const row = await queryOne<{ password: string }>('SELECT password FROM users WHERE id = ?', [me.id]);
  if (!row || !(await checkPassword(current, row.password))) fail('/admin/profile', 'Current password is incorrect');
  if (next.length < 8) fail('/admin/profile', 'New password must be at least 8 characters');
  if (next !== str(fd, 'password_confirmation')) fail('/admin/profile', 'Passwords do not match');
  await execute('UPDATE users SET password=?, updated_at=NOW() WHERE id=?', [await hashPassword(next), me.id]);
  done('/admin/profile', 'Password changed.');
}

export default async function ProfilePage({ searchParams }: { searchParams: SP }) {
  const me = await requirePermission();
  const sp = await searchParams;
  return (
    <>
      <PageHead title="My Profile" />
      <Flash sp={sp} />
      <div className="grid grid-2">
        <form action={saveProfile} className="card">
          <h2>Profile</h2>
          <div className="grid">
            <Field label="Name" htmlFor="name">
              <input id="name" name="name" className="input" required defaultValue={me.name} />
            </Field>
            <Field label="Email" htmlFor="email">
              <input id="email" name="email" type="email" className="input" required defaultValue={me.email} />
            </Field>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              Save
            </button>
          </div>
        </form>
        <form action={changePassword} className="card">
          <h2>Change password</h2>
          <div className="grid">
            <Field label="Current password" htmlFor="current_password">
              <input id="current_password" name="current_password" type="password" className="input" required autoComplete="current-password" />
            </Field>
            <Field label="New password" htmlFor="password">
              <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />
            </Field>
            <Field label="Confirm new password" htmlFor="password_confirmation">
              <input id="password_confirmation" name="password_confirmation" type="password" className="input" required autoComplete="new-password" />
            </Field>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              Change password
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
