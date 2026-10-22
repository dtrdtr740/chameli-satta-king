import Link from 'next/link';
import { AdBox, getAds } from './Ads';
import { AutoRefresh } from './AutoRefresh';
import { BlogCards } from './BlogCards';
import { WhatsAppChannel, WhatsAppContact } from './WhatsAppSection';
import { latestPosts } from '@/lib/blog';
import { LiveClock } from './LiveClock';
import { CmsContent, SchemaMarkup } from './SchemaMarkup';
import { getHomeData, type Game } from '@/lib/results';
import { pageSeo, toMetadata } from '@/lib/seo';
import { SETTING_DEFAULTS, getSettings, uploadUrl } from '@/lib/settings';
import { MONTHS, formatTime12, padResult } from '@/lib/time';

// Monthly chart split, same as the original site (18 games per table).
const CHUNK = 18;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const FALLBACK = {
  title: '{site} | Satta King Live Result Today',
  description: 'Check {site} for Satta King live results, charts and daily updates.',
};

export async function homeMetadata(pageKey: string, path: string) {
  return toMetadata(await pageSeo(pageKey, path, FALLBACK));
}

/**
 * Middle "Join WhatsApp" banner, same as the original: the middle ad's text (or the default line) plus a
 * button image. Uses the middle ad's link, else the WhatsApp channel URL from Site Settings; hidden when neither is set.
 */
function WhatsAppBanner({ content, text, image, alt, link }: { content: string | null; text: string; image: string; alt: string; link: string | null }) {
  if (!link) return null;
  return (
    <section className="ad-wrap">
      <div className="ad-box middle">
        {content ? <div dangerouslySetInnerHTML={{ __html: content }} /> : <span className="rv-ad-heading">{text}</span>}
        <a href={link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <span className="ad-img">
            <img src={image} alt={alt} width={159} height={55} loading="lazy" decoding="async" />
          </span>
        </a>
      </div>
    </section>
  );
}

function Waiting({ eager }: { eager?: boolean }) {
  return <img className="wait-img" src="/wait.gif" alt="waiting" width={40} height={40} loading={eager ? 'eager' : 'lazy'} />;
}

export async function HomePage({ pageKey, path }: { pageKey: string; path: string }) {
  const [data, ads, settings, seo, posts] = await Promise.all([
    getHomeData(),
    getAds(),
    getSettings(),
    pageSeo(pageKey, path, FALLBACK),
    latestPosts(6),
  ]);
  const [, month] = data.today.split('-').map(Number);
  const year = data.today.slice(0, 4);
  const hint = settings.live_hint_text;
  const channel = settings.whatsapp_channel_url || null;

  return (
    <>
      <AutoRefresh seconds={60} />
      <SchemaMarkup markup={seo.schema} />

      {/* Permanent WhatsApp channel banner (Site Settings), then any real top ads. */}
      <WhatsAppChannel settings={settings} />
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

      {/* Permanent WhatsApp number banner (Site Settings), then any real bottom ad. */}
      <WhatsAppContact settings={settings} />
      {ads.bottom ? <AdBox ad={ads.bottom} fallbackLink={channel} /> : null}
      <WhatsAppBanner
        content={ads.middle?.content ?? null}
        text={settings.whatsapp_channel_text || SETTING_DEFAULTS.whatsapp_channel_text}
        image={uploadUrl(ads.middle?.image) ?? '/join-whatsapp.png'}
        alt={ads.middle?.title || 'Join WhatsApp'}
        link={ads.middle?.link || settings.whatsapp_channel_url || null}
      />
      {ads.sidebar ? <AdBox ad={ads.sidebar} fallbackLink={channel} /> : null}

      {/* Today/yesterday results in two sections; which game goes where is set in Admin -> Result Sections. */}
      <div id="today" className="section">
        {[1, 2].map((n) => {
          const games = data.games.filter((g) => (g.result_section === 2 ? 2 : 1) === n);
          if (games.length === 0) return null;
          const title = n === 1 ? settings.section_1_title : settings.section_2_title;
          return (
            <section key={n} className="result-section" aria-label={title || `Results section ${n}`}>
              {title ? <h2 className="band-title">{title}</h2> : null}
              <ResultTable games={games} data={data} />
            </section>
          );
        })}
      </div>

      <div id="monthly" className="section">
        <h2 className="band-title">
          {MONTHS[month - 1]} Result Chart {year}
        </h2>
        {chunk(data.games, CHUNK).map((games, i) => (
          <MonthTable key={i} games={games} data={data} />
        ))}
        <p className="scroll-hint">मोबाइल पर पूरा चार्ट देखने के लिए left-right scroll करें</p>
      </div>

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

function ResultTable({ games, data }: { games: Game[]; data: Awaited<ReturnType<typeof getHomeData>> }) {
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
                  <Link href={`/records/${g.slug}`} prefetch={false}>
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
