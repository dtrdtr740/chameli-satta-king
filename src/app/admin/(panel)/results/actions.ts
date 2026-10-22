'use server';

import { revalidatePath } from 'next/cache';
import { assignedGameIds, canUseGame, requirePermission } from '@/lib/auth';
import { DB_TIMEZONE, execute, queryOne } from '@/lib/db';
import { DATE_RE, done, fail, intOrNull, isDuplicate, str } from '@/lib/form';
import { epochToDbDateTime } from '@/lib/time';

const P = 'manage game results';

export async function saveResult(fd: FormData) {
  const user = await requirePermission(P);
  const allowed = await assignedGameIds(user);
  const id = intOrNull(fd, 'id');
  const back = `/admin/results/${id ?? 'new'}`;
  const gameId = intOrNull(fd, 'game_id');
  // Both the game being saved and (when editing) the game the row belongs to must be assigned.
  if (gameId && !canUseGame(allowed, gameId)) fail(back, 'You are not allowed to update this game.');
  if (id) {
    const existing = await queryOne<{ game_id: number }>('SELECT game_id FROM game_results WHERE id = ?', [id]);
    if (!existing || !canUseGame(allowed, existing.game_id)) fail('/admin/results', 'You are not allowed to update this game.');
  }
  const date = str(fd, 'result_date');
  const result = str(fd, 'result');
  const status = str(fd, 'status') === 'declared' ? 'declared' : 'waiting';
  const mins = intOrNull(fd, 'show_minutes') ?? 0;
  if (!gameId) fail(back, 'Choose a game');
  if (!DATE_RE.test(date)) fail(back, 'Enter a valid date');
  if (result.length > 10) fail(back, 'Result must be 10 characters or fewer');
  if (mins < 0) fail(back, 'Show minutes cannot be negative');
  const now = epochToDbDateTime(Date.now(), DB_TIMEZONE);
  try {
    if (id) {
      await execute(
        'UPDATE game_results SET game_id=?, result_date=?, result=?, status=?, show_minutes=?, updated_at=? WHERE id=?',
        [gameId, date, result || null, status, mins, now, id],
      );
    } else {
      await execute(
        `INSERT INTO game_results (game_id, result_date, result, status, show_minutes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [gameId, date, result || null, status, mins, now, now],
      );
    }
  } catch (e) {
    if (isDuplicate(e)) fail(back, 'This game already has a result for that date — edit that one instead.');
    throw e;
  }
  revalidatePath('/', 'layout');
  done('/admin/results', 'Result saved.');
}

export async function deleteResult(fd: FormData) {
  const user = await requirePermission(P);
  const allowed = await assignedGameIds(user);
  const id = intOrNull(fd, 'id');
  if (id) {
    const existing = await queryOne<{ game_id: number }>('SELECT game_id FROM game_results WHERE id = ?', [id]);
    if (existing && !canUseGame(allowed, existing.game_id)) fail('/admin/results', 'You are not allowed to delete this game result.');
    await execute('DELETE FROM game_results WHERE id = ?', [id]);
  }
  revalidatePath('/', 'layout');
  done('/admin/results', 'Result deleted.');
}
