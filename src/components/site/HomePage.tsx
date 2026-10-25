import Link from 'next/link';
import { AdBox, getAds } from './Ads';
import { AutoRefresh } from './AutoRefresh';
import { BlogCards } from './BlogCards';
import { WhatsAppBanner } from './WhatsAppSection';
import { latestPosts } from '@/lib/blog';
import { LiveClock } from './LiveClock';
import { CmsContent, SchemaMarkup } from './SchemaMarkup';
import { YearChart } from './YearChart';
import { getHomeData, getYearGrid, type Game } from '@/lib/results';
import { pageSeo, toMetadata } from '@/lib/seo';
import { FEATURED_ANCHOR, gameHref, getSettings, type Settings } from '@/lib/settings';
import { activeSection } from '@/lib/whatsapp';
import { MONTHS, formatTime12, padResult } from '@/lib/time';

const FALLBACK = {
  title: '{site} | Satta King Live Result Today',
  description: 'Check {site} for Satta King live results, charts and daily updates.',
};

export async function homeMetadata(pageKey: string, path: string) {
  return toMetadata(await pageSeo(pageKey, path, FALLBACK));
}

function Waiting({ eager }: { eager?: boolean }) {
  return <img className="wait-img" src="/wait.gif" alt="waiting" width={40} height={40} loading={eager ? 'eager' : 'lazy'} />;
}

export async function HomePage({ pageKey, path }: { pageKey: string; path: string }) {
  const [data, ads, settings, seo, posts, waTop, waAfterLive, waMiddle] = await Promise.all([
    getHomeData(),
    getAds(),
    getSettings(),
    pageSeo(pageKey, path, FALLBACK),
    latestPosts(6),
    activeSection('top'),
    activeSection('after_live'),
    activeSection('middle'),
  ]);
  const [, month] = data.today.split('-').map(Number);
  const year = data.today.slice(0, 4);
  const hint = settings.live_hint_text;
  const featuredGame = data.games.find((g) => settings.featured_game && g.slug === settings.featured_game);
  const featured = featuredGame ? { game: featuredGame, grid: (await getYearGrid(featuredGame.id, Number(year))).grid } : null;
  // Real ads without their own link fall back to the WhatsApp channel.
  const channel = waTop?.link ?? waMiddle?.link ?? null;

  return (
    <>
      <AutoRefresh seconds={60} />
      <SchemaMarkup markup={seo.schema} />

      {/* Permanent WhatsApp banners are managed in Admin -> WhatsApp Sections; real ads in Advertisements. */}
      <WhatsAppBanner section={waTop} />
      {ads.top.map((ad) => (
        <AdBox key={ad.id} ad={ad} fallbackLink={channel} />
      ))}

      <section id="live" className="live-box" aria-label="Live results">
        <LiveClock />
        {hint ? <p className="live-hint">{hint}</p> : null}
        {data.liveGames.length === 0 ? (
          <p className="live-name">No games found</p>
        ) : (
          data.liveGames.map((g) => (
            <div key={g.id}>
              <p className="live-name">{g.name}</p>
              <div className="live-result">
                {g.state === 'declared' ? padResult(g.result) : <Waiting eager />}
              </div>
            </div>
          ))
        )}
      </section>

      <WhatsAppBanner section={waAfterLive} />
      {ads.bottom ? <AdBox ad={ads.bottom} fallbackLink={channel} /> : null}
      <WhatsAppBanner section={waMiddle} variant="middle" />
      {ads.middle ? <AdBox ad={ads.middle} variant="middle" fallbackLink={channel} /> : null}
      {ads.sidebar ? <AdBox ad={ads.sidebar} fallbackLink={channel} /> : null}

      {/* One today/yesterday table and one monthly chart for every game, in Admin -> Games order. */}
      <div id="today" className="section">
        <section className="result-section" aria-label="Today and yesterday results">
          <ResultTable games={data.games} data={data} settings={settings} />
        </section>
      </div>

      <div id="monthly" className="section">
        <h2 className="band-title">
          {MONTHS[month - 1]} Result Chart {year}
        </h2>
        <MonthTable games={data.games} data={data} />
        <p className="scroll-hint">मोबाइल पर पूरा चार्ट देखने के लिए left-right scroll करें</p>
      </div>

      {/* This site's featured game (Admin -> Site Settings): its result and full yearly chart. */}
      {featured ? (
        <section id={FEATURED_ANCHOR} className="section" aria-labelledby="featured-heading">
          <h2 id="featured-heading" className="band-title">
            {featured.game.name} Result Chart {year}
          </h2>
          <ResultTable games={[featured.game]} data={data} settings={settings} />
          <YearChart year={Number(year)} grid={featured.grid} />
        </section>
      ) : null}

      {/* Article + FAQ (editable in SEO & Content), then the latest blog posts. */}
      <CmsContent html={seo.content} />

      {posts.length > 0 ? (
        <section id="blog" className="section" aria-labelledby="blog-heading">
          <h2 id="blog-heading" className="band-title">
            Blog
          </h2>
          <BlogCards posts={posts} />
          <p className="center" style={{ margin: '14px 0 4px' }}>
            <Link href="/blog" className="btn-dark">
              View All Blogs
            </Link>
          </p>
        </section>
      ) : null}
    </>
  );
}

function ResultTable({ games, data, settings }: { games: Game[]; data: Awaited<ReturnType<typeof getHomeData>>; settings: Settings }) {
  return (
    <div className="table-scroll">
      <table className="result-table">
        <thead>
          <tr>
            <th scope="col">सट्टा का नाम</th>
            <th scope="col">कल आया था</th>
            <th scope="col">आज का रिज़ल्ट</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => {
            const y = data.yesterdayResults[g.id]?.result;
            const t = data.todayTable[g.id]?.result;
            return (
              <tr key={g.id}>
                <td className="game-cell">
                  <Link href={gameHref(g.slug, settings)} prefetch={false}>
                    {g.name.toUpperCase()}
                  </Link>
                  {g.result_time ? <span className="game-time">{formatTime12(g.result_time)}</span> : null}
                </td>
                <td className="num">{y ? padResult(y) : '-'}</td>
                <td className="num">{t ? padResult(t) : <Waiting />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonthTable({ games, data }: { games: Game[]; data: Awaited<ReturnType<typeof getHomeData>> }) {
  return (
    <div className="month-card">
      <table className="month-table">
        <thead>
          <tr>
            <th className="sticky" scope="col">Date</th>
            {games.map((g) => (
              <th key={g.id} scope="col">
                {g.name.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.monthDates.map((date) => {
            const day = data.monthly[date] ?? {};
            return (
              <tr key={date} className={date === data.today ? 'is-today' : undefined}>
                <td className="sticky">{date.slice(8)}</td>
                {games.map((g) => (
                  <td key={g.id}>{day[g.id] ? <b className="chip">{padResult(day[g.id])}</b> : <span className="dash">-</span>}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
