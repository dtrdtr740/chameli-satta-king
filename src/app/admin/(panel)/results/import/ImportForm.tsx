'use client';

import { useActionState, useState } from 'react';
import { applyImport, previewImport, type PreviewRow } from './actions';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LABEL: Record<PreviewRow['action'], string> = { add: 'new', update: 'will change', same: 'already saved', keep: 'kept (different value saved)' };
const COLOR: Record<PreviewRow['action'], string> = { add: '#16a34a', update: '#d97706', same: '#9ca3af', keep: '#dc2626' };

type Props = { games: { id: number; name: string }[]; years: number[]; gameId: number; year: number };

export function ImportForm({ games, years, gameId, year }: Props) {
  const [state, action, pending] = useActionState(previewImport, undefined);
  const [game, setGame] = useState(gameId);
  const [yr, setYr] = useState(year);
  const p = state?.preview;
  const toSave = p ? p.rows.filter((r) => r.action === 'add' || r.action === 'update') : [];

  return (
    <>
      <form action={action} className="card">
        {state?.error ? <div className="flash err">{state.error}</div> : null}
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="game_id">Game</label>
            <select id="game_id" name="game_id" className="select" value={game} onChange={(e) => setGame(Number(e.target.value))}>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="year">Year</label>
            <select id="year" name="year" className="select" value={yr} onChange={(e) => setYr(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="file">Excel file</label>
            <input id="file" name="file" type="file" className="input" required accept=".xlsx,.csv" />
            <span className="hint">
              <a href={`/admin/results/import/template?game=${game}&year=${yr}`}>Download template for this game and year</a> (already-saved
              results are filled in)
            </span>
          </div>
          <div className="field">
            <label>If a day already has a result</label>
            <label className="check">
              <input type="radio" name="mode" value="fill" defaultChecked /> Keep the saved result (only fill empty days)
            </label>
            <label className="check">
              <input type="radio" name="mode" value="overwrite" /> Replace it with the value from the file
            </label>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Reading file…' : 'Preview'}
          </button>
        </div>
      </form>

      {p ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>
            Preview: {p.gameName} {p.year}
          </h2>
          <p>
            <b style={{ color: COLOR.add }}>{p.counts.add} new</b> · <b style={{ color: COLOR.update }}>{p.counts.update} will change</b> ·{' '}
            {p.counts.same} already saved · {p.counts.keep ? <b style={{ color: COLOR.keep }}>{p.counts.keep} kept</b> : '0 kept'}
          </p>
          {p.errors.length ? (
            <div className="flash err">
              <b>{p.errors.length} cell(s) could not be read and will be skipped:</b>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {p.errors.slice(0, 30).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {p.errors.length > 30 ? <li>…and {p.errors.length - 30} more</li> : null}
              </ul>
            </div>
          ) : null}
          {p.warnings.length ? (
            <div className="flash" style={{ background: '#fef3c7', color: '#92400e' }}>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {p.warnings.slice(0, 15).map((w) => (
                  <li key={w}>{w}</li>
                ))}
                {p.warnings.length > 15 ? <li>…and {p.warnings.length - 15} more</li> : null}
              </ul>
            </div>
          ) : null}

          <PreviewGrid rows={p.rows} year={p.year} />

          <form action={applyImport} className="form-actions">
            <input type="hidden" name="game_id" value={p.gameId} />
            <input type="hidden" name="year" value={p.year} />
            <input type="hidden" name="mode" value={p.overwrite ? 'overwrite' : 'fill'} />
            <input type="hidden" name="entries" value={JSON.stringify(toSave.map(({ date, result }) => ({ date, result })))} />
            <button className="btn btn-primary" type="submit" disabled={toSave.length === 0}>
              {toSave.length ? `Save ${toSave.length} result${toSave.length === 1 ? '' : 's'}` : 'Nothing to save'}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

function PreviewGrid({ rows, year }: { rows: PreviewRow[]; year: number }) {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return (
    <>
      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="table" style={{ fontSize: 13, textAlign: 'center' }}>
          <thead>
            <tr>
              <th>{year}</th>
              {MONTHS.map((m) => (
                <th key={m}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <tr key={day}>
                <td className="muted">{day}</td>
                {MONTHS.map((_, mi) => {
                  const r = byDate.get(`${year}-${String(mi + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                  if (!r) return <td key={mi} />;
                  const title = r.existing && r.existing !== r.result ? `saved: ${r.existing}, file: ${r.result} (${LABEL[r.action]})` : LABEL[r.action];
                  return (
                    <td key={mi} title={title} style={{ color: COLOR[r.action], fontWeight: r.action === 'same' ? 400 : 700 }}>
                      {r.action === 'keep' ? r.existing : r.result}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        {(['add', 'update', 'same', 'keep'] as const).map((a) => (
          <span key={a} style={{ marginRight: 14 }}>
            <b style={{ color: COLOR[a] }}>■</b> {LABEL[a]}
          </span>
        ))}
        · Hover a cell to see the saved and new values.
      </p>
    </>
  );
}
