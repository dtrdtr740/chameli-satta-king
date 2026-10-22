import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveBlock } from '../actions';
import { HtmlEditor } from '@/components/admin/HtmlEditor';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

export default async function BlockForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requirePermission('manage content blocks');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const row =
    id === 'new'
      ? null
      : await queryOne<{ id: number; key: string; title: string | null; content: string | null; game_id: number | null; year: number | null; is_active: number }>(
          'SELECT * FROM content_blocks WHERE id = ?',
          [Number(id)],
        );
  if (id !== 'new' && !row) notFound();
  const games = await query<{ id: number; name: string }>('SELECT id, name FROM games ORDER BY sort_order, id');

  return (
    <>
      <PageHead title={row ? 'Edit content block' : 'Add content block'} />
      <Flash sp={sp} />
      <form action={saveBlock} className="card">
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <div className="grid grid-2">
          <Field label="Title" htmlFor="title">
            <input id="title" name="title" className="input" defaultValue={row?.title ?? ''} />
          </Field>
          <Field label="Key" htmlFor="key" hint="Unique identifier. Generated from the title when empty.">
            <input id="key" name="key" className="input" defaultValue={row?.key ?? ''} />
          </Field>
          <Field label="Game" htmlFor="game_id">
            <select id="game_id" name="game_id" className="select" defaultValue={row?.game_id ?? ''}>
              <option value="">— none —</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year" htmlFor="year" hint="Empty = shown for every year.">
            <input id="year" name="year" type="number" className="input" defaultValue={row?.year ?? ''} />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ fontWeight: 600 }}>Content</label>
          <HtmlEditor name="content" defaultValue={row?.content ?? ''} rows={14} />
        </div>
        <label className="check" style={{ marginTop: 12 }}>
          <input type="checkbox" name="is_active" defaultChecked={row ? !!row.is_active : true} /> Active
        </label>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <Link className="btn" href="/admin/content-blocks">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
