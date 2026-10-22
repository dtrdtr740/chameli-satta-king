import type { MetadataRoute } from 'next';
import { latestPosts } from '@/lib/blog';
import { getActiveGames } from '@/lib/results';
import { siteUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const games = await getActiveGames();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'always', priority: 1 },
    { url: `${base}/chart`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/satta-khaiwal`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/lucky-satta-king`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/contact-us`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms-conditions`, changeFrequency: 'yearly', priority: 0.3 },
  ];
  for (const g of games) {
    pages.push({ url: `${base}/records/${g.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.8 });
  }
  const posts = await latestPosts(1000);
  if (posts.length) pages.push({ url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 });
  for (const p of posts) {
    const raw = p.published_at || p.created_at;
    pages.push({
      url: `${base}/blog/${p.slug}`,
      lastModified: raw ? new Date(`${raw.replace(' ', 'T')}Z`) : now,
      changeFrequency: 'monthly',
      priority: 0.5,
    });
  }
  return pages;
}
