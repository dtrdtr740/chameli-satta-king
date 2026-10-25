import 'server-only';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ensureAuthTables } from './authTables';
import { execute, query, queryOne } from './db';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from './session';
import { MANAGES_SHARED, SHARED_PERMISSIONS } from './site';

// Spatie stores the morph class of the Laravel model.
export const USER_MODEL_TYPE = 'App\\Models\\User';
export const SUPER_ADMIN_ROLE = 'super admin';

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: Set<string>;
  isSuperAdmin: boolean;
};

// Laravel writes $2y$ bcrypt hashes; they are the same algorithm as $2b$.
export async function checkPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash.replace(/^\$2y\$/, '$2b$'));
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function startSession(userId: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Logs out and revokes this token, so a copied cookie stops working too (not just this browser). */
export async function endSession() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (session) {
    await ensureAuthTables();
    await execute('INSERT IGNORE INTO revoked_sessions (jti, expires_at) VALUES (?, ?)', [session.jti, session.exp]);
    await execute('DELETE FROM revoked_sessions WHERE expires_at < ?', [Math.floor(Date.now() / 1000)]);
  }
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  await ensureAuthTables();
  if (await queryOne('SELECT 1 FROM revoked_sessions WHERE jti = ?', [session.jti])) return null;
  const uid = session.uid;
  const user = await queryOne<{ id: number; name: string; email: string }>(
    'SELECT id, name, email FROM users WHERE id = ?',
    [uid],
  );
  if (!user) return null;
  const roles = await query<{ name: string }>(
    `SELECT r.name FROM roles r JOIN model_has_roles mr ON mr.role_id = r.id
      WHERE mr.model_id = ? AND mr.model_type = ?`,
    [uid, USER_MODEL_TYPE],
  );
  const perms = await query<{ name: string }>(
    `SELECT p.name FROM permissions p
       JOIN role_has_permissions rp ON rp.permission_id = p.id
       JOIN model_has_roles mr ON mr.role_id = rp.role_id
      WHERE mr.model_id = ? AND mr.model_type = ?
     UNION
     SELECT p.name FROM permissions p
       JOIN model_has_permissions mp ON mp.permission_id = p.id
      WHERE mp.model_id = ? AND mp.model_type = ?`,
    [uid, USER_MODEL_TYPE, uid, USER_MODEL_TYPE],
  );
  const roleNames = roles.map((r) => r.name);
  return {
    ...user,
    roles: roleNames,
    permissions: new Set(perms.map((p) => p.name)),
    isSuperAdmin: roleNames.includes(SUPER_ADMIN_ROLE),
  };
});

export function can(user: AdminUser | null, permission: string): boolean {
  // Games, results, users and permissions are shared data, managed only on the main site.
  if (!MANAGES_SHARED && SHARED_PERMISSIONS.has(permission)) return false;
  return !!user && (user.isSuperAdmin || user.permissions.has(permission));
}

/** Use at the top of every admin page and server action. */
export async function requirePermission(permission?: string): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  if (permission && !can(user, permission)) redirect('/admin?denied=1');
  return user;
}

/** Game ids a user may see and update in the admin (Admin -> Assign Games). Super admins: all. */
export async function assignedGameIds(user: AdminUser): Promise<Set<number> | 'all'> {
  if (user.isSuperAdmin) return 'all';
  const rows = await query<{ game_id: number }>('SELECT game_id FROM game_user WHERE user_id = ?', [user.id]);
  return new Set(rows.map((r) => r.game_id));
}

export function canUseGame(allowed: Set<number> | 'all', gameId: number): boolean {
  return allowed === 'all' || allowed.has(gameId);
}

/** SQL condition limiting `column` to the user's games, e.g. `AND ${sql}` with `params`. */
export function gameScope(allowed: Set<number> | 'all', column: string): { sql: string; params: unknown[] } {
  if (allowed === 'all') return { sql: '1=1', params: [] };
  if (allowed.size === 0) return { sql: '1=0', params: [] };
  return { sql: `${column} IN (?)`, params: [[...allowed]] };
}
