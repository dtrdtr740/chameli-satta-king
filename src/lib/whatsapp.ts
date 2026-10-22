import 'server-only';
import { cache } from 'react';
import { query } from './db';

export type WhatsAppSlot = 'top' | 'after_live' | 'middle' | 'floating';

export type WhatsAppSection = {
  slot: WhatsAppSlot;
  title: string | null;
  content: string | null;
  image: string | null;
  link: string | null;
  is_active: number;
  sort_order: number;
  updated_at: string | null;
};

/** What each fixed slot is for (shown in the admin). */
export const SLOT_INFO: Record<WhatsAppSlot, { label: string; where: string; hasContent: boolean }> = {
  top: { label: 'Top banner', where: 'Home page, under the logo', hasContent: true },
  after_live: { label: 'Below live results', where: 'Home page, right after the live result box', hasContent: true },
  middle: { label: 'Middle banner', where: 'Home page, above the result tables', hasContent: true },
  floating: { label: 'Floating button', where: 'Every page, bottom-right icon; also the Contact page button', hasContent: false },
};

export const getWhatsAppSections = cache(async (): Promise<Record<string, WhatsAppSection>> => {
  const rows = await query<WhatsAppSection>('SELECT * FROM whatsapp_sections ORDER BY sort_order, slot');
  return Object.fromEntries(rows.map((r) => [r.slot, r]));
});

/** Active section with a link, or null (inactive / missing / no link = hidden). */
export async function activeSection(slot: WhatsAppSlot): Promise<WhatsAppSection | null> {
  const s = (await getWhatsAppSections())[slot];
  return s && s.is_active && s.link ? s : null;
}
