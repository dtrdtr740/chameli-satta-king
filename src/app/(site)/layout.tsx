import Link from 'next/link';
import '../site.css';
import { RefreshButton } from '@/components/site/AutoRefresh';
import { SiteNav } from '@/components/site/SiteNav';
import { query } from '@/lib/db';
import { getActiveGames } from '@/lib/results';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/session';
import { fillPlaceholders, gameHref, getSettings, uploadUrl } from '@/lib/settings';
import { activeSection } from '@/lib/whatsapp';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, games, loggedIn, notices, waFloat] = await Promise.all([
    getSettings(),
    getActiveGames(),
    cookies().then((c) => verifySession(c.get(SESSION_COOKIE)?.value)).then((uid) => uid !== null),
    query<{ id: number; title: string | null; message: string | null }>(
      'SELECT id, title, message FROM notices WHERE is_active = 1 ORDER BY id DESC LIMIT 5',
    ),
    activeSection('floating'),
  ]);
  const logo = uploadUrl(settings.logo);

  return (
    <div className="site">
      <SiteNav games={games.map((g) => ({ name: g.name, href: gameHref(g.slug, settings) }))} loggedIn={loggedIn} />

      {settings.marquee_text ? (
        <div className="marquee" aria-hidden="true">
          <span>{settings.marquee_text}</span>
        </div>
      ) : null}

      <div className="brand-band">
        <Link href="/" className="brand-link">
          {logo ? <img src={logo} alt={settings.site_name} width={64} height={64} /> : null}
          <span>{settings.brand_text || settings.site_name}</span>
        </Link>
      </div>

      {notices.length > 0 && (
        <div className="notice-strip" role="status">
          {notices.map((n) => (
            <p key={n.id}>
              {n.title ? <strong>{n.title}: </strong> : null}
              <span dangerouslySetInnerHTML={{ __html: n.message ?? '' }} />
            </p>
          ))}
        </div>
      )}

      <main>{children}</main>

      <footer className="site-footer">
        <ul className="footer-links">
          <li><Link href="/">Home</Link></li>
          <li><Link href="/chart">Record Chart</Link></li>
          <li><Link href="/blog">Blog</Link></li>
          <li><Link href="/contact-us">Contact Us</Link></li>
          <li><Link href="/privacy-policy">Privacy Policy</Link></li>
          <li><Link href="/terms-conditions">Terms &amp; Conditions</Link></li>
        </ul>
        <p className="footer-copy">{fillPlaceholders(settings.copyright_text, settings)}</p>
        {settings.footer_disclaimer ? <p className="footer-disclaimer">{fillPlaceholders(settings.footer_disclaimer, settings)}</p> : null}
      </footer>

      <div className="floaters">
        {/* Floating WhatsApp button: Admin -> WhatsApp Sections -> Floating button. */}
        {waFloat ? (
          <a className="wa-logo" href={waFloat.link ?? '#'} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
            <img src={uploadUrl(waFloat.image) ?? '/whatsapp-logo.webp'} alt="WhatsApp" width={80} height={80} loading="lazy" decoding="async" />
          </a>
        ) : null}
        <RefreshButton />
      </div>
    </div>
  );
}
