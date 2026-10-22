import Link from 'next/link';
import { deletePost } from './actions';
import { DeleteForm } from '@/components/admin/ConfirmButton';
import { Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';
import { postDate } from '@/lib/blog';
import { uploadUrl } from '@/lib/settings';

export default async function BlogAdminPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage blog');
  const sp = await searchParams;
  const rows = await query<{
    id: number;
    title: string;
    slug: string;
    image: string | null;
    is_published: number;
    published_at: string | null;
    created_at: string | null;
    scheduled: number;
  }>(
    `SELECT id, title, slug, image, is_published, published_at, created_at,
            (published_at > UTC_TIMESTAMP()) AS scheduled
       FROM blog_posts ORDER BY COALESCE(published_at, created_at) DESC, id DESC`,
  );

  return (
    <>
      <PageHead
        title="Blog"
        sub="Published posts appear on the home page after the FAQ (latest 6), on /blog, and in the sitemap."
        actions={
          <Link className="btn btn-primary" href="/admin/blog/new">
            + Write post
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
              <th>Date</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  No posts yet. Click “Write post”.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.image ? <img src={uploadUrl(r.image) ?? ''} alt="" style={{ height: 40, borderRadius: 6 }} /> : '—'}</td>
                  <td>
                    <strong>{r.title}</strong>
                    <div className="muted">/blog/{r.slug}</div>
                  </td>
                  <td>{postDate(r)}</td>
                  <td>
                    {!r.is_published ? (
                      <span className="badge off">Draft</span>
                    ) : r.scheduled ? (
                      <span className="badge wait">Scheduled</span>
                    ) : (
                      <span className="badge ok">Published</span>
                    )}
                  </td>
                  <td className="actions">
                    {r.is_published && !r.scheduled ? (
                      <a className="btn btn-sm" href={`/blog/${r.slug}`} target="_blank" rel="noopener">
                        View
                      </a>
                    ) : null}
                    <Link className="btn btn-sm" href={`/admin/blog/${r.id}`}>
                      Edit
                    </Link>
                    <DeleteForm action={deletePost} id={r.id} message={`Delete "${r.title}"?`} />
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
