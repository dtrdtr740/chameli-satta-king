import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CmsContent, SchemaMarkup } from '@/components/site/SchemaMarkup';
import { getPost, postDate, summary } from '@/lib/blog';
import { fillPlaceholders, getSettings, siteUrl, uploadUrl } from '@/lib/settings';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [post, s] = await Promise.all([params.then((p) => getPost(p.slug)), getSettings()]);
  if (!post) return {};
  const title = fillPlaceholders(post.meta_title, s) || `${post.title} | ${s.site_name}`;
  const description = fillPlaceholders(post.meta_description, s) || summary(post);
  const url = `${siteUrl()}/blog/${post.slug}`;
  const image = post.image ? `${siteUrl()}${uploadUrl(post.image)}` : undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', title, description, url, images: image ? [image] : undefined },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const [post, s] = await Promise.all([params.then((p) => getPost(p.slug)), getSettings()]);
  if (!post) notFound();
  const img = uploadUrl(post.image);
  const url = `${siteUrl()}/blog/${post.slug}`;
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: summary(post),
    datePublished: (post.published_at || post.created_at || '').replace(' ', 'T') + 'Z',
    dateModified: (post.updated_at || post.published_at || '').replace(' ', 'T') + 'Z',
    mainEntityOfPage: url,
    image: img ? `${siteUrl()}${img}` : undefined,
    publisher: { '@type': 'Organization', name: s.site_name },
  });

  return (
    <article className="section post">
      <SchemaMarkup markup={schema} />
      <h1 className="page-title">{post.title}</h1>
      <p className="post-meta">
        <time>{postDate(post)}</time>
      </p>
      {img ? <img className="post-hero" src={img} alt={post.title} /> : null}
      <CmsContent html={fillPlaceholders(post.content, s)} />
      <p className="center" style={{ margin: '18px 0' }}>
        <Link href="/blog" className="btn-dark">
          ← All Blogs
        </Link>
      </p>
    </article>
  );
}
