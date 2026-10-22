'use server';

import { revalidatePath } from 'next/cache';
import { assignedGameIds, requirePermission } from '@/lib/auth';
import { DB_TIMEZONE, query, transaction } from '@/lib/db';
import { DATE_RE, done, fail, idList, intOrNull, str } from '@/lib/form';
import { epochToDbDateTime } from '@/lib/time';

export async function saveTodayResults(fd: FormData) {
  const user = await requirePermission('update today results');
  const date = str(fd, 'result_date');
  const back = `/admin/today-update?date=${date}`;
  if (!DATE_RE.test(date)) fail('/admin/today-update', 'Invalid date');

  const allowed = await assignedGameIds(user);
  // A row's own Save button sends `only=<game id>`; the bottom button saves every row.
  const only = intOrNull(fd, 'only');
  const ids = only ? idList(fd, 'game_ids').filter((id) => id === only) : idList(fd, 'game_ids');
  if (only && ids.length === 0) fail(back, 'That game is not on this page.');
  const rows: { gameId: number; result: string; status: 'waiting' | 'declared'; mins: number }[] = [];
  for (const gameId of ids) {
    if (allowed !== 'all' && !allowed.has(gameId)) fail(back, 'You are not allowed to update one of these games.');
    const result = str(fd, `r_${gameId}_result`);
    if (result.length > 10) fail(back, 'Result must be 10 characters or fewer');
    const rawMins = Number(str(fd, `r_${gameId}_mins`) || 15);
    const mins = Number.isInteger(rawMins) && rawMins >= 0 ? rawMins : 15;
    const status = result ? 'declared' : str(fd, `r_${gameId}_status`) === 'declared' ? 'declared' : 'waiting';
    const existed = str(fd, `r_${gameId}_existed`) === '1';
    // Skip untouched empty rows so the table isn't filled with empty "waiting" records.
    if (!result && !existed && status === 'waiting') continue;
    rows.push({ gameId, result, status, mins });
  }

  const now = epochToDbDateTime(Date.now(), DB_TIMEZONE);
  await transaction(async (conn) => {
    for (const r of rows) {
      await conn.query('UPDATE games SET default_show_minutes = ? WHERE id = ?', [r.mins, r.gameId]);
      // updated_at only moves when something changed (like Eloquent's updateOrCreate) — the live box
      // uses updated_at + show_minutes, so re-saving unchanged rows must not re-show old results.
      await conn.query(
        `INSERT INTO game_results (game_id, result_date, result, status, show_minutes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           updated_at = IF(result <=> VALUES(result) AND status <=> VALUES(status) AND show_minutes <=> VALUES(show_minutes), updated_at, VALUES(updated_at)),
           result = VALUES(result), status = VALUES(status), show_minutes = VALUES(show_minutes)`,
        [r.gameId, date, r.result || null, r.status, r.mins, now, now],
      );
    }
  });

  revalidatePath('/', 'layout');
  if (only) {
    const name = (await query<{ name: string }>('SELECT name FROM games WHERE id = ?', [only]))[0]?.name ?? 'Game';
    done(back, rows.length ? `${name} saved.` : `${name}: nothing to save (result is empty).`);
  }
  done(back, `Saved ${rows.length} result${rows.length === 1 ? '' : 's'}.`);
}
