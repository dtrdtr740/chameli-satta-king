import Link from 'next/link';
import { deleteBlock } from './actions';
import { DeleteForm } from '@/components/admin/ConfirmButton';
import { Active, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';

export default async function ContentBlocksPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage content blocks');
  const sp = await searchParams;
  const rows = await query<{ id: number; key: string; title: string | null; game: string | null; year: number | null; is_active: number }>(
    `SELECT b.id, b.key, b.title, g.name AS game, b.year, b.is_active
       FROM content_blocks b LEFT JOIN games g ON g.id = b.game_id ORDER BY b.id DESC`,
  );
  return (
    <>
      <PageHead
        title="Content Blocks"
        sub="Extra content sections shown on a game's record page (below the chart)."
        actions={
          <Link className="btn btn-primary" href="/admin/content-blocks/new">
            + Add block
          </Link>
        }
      />
      <Flash sp={sp} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Key</th>
              <th>Game</th>
              <th>Year</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">
                  No content blocks.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.title || <span className="muted">(untitled)</span>}</td>
                  <td className="muted">{r.key}</td>
                  <td>{r.game ?? '—'}</td>
                  <td>{r.year ?? 'All'}</td>
                  <td>
                    <Active on={r.is_active} />
                  </td>
                  <td className="actions">
                    <Link className="btn btn-sm" href={`/admin/content-blocks/${r.id}`}>
                      Edit
                    </Link>
                    <DeleteForm action={deleteBlock} id={r.id} message="Delete this content block?" />
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
