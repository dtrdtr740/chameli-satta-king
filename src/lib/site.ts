// Several websites can run from this code on ONE database:
// - shared tables (games, results, chart years, users/roles/permissions) are used by every site;
// - per-site tables (settings, SEO & content, blog, ads, notices, WhatsApp sections, content blocks, media)
//   get a prefix from SITE_KEY, e.g. SITE_KEY=a7 -> a7_seo_pages.
// The main site has no SITE_KEY and also manages games/results/users. Other sites are content-only.

export const SITE_KEY = (process.env.SITE_KEY || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
export const TABLE_PREFIX = SITE_KEY ? `${SITE_KEY}_` : '';

/** True on the main site: it manages games, results, users, roles and permissions. */
export const MANAGES_SHARED = !SITE_KEY;

export const SITE_TABLES = [
  'site_settings', 'seo_pages', 'blog_posts', 'advertisements', 'notices',
  'whatsapp_sections', 'content_blocks', 'media',
] as const;

const TABLE_RE = new RegExp(`\\b(FROM|INTO|UPDATE|JOIN|TABLE|EXISTS)(\\s+)(\`?)(${SITE_TABLES.join('|')})\\3(?![\\w.])`, 'gi');

/** Point per-site table names in a SQL string at this site's copies. No-op on the main site. */
export function siteSql(sql: string): string {
  if (!TABLE_PREFIX) return sql;
  return sql.replace(TABLE_RE, (_m, kw, sp, tick, table) => `${kw}${sp}${tick}${TABLE_PREFIX}${table}${tick}`);
}

/** Permissions that only make sense on the main site (shared data). */
export const SHARED_PERMISSIONS = new Set([
  'update today results', 'manage game results', 'manage games', 'assign games to users', 'manage chart years',
  'manage users', 'manage roles', 'manage permissions',
]);

/**
 * Colour theme of the public site. '' = default warm theme (Chameli); 'blue' = A7 Satta Wala.
 * Set SITE_THEME=blue on a Netlify site to force it; A7 is also recognised by SITE_KEY=a7 or an a7sattawala SITE_URL.
 */
export const SITE_THEME: '' | 'blue' =
  process.env.SITE_THEME?.trim().toLowerCase() === 'blue' || SITE_KEY === 'a7' || /a7sattawala/i.test(process.env.SITE_URL || '')
    ? 'blue'
    : '';
