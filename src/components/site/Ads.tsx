import 'server-only';
import { query } from '@/lib/db';
import { uploadUrl } from '@/lib/settings';

export type Ad = {
  id: number;
  title: string | null;
  position: string | null;
  content: string | null;
  image: string | null;
  link: string | null;
};

export async function getAds() {
  const rows = await query<Ad>(
    `SELECT id, title, position, content, image, link FROM advertisements
      WHERE is_active = 1 AND position IN ('top','middle','bottom','sidebar')
      ORDER BY created_at DESC, id DESC`,
  );
  return {
    top: rows.filter((a) => a.position === 'top'),
    middle: rows.find((a) => a.position === 'middle') ?? null,
    bottom: rows.find((a) => a.position === 'bottom') ?? null,
    sidebar: rows.find((a) => a.position === 'sidebar') ?? null,
  };
}

/** `fallbackLink` (the WhatsApp channel from Site Settings) is used when the ad has no link of its own. */
export function AdBox({ ad, variant, fallbackLink }: { ad: Ad; variant?: 'middle'; fallbackLink?: string | null }) {
  if (!ad.content && !ad.image && !ad.link) return null;
  const img = uploadUrl(ad.image);
  const link = ad.link || fallbackLink || null;
  const inner = (
    <>
      {ad.content ? <div dangerouslySetInnerHTML={{ __html: ad.content }} /> : null}
      {img ? (
        <span className="ad-img">
          <img src={img} alt={ad.title || 'Advertisement'} loading="lazy" decoding="async" />
        </span>
      ) : null}
    </>
  );
  const cls = `ad-box${variant ? ` ${variant}` : ''}`;
  return (
    <section className="ad-wrap">
      {link ? (
        <a className={cls} href={link} target="_blank" rel="noopener sponsored">
          {inner}
        </a>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </section>
  );
}
