import type { Metadata, Viewport } from 'next';
import { getSettings, siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: s.site_name, template: `%s | ${s.site_name}` },
    verification: s.google_site_verification ? { google: s.google_site_verification } : undefined,
  };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#000000' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi-IN">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
