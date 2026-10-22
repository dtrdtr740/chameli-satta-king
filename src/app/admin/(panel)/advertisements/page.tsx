import Link from 'next/link';
import { deleteAd } from './actions';
import { DeleteForm } from '@/components/admin/ConfirmButton';
import { Active, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';
import { uploadUrl } from '@/lib/settings';

export default async function AdsPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage advertisements');
  const sp = await searchParams;
  const rows = await query<{ id: number; title: string | null; position: string | null; image: string | null; link: string | null; is_active: number }>(
    'SELECT id, title, position, image, link, is_active FROM advertisements ORDER BY id DESC',
  );
  return (
    <>
      <PageHead
        title="Advertisements"
        sub="Top: every active ad is shown. Middle / bottom / sidebar: only the newest active ad is shown."
        actions={
          <Link className="btn btn-primary" href="/admin/advertisements/new">
            + Add advertisement
          </Link>
        }
      />
      <Flash sp={sp} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Position</th>
              <th>Link</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  No advertisements.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.image ? <img src={uploadUrl(r.image) ?? ''} alt="" style={{ height: 36 }} /> : '—'}</td>
                  <td>{r.title || <span className="muted">(untitled)</span>}</td>
                  <td>
                    <span className="badge">{r.position}</span>
                  </td>
                  <td className="muted" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.link || '—'}
                  </td>
                  <td>
                    <Active on={r.is_active} />
                  </td>
                  <td className="actions">
                    <Link className="btn btn-sm" href={`/admin/advertisements/${r.id}`}>
                      Edit
                    </Link>
                    <DeleteForm action={deleteAd} id={r.id} message="Delete this advertisement?" />
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
