import Link from 'next/link';
import { ImportForm } from './ImportForm';
import { Flash, PageHead, one, type SP } from '@/components/admin/ui';
import { assignedGameIds, gameScope, requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';
import { istYear } from '@/lib/time';

export default async function ImportResultsPage({ searchParams }: { searchParams: SP }) {
  const user = await requirePermission('manage game results');
  const sp = await searchParams;
  const scope = gameScope(await assignedGameIds(user), 'id');
  const games = await query<{ id: number; name: string; is_active: number }>(
    `SELECT id, name, is_active FROM games WHERE ${scope.sql} ORDER BY is_active DESC, sort_order, id`,
    scope.params,
  );
  const thisYear = istYear();
  const years = Array.from({ length: thisYear - 2014 }, (_, i) => thisYear - i);
  const gameId = Number(one(sp.game)) || games[0]?.id || 0;
  const year = Number(one(sp.year)) || thisYear;

  return (
    <>
      <PageHead
        title="Import Results from Excel"
        sub="Add or update a game's past results for a whole year at once: choose the game and year, download the template, fill it in and upload it. You see a preview before anything is saved."
        actions={
          <Link className="btn" href="/admin/results">
            ← Game Results
          </Link>
        }
      />
      <Flash sp={sp} />
      <ImportForm games={games.map((g) => ({ id: g.id, name: g.is_active ? g.name : `${g.name} (inactive)` }))} years={years} gameId={gameId} year={year} />
      <div className="card" style={{ marginTop: 16 }}>
        <h2>File format</h2>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>One game and one year per file: day numbers 1–31 in the first column, months (Jan, Feb … Dec) in the header row — the same layout as the yearly chart.</li>
          <li>Results are numbers 00–99. Empty cells, &quot;-&quot;, &quot;*&quot; and &quot;XX&quot; are skipped.</li>
          <li>Only dates up to yesterday are imported; today&apos;s result goes through Today Result Update.</li>
          <li>Excel (.xlsx) or CSV. For an old .xls file, open it in Excel and save it as .xlsx.</li>
        </ul>
      </div>
    </>
  );
}
