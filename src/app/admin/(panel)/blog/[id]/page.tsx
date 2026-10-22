import Link from 'next/link';
import { notFound } from 'next/navigation';
import { savePost } from '../actions';
import { HtmlEditor } from '@/components/admin/HtmlEditor';
import { SeoFields } from '@/components/admin/SeoFields';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import type { BlogPost } from '@/lib/blog';
import { queryOne } from '@/lib/db';
import { getSettings, siteUrl, uploadUrl } from '@/lib/settings';
import { dbDateTimeToEpoch } from '@/lib/time';

/** UTC DB value -> IST "YYYY-MM-DDTHH:MM" for <input type="datetime-local">. */
function toIstInput(value: string | null): string {
  const epoch = dbDateTimeToEpoch(value, '+00:00') ?? Date.now();
  return new Date(epoch + 330 * 60000).toISOString().slice(0, 16);
}

export default async function BlogPostForm({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  await requirePermission('manage blog');
  const [{ id }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  const post = id === 'new' ? null : await queryOne<BlogPost>('SELECT * FROM blog_posts WHERE id = ?', [Number(id)]);
  if (id !== 'new' && !post) notFound();

  return (
    <>
      <PageHead
        title={post ? 'Edit post' : 'Write post'}
        actions={
          post ? (
            <a className="btn" href={`/blog/${post.slug}`} target="_blank" rel="noopener">
              View ↗
            </a>
          ) : null
        }
      />
      <Flash sp={sp} />
      <form action={savePost}>
        {post ? <input type="hidden" name="id" value={post.id} /> : null}
        <div className="card grid">
          <Field label="Title" htmlFor="title">
            <input id="title" name="title" className="input" required defaultValue={post?.title} />
          </Field>
          <div className="grid grid-3">
            <Field label="URL slug" htmlFor="slug" hint="English letters/numbers. Empty = made from the title.">
              <input id="slug" name="slug" className="input" defaultValue={post?.slug} placeholder="gali-result-guide" />
            </Field>
            <Field label="Publish date & time (IST)" htmlFor="published_at" hint="A future time schedules the post.">
              <input id="published_at" name="published_at" type="datetime-local" className="input" defaultValue={toIstInput(post?.published_at ?? null)} />
            </Field>
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <label className="check">
                <input type="checkbox" name="is_published" defaultChecked={post ? !!post.is_published : true} /> Published (untick = draft)
              </label>
            </div>
          </div>
          <Field label="Short summary" htmlFor="excerpt" hint="Shown on the blog cards. Empty = start of the post.">
            <textarea id="excerpt" name="excerpt" className="textarea" rows={2} defaultValue={post?.excerpt ?? ''} />
          </Field>
          <Field label="Cover image" htmlFor="image" hint="PNG/JPG/WEBP, up to 4 MB. 1200×675 works best.">
            <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" className="input" />
            {post?.image ? (
              <span style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                <img src={uploadUrl(post.image) ?? ''} alt="" style={{ height: 56, borderRadius: 6 }} />
                <label className="check">
                  <input type="checkbox" name="remove_image" /> Remove
                </label>
              </span>
            ) : null}
          </Field>
        </div>

        <div className="card">
          <h2>Content</h2>
          <HtmlEditor name="content" defaultValue={post?.content ?? ''} placeholders="Use H2/H3 for headings and P for paragraphs. {site} and {year} are replaced." />
        </div>

        <div className="card">
          <h2>SEO</h2>
          <SeoFields
            title={post?.meta_title ?? ''}
            description={post?.meta_description ?? ''}
            url={`${siteUrl()}/blog/${post?.slug ?? 'your-post'}`}
            siteName={settings.site_name}
          />
          <p className="hint muted" style={{ marginBottom: 0 }}>
            Empty meta title = “Post title | {settings.site_name}”. Empty description = the summary.
          </p>
        </div>

        <div className="sticky-save">
          <button className="btn btn-primary" type="submit">
            💾 Save post
          </button>{' '}
          <Link className="btn" href="/admin/blog">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
