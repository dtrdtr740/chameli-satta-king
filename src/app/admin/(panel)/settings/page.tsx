import { revalidatePath } from 'next/cache';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { execute } from '@/lib/db';
import { bool, done, fail, str } from '@/lib/form';
import { SETTING_DEFAULTS, getSettings, uploadUrl, type Settings } from '@/lib/settings';
import { deleteUpload, saveImage } from '@/lib/uploads';

const TEXT_KEYS: (keyof Settings)[] = [
  'site_name', 'brand_text', 'marquee_text', 'live_hint_text',
  'footer_disclaimer', 'copyright_text', 'google_site_verification',
];

async function saveSettings(fd: FormData) {
  'use server';
  await requirePermission('manage site settings');
  const current = await getSettings();
  const values: Partial<Settings> = {};
  for (const k of TEXT_KEYS) values[k] = str(fd, k);
  if (!values.site_name) fail('/admin/settings', 'Site name is required');
  try {
    const up = await saveImage(fd.get('logo'), 'branding');
    if (up || bool(fd, 'remove_logo')) {
      await deleteUpload(current.logo);
      values.logo = up ?? '';
    }
  } catch (e) {
    fail('/admin/settings', (e as Error).message);
  }
  for (const [key, value] of Object.entries(values)) {
    await execute(
      'INSERT INTO site_settings (`key`, `value`, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = NOW()',
      [key, value],
    );
  }
  revalidatePath('/', 'layout');
  done('/admin/settings', 'Settings saved.');
}

export default async function SettingsPage({ searchParams }: { searchParams: SP }) {
  await requirePermission('manage site settings');
  const [s, sp] = await Promise.all([getSettings(), searchParams]);
  const logo = uploadUrl(s.logo);
  return (
    <>
      <PageHead title="Site Settings" sub="Branding and texts used in the header, live box and footer. WhatsApp banners, links and the floating button are in Admin → WhatsApp Sections." />
      <Flash sp={sp} />
      <form action={saveSettings} className="card">
        <div className="grid grid-2">
          <Field label="Site name" htmlFor="site_name" hint="Used in titles and as {site} in SEO text.">
            <input id="site_name" name="site_name" className="input" required defaultValue={s.site_name} />
          </Field>
          <Field label="Brand band text" htmlFor="brand_text" hint="The big blinking text under the header.">
            <input id="brand_text" name="brand_text" className="input" defaultValue={s.brand_text} />
          </Field>
          <Field label="Logo" htmlFor="logo" hint="Square PNG/WEBP works best.">
            <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="input" />
            {logo ? (
              <span style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                <img src={logo} alt="" style={{ height: 44, borderRadius: 8, background: '#000' }} />
                <label className="check">
                  <input type="checkbox" name="remove_logo" /> Remove
                </label>
              </span>
            ) : null}
          </Field>
          <Field label="Live box hint text" htmlFor="live_hint_text">
            <input id="live_hint_text" name="live_hint_text" className="input" defaultValue={s.live_hint_text} />
          </Field>
          <Field label="Scrolling marquee text" htmlFor="marquee_text">
            <textarea id="marquee_text" name="marquee_text" className="textarea" rows={2} defaultValue={s.marquee_text} />
          </Field>
          <Field label="Footer disclaimer" htmlFor="footer_disclaimer">
            <textarea id="footer_disclaimer" name="footer_disclaimer" className="textarea" rows={2} defaultValue={s.footer_disclaimer} />
          </Field>
          <Field label="Copyright text" htmlFor="copyright_text" hint="{year} and {site} are replaced.">
            <input id="copyright_text" name="copyright_text" className="input" defaultValue={s.copyright_text || SETTING_DEFAULTS.copyright_text} />
          </Field>
          <Field label="Google site verification code" htmlFor="google_site_verification">
            <input id="google_site_verification" name="google_site_verification" className="input" defaultValue={s.google_site_verification} />
          </Field>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Save settings
          </button>
        </div>
      </form>
    </>
  );
}
