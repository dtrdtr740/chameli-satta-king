import 'server-only';
import { cache } from 'react';
import { query } from './db';
import { istYear } from './time';

export type Settings = {
  site_name: string;
  brand_text: string;
  marquee_text: string;
  live_hint_text: string;
  whatsapp_number: string;
  whatsapp_channel_url: string;
  footer_disclaimer: string;
  copyright_text: string;
  google_site_verification: string;
  logo: string;
  section_1_title: string;
  section_2_title: string;
  whatsapp_channel_text: string;
  whatsapp_contact_text: string;
};

export const SETTING_DEFAULTS: Settings = {
  site_name: 'Satta King Live',
  brand_text: 'SATTA KING LIVE',
  marquee_text: '',
  live_hint_text: '',
  whatsapp_number: '',
  whatsapp_channel_url: '',
  footer_disclaimer: '',
  copyright_text: '© {year} {site}. All Rights Reserved',
  google_site_verification: '',
  logo: '',
  section_1_title: '',
  section_2_title: '',
  whatsapp_channel_text: 'व्हाट्सएप पर सुपर फास्ट रिजल्ट देखने के लिए नीचे दिए गए लिंक पर जाएं और चैनल को फॉलो करें।',
  whatsapp_contact_text: 'WhatsApp: {number}',
};

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await query<{ key: string; value: string | null }>('SELECT `key`, `value` FROM site_settings');
  const out = { ...SETTING_DEFAULTS };
  for (const r of rows) {
    if (r.key in out) (out as Record<string, string>)[r.key] = r.value ?? '';
  }
  return out;
});

export function siteUrl(): string {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/** Replace {site}, {year}, {domain} and any extra {tokens}. */
export function fillPlaceholders(text: string | null | undefined, settings: Settings, extra: Record<string, string | number> = {}): string {
  if (!text) return '';
  const map: Record<string, string> = {
    site: settings.site_name,
    year: String(istYear()),
    domain: siteUrl(),
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])),
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
}

export function uploadUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith('/')) return path;
  return `/uploads/${path}`;
}
