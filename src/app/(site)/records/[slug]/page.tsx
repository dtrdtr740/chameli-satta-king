import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { CmsContent, SchemaMarkup } from '@/components/site/SchemaMarkup';
import { YearChart } from '@/components/site/YearChart';
import { query } from '@/lib/db';
import { getGameBySlug, getGameYears, getYearGrid } from '@/lib/results';
import { getSeoByKey, getSeoForGame, resolveSeo, toMetadata } from '@/lib/seo';
import { gameHref, getSettings } from '@/lib/settings';
import { istYear } from '@/lib/time';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ year?: string }> };

function pickYear(raw: string | undefined) {
  const y = Number(raw);
  return Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : istYear();
}

async function load(slug: string, year: number) {
  const game = await getGameBySlug(slug);
  if (!game) return null;
  // Per-game SEO wins; otherwise the "game-record" template with {game}/{slug}/{year} placeholders.
  const seoRow = (await getSeoForGame(game.id)) ?? (await getSeoByKey('game-record'));
  const path = year === istYear() ? `/records/${game.slug}` : `/records/${game.slug}?year=${year}`;
  const seo = await resolveSeo(
    seoRow,
    path,
    { title: `${game.name} Record Chart ${year}`, description: `${game.name} record chart ${year}, old results and complete satta chart.` },
    { game: game.name, slug: game.slug, year },
  );
  return { game, seo, path };
}

export async function generateMetadata({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const data = await load(slug, pickYear(sp.year));
  return data ? toMetadata(data.seo) : {};
}

export default async function RecordPage({ params, searchParams }: Props) {
  const [{ slug }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  // This site's featured game is shown on the home page instead of a record page.
  if (settings.featured_game && slug === settings.featured_game) redirect(gameHref(slug, settings));
  const year = pickYear(sp.year);
  const data = await load(slug, year);
  if (!data) notFound();
  const { game, seo } = data;

  const [{ grid }, gameYears, blocks] = await Promise.all([
    getYearGrid(game.id, year),
    getGameYears(game.id),
    query<{ id: number; title: string | null; content: string | null }>(
      `SELECT id, title, content FROM content_blocks
        WHERE game_id = ? AND is_active = 1 AND (year IS NULL OR year = ?) ORDER BY id`,
      [game.id, year],
    ),
  ]);
  const thisYear = istYear();
  // Keep the requested year as a tab even if it's hidden/empty, so the visitor can see where they are.
  const years = [...new Set([...(gameYears.get(game.id) ?? [thisYear]), year])].sort((a, b) => b - a);

  return (
    <div className="section">
      <SchemaMarkup markup={seo.schema} />
      <h1 className="page-title">
        {game.name} Record Chart {year}
      </h1>

      {years.length > 1 && (
        <nav className="year-tabs" aria-label="Year">
          {years.map((y) => (
            <Link
              key={y}
              href={y === thisYear ? `/records/${game.slug}` : `/records/${game.slug}?year=${y}`}
              aria-current={y === year ? 'page' : undefined}
            >
              {y}
            </Link>
          ))}
        </nav>
      )}

      <YearChart year={year} grid={grid} />

      <CmsContent html={seo.content} />

      {blocks.map((b) => (
        <div key={b.id} className="content-block cms">
          {b.title ? <h2>{b.title}</h2> : null}
          <div dangerouslySetInnerHTML={{ __html: b.content ?? '' }} />
        </div>
      ))}

      <p className="center" style={{ margin: '16px 0' }}>
        <Link href="/chart" className="btn-dark">
          Back To Chart
        </Link>
      </p>
    </div>
  );
}
