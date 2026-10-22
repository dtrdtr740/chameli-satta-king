import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { DeleteForm } from '@/components/admin/ConfirmButton';
import { Active, Field, Flash, PageHead, one, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { execute, query, queryOne } from '@/lib/db';
import { bool, done, intOrNull, strOrNull } from '@/lib/form';

const P = 'manage notices';

async function saveNotice(fd: FormData) {
  'use server';
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  const values = [strOrNull(fd, 'title'), strOrNull(fd, 'message'), bool(fd, 'is_active')];
  if (id) await execute('UPDATE notices SET title=?, message=?, is_active=?, updated_at=NOW() WHERE id=?', [...values, id]);
  else await execute('INSERT INTO notices (title, message, is_active, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', values);
  revalidatePath('/', 'layout');
  done('/admin/notices', 'Notice saved.');
}

async function deleteNotice(fd: FormData) {
  'use server';
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  if (id) await execute('DELETE FROM notices WHERE id = ?', [id]);
  revalidatePath('/', 'layout');
  done('/admin/notices', 'Notice deleted.');
}

export default async function NoticesPage({ searchParams }: { searchParams: SP }) {
  await requirePermission(P);
  const sp = await searchParams;
  const editId = Number(one(sp.edit)) || null;
  const [rows, editing] = await Promise.all([
    query<{ id: number; title: string | null; message: string | null; is_active: number }>('SELECT * FROM notices ORDER BY id DESC'),
    editId ? queryOne<{ id: number; title: string | null; message: string | null; is_active: number }>('SELECT * FROM notices WHERE id = ?', [editId]) : null,
  ]);

  return (
    <>
      <PageHead title="Notices" sub="Active notices appear in a strip below the site header." />
      <Flash sp={sp} />
      <form action={saveNotice} className="card" key={editing?.id ?? 'new'}>
        <h2>{editing ? 'Edit notice' : 'New notice'}</h2>
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <div className="grid grid-2">
          <Field label="Title" htmlFor="title">
            <input id="title" name="title" className="input" defaultValue={editing?.title ?? ''} />
          </Field>
          <Field label="Message (HTML allowed)" htmlFor="message">
            <textarea id="message" name="message" className="textarea" rows={2} defaultValue={editing?.message ?? ''} />
          </Field>
        </div>
        <div className="form-actions" style={{ alignItems: 'center' }}>
          <label className="check">
            <input type="checkbox" name="is_active" defaultChecked={editing ? !!editing.is_active : true} /> Active
          </label>
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          {editing ? (
            <Link className="btn" href="/admin/notices">
              Cancel
            </Link>
          ) : null}
        </div>
      </form>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Message</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty">
                  No notices.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.title || '—'}</td>
                  <td className="muted">{(r.message ?? '').replace(/<[^>]+>/g, '').slice(0, 120)}</td>
                  <td>
                    <Active on={r.is_active} />
                  </td>
                  <td className="actions">
                    <Link className="btn btn-sm" href={`/admin/notices?edit=${r.id}`}>
                      Edit
                    </Link>
                    <DeleteForm action={deleteNotice} id={r.id} message="Delete this notice?" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
