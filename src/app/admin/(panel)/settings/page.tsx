import { revalidatePath } from 'next/cache';
import { Field, Flash, PageHead, type SP } from '@/components/admin/ui';
import { requirePermission } from '@/lib/auth';
import { execute } from '@/lib/db';
import { getActiveGames } from '@/lib/results';
import { bool, done, fail, str } from '@/lib/form';
import { schemaBlocks } from '@/components/site/SchemaMarkup';
import { SETTING_DEFAULTS, ga4Id, getSettings, googleVerificationToken, uploadUrl, type Settings } from '@/lib/settings';
import { deleteUpload, saveImage } from '@/lib/uploads';

const TEXT_KEYS: (keyof Settings)[] = [
  'site_name', 'brand_text', 'marquee_text', 'live_hint_text',
  'footer_disclaimer', 'copyright_text',
];

const SCHEMA_EXAMPLE = `{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "{site}",
  "url": "{domain}"
}`;

async function saveSettings(fd: FormData) {
  'use server';
  await requirePermission('manage site settings');
  const current = await getSettings();
  const values: Partial<Settings> = {};
  for (const k of TEXT_KEYS) values[k] = str(fd, k);
  if (!values.site_name) fail('/admin/settings', 'Site name is required');
  const featured = str(fd, 'featured_game');
  if (featured && !(await getActiveGames()).some((g) => g.slug === featured)) fail('/admin/settings', 'Choose an active game to feature');
  values.featured_game = featured;

  // Google Search Console: accept the bare code or the whole <meta> tag.
  values.google_site_verification = googleVerificationToken(str(fd, 'google_site_verification'));
  // Google Analytics 4: accept the bare G- ID or the whole gtag snippet.
  const gaRaw = str(fd, 'ga4_measurement_id');
  const ga4 = ga4Id(gaRaw);
  if (gaRaw && !ga4) fail('/admin/settings', 'Google Analytics ID must look like G-XXXXXXXXXX');
  values.ga4_measurement_id = ga4;
  // Site-wide schema must be valid JSON-LD (raw JSON or <script type="application/ld+json"> tags).
  const schema = str(fd, 'site_schema');
  for (const block of schemaBlocks(schema)) {
    try {
      JSON.parse(block);
    } catch {
      fail('/admin/settings', 'Site-wide schema is not valid JSON. Check commas, quotes and brackets.');
    }
  }
  values.site_schema = schema;
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
  const [s, sp, games] = await Promise.all([getSettings(), searchParams, getActiveGames()]);
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
          <Field
            label="Google Search Console (GSC) code"
            htmlFor="google_site_verification"
            hint='Paste the verification code, or the whole <meta name="google-site-verification" ...> tag from Search Console.'
          >
            <input id="google_site_verification" name="google_site_verification" className="input" defaultValue={s.google_site_verification} />
          </Field>
          <Field
            label="Google Analytics 4 (GA4) ID"
            htmlFor="ga4_measurement_id"
            hint="Measurement ID like G-XXXXXXXXXX (or paste the whole Google tag snippet). Leave empty to turn tracking off."
          >
            <input id="ga4_measurement_id" name="ga4_measurement_id" className="input" placeholder="G-XXXXXXXXXX" defaultValue={s.ga4_measurement_id} />
          </Field>
          <Field
            label="Featured game on home page"
            htmlFor="featured_game"
            hint="Shown in its own section with the full yearly chart after the monthly chart. On this website its record page then opens the home page section instead."
          >
            <select id="featured_game" name="featured_game" className="input" defaultValue={s.featured_game}>
              <option value="">None</option>
              {games.map((g) => (
                <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Site-wide schema (JSON-LD)"
          htmlFor="site_schema"
          hint="Added to every page of this website, on top of the schema set per page in SEO & Content. Raw JSON or a full script tag of type application/ld+json. {site}, {domain} and {year} are replaced."
        >
          <textarea
            id="site_schema"
            name="site_schema"
            className="textarea code"
            style={{ minHeight: 180 }}
            placeholder={SCHEMA_EXAMPLE}
            defaultValue={s.site_schema}
          />
        </Field>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Save settings
          </button>
        </div>
      </form>
    </>
  );
}
