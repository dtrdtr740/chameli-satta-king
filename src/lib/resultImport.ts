import 'server-only';
import ExcelJS from 'exceljs';
import { MONTHS, daysInMonth } from './time';

// Excel/CSV import of a year chart: one game, one year, days 1-31 down and months across,
// the same layout as the public record chart (and the template from /admin/results/import/template).

export type ImportEntry = { date: string; result: string };
/** `fatal` means the file has no usable chart at all; `errors` are single cells that were skipped. */
export type ParsedSheet = { entries: ImportEntry[]; errors: string[]; warnings: string[]; fatal?: string };

const MONTH_ALIASES = MONTHS.map((m) => [m.toLowerCase(), m.slice(0, 3).toLowerCase()]);
// Markers people use for "no result" in charts.
const EMPTY = new Set(['', '-', '--', '*', '**', 'x', 'xx', '#']);

function monthOf(cell: string): number | null {
  const c = cell.trim().toLowerCase().replace(/\.$/, '');
  const i = MONTH_ALIASES.findIndex((a) => a.includes(c) || (c.length > 3 && a[0].startsWith(c)));
  return c && i >= 0 ? i + 1 : null;
}

function colName(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return '';
  if (v instanceof Date) return '';
  if (typeof v === 'object') {
    if ('richText' in v && Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if ('result' in v) return cellText((v as { result?: ExcelJS.CellValue }).result ?? null);
    if ('text' in v) return String((v as { text: unknown }).text ?? '');
  }
  return String(v);
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const delim = (text.split(/\r?\n/, 1)[0].match(/;/g)?.length ?? 0) > (text.split(/\r?\n/, 1)[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) row.push(cell), (cell = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += ch;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows;
}

/** All sheets of an uploaded file as rows of cell text. */
export async function readRows(file: File): Promise<string[][][]> {
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  if (name.endsWith('.csv')) return [csvRows(buf.toString('utf8').replace(/^﻿/, ''))];
  if (!name.endsWith('.xlsx')) throw new Error('Upload an .xlsx (Excel) or .csv file. Old .xls files: open in Excel and "Save as" .xlsx first.');
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
  } catch {
    throw new Error('Could not read this Excel file. Save it again as .xlsx and retry.');
  }
  return wb.worksheets.map((ws) => {
    const out: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (r, n) => {
      const vals = r.values as ExcelJS.CellValue[]; // 1-based
      out[n - 1] = vals.slice(1).map((v) => cellText(v ?? null).trim());
    });
    return Array.from(out, (r) => r ?? []);
  });
}

/** Results for `year` from the first sheet that has a row of month names. */
export function parseYearChart(sheets: string[][][], year: number, lastDate: string): ParsedSheet {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const rows of sheets) {
    // Header = first row with a month name in a cell of its own (a file may hold just one month).
    const headerIdx = rows.findIndex((r) => r.some((c) => monthOf(c)));
    if (headerIdx < 0) continue;
    const header = rows[headerIdx];
    const cols = new Map<number, number>(); // column -> month
    header.forEach((c, i) => {
      const m = monthOf(c);
      if (m && ![...cols.values()].includes(m)) cols.set(i, m);
    });
    const firstMonthCol = Math.min(...cols.keys());
    const yearInSheet = rows.slice(0, headerIdx + 1).flat().join(' ').match(/\b(19|20)\d{2}\b/)?.[0];
    if (yearInSheet && Number(yearInSheet) !== year) {
      warnings.push(`The sheet mentions ${yearInSheet}, but you chose ${year}. Results are saved for ${year}.`);
    }

    const entries: ImportEntry[] = [];
    const seen = new Set<string>();
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      // Day number: the last cell left of the month columns that is 1-31.
      let day: number | null = null;
      for (let c = firstMonthCol - 1; c >= 0; c--) {
        const d = Number((row[c] ?? '').replace(/(st|nd|rd|th)$/i, ''));
        if (Number.isInteger(d) && d >= 1 && d <= 31) {
          day = d;
          break;
        }
      }
      if (day === null) continue;
      for (const [c, month] of cols) {
        const raw = (row[c] ?? '').trim();
        if (EMPTY.has(raw.toLowerCase())) continue;
        const ref = `${colName(c)}${r + 1}`;
        const label = `${MONTHS[month - 1].slice(0, 3)} ${day} (cell ${ref})`;
        if (!/^\d{1,2}(\.0+)?$/.test(raw)) {
          errors.push(`${label}: "${raw}" is not a result (use 00-99).`);
          continue;
        }
        if (day > daysInMonth(year, month)) {
          warnings.push(`${label}: ${MONTHS[month - 1]} ${year} has no day ${day}, skipped.`);
          continue;
        }
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (date > lastDate) {
          warnings.push(`${label}: ${date} is today or later, skipped. Use Today Result Update for today.`);
          continue;
        }
        if (seen.has(date)) {
          errors.push(`${label}: day ${day} appears twice for ${MONTHS[month - 1]}.`);
          continue;
        }
        seen.add(date);
        entries.push({ date, result: String(Number.parseInt(raw, 10)).padStart(2, '0') });
      }
    }
    entries.sort((a, b) => a.date.localeCompare(b.date));
    return { entries, errors, warnings };
  }
  return { entries: [], errors, warnings, fatal: 'No month names (Jan, Feb, … or January, February, …) found in a header row. Use the template.' };
}

/** A filled-in year chart template for one game (existing results included). */
export async function buildTemplate(gameName: string, year: number, existing: Record<string, string>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Results');
  ws.addRow([`${gameName} ${year}`]).font = { bold: true, size: 13 };
  const head = ws.addRow(['Day', ...MONTHS.map((m) => m.slice(0, 3))]);
  head.font = { bold: true };
  head.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }));
  for (let day = 1; day <= 31; day++) {
    const row = ws.addRow([
      day,
      ...MONTHS.map((_, i) => existing[`${year}-${String(i + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`] ?? ''),
    ]);
    MONTHS.forEach((_, i) => {
      const cell = row.getCell(i + 2);
      cell.numFmt = '@'; // text, so "05" keeps its zero
      if (day > daysInMonth(year, i + 1)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9CA3AF' } };
    });
  }
  ws.columns.forEach((c, i) => (c.width = i === 0 ? 6 : 7));
  ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 2 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}
