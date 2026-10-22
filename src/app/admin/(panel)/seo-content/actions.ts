'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { bool, done, fail, intOrNull, str, strOrNull } from '@/lib/form';
import { SITE_PAGES } from '@/lib/seo';
import { deleteUpload, saveImage } from '@/lib/uploads';

export async function saveSeoContent(fd: FormData) {
  await requirePermission('manage seo & content');
  const pageKey = str(fd, 'page_key');
  const gameId = intOrNull(fd, 'game_id');
  const back = gameId ? `/admin/seo-content?game=${gameId}` : `/admin/seo-content?page=${encodeURIComponent(pageKey)}`;
  if (!gameId && !SITE_PAGES.some((p) => p.key === pageKey)) fail('/admin/seo-content', 'Unknown page');

  const canonical = strOrNull(fd, 'canonical_url');
  if (canonical && !/^https?:\/\//.test(canonical)) fail(back, 'Canonical URL must start with http:// or https://');

  const existing = gameId
    ? await queryOne<{ id: number; og_image: string | null }>('SELECT id, og_image FROM seo_pages WHERE game_id = ? AND year IS NULL LIMIT 1', [gameId])
    : await queryOne<{ id: number; og_image: string | null }>('SELECT id, og_image FROM seo_pages WHERE page_key = ? LIMIT 1', [pageKey]);

  let ogImage = existing?.og_image ?? null;
  try {
    const uploaded = await saveImage(fd.get('og_image'), 'seo-pages');
    if (uploaded || bool(fd, 'remove_og_image')) {
      await deleteUpload(ogImage);
      ogImage = uploaded;
    }
  } catch (e) {
    fail(back, (e as Error).message);
  }

  const values = [
    strOrNull(fd, 'meta_title'),
    strOrNull(fd, 'meta_description'),
    strOrNull(fd, 'meta_keywords'),
    canonical,
    strOrNull(fd, 'og_title'),
    strOrNull(fd, 'og_description'),
    ogImage,
    strOrNull(fd, 'schema_markup'),
    strOrNull(fd, 'page_content'),
  ];

  if (existing) {
    await execute(
      `UPDATE seo_pages SET meta_title=?, meta_description=?, meta_keywords=?, canonical_url=?, og_title=?,
              og_description=?, og_image=?, schema_markup=?, page_content=?, updated_at=NOW() WHERE id=?`,
      [...values, existing.id],
    );
  } else {
    await execute(
      `INSERT INTO seo_pages (page_key, game_id, year, meta_title, meta_description, meta_keywords, canonical_url, og_title,
                              og_description, og_image, schema_markup, page_content, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [gameId ? null : pageKey, gameId, ...values],
    );
  }

  revalidatePath('/', 'layout');
  done(back, 'SEO & content saved. Changes are live.');
}
