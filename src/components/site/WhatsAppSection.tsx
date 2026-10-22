import { uploadUrl } from '@/lib/settings';
import type { WhatsAppSection } from '@/lib/whatsapp';

/**
 * One permanent WhatsApp banner (Admin -> WhatsApp Sections): the editable text on top and the
 * image as a button underneath, both opening the section's link.
 */
export function WhatsAppBanner({ section, variant }: { section: WhatsAppSection | null; variant?: 'middle' }) {
  if (!section) return null;
  const img = uploadUrl(section.image);
  return (
    <section className="ad-wrap wa-section" aria-label={section.title || 'WhatsApp'}>
      <div className={`ad-box${variant ? ` ${variant}` : ''}`}>
        {section.content ? <div className="wa-text" dangerouslySetInnerHTML={{ __html: section.content }} /> : null}
        <a href={section.link ?? '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          {img ? (
            <span className="ad-img">
              <img src={img} alt={section.title || 'WhatsApp'} decoding="async" />
            </span>
          ) : (
            <span className="ad-img">WhatsApp</span>
          )}
        </a>
      </div>
    </section>
  );
}
