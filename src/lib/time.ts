// India has no DST, so IST is a fixed +05:30 offset.
const IST_OFFSET_MS = 330 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' of the given instant in IST. */
export function istDate(epochMs: number = Date.now()): string {
  const d = new Date(epochMs + IST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function istYear(epochMs: number = Date.now()): number {
  return new Date(epochMs + IST_OFFSET_MS).getUTCFullYear();
}

/** Epoch ms for an IST wall-clock date ('YYYY-MM-DD') and time ('HH:MM[:SS]'). */
export function istToEpoch(date: string, time: string = '00:00:00'): number {
  const [y, m, d] = date.split('-').map(Number);
  const [hh = 0, mm = 0, ss = 0] = time.trim().split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm, ss) - IST_OFFSET_MS;
}

/** Parse a DB DATETIME/TIMESTAMP string stored in `offset` (e.g. '+00:00') into epoch ms. */
export function dbDateTimeToEpoch(value: string | null | undefined, offset: string): number | null {
  if (!value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const o = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  const offsetMs = o ? (o[1] === '-' ? -1 : 1) * (Number(o[2]) * 60 + Number(o[3])) * 60000 : 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - offsetMs;
}

/** Format epoch ms as a DB DATETIME string in `offset`. */
export function epochToDbDateTime(epochMs: number, offset: string): string {
  const o = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  const offsetMs = o ? (o[1] === '-' ? -1 : 1) * (Number(o[2]) * 60 + Number(o[3])) * 60000 : 0;
  const d = new Date(epochMs + offsetMs);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** '14:50:00' -> '02:50 PM' */
export function formatTime12(time: string | null | undefined): string {
  if (!time) return '';
  const [hh, mm] = time.split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${pad(h12)}:${pad(mm)} ${suffix}`;
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function padResult(r: string | null | undefined): string {
  if (!r) return '';
  return /^\d$/.test(r) ? `0${r}` : r;
}
