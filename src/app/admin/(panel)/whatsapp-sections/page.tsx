import Link from 'next/link';
import { Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { uploadUrl } from '@/lib/settings';
import { SLOT_INFO, getWhatsAppSections, type WhatsAppSlot } from '@/lib/whatsapp';

const ORDER: WhatsAppSlot[] = ['top', 'after_live', 'middle', 'floating'];

export default async function WhatsAppSectionsPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage whatsapp sections');
  const [sp, sections] = await Promise.all([searchParams, getWhatsAppSections()]);

  return (
    <>
      <PageHead
        title="WhatsApp Sections"
        sub="Permanent WhatsApp banners on the website. They can be edited or hidden, but not deleted — so a WhatsApp link can never disappear by accident."
      />
      <Flash sp={sp} />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Section</th>
              <th>Text</th>
              <th>Link</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ORDER.map((slot) => {
              const s = sections[slot];
              const info = SLOT_INFO[slot];
              const text = (s?.content ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              return (
                <tr key={slot}>
                  <td>{s?.image ? <img src={uploadUrl(s.image) ?? ''} alt="" style={{ height: 36, maxWidth: 110, objectFit: 'contain' }} /> : '—'}</td>
                  <td>
                    <strong>{info.label}</strong>
                    <div className="muted">{info.where}</div>
                  </td>
                  <td className="muted" style={{ maxWidth: 280 }}>
                    {info.hasContent ? (text ? `${text.slice(0, 90)}${text.length > 90 ? '…' : ''}` : '(no text)') : '— (icon only)'}
                  </td>
                  <td className="muted" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s?.link || '—'}
                  </td>
                  <td>
                    {s?.is_active && s.link ? <span className="badge ok">Showing</span> : <span className="badge off">Hidden</span>}
                  </td>
                  <td className="actions">
                    <Link className="btn btn-sm btn-primary" href={`/admin/whatsapp-sections/${slot}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
