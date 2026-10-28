import Link from 'next/link';
import { BlogCards } from '@/components/site/BlogCards';
import { countPosts, latestPosts } from '@/lib/blog';
import { getSettings, siteUrl } from '@/lib/settings';
import type { Metadata } from 'next';

const PER_PAGE = 12;

type Props = { searchParams: Promise<{ page?: string }> };

function pageOf(raw?: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [s, page] = await Promise.all([getSettings(), searchParams.then((sp) => pageOf(sp.page))]);
  const title = `Blog | ${s.site_name}`;
  const description = `${s.site_name} Blog – guides and updates on Satta King results, charts and games.`;
  const url = `${siteUrl()}/blog${page > 1 ? `?page=${page}` : ''}`;
  return { title: { absolute: title }, description, alternates: { canonical: url }, openGraph: { title, description, url } };
}

export default async function BlogIndex({ searchParams }: Props) {
  const page = pageOf((await searchParams).page);
  const [posts, total] = await Promise.all([latestPosts(PER_PAGE, (page - 1) * PER_PAGE), countPosts()]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="section">
      <h1 className="page-title blog-title">Blog</h1>
      {posts.length === 0 ? <p className="center">No blog posts yet.</p> : <BlogCards posts={posts} />}
      {pages > 1 ? (
        <nav className="pager-links" aria-label="Pages">
          {page > 1 ? (
            <Link className="btn-dark" href={page === 2 ? '/blog' : `/blog?page=${page - 1}`}>
              ← Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link className="btn-dark" href={`/blog?page=${page + 1}`}>
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
