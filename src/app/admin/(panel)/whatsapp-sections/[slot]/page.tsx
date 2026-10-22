import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveWhatsAppSection } from '../actions';
import { HtmlEditor } from '@/components/admin/HtmlEditor';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { WhatsAppBanner } from '@/components/site/WhatsAppSection';
import { requirePermission } from '@/lib/auth';
import { uploadUrl } from '@/lib/settings';
import { SLOT_INFO, getWhatsAppSections, type WhatsAppSlot } from '@/lib/whatsapp';

const BUILT_IN = [
  { value: '/join-whatsapp.png', label: 'Join Group button' },
  { value: '/whatsapp-logo.webp', label: 'WhatsApp logo (round)' },
  { value: '/whatsapp-chat.png', label: '"WhatsApp – click to chat" badge' },
];

export default async function EditWhatsAppSection({ params, searchParams }: { params: Promise<{ slot: string }>; searchParams: SP }) {
  await requirePermission('manage whatsapp sections');
  const [{ slot }, sp, sections] = await Promise.all([params, searchParams, getWhatsAppSections()]);
  if (!(slot in SLOT_INFO)) notFound();
  const info = SLOT_INFO[slot as WhatsAppSlot];
  const s = sections[slot];
  if (!s) notFound();
  const current = s.image ?? '';
  const isBuiltIn = BUILT_IN.some((b) => b.value === current);

  return (
    <>
      <PageHead
        title={`Edit: ${info.label}`}
        sub={info.where}
        actions={
          <a className="btn" href="/" target="_blank" rel="noopener">
            View site ↗
          </a>
        }
      />
      <Flash sp={sp} />

      {info.hasContent ? (
        <div className="card">
          <h2>Current look on the website</h2>
          <div className="preview site">
            <WhatsAppBanner section={{ ...s, is_active: 1 }} variant={slot === 'middle' ? 'middle' : undefined} />
          </div>
        </div>
      ) : null}

      <form action={saveWhatsAppSection}>
        <input type="hidden" name="slot" value={slot} />
        <div className="card grid">
          <Field
            label="Link"
            htmlFor="link"
            hint="WhatsApp channel: https://www.whatsapp.com/channel/… · Chat with a number: https://wa.me/91XXXXXXXXXX (country code, no + or spaces)"
          >
            <input id="link" name="link" className="input" defaultValue={s.link ?? ''} placeholder="https://wa.me/918168973121" />
          </Field>

          <label className="check">
            <input type="checkbox" name="is_active" defaultChecked={!!s.is_active} /> Show on website
          </label>
        </div>

        {info.hasContent ? (
          <div className="card">
            <h2>Text</h2>
            <HtmlEditor name="content" defaultValue={s.content ?? ''} rows={8} />
          </div>
        ) : (
          <input type="hidden" name="content" value="" />
        )}

        <div className="card grid">
          <h2 style={{ margin: 0 }}>Image / button</h2>
          <div className="check-grid">
            {BUILT_IN.map((b) => (
              <label key={b.value}>
                <input type="radio" name="image_choice" value={b.value} defaultChecked={current === b.value} />
                <img src={b.value} alt="" style={{ height: 32, maxWidth: 100, objectFit: 'contain' }} />
                <span>{b.label}</span>
              </label>
            ))}
            {!isBuiltIn && current ? (
              <label>
                <input type="radio" name="image_choice" value="keep" defaultChecked />
                <img src={uploadUrl(current) ?? ''} alt="" style={{ height: 32, maxWidth: 100, objectFit: 'contain' }} />
                <span>Your uploaded image</span>
              </label>
            ) : null}
          </div>
          <Field label="…or upload your own" htmlFor="image" hint="PNG/JPG/WEBP/GIF, up to 4 MB. An upload replaces the choice above.">
            <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="input" />
          </Field>
        </div>

        <div className="sticky-save">
          <button className="btn btn-primary" type="submit">
            💾 Save
          </button>{' '}
          <Link className="btn" href="/admin/whatsapp-sections">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
