'use server';

import { revalidatePath } from 'next/cache';
import { USER_MODEL_TYPE, hashPassword, requirePermission } from '@/lib/auth';
import { execute, transaction } from '@/lib/db';
import { done, fail, idList, intOrNull, isDuplicate, str } from '@/lib/form';

const P = 'manage users';

export async function saveUser(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  const back = `/admin/users/${id ?? 'new'}`;
  const name = str(fd, 'name');
  const email = str(fd, 'email').toLowerCase();
  const password = str(fd, 'password');
  const roleIds = idList(fd, 'role_ids');
  const permissionIds = idList(fd, 'permission_ids');
  if (!name) fail(back, 'Name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(back, 'Enter a valid email');
  if (!id && password.length < 8) fail(back, 'Password must be at least 8 characters');
  if (id && password && password.length < 8) fail(back, 'Password must be at least 8 characters');

  try {
    await transaction(async (conn) => {
      let userId = id;
      if (id) {
        await conn.query('UPDATE users SET name=?, email=?, updated_at=NOW() WHERE id=?', [name, email, id]);
        if (password) await conn.query('UPDATE users SET password=? WHERE id=?', [await hashPassword(password), id]);
      } else {
        const [res] = await conn.query('INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', [
          name,
          email,
          await hashPassword(password),
        ]);
        userId = (res as { insertId: number }).insertId;
      }
      await conn.query('DELETE FROM model_has_roles WHERE model_id = ? AND model_type = ?', [userId, USER_MODEL_TYPE]);
      for (const rid of roleIds) {
        await conn.query('INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, ?, ?)', [rid, USER_MODEL_TYPE, userId]);
      }
      // Direct (per-user) permissions, on top of what the roles give.
      await conn.query('DELETE FROM model_has_permissions WHERE model_id = ? AND model_type = ?', [userId, USER_MODEL_TYPE]);
      for (const pid of permissionIds) {
        await conn.query('INSERT INTO model_has_permissions (permission_id, model_type, model_id) VALUES (?, ?, ?)', [pid, USER_MODEL_TYPE, userId]);
      }
    });
  } catch (e) {
    if (isDuplicate(e)) fail(back, 'That email is already used');
    throw e;
  }
  revalidatePath('/admin/users');
  done('/admin/users', 'User saved.');
}

export async function deleteUser(fd: FormData) {
  const me = await requirePermission(P);
  const id = intOrNull(fd, 'id');
  if (id === me.id) fail('/admin/users', "You can't delete your own account");
  if (id) {
    await execute('DELETE FROM model_has_roles WHERE model_id = ? AND model_type = ?', [id, USER_MODEL_TYPE]);
    await execute('DELETE FROM model_has_permissions WHERE model_id = ? AND model_type = ?', [id, USER_MODEL_TYPE]);
    await execute('DELETE FROM users WHERE id = ?', [id]);
  }
  revalidatePath('/admin/users');
  done('/admin/users', 'User deleted.');
}
