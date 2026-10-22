import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveSeoPage } from '../actions';
import { HtmlEditor } from '@/components/admin/HtmlEditor';
import { SeoFields } from '@/components/admin/SeoFields';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import type { SeoPage } from '@/lib/seo';
import { getSettings, siteUrl, uploadUrl } from '@/lib/settings';

export default async function SeoPageForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requirePermission('manage seo pages');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const row = id === 'new' ? null : await queryOne<SeoPage>('SELECT * FROM seo_pages WHERE id = ?', [Number(id)]);
  if (id !== 'new' && !row) notFound();
  const [games, settings] = await Promise.all([
    query<{ id: number; name: string }>('SELECT id, name FROM games ORDER BY sort_order, id'),
    getSettings(),
  ]);

  return (
    <>
      <PageHead title={row ? 'Edit SEO page' : 'Add SEO page'} />
      <Flash sp={sp} />
      <form action={saveSeoPage} className="card">
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <div className="grid grid-3">
          <Field label="Page key" htmlFor="page_key" hint="home, home_2, home_3, chart, game-record, contact-us, privacy-policy, terms-conditions">
            <input id="page_key" name="page_key" className="input" defaultValue={row?.page_key ?? ''} />
          </Field>
          <Field label="Game" htmlFor="game_id" hint="For a game-specific record page.">
            <select id="game_id" name="game_id" className="select" defaultValue={row?.game_id ?? ''}>
              <option value="">— none —</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Year" htmlFor="year" hint="Leave empty for the main record page.">
            <input id="year" name="year" type="number" className="input" defaultValue={row?.year ?? ''} />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <SeoFields
            title={row?.meta_title ?? ''}
            description={row?.meta_description ?? ''}
            keywords={row?.meta_keywords ?? ''}
            url={siteUrl()}
            siteName={settings.site_name}
          />
        </div>
        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <Field label="Canonical URL" htmlFor="canonical_url">
            <input id="canonical_url" name="canonical_url" className="input" defaultValue={row?.canonical_url ?? ''} />
          </Field>
          <Field label="OG title" htmlFor="og_title">
            <input id="og_title" name="og_title" className="input" defaultValue={row?.og_title ?? ''} />
          </Field>
          <Field label="OG description" htmlFor="og_description">
            <textarea id="og_description" name="og_description" className="textarea" rows={3} defaultValue={row?.og_description ?? ''} />
          </Field>
          <Field label="OG image" htmlFor="og_image">
            <input id="og_image" name="og_image" type="file" accept="image/png,image/jpeg,image/webp" className="input" />
            {row?.og_image ? (
              <span style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                <img src={uploadUrl(row.og_image) ?? ''} alt="" style={{ height: 48, borderRadius: 6 }} />
                <label className="check">
                  <input type="checkbox" name="remove_og_image" /> Remove
                </label>
              </span>
            ) : null}
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <Field label="Schema markup" htmlFor="schema_markup">
            <textarea id="schema_markup" name="schema_markup" className="textarea code" style={{ minHeight: 140 }} defaultValue={row?.schema_markup ?? ''} />
          </Field>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ fontWeight: 600 }}>Page content</label>
          <HtmlEditor name="page_content" defaultValue={row?.page_content ?? ''} rows={12} />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Save
          </button>
          <Link className="btn" href="/admin/seo-pages">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
