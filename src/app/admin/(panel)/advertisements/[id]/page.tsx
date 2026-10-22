import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveAd } from '../actions';
import { HtmlEditor } from '@/components/admin/HtmlEditor';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { uploadUrl } from '@/lib/settings';

const POSITIONS = ['top', 'middle', 'bottom', 'sidebar'];

export default async function AdForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requirePermission('manage advertisements');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const row =
    id === 'new'
      ? null
      : await queryOne<{ id: number; title: string | null; position: string | null; content: string | null; image: string | null; link: string | null; is_active: number }>(
          'SELECT * FROM advertisements WHERE id = ?',
          [Number(id)],
        );
  if (id !== 'new' && !row) notFound();

  return (
    <>
      <PageHead title={row ? 'Edit advertisement' : 'Add advertisement'} />
      <Flash sp={sp} />
      <form action={saveAd} className="card">
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <div className="grid grid-3">
          <Field label="Title" htmlFor="title">
            <input id="title" name="title" className="input" defaultValue={row?.title ?? ''} />
          </Field>
          <Field label="Position" htmlFor="position">
            <select id="position" name="position" className="select" defaultValue={row?.position ?? 'top'}>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Link" htmlFor="link">
            <input id="link" name="link" className="input" defaultValue={row?.link ?? ''} placeholder="https://" />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Image" htmlFor="image" hint="PNG/JPG/WEBP/GIF, up to 4 MB.">
            <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="input" />
            {row?.image ? (
              <span style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                <img src={uploadUrl(row.image) ?? ''} alt="" style={{ height: 48 }} />
                <label className="check">
                  <input type="checkbox" name="remove_image" /> Remove
                </label>
              </span>
            ) : null}
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ fontWeight: 600 }}>Content (HTML)</label>
          <HtmlEditor name="content" defaultValue={row?.content ?? ''} rows={8} />
        </div>
        <label className="check" style={{ marginTop: 12 }}>
          <input type="checkbox" name="is_active" defaultChecked={row ? !!row.is_active : true} /> Active
        </label>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <Link className="btn" href="/admin/advertisements">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
