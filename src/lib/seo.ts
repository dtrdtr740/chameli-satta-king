import 'server-only';
import type { Metadata } from 'next';
import { cache } from 'react';
import { queryOne } from './db';
import { fillPlaceholders, getSettings, siteUrl, uploadUrl } from './settings';

export type SeoPage = {
  id: number;
  page_key: string | null;
  game_id: number | null;
  year: number | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  schema_markup: string | null;
  page_content: string | null;
};

/** Every public page the "SEO & Content" manager can edit. */
export const SITE_PAGES: { key: string; label: string; path: string; hasContent: boolean }[] = [
  { key: 'home', label: 'Home', path: '/', hasContent: true },
  { key: 'home_2', label: 'Satta Khaiwal', path: '/satta-khaiwal', hasContent: true },
  { key: 'home_3', label: 'Lucky Satta King', path: '/lucky-satta-king', hasContent: true },
  { key: 'chart', label: 'Chart', path: '/chart', hasContent: true },
  { key: 'contact-us', label: 'Contact Us', path: '/contact-us', hasContent: true },
  { key: 'privacy-policy', label: 'Privacy Policy', path: '/privacy-policy', hasContent: true },
  { key: 'terms-conditions', label: 'Terms & Conditions', path: '/terms-conditions', hasContent: true },
  { key: 'game-record', label: 'Game record (default template)', path: '/records/{slug}', hasContent: true },
];

export const getSeoByKey = cache(async (pageKey: string) =>
  queryOne<SeoPage>('SELECT * FROM seo_pages WHERE page_key = ? LIMIT 1', [pageKey]),
);

export const getSeoForGame = cache(async (gameId: number) =>
  queryOne<SeoPage>('SELECT * FROM seo_pages WHERE game_id = ? AND year IS NULL LIMIT 1', [gameId]),
);

type Resolved = {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string | null;
  schema: string | null;
  content: string;
};

export async function resolveSeo(
  seo: SeoPage | null,
  path: string,
  fallback: { title: string; description: string },
  extra: Record<string, string | number> = {},
): Promise<Resolved> {
  const s = await getSettings();
  const f = (v: string | null | undefined) => fillPlaceholders(v, s, extra);
  const title = f(seo?.meta_title) || f(fallback.title);
  const description = f(seo?.meta_description) || f(fallback.description);
  const base = siteUrl();
  return {
    title,
    description,
    keywords: f(seo?.meta_keywords),
    canonical: seo?.canonical_url || `${base}${path}`,
    ogTitle: f(seo?.og_title) || title,
    ogDescription: f(seo?.og_description) || description,
    ogImage: seo?.og_image ? `${base}${uploadUrl(seo.og_image)}` : null,
    schema: seo?.schema_markup ?? null,
    content: f(seo?.page_content),
  };
}

export function toMetadata(r: Resolved): Metadata {
  return {
    title: { absolute: r.title },
    description: r.description,
    keywords: r.keywords || undefined,
    alternates: { canonical: r.canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title: r.ogTitle,
      description: r.ogDescription,
      url: r.canonical,
      images: r.ogImage ? [r.ogImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: r.ogTitle,
      description: r.ogDescription,
      images: r.ogImage ? [r.ogImage] : undefined,
    },
  };
}

export async function pageSeo(pageKey: string, path: string, fallback: { title: string; description: string }) {
  return resolveSeo(await getSeoByKey(pageKey), path, fallback);
}
