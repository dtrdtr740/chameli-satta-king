import 'server-only';
import { DB_TIMEZONE, query } from './db';
import { DAY_MS, dbDateTimeToEpoch, istDate, istToEpoch, istYear } from './time';

export type Game = {
  id: number;
  name: string;
  slug: string;
  result_time: string | null;
  sort_order: number;
  is_active: number;
  default_show_minutes: number;
  result_section: number;
};

export type GameResult = {
  id: number;
  game_id: number;
  result_date: string;
  result: string | null;
  status: 'waiting' | 'declared';
  show_minutes: number;
  updated_at: string | null;
};

export type LiveState = 'declared' | 'waiting' | 'upcoming';

export type LiveGame = Game & { state: LiveState; result: string | null };

export type HomeData = {
  today: string;
  yesterday: string;
  games: Game[];
  liveGames: LiveGame[];
  todayTable: Record<number, GameResult>;
  yesterdayResults: Record<number, GameResult>;
  monthDates: string[];
  monthly: Record<string, Record<number, string>>;
};

const WAITING_LEAD_MS = 5 * 60 * 1000;
const LATE_NIGHT_HOUR = 21;

export async function getActiveGames(): Promise<Game[]> {
  return query<Game>(
    `SELECT id, name, slug, result_time, sort_order, is_active, default_show_minutes, result_section
       FROM games WHERE is_active = 1 ORDER BY sort_order, id`,
  );
}

function hourOf(time: string): number {
  return Number(time.trim().split(':')[0]);
}

function hideAfter(r: GameResult): number | null {
  const updated = dbDateTimeToEpoch(r.updated_at, DB_TIMEZONE);
  return updated === null ? null : updated + (r.show_minutes || 0) * 60000;
}

function firstPerGame(rows: GameResult[]): Record<number, GameResult> {
  const out: Record<number, GameResult> = {};
  for (const r of rows) if (!(r.game_id in out)) out[r.game_id] = r;
  return out;
}

/**
 * Same rules as the Laravel FrontController::home():
 * - Games after 21:00 keep "yesterday" as their working date until yesterday's result is declared
 *   and its show_minutes window has expired (or until 5 min before today's time when nothing was declared).
 * - "Live" shows recently declared first, then games inside their waiting window, then upcoming ones (max 4).
 */
export async function getHomeData(now: number = Date.now()): Promise<HomeData> {
  const today = istDate(now);
  const yesterday = istDate(now - DAY_MS);
  const games = await getActiveGames();
  const ids = games.map((g) => g.id);
  const byId = new Map(games.map((g) => [g.id, g]));

  const recent = ids.length
    ? await query<GameResult>(
        `SELECT id, game_id, result_date, result, status, show_minutes, updated_at
           FROM game_results
          WHERE game_id IN (?) AND result_date BETWEEN ? AND ?
            AND status = 'declared' AND result IS NOT NULL AND result <> ''
          ORDER BY updated_at DESC`,
        [ids, yesterday, today],
      )
    : [];

  const workingDate = new Map<number, string>();
  for (const g of games) {
    if (!g.result_time) {
      workingDate.set(g.id, today);
      continue;
    }
    const todayGameTime = istToEpoch(today, g.result_time);
    if (hourOf(g.result_time) < LATE_NIGHT_HOUR) {
      workingDate.set(g.id, today);
      continue;
    }
    const prev = recent.find((r) => r.game_id === g.id && r.result_date === yesterday);
    if (prev && prev.updated_at) {
      if ((prev.show_minutes || 0) <= 0) {
        workingDate.set(g.id, yesterday);
        continue;
      }
      const hide = hideAfter(prev);
      workingDate.set(g.id, hide !== null && now <= hide ? yesterday : today);
      continue;
    }
    workingDate.set(g.id, now < todayGameTime - WAITING_LEAD_MS ? yesterday : today);
  }

  const belongsToTable = (r: GameResult) => {
    if (r.result_date === workingDate.get(r.game_id)) return true;
    const g = byId.get(r.game_id);
    if (!g || !g.result_time || (r.show_minutes || 0) <= 0 || r.result_date !== yesterday) return false;
    const hide = hideAfter(r);
    return hourOf(g.result_time) >= LATE_NIGHT_HOUR && hide !== null && now <= hide;
  };

  const tableRows = recent.filter(belongsToTable);
  const todayTable = firstPerGame(tableRows);
  const liveDeclared = firstPerGame(
    tableRows.filter((r) => {
      if ((r.show_minutes || 0) <= 0) return true;
      const hide = hideAfter(r);
      return hide !== null && now <= hide;
    }),
  );
  const yesterdayResults = firstPerGame(recent.filter((r) => r.result_date === yesterday));

  const gameTime = (g: Game) => istToEpoch(workingDate.get(g.id) ?? today, g.result_time as string);
  const updatedOf = (r: GameResult) => dbDateTimeToEpoch(r.updated_at, DB_TIMEZONE) ?? 0;

  const declared = games
    .filter((g) => liveDeclared[g.id]?.result)
    .sort((a, b) => updatedOf(liveDeclared[b.id]) - updatedOf(liveDeclared[a.id]))
    .map<LiveGame>((g) => ({ ...g, state: 'declared', result: liveDeclared[g.id].result }));

  const pending = games.filter((g) => !todayTable[g.id] && g.result_time);
  const waiting = pending
    .filter((g) => now >= gameTime(g) - WAITING_LEAD_MS)
    .sort((a, b) => gameTime(a) - gameTime(b))
    .map<LiveGame>((g) => ({ ...g, state: 'waiting', result: null }));
  const upcoming = pending
    .filter((g) => now < gameTime(g) - WAITING_LEAD_MS)
    .sort((a, b) => gameTime(a) - gameTime(b))
    .map<LiveGame>((g) => ({ ...g, state: 'upcoming', result: null }));

  const seen = new Set<number>();
  const liveGames = [...declared, ...waiting, ...upcoming].filter((g) => !seen.has(g.id) && seen.add(g.id)).slice(0, 4);

  const [y, m] = today.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthDates = Array.from({ length: lastDay }, (_, i) => `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);

  const monthRows = ids.length
    ? await query<Pick<GameResult, 'game_id' | 'result_date' | 'result'>>(
        `SELECT game_id, result_date, result FROM game_results
          WHERE game_id IN (?) AND result_date BETWEEN ? AND ? AND status = 'declared'
            AND result IS NOT NULL AND result <> ''`,
        [ids, monthDates[0], monthDates[monthDates.length - 1]],
      )
    : [];
  const monthly: HomeData['monthly'] = {};
  for (const r of monthRows) {
    (monthly[r.result_date] ??= {})[r.game_id] = r.result as string;
  }

  return { today, yesterday, games, liveGames, todayTable, yesterdayResults, monthDates, monthly };
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
  const rows = await query<Game>(
    `SELECT id, name, slug, result_time, sort_order, is_active, default_show_minutes, result_section
       FROM games WHERE slug = ? AND is_active = 1 LIMIT 1`,
    [slug],
  );
  return rows[0] ?? null;
}

/** day -> month(1-12) -> result for one game and year. */
export async function getYearGrid(gameId: number, year: number) {
  const rows = await query<Pick<GameResult, 'result_date' | 'result' | 'status'>>(
    `SELECT result_date, result, status FROM game_results
      WHERE game_id = ? AND result_date BETWEEN ? AND ? ORDER BY result_date`,
    [gameId, `${year}-01-01`, `${year}-12-31`],
  );
  const grid: Record<number, Record<number, string>> = {};
  for (const r of rows) {
    if (r.status !== 'declared' || !r.result) continue;
    const [, mm, dd] = r.result_date.split('-').map(Number);
    (grid[dd] ??= {})[mm] = r.result;
  }
  return { grid, count: rows.length };
}

/**
 * Years to offer per game, newest first: the current year, every year that has declared results,
 * plus years added in Admin -> Chart Years. A Chart Years row set to inactive hides that year.
 * So a new year (e.g. 2027) appears on 1 January and old years stay linked without manual work.
 */
export async function getGameYears(gameId?: number): Promise<Map<number, number[]>> {
  const where = gameId ? 'WHERE game_id = ?' : '';
  const params = gameId ? [gameId] : [];
  const [withResults, chartYears, games] = await Promise.all([
    query<{ game_id: number; year: number }>(
      `SELECT DISTINCT game_id, YEAR(result_date) AS year FROM game_results ${where ? `${where} AND` : 'WHERE'}
         status = 'declared' AND result IS NOT NULL AND result <> ''`,
      params,
    ),
    query<{ game_id: number; year: number; is_active: number }>(`SELECT game_id, year, is_active FROM chart_years ${where}`, params),
    gameId ? Promise.resolve([{ id: gameId }]) : query<{ id: number }>('SELECT id FROM games'),
  ]);
  const current = istYear();
  const years = new Map<number, Set<number>>(games.map((g) => [g.id, new Set([current])]));
  const add = (id: number, y: number) => (years.get(id) ?? years.set(id, new Set()).get(id)!).add(Number(y));
  for (const r of withResults) add(r.game_id, r.year);
  for (const c of chartYears) if (c.is_active) add(c.game_id, c.year);
  for (const c of chartYears) if (!c.is_active && Number(c.year) !== current) years.get(c.game_id)?.delete(Number(c.year));
  return new Map([...years].map(([id, set]) => [id, [...set].sort((a, b) => b - a)]));
}
