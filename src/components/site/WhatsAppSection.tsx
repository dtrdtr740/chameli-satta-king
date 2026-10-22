import { SETTING_DEFAULTS, type Settings } from '@/lib/settings';

/**
 * Permanent WhatsApp blocks (not ads): the channel "Join Group" banner and the contact-number banner.
 * Text, channel link and number come from Admin -> Site Settings. Each block hides if its link is empty.
 */
export function WhatsAppChannel({ settings }: { settings: Settings }) {
  const url = settings.whatsapp_channel_url;
  if (!url) return null;
  return (
    <section className="ad-wrap wa-section" aria-label="WhatsApp channel">
      <a className="ad-box" href={url} target="_blank" rel="noopener noreferrer">
        <span className="rv-ad-heading">{settings.whatsapp_channel_text || SETTING_DEFAULTS.whatsapp_channel_text}</span>
        <span className="ad-img">
          <img src="/join-whatsapp.png" alt="Join WhatsApp channel" width={159} height={55} decoding="async" />
        </span>
      </a>
    </section>
  );
}

export function WhatsAppContact({ settings }: { settings: Settings }) {
  const number = settings.whatsapp_number.replace(/[^\d]/g, '');
  if (!number) return null;
  const shown = number.startsWith('91') && number.length === 12 ? `+91 ${number.slice(2)}` : `+${number}`;
  return (
    <section className="ad-wrap wa-section" aria-label="WhatsApp contact">
      <a className="ad-box" href={`https://wa.me/${number}`} target="_blank" rel="noopener noreferrer">
        <span className="rv-ad-heading">{(settings.whatsapp_contact_text || SETTING_DEFAULTS.whatsapp_contact_text).replace('{number}', shown)}</span>
        <span className="ad-img">
          <img src="/whatsapp-logo.webp" alt="WhatsApp" width={55} height={55} loading="lazy" decoding="async" />
        </span>
      </a>
    </section>
  );
}
