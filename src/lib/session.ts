// Edge-safe session helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'admin_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type Session = { uid: number; jti: string; exp: number };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error('AUTH_SECRET must be set to at least 32 characters');
  return new TextEncoder().encode(s);
}

// Each token gets its own id (jti) so logging out can revoke exactly that token (see lib/auth.ts).
export async function signSession(userId: number): Promise<string> {
  const jti = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

/** Signature and expiry only; revocation is checked server-side in getCurrentUser(). */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    // Tokens issued before jti existed can't be revoked, so they are no longer accepted.
    if (typeof payload.uid !== 'number' || typeof payload.jti !== 'string' || typeof payload.exp !== 'number') return null;
    return { uid: payload.uid, jti: payload.jti, exp: payload.exp };
  } catch {
    return null;
  }
}
