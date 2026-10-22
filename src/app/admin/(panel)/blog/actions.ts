'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { bool, done, fail, intOrNull, isDuplicate, slugify, str, strOrNull } from '@/lib/form';
import { epochToDbDateTime, istToEpoch } from '@/lib/time';
import { deleteUpload, saveImage } from '@/lib/uploads';

const P = 'manage blog';

export async function savePost(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  const back = `/admin/blog/${id ?? 'new'}`;
  const title = str(fd, 'title');
  // Hindi titles slugify to nothing, so fall back to a dated slug the admin can edit.
  const slug = slugify(str(fd, 'slug') || title) || `post-${Date.now()}`;
  if (!title) fail(back, 'Title is required');

  // The form sends IST wall-clock time ("2026-10-22T18:30"); store it as UTC.
  const when = str(fd, 'published_at');
  const m = when.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  const publishedAt = m ? epochToDbDateTime(istToEpoch(m[1], m[2]), '+00:00') : epochToDbDateTime(Date.now(), '+00:00');

  const old = id ? await queryOne<{ image: string | null }>('SELECT image FROM blog_posts WHERE id = ?', [id]) : null;
  let image = old?.image ?? null;
  try {
    const up = await saveImage(fd.get('image'), 'blog');
    if (up || bool(fd, 'remove_image')) {
      await deleteUpload(image);
      image = up;
    }
  } catch (e) {
    fail(back, (e as Error).message);
  }

  const values = [
    title, slug, strOrNull(fd, 'excerpt'), strOrNull(fd, 'content'), image,
    strOrNull(fd, 'meta_title'), strOrNull(fd, 'meta_description'), bool(fd, 'is_published'), publishedAt,
  ];
  try {
    if (id) {
      await execute(
        `UPDATE blog_posts SET title=?, slug=?, excerpt=?, content=?, image=?, meta_title=?, meta_description=?,
                is_published=?, published_at=?, updated_at=NOW() WHERE id=?`,
        [...values, id],
      );
    } else {
      await execute(
        `INSERT INTO blog_posts (title, slug, excerpt, content, image, meta_title, meta_description, is_published, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        values,
      );
    }
  } catch (e) {
    if (isDuplicate(e)) fail(back, `The URL "/blog/${slug}" is already used by another post`);
    throw e;
  }
  revalidatePath('/', 'layout');
  done('/admin/blog', 'Blog post saved.');
}

export async function deletePost(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  if (id) {
    const row = await queryOne<{ image: string | null }>('SELECT image FROM blog_posts WHERE id = ?', [id]);
    await deleteUpload(row?.image);
    await execute('DELETE FROM blog_posts WHERE id = ?', [id]);
  }
  revalidatePath('/', 'layout');
  done('/admin/blog', 'Blog post deleted.');
}
