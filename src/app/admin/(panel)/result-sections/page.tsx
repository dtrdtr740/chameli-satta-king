import { revalidatePath } from 'next/cache';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { execute, query, transaction } from '@/lib/db';
import { done, idList, intOrNull, str } from '@/lib/form';
import { getSettings } from '@/lib/settings';
import { formatTime12 } from '@/lib/time';

const P = 'manage games';

async function saveSections(fd: FormData) {
  'use server';
  await requirePermission(P);
  const ids = idList(fd, 'ids');
  await transaction(async (conn) => {
    for (const id of ids) {
      const section = intOrNull(fd, `section_${id}`) === 2 ? 2 : 1;
      const order = intOrNull(fd, `order_${id}`);
      await conn.query('UPDATE games SET result_section = ?, sort_order = COALESCE(?, sort_order), updated_at = NOW() WHERE id = ?', [
        section,
        order,
        id,
      ]);
    }
  });
  for (const key of ['section_1_title', 'section_2_title']) {
    await execute(
      'INSERT INTO site_settings (`key`, `value`, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = NOW()',
      [key, str(fd, key)],
    );
  }
  revalidatePath('/', 'layout');
  done('/admin/result-sections', 'Result sections saved.');
}

export default async function ResultSectionsPage({ searchParams }: { searchParams: SP }) {
  await requirePermission(P);
  const [sp, settings, games] = await Promise.all([
    searchParams,
    getSettings(),
    query<{ id: number; name: string; result_time: string | null; sort_order: number; result_section: number; is_active: number }>(
      'SELECT id, name, result_time, sort_order, result_section, is_active FROM games ORDER BY result_section, sort_order, id',
    ),
  ]);
  const count = (n: number) => games.filter((g) => g.is_active && (g.result_section === 2 ? 2 : 1) === n).length;

  return (
    <>
      <PageHead
        title="Result Sections"
        sub="The home page shows today's and yesterday's results in two tables. Choose which games go in the first and which in the second; order sorts games inside each section."
      />
      <Flash sp={sp} />

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="stat">
          <b>{count(1)}</b>
          <span>active games in Section 1</span>
        </div>
        <div className="stat">
          <b>{count(2)}</b>
          <span>active games in Section 2</span>
        </div>
      </div>

      <form action={saveSections}>
        <div className="card grid grid-2">
          <Field label="Section 1 heading" htmlFor="section_1_title" hint="Optional. Shown above the first table.">
            <input id="section_1_title" name="section_1_title" className="input" defaultValue={settings.section_1_title} placeholder="e.g. दिन के गेम" />
          </Field>
          <Field label="Section 2 heading" htmlFor="section_2_title" hint="Optional. Shown above the second table.">
            <input id="section_2_title" name="section_2_title" className="input" defaultValue={settings.section_2_title} placeholder="e.g. रात के गेम" />
          </Field>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Game</th>
                <th>Time</th>
                <th>Section</th>
                <th>Order</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td>
                    <input type="hidden" name="ids" value={g.id} />
                    <strong>{g.name}</strong>
                  </td>
                  <td className="muted">{formatTime12(g.result_time) || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 14 }}>
                      <label className="check">
                        <input type="radio" name={`section_${g.id}`} value="1" defaultChecked={g.result_section !== 2} /> Section 1
                      </label>
                      <label className="check">
                        <input type="radio" name={`section_${g.id}`} value="2" defaultChecked={g.result_section === 2} /> Section 2
                      </label>
                    </div>
                  </td>
                  <td>
                    <input
                      className="input"
                      style={{ width: 80 }}
                      type="number"
                      min={0}
                      name={`order_${g.id}`}
                      defaultValue={g.sort_order}
                      aria-label={`${g.name} order`}
                    />
                  </td>
                  <td>{g.is_active ? <span className="badge ok">Active</span> : <span className="badge off">Inactive (hidden)</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sticky-save">
          <button className="btn btn-primary" type="submit">
            💾 Save sections
          </button>
        </div>
      </form>
    </>
  );
}
