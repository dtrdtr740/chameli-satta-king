'use client';

import { useRef } from 'react';

type Row = { id: number; name: string; time: string; result: string; status: string; mins: number; existed: boolean };

export function TodayGrid({ rows }: { rows: Row[] }) {
  const tableRef = useRef<HTMLTableElement>(null);

  // Enter jumps to the next result box instead of submitting.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const inputs = Array.from(tableRef.current?.querySelectorAll<HTMLInputElement>('input.result') ?? []);
    const next = inputs[inputs.indexOf(e.currentTarget) + 1];
    if (next) next.focus();
    else e.currentTarget.form?.requestSubmit();
  };

  return (
    <div className="table-wrap">
      <table className="table today-table" ref={tableRef}>
        <thead>
          <tr>
            <th>Game</th>
            <th>Time</th>
            <th>Result</th>
            <th>Status</th>
            <th>Show in live box (min)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.result ? 'is-declared' : undefined}>
              <td>
                <input type="hidden" name="game_ids" value={r.id} />
                <input type="hidden" name={`r_${r.id}_existed`} value={r.existed ? '1' : '0'} />
                <strong>{r.name}</strong>
              </td>
              <td className="muted">{r.time || '—'}</td>
              <td>
                <input
                  className="input result"
                  name={`r_${r.id}_result`}
                  defaultValue={r.result}
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={`${r.name} result`}
                  onKeyDown={onKeyDown}
                />
              </td>
              <td>
                <select className="select" name={`r_${r.id}_status`} defaultValue={r.status} aria-label={`${r.name} status`}>
                  <option value="waiting">Waiting</option>
                  <option value="declared">Declared</option>
                </select>
              </td>
              <td>
                <input
                  className="input mins"
                  type="number"
                  min={0}
                  name={`r_${r.id}_mins`}
                  defaultValue={r.mins}
                  aria-label={`${r.name} show minutes`}
                />
              </td>
              <td>
                {/* Submits the whole form, but the action only saves the game named in `only`. */}
                <button className="btn btn-sm btn-primary" type="submit" name="only" value={r.id} aria-label={`Save ${r.name}`}>
                  Save
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
