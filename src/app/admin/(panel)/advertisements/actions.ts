'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { bool, done, fail, intOrNull, str, strOrNull } from '@/lib/form';
import { deleteUpload, saveImage } from '@/lib/uploads';

const P = 'manage advertisements';
const AD_POSITIONS = ['top', 'middle', 'bottom', 'sidebar'] as const;

export async function saveAd(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  const back = `/admin/advertisements/${id ?? 'new'}`;
  const position = str(fd, 'position');
  const link = strOrNull(fd, 'link');
  if (!(AD_POSITIONS as readonly string[]).includes(position)) fail(back, 'Choose a position');
  if (link && !/^(https?:\/\/|\/|mailto:|tel:)/.test(link)) fail(back, 'Link must start with http(s)://, /, mailto: or tel:');

  const old = id ? await queryOne<{ image: string | null }>('SELECT image FROM advertisements WHERE id = ?', [id]) : null;
  let image = old?.image ?? null;
  try {
    const up = await saveImage(fd.get('image'), 'advertisements');
    if (up || bool(fd, 'remove_image')) {
      await deleteUpload(image);
      image = up;
    }
  } catch (e) {
    fail(back, (e as Error).message);
  }

  const values = [strOrNull(fd, 'title'), position, strOrNull(fd, 'content'), image, link, bool(fd, 'is_active')];
  if (id) {
    await execute('UPDATE advertisements SET title=?, position=?, content=?, image=?, link=?, is_active=?, updated_at=NOW() WHERE id=?', [...values, id]);
  } else {
    await execute(
      'INSERT INTO advertisements (title, position, content, image, link, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      values,
    );
  }
  revalidatePath('/', 'layout');
  done('/admin/advertisements', 'Advertisement saved.');
}

export async function deleteAd(fd: FormData) {
  await requirePermission(P);
  const id = intOrNull(fd, 'id');
  if (id) {
    const row = await queryOne<{ image: string | null }>('SELECT image FROM advertisements WHERE id = ?', [id]);
    await deleteUpload(row?.image);
    await execute('DELETE FROM advertisements WHERE id = ?', [id]);
  }
  revalidatePath('/', 'layout');
  done('/admin/advertisements', 'Advertisement deleted.');
}
