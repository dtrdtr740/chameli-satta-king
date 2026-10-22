import { saveSeoContent } from './actions';
import { PageList, type ListItem } from './PageList';
import { HtmlEditor } from '@/components/admin/HtmlEditor';
import { SeoFields } from '@/components/admin/SeoFields';
import { Field, Flash, PageHead, one, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';
import { SITE_PAGES, type SeoPage } from '@/lib/seo';
import { getSettings, siteUrl, uploadUrl } from '@/lib/settings';

function status(row: SeoPage | undefined): ListItem['status'] {
  if (!row || (!row.meta_title && !row.meta_description)) return 'off';
  return row.meta_title && row.meta_description ? 'ok' : 'warn';
}

export default async function SeoContentPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage seo & content');
  const sp = await searchParams;
  const pageKey = one(sp.page);
  const gameId = Number(one(sp.game)) || null;

  const [settings, rows, games] = await Promise.all([
    getSettings(),
    query<SeoPage>('SELECT * FROM seo_pages'),
    query<{ id: number; name: string; slug: string }>('SELECT id, name, slug FROM games ORDER BY sort_order, id'),
  ]);
  const byKey = new Map(rows.filter((r) => r.page_key).map((r) => [r.page_key as string, r]));
  const byGame = new Map(rows.filter((r) => r.game_id && r.year === null).map((r) => [r.game_id as number, r]));

  const selectedKey = gameId ? null : pageKey && SITE_PAGES.some((p) => p.key === pageKey) ? pageKey : 'home';
  const game = gameId ? games.find((g) => g.id === gameId) : undefined;
  const row = game ? byGame.get(game.id) : byKey.get(selectedKey as string);
  const sitePage = SITE_PAGES.find((p) => p.key === selectedKey);
  const base = siteUrl();
  const path = game ? `/records/${game.slug}` : (sitePage?.path ?? '/');
  const title = game ? `${game.name} record page` : (sitePage?.label ?? '');
  const vars: Record<string, string> = game
    ? { game: game.name, slug: game.slug }
    : selectedKey === 'game-record'
      ? { game: 'Gali', slug: 'gali' }
      : {};

  const items: ListItem[] = [
    ...SITE_PAGES.map((p) => ({
      href: `/admin/seo-content?page=${p.key}`,
      label: p.label,
      sub: p.path,
      status: status(byKey.get(p.key)),
      current: !game && p.key === selectedKey,
      group: 'Site pages',
    })),
    ...games.map((g) => ({
      href: `/admin/seo-content?game=${g.id}`,
      label: g.name,
      sub: byGame.has(g.id) ? `/records/${g.slug}` : `/records/${g.slug} · uses template`,
      status: status(byGame.get(g.id)),
      current: game?.id === g.id,
      group: 'Game record pages',
    })),
  ];

  const placeholderHelp = `Placeholders: {site} = ${settings.site_name}, {year} = current year, {domain} = ${base}${
    game || selectedKey === 'game-record' ? ', {game} = game name, {slug} = game slug' : ''
  }`;

  return (
    <>
      <PageHead
        title="SEO & Content"
        sub="Edit the meta title, meta description and the written content of every page in one place."
      />
      <Flash sp={sp} />
      <div className="seo-layout">
        <PageList items={items} />

        <form action={saveSeoContent} key={game ? `g${game.id}` : selectedKey ?? ''}>
          {game ? <input type="hidden" name="game_id" value={game.id} /> : <input type="hidden" name="page_key" value={selectedKey ?? ''} />}

          <div className="card">
            <div className="page-head" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>{title}</h2>
              <div className="actions">
                {!path.includes('{') ? (
                  <a className="btn btn-sm" href={path} target="_blank" rel="noopener">
                    Open page ↗
                  </a>
                ) : null}
              </div>
              {game && !row ? (
                <p>This game uses the “Game record (default template)” SEO until you save something here.</p>
              ) : null}
            </div>
            <SeoFields
              title={row?.meta_title ?? ''}
              description={row?.meta_description ?? ''}
              keywords={row?.meta_keywords ?? ''}
              url={`${base}${path.replace('{slug}', 'gali')}`}
              siteName={settings.site_name}
              vars={vars}
            />
            <p className="hint muted" style={{ marginBottom: 0 }}>
              {placeholderHelp}
            </p>
          </div>

          <div className="card">
            <h2>Page content</h2>
            <p className="muted" style={{ marginTop: -6 }}>
              {selectedKey?.startsWith('home')
                ? 'Shown below the result tables and monthly chart.'
                : game || selectedKey === 'game-record'
                  ? 'Shown below the record chart.'
                  : 'The main body of this page.'}
            </p>
            <HtmlEditor name="page_content" defaultValue={row?.page_content ?? ''} placeholders={placeholderHelp} />
          </div>

          <details className="card">
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Social sharing, canonical &amp; schema (advanced)</summary>
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <Field label="OG title" htmlFor="og_title" hint="Defaults to the meta title.">
                <input id="og_title" name="og_title" className="input" defaultValue={row?.og_title ?? ''} />
              </Field>
              <Field label="Canonical URL" htmlFor="canonical_url" hint="Leave empty to use the page's own URL.">
                <input id="canonical_url" name="canonical_url" className="input" defaultValue={row?.canonical_url ?? ''} placeholder={`${base}${path}`} />
              </Field>
              <Field label="OG description" htmlFor="og_description" hint="Defaults to the meta description.">
                <textarea id="og_description" name="og_description" className="textarea" rows={3} defaultValue={row?.og_description ?? ''} />
              </Field>
              <Field label="OG image" htmlFor="og_image" hint="PNG/JPG/WEBP, up to 4 MB. 1200×630 works best.">
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
            <Field label="Schema markup (JSON-LD)" htmlFor="schema_markup" hint='Raw JSON or a full <script type="application/ld+json"> tag.'>
              <textarea id="schema_markup" name="schema_markup" className="textarea code" style={{ minHeight: 160 }} defaultValue={row?.schema_markup ?? ''} />
            </Field>
          </details>

          <div className="sticky-save">
            <button className="btn btn-primary" type="submit">
              💾 Save SEO &amp; content
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
