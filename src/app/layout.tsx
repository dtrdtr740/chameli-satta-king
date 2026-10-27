import type { Metadata, Viewport } from 'next';
import { getSettings, siteUrl, uploadUrl } from '@/lib/settings';
import { SITE_THEME } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  // Favicon = this site's logo (Admin -> Site Settings); the generic icon only when no logo is set.
  const logo = uploadUrl(s.logo);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.site_name, template: `%s | ${s.site_name}` },
    verification: s.google_site_verification ? { google: s.google_site_verification } : undefined,
    icons: logo ? { icon: logo, shortcut: logo, apple: logo } : { icon: '/icon.svg' },
  };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: SITE_THEME === 'blue' ? '#111827' : '#2C2A29' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi-IN">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
