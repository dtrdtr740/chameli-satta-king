import { MONTHS, daysInMonth, istDate, padResult } from '@/lib/time';

/** Day × month record table for one game and year (grid from getYearGrid). */
export function YearChart({ year, grid }: { year: number; grid: Record<number, Record<number, string>> }) {
  const today = istDate();
  return (
    <div className="table-scroll">
      <table className="record-table">
        <thead>
          <tr>
            <th className="year">{year}</th>
            {MONTHS.map((m) => (
              <th key={m}>
                {/* Full name on wide screens, Jan/Feb/… on phones (see .m-full/.m-short in site.css). */}
                <span className="m-full">{m}</span>
                <span className="m-short">{m.slice(0, 3)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <tr key={day}>
              <td className="day">{String(day).padStart(2, '0')}</td>
              {MONTHS.map((_, mi) => {
                const month = mi + 1;
                if (day > daysInMonth(year, month)) return <td key={mi} className="na" />;
                const v = grid[day]?.[month];
                const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                return (
                  <td key={mi} className={v ? 'has' : undefined}>
                    {v ? padResult(v) : date > today ? '' : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
