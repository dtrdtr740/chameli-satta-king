'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth';
import { execute, query } from '@/lib/db';
import { TIME_RE, bool, done, fail, idList, intOrNull, isDuplicate, slugify, str } from '@/lib/form';

const P = 'manage games';

export async function saveGame(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  const back = `/admin/games/${id ?? 'new'}`;
  const name = str(fd, 'name');
  const slug = slugify(str(fd, 'slug') || name);
  const time = str(fd, 'result_time');
  const sort = intOrNull(fd, 'sort_order') ?? 0;
  const mins = intOrNull(fd, 'default_show_minutes') ?? 15;
  if (!name) fail(back, 'Name is required');
  if (!slug) fail(back, 'Slug is required');
  if (time && !TIME_RE.test(time)) fail(back, 'Result time must be HH:MM');
  const values = [name, slug, time ? (time.length === 5 ? `${time}:00` : time) : null, bool(fd, 'is_active'), mins, sort];
  let newId: number | null = null;
  try {
    if (id) {
      await execute(
        `UPDATE games SET name=?, slug=?, result_time=?, is_active=?, default_show_minutes=?, sort_order=?, updated_at=NOW() WHERE id=?`,
        [...values, id],
      );
    } else {
      const res = await execute(
        `INSERT INTO games (name, slug, result_time, is_active, default_show_minutes, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        values,
      );
      newId = res.insertId;
    }
  } catch (e) {
    if (isDuplicate(e)) fail(back, `Slug "${slug}" is already used by another game`);
    throw e;
  }
  revalidatePath('/', 'layout');
  // A new game usually has older results to bring in: offer the Excel import right away.
  if (newId) done(`/admin/results/import?game=${newId}`, `${name} created. You can now upload its previous results (optional).`);
  done('/admin/games', 'Game saved.');
}

export async function deleteGame(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  if (id) await execute('DELETE FROM games WHERE id = ?', [id]);
  revalidatePath('/', 'layout');
  done('/admin/games', 'Game deleted (with its results).');
}

/** Saves the drag-free "sort order" column from the list page in one go. */
export async function saveOrder(fd: FormData) {
  await requirePermission(P);
  const ids = idList(fd, 'ids');
  const games = await query<{ id: number }>('SELECT id FROM games');
  const known = new Set(games.map((g) => g.id));
  for (const id of ids) {
    if (!known.has(id)) continue;
    const n = intOrNull(fd, `order_${id}`);
    if (n !== null) await execute('UPDATE games SET sort_order = ? WHERE id = ?', [n, id]);
  }
  revalidatePath('/', 'layout');
  done('/admin/games', 'Order saved.');
}
