import 'server-only';
import { execute } from './db';

// Tables for logout revocation and login throttling. scripts/migrate.mjs creates them too; they are
// also created here on first use so a deploy works before the migration has been run.
// Both are shared by all sites (not in SITE_TABLES); times are epoch seconds to avoid timezone issues.
let ready: Promise<void> | null = null;

export function ensureAuthTables(): Promise<void> {
  ready ??= (async () => {
    await execute(
      `CREATE TABLE IF NOT EXISTS revoked_sessions (
        jti CHAR(32) NOT NULL PRIMARY KEY,
        expires_at BIGINT NOT NULL,
        KEY revoked_sessions_expires_index (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await execute(
      `CREATE TABLE IF NOT EXISTS login_attempts (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        email VARCHAR(255) NOT NULL,
        attempted_at BIGINT NOT NULL,
        KEY login_attempts_ip_index (ip, attempted_at),
        KEY login_attempts_email_ip_index (email, ip, attempted_at),
        KEY login_attempts_time_index (attempted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
