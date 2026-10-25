'use server';

import { redirect } from 'next/navigation';
import { checkPassword, endSession, hashPassword, startSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { str } from '@/lib/form';
import { clearFailedLogins, clientIp, loginBlockedMinutes, recordFailedLogin } from '@/lib/loginLimit';

export async function login(_prev: { error?: string } | undefined, fd: FormData) {
  const email = str(fd, 'email').toLowerCase();
  const password = str(fd, 'password');
  if (!email || !password) return { error: 'Enter email and password.' };
  const ip = await clientIp();
  const wait = await loginBlockedMinutes(email, ip);
  if (wait) return { error: `Too many failed attempts. Try again in ${wait} minute${wait === 1 ? '' : 's'}.` };
  const user = await queryOne<{ id: number; password: string }>('SELECT id, password FROM users WHERE email = ?', [email]);
  // Do bcrypt work even when the user is missing so response time doesn't reveal which emails exist.
  const ok = user ? await checkPassword(password, user.password) : (await hashPassword(password), false);
  if (!user || !ok) {
    await recordFailedLogin(email, ip);
    return { error: 'These credentials do not match our records.' };
  }
  await clearFailedLogins(email, ip);
  await startSession(user.id);
  redirect('/admin');
}

export async function logout() {
  await endSession();
  redirect('/admin/login');
}
