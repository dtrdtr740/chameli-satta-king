import Link from 'next/link';
import { deleteSeoPage } from './actions';
import { DeleteForm } from '@/components/admin/ConfirmButton';
import { Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function SeoPagesPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage seo pages');
  const sp = await searchParams;
  const rows = await query<{ id: number; page_key: string | null; game: string | null; year: number | null; meta_title: string | null; updated_at: string }>(
    `SELECT s.id, s.page_key, g.name AS game, s.year, s.meta_title, s.updated_at
       FROM seo_pages s LEFT JOIN games g ON g.id = s.game_id ORDER BY s.updated_at DESC`,
  );
  return (
    <>
      <PageHead
        title="SEO Pages"
        sub="Raw list of every SEO record. For day-to-day edits, use SEO & Content."
        actions={
          <>
            <Link className="btn" href="/admin/seo-content">
              Open SEO &amp; Content
            </Link>
            <Link className="btn btn-primary" href="/admin/seo-pages/new">
              + Add SEO page
            </Link>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Page key</th>
              <th>Game</th>
              <th>Year</th>
              <th>Meta title</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  No SEO pages.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.page_key ?? <span className="muted">—</span>}</td>
                  <td>{r.game ?? <span className="muted">—</span>}</td>
                  <td>{r.year ?? <span className="muted">—</span>}</td>
                  <td>{r.meta_title}</td>
                  <td className="muted">{r.updated_at}</td>
                  <td className="actions">
                    <Link className="btn btn-sm" href={`/admin/seo-pages/${r.id}`}>
                      Edit
                    </Link>
                    <DeleteForm action={deleteSeoPage} id={r.id} message="Delete this SEO page?" />
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
