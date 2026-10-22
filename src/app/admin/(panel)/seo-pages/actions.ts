'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { bool, done, fail, intOrNull, isDuplicate, strOrNull } from '@/lib/form';
import { deleteUpload, saveImage } from '@/lib/uploads';

const P = 'manage seo pages';

export async function saveSeoPage(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  const back = `/admin/seo-pages/${id ?? 'new'}`;
  const pageKey = strOrNull(fd, 'page_key');
  const gameId = intOrNull(fd, 'game_id');
  const year = intOrNull(fd, 'year');
  const canonical = strOrNull(fd, 'canonical_url');
  if (!pageKey && !gameId) fail(back, 'Set a page key or choose a game');
  if (year !== null && (year < 2000 || year > 2100)) fail(back, 'Year must be between 2000 and 2100');
  if (canonical && !/^https?:\/\//.test(canonical)) fail(back, 'Canonical URL must start with http:// or https://');

  const old = id ? await queryOne<{ og_image: string | null }>('SELECT og_image FROM seo_pages WHERE id = ?', [id]) : null;
  let ogImage = old?.og_image ?? null;
  try {
    const up = await saveImage(fd.get('og_image'), 'seo-pages');
    if (up || bool(fd, 'remove_og_image')) {
      await deleteUpload(ogImage);
      ogImage = up;
    }
  } catch (e) {
    fail(back, (e as Error).message);
  }

  const values = [
    pageKey, gameId, year,
    strOrNull(fd, 'meta_title'), strOrNull(fd, 'meta_description'), strOrNull(fd, 'meta_keywords'), canonical,
    strOrNull(fd, 'og_title'), strOrNull(fd, 'og_description'), ogImage, strOrNull(fd, 'schema_markup'), strOrNull(fd, 'page_content'),
  ];
  try {
    if (id) {
      await execute(
        `UPDATE seo_pages SET page_key=?, game_id=?, year=?, meta_title=?, meta_description=?, meta_keywords=?, canonical_url=?,
                og_title=?, og_description=?, og_image=?, schema_markup=?, page_content=?, updated_at=NOW() WHERE id=?`,
        [...values, id],
      );
    } else {
      await execute(
        `INSERT INTO seo_pages (page_key, game_id, year, meta_title, meta_description, meta_keywords, canonical_url,
                og_title, og_description, og_image, schema_markup, page_content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        values,
      );
    }
  } catch (e) {
    if (isDuplicate(e)) fail(back, `Page key "${pageKey}" already exists`);
    throw e;
  }
  revalidatePath('/', 'layout');
  done('/admin/seo-pages', 'SEO page saved.');
}

export async function deleteSeoPage(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  if (id) {
    const row = await queryOne<{ og_image: string | null }>('SELECT og_image FROM seo_pages WHERE id = ?', [id]);
    await deleteUpload(row?.og_image);
    await execute('DELETE FROM seo_pages WHERE id = ?', [id]);
  }
  revalidatePath('/', 'layout');
  done('/admin/seo-pages', 'SEO page deleted.');
}
