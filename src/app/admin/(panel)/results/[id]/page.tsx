import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveResult } from '../actions';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { assignedGameIds, canUseGame, gameScope, requirePermission } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { istDate } from '@/lib/time';

export default async function ResultForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const user = await requirePermission('manage game results');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const allowed = await assignedGameIds(user);
  const row =
    id === 'new'
      ? null
      : await queryOne<{ id: number; game_id: number; result_date: string; result: string | null; status: string; show_minutes: number }>(
          'SELECT * FROM game_results WHERE id = ?',
          [Number(id)],
        );
  // Results of games not assigned to this user look like they don't exist.
  if (id !== 'new' && (!row || !canUseGame(allowed, row.game_id))) notFound();
  const gScope = gameScope(allowed, 'id');
  const games = await query<{ id: number; name: string }>(`SELECT id, name FROM games WHERE ${gScope.sql} ORDER BY sort_order, id`, gScope.params);

  return (
    <>
      <PageHead title={row ? 'Edit result' : 'Add result'} />
      <Flash sp={sp} />
      <form action={saveResult} className="card">
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <div className="grid grid-2">
          <Field label="Game" htmlFor="game_id">
            <select id="game_id" name="game_id" className="select" required defaultValue={row?.game_id ?? ''}>
              <option value="">Choose…</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Result date" htmlFor="result_date">
            <input id="result_date" name="result_date" type="date" className="input" required defaultValue={row?.result_date ?? istDate()} />
          </Field>
          <Field label="Result" htmlFor="result">
            <input id="result" name="result" className="input" maxLength={10} defaultValue={row?.result ?? ''} />
          </Field>
          <Field label="Status" htmlFor="status">
            <select id="status" name="status" className="select" defaultValue={row?.status ?? 'declared'}>
              <option value="waiting">Waiting</option>
              <option value="declared">Declared</option>
            </select>
          </Field>
          <Field label="Show in live box (minutes)" htmlFor="show_minutes" hint="0 = always show while it is the current result.">
            <input id="show_minutes" name="show_minutes" type="number" min={0} className="input" defaultValue={row?.show_minutes ?? 15} />
          </Field>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <Link className="btn" href="/admin/results">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
