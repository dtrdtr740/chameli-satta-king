import 'server-only';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execute, queryOne } from './db';

// Uploads are stored in the `media` table so they survive hosts with a throw-away disk (Render, Railway…).
// Files that were saved on disk before this change are still served from UPLOAD_DIR as a fallback.
export const UPLOAD_ROOT = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './storage/uploads');

const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_BYTES = 4 * 1024 * 1024;

/** Saves an uploaded image and returns its path (served at /uploads/<path>), or null if none was sent. */
export async function saveImage(file: FormDataEntryValue | null, folder: string): Promise<string | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error('Image must be PNG, JPG, WEBP or GIF');
  if (file.size > MAX_BYTES) throw new Error('Image must be 4 MB or smaller');
  const rel = `${folder}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
  await execute('INSERT INTO media (path, mime, data, created_at) VALUES (?, ?, ?, NOW())', [
    rel,
    file.type,
    Buffer.from(await file.arrayBuffer()),
  ]);
  return rel;
}

export async function deleteUpload(rel: string | null | undefined) {
  if (!rel || /^https?:/.test(rel) || rel.startsWith('/')) return;
  await execute('DELETE FROM media WHERE path = ?', [rel]);
  const full = path.resolve(UPLOAD_ROOT, rel);
  if (full.startsWith(UPLOAD_ROOT + path.sep)) await fs.rm(full, { force: true });
}

/** Image bytes for /uploads/<rel>: database first, then the old on-disk folder. */
export async function readUpload(rel: string): Promise<{ data: Buffer; mime: string } | null> {
  const row = await queryOne<{ data: Buffer; mime: string }>('SELECT data, mime FROM media WHERE path = ?', [rel]);
  if (row) return row;
  const full = path.resolve(UPLOAD_ROOT, rel);
  const mime = MIME_BY_EXT[path.extname(full).slice(1).toLowerCase()];
  if (!mime || !full.startsWith(UPLOAD_ROOT + path.sep)) return null;
  try {
    return { data: await fs.readFile(full), mime };
  } catch {
    return null;
  }
}

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(Object.entries(ALLOWED).map(([m, e]) => [e, m]));
MIME_BY_EXT.jpeg = 'image/jpeg';
