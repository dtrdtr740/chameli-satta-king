import 'server-only';
import { redirect } from 'next/navigation';

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export function strOrNull(fd: FormData, key: string): string | null {
  return str(fd, key) || null;
}

export function intOrNull(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

export function bool(fd: FormData, key: string): number {
  const v = fd.get(key);
  return v === 'on' || v === '1' || v === 'true' ? 1 : 0;
}

export function idList(fd: FormData, key: string): number[] {
  return fd
    .getAll(key)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Redirect back with an error message (shown by <Flash/>). */
export function fail(path: string, message: string): never {
  const sep = path.includes('?') ? '&' : '?';
  redirect(`${path}${sep}error=${encodeURIComponent(message)}`);
}

export function done(path: string, message: string): never {
  const sep = path.includes('?') ? '&' : '?';
  redirect(`${path}${sep}ok=${encodeURIComponent(message)}`);
}

export function isDuplicate(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'ER_DUP_ENTRY';
}

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
