import 'server-only';
import { query, queryOne } from './db';

export type BlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: number;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

// Published = switched on and its publish date has arrived (lets you schedule posts).
const LIVE = 'is_published = 1 AND (published_at IS NULL OR published_at <= UTC_TIMESTAMP())';

export async function latestPosts(limit: number, offset = 0): Promise<BlogPost[]> {
  return query<BlogPost>(
    `SELECT id, title, slug, excerpt, image, published_at, created_at FROM blog_posts
      WHERE ${LIVE} ORDER BY COALESCE(published_at, created_at) DESC, id DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
}

export async function countPosts(): Promise<number> {
  return (await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM blog_posts WHERE ${LIVE}`))?.n ?? 0;
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  return queryOne<BlogPost>(`SELECT * FROM blog_posts WHERE slug = ? AND ${LIVE} LIMIT 1`, [slug]);
}

/** '2026-10-22 14:30:00' (UTC) -> '22 October 2026' in IST. */
export function postDate(p: Pick<BlogPost, 'published_at' | 'created_at'>): string {
  const raw = p.published_at || p.created_at;
  if (!raw) return '';
  const d = new Date(`${raw.replace(' ', 'T')}Z`);
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** Plain-text summary: the excerpt, or the first ~160 chars of the content. */
export function summary(p: Pick<BlogPost, 'excerpt' | 'content'>, max = 160): string {
  const text = (p.excerpt || (p.content ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}
