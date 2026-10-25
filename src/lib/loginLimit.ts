import 'server-only';
import { headers } from 'next/headers';
import { ensureAuthTables } from './authTables';
import { execute, queryOne } from './db';

// Failed logins are counted in the database: on Netlify every request can hit a different
// function instance, so an in-memory counter would not hold.
const WINDOW_SECONDS = 15 * 60;
const MAX_PER_EMAIL_IP = 5;
// Higher cap per IP so one address can't spray many emails; it is per IP, not per email,
// so nobody can lock a real admin out by failing logins with their email from elsewhere.
const MAX_PER_IP = 20;

const nowSeconds = () => Math.floor(Date.now() / 1000);

export async function clientIp(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-nf-client-connection-ip') || h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || '';
  return ip.trim().slice(0, 45) || 'unknown';
}

/** Minutes until this email/IP may try again, or 0 when not blocked. */
export async function loginBlockedMinutes(email: string, ip: string): Promise<number> {
  await ensureAuthTables();
  const since = nowSeconds() - WINDOW_SECONDS;
  const pair = await queryOne<{ n: number; first: number | null }>(
    'SELECT COUNT(*) AS n, MIN(attempted_at) AS first FROM login_attempts WHERE email = ? AND ip = ? AND attempted_at > ?',
    [email, ip, since],
  );
  const byIp = await queryOne<{ n: number; first: number | null }>(
    'SELECT COUNT(*) AS n, MIN(attempted_at) AS first FROM login_attempts WHERE ip = ? AND attempted_at > ?',
    [ip, since],
  );
  const blockedFrom = [
    Number(pair?.n) >= MAX_PER_EMAIL_IP ? Number(pair?.first) : null,
    Number(byIp?.n) >= MAX_PER_IP ? Number(byIp?.first) : null,
  ].filter((t): t is number => t !== null);
  if (!blockedFrom.length) return 0;
  // Blocked until the oldest counted attempt leaves the window.
  return Math.max(1, Math.ceil((Math.max(...blockedFrom) + WINDOW_SECONDS - nowSeconds()) / 60));
}

export async function recordFailedLogin(email: string, ip: string) {
  await ensureAuthTables();
  const now = nowSeconds();
  await execute('INSERT INTO login_attempts (ip, email, attempted_at) VALUES (?, ?, ?)', [ip, email.slice(0, 255), now]);
  await execute('DELETE FROM login_attempts WHERE attempted_at < ?', [now - 24 * 60 * 60]);
}

export async function clearFailedLogins(email: string, ip: string) {
  await ensureAuthTables();
  await execute('DELETE FROM login_attempts WHERE email = ? AND ip = ?', [email, ip]);
}
