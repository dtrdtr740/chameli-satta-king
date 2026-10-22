import 'server-only';
import mysql, { type Pool, type ResultSetHeader } from 'mysql2/promise';
import { siteSql } from './site';

const globalForDb = globalThis as unknown as { __pool?: Pool };

export const DB_TIMEZONE = process.env.DB_TIMEZONE || '+00:00';

function createPool(): Pool {
  const p = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE,
    timezone: DB_TIMEZONE,
    // Keep DATE/DATETIME as plain strings; timezone math happens in lib/time.ts.
    dateStrings: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    // Cloud MySQL (Aiven, TiDB, PlanetScale…) requires TLS. DB_SSL=true turns it on.
    ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: process.env.DB_SSL_VERIFY !== 'false' } : undefined,
  });
  // TIMESTAMP columns are converted through the session time zone, so pin it; otherwise the
  // server's default (e.g. IST) shifts every created_at/updated_at we read and write.
  p.pool.on('connection', (conn) => {
    conn.query('SET time_zone = ?', [DB_TIMEZONE]);
  });
  return p;
}

// Reuse one pool across hot reloads in dev.
export const pool = globalForDb.__pool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.__pool = pool;

// Every query goes through siteSql(), which points per-site tables (settings, SEO, blog, ads…) at this
// website's own copies when SITE_KEY is set. Shared tables (games, results, users) are untouched.
export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool.query(siteSql(sql), params);
  return rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [res] = await pool.query(siteSql(sql), params);
  return res as ResultSetHeader;
}

export async function transaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  // Same per-site table rewrite for queries run inside the transaction.
  const raw = conn.query.bind(conn) as (sql: string, params?: unknown) => ReturnType<typeof conn.query>;
  (conn as unknown as { query: typeof raw }).query = (sql: string, params?: unknown) => raw(siteSql(sql), params);
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
