import { CmsContent, SchemaMarkup } from './SchemaMarkup';
import { pageSeo, toMetadata } from '@/lib/seo';
import { activeSection } from '@/lib/whatsapp';

// `pageKey`, not `key`: React strips a prop named key before it reaches the component.
type Def = { pageKey: string; path: string; title: string };

export async function contentMetadata({ pageKey, path, title }: Def) {
  return toMetadata(await pageSeo(pageKey, path, { title: `${title} | {site}`, description: `${title} - {site}` }));
}

/** Pages whose whole body is managed from Admin -> SEO & Content. */
export async function ContentPage({ pageKey, path, title, showContact }: Def & { showContact?: boolean }) {
  // The Contact page WhatsApp button uses the same link as the floating button (Admin -> WhatsApp Sections).
  const [seo, wa] = await Promise.all([pageSeo(pageKey, path, { title, description: '' }), activeSection('floating')]);
  return (
    <div className="section">
      <SchemaMarkup markup={seo.schema} />
      {seo.content ? <CmsContent html={seo.content} /> : <h1 className="page-title">{title}</h1>}
      {showContact && wa ? (
        <div className="contact-card">
          <a href={wa.link ?? '#'} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
            <img src="/whatsapp-chat.png" alt="WhatsApp - click to chat" width={200} height={70} style={{ height: 70, width: 'auto' }} />
          </a>
        </div>
      ) : null}
    </div>
  );
}
