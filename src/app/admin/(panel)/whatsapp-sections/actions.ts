'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { bool, done, fail, str, strOrNull } from '@/lib/form';
import { deleteUpload, saveImage } from '@/lib/uploads';

const P = 'manage whatsapp sections';
const SLOTS = ['top', 'after_live', 'middle', 'floating'];
// Built-in images (in /public) that can be picked without uploading.
const BUILT_IN = ['/join-whatsapp.png', '/whatsapp-logo.webp', '/whatsapp-chat.png'];

export async function saveWhatsAppSection(fd: FormData) {
  await requirePermission(P);
  const slot = str(fd, 'slot');
  if (!SLOTS.includes(slot)) fail('/admin/whatsapp-sections', 'Unknown section');
  const back = `/admin/whatsapp-sections/${slot}`;

  const link = str(fd, 'link');
  const active = bool(fd, 'is_active');
  if (active && !link) fail(back, 'Add a link, or untick "Show on website".');
  if (link && !/^(https?:\/\/|\/|tel:|mailto:)/.test(link)) fail(back, 'The link must start with https:// (e.g. https://wa.me/91XXXXXXXXXX)');

  const old = await queryOne<{ image: string | null }>('SELECT image FROM whatsapp_sections WHERE slot = ?', [slot]);
  let image = old?.image ?? null;
  const choice = str(fd, 'image_choice');
  try {
    const up = await saveImage(fd.get('image'), 'whatsapp');
    if (up) {
      if (image && !image.startsWith('/')) await deleteUpload(image);
      image = up;
    } else if (BUILT_IN.includes(choice)) {
      if (image && !image.startsWith('/')) await deleteUpload(image);
      image = choice;
    }
  } catch (e) {
    fail(back, (e as Error).message);
  }

  await execute(
    'UPDATE whatsapp_sections SET content = ?, link = ?, image = ?, is_active = ?, updated_at = NOW() WHERE slot = ?',
    [strOrNull(fd, 'content'), link || null, image, active, slot],
  );
  revalidatePath('/', 'layout');
  done('/admin/whatsapp-sections', 'WhatsApp section saved. It is live now.');
}
