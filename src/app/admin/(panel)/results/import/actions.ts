'use server';

import { revalidatePath } from 'next/cache';
import { assignedGameIds, canUseGame, requirePermission } from '@/lib/auth';
import { DB_TIMEZONE, query, queryOne, transaction } from '@/lib/db';
import { done, fail, intOrNull, str } from '@/lib/form';
import { parseYearChart, readRows, type ImportEntry } from '@/lib/resultImport';
import { DAY_MS, epochToDbDateTime, istDate, istToEpoch } from '@/lib/time';

const P = 'manage game results';
const MAX_BYTES = 2 * 1024 * 1024;

type Game = { id: number; name: string; result_time: string | null; default_show_minutes: number };
export type PreviewRow = ImportEntry & { existing: string | null; action: 'add' | 'update' | 'same' | 'keep' };
export type PreviewState = {
  error?: string;
  preview?: {
    gameId: number;
    gameName: string;
    year: number;
    overwrite: boolean;
    rows: PreviewRow[];
    errors: string[];
    warnings: string[];
    counts: Record<PreviewRow['action'], number>;
  };
};

async function loadGame(gameId: number | null): Promise<Game> {
  const user = await requirePermission(P);
  if (!gameId) fail('/admin/results/import', 'Choose a game');
  const allowed = await assignedGameIds(user);
  if (!canUseGame(allowed, gameId)) fail('/admin/results/import', 'You are not allowed to update this game.');
  const game = await queryOne<Game>('SELECT id, name, result_time, default_show_minutes FROM games WHERE id = ?', [gameId]);
  if (!game) fail('/admin/results/import', 'Game not found');
  return game;
}

function validYear(y: number | null): y is number {
  return y !== null && y >= 2000 && y <= Number(istDate().slice(0, 4));
}

async function existingResults(gameId: number, year: number): Promise<Map<string, string>> {
  const rows = await query<{ result_date: string; result: string | null }>(
    `SELECT result_date, result FROM game_results
      WHERE game_id = ? AND result_date BETWEEN ? AND ? AND status = 'declared' AND result IS NOT NULL AND result <> ''`,
    [gameId, `${year}-01-01`, `${year}-12-31`],
  );
  return new Map(rows.map((r) => [r.result_date, r.result as string]));
}

function plan(entries: ImportEntry[], existing: Map<string, string>, overwrite: boolean): PreviewRow[] {
  return entries.map((e) => {
    const old = existing.get(e.date) ?? null;
    const action = old === null ? 'add' : old === e.result ? 'same' : overwrite ? 'update' : 'keep';
    return { ...e, existing: old, action };
  });
}

/** Step 1: read the file and show what would change. Nothing is saved. */
export async function previewImport(_prev: PreviewState | undefined, fd: FormData): Promise<PreviewState> {
  const game = await loadGame(intOrNull(fd, 'game_id'));
  const year = intOrNull(fd, 'year');
  if (!validYear(year)) return { error: 'Choose a year from 2000 to this year.' };
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose an Excel (.xlsx) or .csv file.' };
  if (file.size > MAX_BYTES) return { error: 'The file must be 2 MB or smaller.' };

  let parsed;
  try {
    // Results can be imported up to yesterday; today goes through Today Result Update.
    parsed = parseYearChart(await readRows(file), year, istDate(Date.now() - DAY_MS));
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (parsed.fatal) return { error: parsed.fatal };
  const overwrite = str(fd, 'mode') === 'overwrite';
  const rows = plan(parsed.entries, await existingResults(game.id, year), overwrite);
  const counts = { add: 0, update: 0, same: 0, keep: 0 };
  for (const r of rows) counts[r.action]++;
  return { preview: { gameId: game.id, gameName: game.name, year, overwrite, rows, errors: parsed.errors, warnings: parsed.warnings, counts } };
}

/** Step 2: save the previewed results. Re-checks everything; the client only sends dates and values. */
export async function applyImport(fd: FormData) {
  const game = await loadGame(intOrNull(fd, 'game_id'));
  const year = intOrNull(fd, 'year');
  const back = `/admin/results/import?game=${game.id}&year=${year ?? ''}`;
  if (!validYear(year)) fail(back, 'Invalid year');
  const overwrite = str(fd, 'mode') === 'overwrite';

  let entries: ImportEntry[];
  try {
    entries = JSON.parse(str(fd, 'entries'));
  } catch {
    fail(back, 'Upload the file again.');
  }
  const lastDate = istDate(Date.now() - DAY_MS);
  const ok = Array.isArray(entries) && entries.every(
    (e) => typeof e?.date === 'string' && e.date.startsWith(`${year}-`) && e.date <= lastDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.result === 'string' && /^\d{2}$/.test(e.result),
  );
  if (!ok) fail(back, 'The import data is invalid. Upload the file again.');

  // Imported results count as declared at the game's time on that day, so they never pop into the live box.
  const when = (date: string) => epochToDbDateTime(istToEpoch(date, game.result_time ?? '12:00:00'), DB_TIMEZONE);
  const now = epochToDbDateTime(Date.now(), DB_TIMEZONE);
  const counts = await transaction(async (conn) => {
    const existing = await existingResults(game.id, year);
    const rows = plan(entries, existing, overwrite).filter((r) => r.action === 'add' || r.action === 'update');
    for (const r of rows) {
      await conn.query(
        `INSERT INTO game_results (game_id, result_date, result, status, show_minutes, created_at, updated_at)
         VALUES (?, ?, ?, 'declared', ?, ?, ?)
         ON DUPLICATE KEY UPDATE result = VALUES(result), status = 'declared', updated_at = VALUES(updated_at)`,
        [game.id, r.date, r.result, game.default_show_minutes, now, when(r.date)],
      );
    }
    return { added: rows.filter((r) => r.action === 'add').length, updated: rows.filter((r) => r.action === 'update').length };
  });

  revalidatePath('/', 'layout');
  done(`/admin/results?game=${game.id}&from=${year}-01-01&to=${year}-12-31`, `${game.name} ${year}: ${counts.added} added, ${counts.updated} updated.`);
}
