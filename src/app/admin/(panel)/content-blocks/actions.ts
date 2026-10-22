'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth';
import { execute } from '@/lib/db';
import { bool, done, fail, intOrNull, isDuplicate, slugify, str, strOrNull } from '@/lib/form';

const P = 'manage content blocks';

export async function saveBlock(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  const back = `/admin/content-blocks/${id ?? 'new'}`;
  const title = strOrNull(fd, 'title');
  const key = slugify(str(fd, 'key') || title || '') || `block-${Date.now()}`;
  const gameId = intOrNull(fd, 'game_id');
  const year = intOrNull(fd, 'year');
  if (year !== null && (year < 2000 || year > 2100)) fail(back, 'Year must be between 2000 and 2100');
  const values = [key, gameId, year, title, strOrNull(fd, 'content'), bool(fd, 'is_active')];
  try {
    if (id) {
      await execute('UPDATE content_blocks SET `key`=?, game_id=?, year=?, title=?, content=?, is_active=?, updated_at=NOW() WHERE id=?', [...values, id]);
    } else {
      await execute(
        'INSERT INTO content_blocks (`key`, game_id, year, title, content, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        values,
      );
    }
  } catch (e) {
    if (isDuplicate(e)) fail(back, `Key "${key}" already exists`);
    throw e;
  }
  revalidatePath('/', 'layout');
  done('/admin/content-blocks', 'Content block saved.');
}

export async function deleteBlock(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  if (id) await execute('DELETE FROM content_blocks WHERE id = ?', [id]);
  revalidatePath('/', 'layout');
  done('/admin/content-blocks', 'Content block deleted.');
}
