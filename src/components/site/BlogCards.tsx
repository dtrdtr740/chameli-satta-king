import Link from 'next/link';
import { postDate, summary, type BlogPost } from '@/lib/blog';
import { uploadUrl } from '@/lib/settings';

export function BlogCards({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="blog-grid">
      {posts.map((p) => {
        const img = uploadUrl(p.image);
        return (
          <article key={p.id} className="blog-card">
            <Link href={`/blog/${p.slug}`} className="blog-card-link">
              {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : null}
              <div className="blog-card-body">
                <h3>{p.title}</h3>
                <time>{postDate(p)}</time>
                <p>{summary(p)}</p>
                <span className="blog-more">Read More →</span>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
