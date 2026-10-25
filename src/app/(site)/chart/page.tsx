import { ChartList } from '@/components/site/ChartList';
import { CmsContent, SchemaMarkup } from '@/components/site/SchemaMarkup';
import { getActiveGames, getGameYears } from '@/lib/results';
import { pageSeo, toMetadata } from '@/lib/seo';
import { gameHref, getSettings } from '@/lib/settings';
import { istYear } from '@/lib/time';

const FALLBACK = { title: 'Satta King Record Chart {year} | {site}', description: 'Satta King record chart for every game on {site}.' };

export async function generateMetadata() {
  return toMetadata(await pageSeo('chart', '/chart', FALLBACK));
}

export default async function ChartPage() {
  const [games, years, seo, settings] = await Promise.all([getActiveGames(), getGameYears(), pageSeo('chart', '/chart', FALLBACK), getSettings()]);
  const currentYear = istYear();
  const rows = games.map((g) => {
    const ys = years.get(g.id) ?? [currentYear];
    const links = Object.fromEntries([...ys, currentYear].map((y) => [y, gameHref(g.slug, settings, y === currentYear ? undefined : y)]));
    return { id: g.id, name: g.name, years: ys, links };
  });

  return (
    <div className="section">
      <SchemaMarkup markup={seo.schema} />
      <h1 className="page-title">Satta Chart</h1>
      <ChartList games={rows} currentYear={currentYear} />
      <CmsContent html={seo.content} />
    </div>
  );
}
