// Creates/updates the schema (compatible with the Laravel "realsata" tables) and optionally seeds it.
//   node scripts/migrate.mjs            -> schema only
//   node scripts/migrate.mjs --seed     -> schema + roles, admin user, games, SEO pages + content
//   node scripts/migrate.mjs --seed --demo -> also fills demo results for the current month
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { SEO_SEED } from './content.mjs';

function loadEnv() {
  for (const file of ['.env', '.env.local']) {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}
loadEnv();

const args = new Set(process.argv.slice(2));
const env = process.env;

const base = {
  host: env.DB_HOST || '127.0.0.1',
  port: Number(env.DB_PORT || 3306),
  user: env.DB_USERNAME,
  password: env.DB_PASSWORD || '',
  timezone: env.DB_TIMEZONE || '+00:00',
  multipleStatements: false,
  ssl: env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: env.DB_SSL_VERIFY !== 'false' } : undefined,
};

// Create the database when the account is allowed to (local dev). On shared hosting it already exists.
try {
  const c = await mysql.createConnection(base);
  await c.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await c.end();
} catch (e) {
  console.log(`(skipping CREATE DATABASE: ${e.code || e.message})`);
}

const db = await mysql.createConnection({ ...base, database: env.DB_DATABASE });
await db.query(`SET time_zone = ?`, [base.timezone]);

// SITE_KEY (e.g. "a7") gives this website its own copies of the per-site tables (a7_seo_pages, …) while
// games/results/users stay shared. Same rule as src/lib/site.ts.
const SITE_KEY = (env.SITE_KEY || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const PREFIX = SITE_KEY ? `${SITE_KEY}_` : '';
const SITE_TABLES = ['site_settings', 'seo_pages', 'blog_posts', 'advertisements', 'notices', 'whatsapp_sections', 'content_blocks', 'media'];
const TABLE_RE = new RegExp(`\\b(FROM|INTO|UPDATE|JOIN|TABLE|EXISTS)(\\s+)(\`?)(${SITE_TABLES.join('|')})\\3(?![\\w.])`, 'gi');
const rawQuery = db.query.bind(db);
db.query = (sql, params) => rawQuery(PREFIX ? sql.replace(TABLE_RE, (_m, kw, sp, tick, t) => `${kw}${sp}${tick}${PREFIX}${t}${tick}`) : sql, params);
const tableName = (t) => (SITE_TABLES.includes(t) ? `${PREFIX}${t}` : t);
if (SITE_KEY) console.log(`Site "${SITE_KEY}": per-site tables use the prefix "${PREFIX}"`);
console.log(`Connected to ${base.host}:${base.port}/${env.DB_DATABASE}`);

const T = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
const ts = 'created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL';

const tables = [
  `CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    ${ts}) ${T}`,
  `CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    guard_name VARCHAR(255) NOT NULL,
    ${ts},
    UNIQUE KEY permissions_name_guard_name_unique (name, guard_name)) ${T}`,
  `CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    guard_name VARCHAR(255) NOT NULL,
    ${ts},
    UNIQUE KEY roles_name_guard_name_unique (name, guard_name)) ${T}`,
  `CREATE TABLE IF NOT EXISTS model_has_permissions (
    permission_id BIGINT UNSIGNED NOT NULL,
    model_type VARCHAR(255) NOT NULL,
    model_id BIGINT UNSIGNED NOT NULL,
    KEY model_has_permissions_model_id_model_type_index (model_id, model_type),
    PRIMARY KEY (permission_id, model_id, model_type),
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS model_has_roles (
    role_id BIGINT UNSIGNED NOT NULL,
    model_type VARCHAR(255) NOT NULL,
    model_id BIGINT UNSIGNED NOT NULL,
    KEY model_has_roles_model_id_model_type_index (model_id, model_type),
    PRIMARY KEY (role_id, model_id, model_type),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS role_has_permissions (
    permission_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (permission_id, role_id),
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS games (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    result_time TIME NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    default_show_minutes INT NOT NULL DEFAULT 15,
    sort_order INT NOT NULL DEFAULT 0,
    ${ts}) ${T}`,
  `CREATE TABLE IF NOT EXISTS game_results (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    game_id BIGINT UNSIGNED NOT NULL,
    result_date DATE NOT NULL,
    result VARCHAR(10) NULL,
    show_minutes INT NOT NULL DEFAULT 0,
    status ENUM('waiting','declared') NOT NULL DEFAULT 'waiting',
    ${ts},
    UNIQUE KEY game_results_game_id_result_date_unique (game_id, result_date),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS content_blocks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    game_id BIGINT UNSIGNED NULL,
    year INT NULL,
    \`key\` VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) NULL,
    content LONGTEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    ${ts},
    KEY content_blocks_game_id_year_index (game_id, year),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL) ${T}`,
  `CREATE TABLE IF NOT EXISTS chart_years (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    game_id BIGINT UNSIGNED NOT NULL,
    year YEAR NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    ${ts},
    UNIQUE KEY chart_years_game_id_year_unique (game_id, year),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS advertisements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NULL,
    position VARCHAR(255) NULL,
    content LONGTEXT NULL,
    image VARCHAR(255) NULL,
    link VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    ${ts}) ${T}`,
  `CREATE TABLE IF NOT EXISTS notices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NULL,
    message LONGTEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    ${ts}) ${T}`,
  `CREATE TABLE IF NOT EXISTS seo_pages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    page_key VARCHAR(255) NULL UNIQUE,
    game_id BIGINT UNSIGNED NULL,
    year INT NULL,
    meta_title VARCHAR(255) NULL,
    meta_description TEXT NULL,
    meta_keywords TEXT NULL,
    canonical_url VARCHAR(255) NULL,
    og_title VARCHAR(255) NULL,
    og_description TEXT NULL,
    og_image VARCHAR(255) NULL,
    schema_markup LONGTEXT NULL,
    page_content LONGTEXT NULL,
    ${ts},
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL) ${T}`,
  `CREATE TABLE IF NOT EXISTS game_user (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    game_id BIGINT UNSIGNED NULL,
    ${ts},
    UNIQUE KEY game_user_user_id_game_id_unique (user_id, game_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE) ${T}`,
  `CREATE TABLE IF NOT EXISTS blog_posts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT NULL,
    content LONGTEXT NULL,
    image VARCHAR(255) NULL,
    meta_title VARCHAR(255) NULL,
    meta_description TEXT NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    published_at DATETIME NULL,
    ${ts},
    KEY blog_posts_published_index (is_published, published_at)) ${T}`,
  `CREATE TABLE IF NOT EXISTS whatsapp_sections (
    slot VARCHAR(30) NOT NULL PRIMARY KEY,
    title VARCHAR(255) NULL,
    content LONGTEXT NULL,
    image VARCHAR(255) NULL,
    link VARCHAR(500) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    ${ts}) ${T}`,
  `CREATE TABLE IF NOT EXISTS media (
    path VARCHAR(255) NOT NULL PRIMARY KEY,
    mime VARCHAR(50) NOT NULL,
    data LONGBLOB NOT NULL,
    created_at TIMESTAMP NULL) ${T}`,
  `CREATE TABLE IF NOT EXISTS site_settings (
    \`key\` VARCHAR(100) NOT NULL PRIMARY KEY,
    \`value\` LONGTEXT NULL,
    updated_at TIMESTAMP NULL) ${T}`,
  // Logout revocation and login throttling (shared by all sites; also created on first use by src/lib/authTables.ts).
  `CREATE TABLE IF NOT EXISTS revoked_sessions (
    jti CHAR(32) NOT NULL PRIMARY KEY,
    expires_at BIGINT NOT NULL,
    KEY revoked_sessions_expires_index (expires_at)) ${T}`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    email VARCHAR(255) NOT NULL,
    attempted_at BIGINT NOT NULL,
    KEY login_attempts_ip_index (ip, attempted_at),
    KEY login_attempts_email_ip_index (email, ip, attempted_at),
    KEY login_attempts_time_index (attempted_at)) ${T}`,
];

for (const sql of tables) await db.query(sql);

// Columns added over time in the Laravel app (and by this app). Added only when missing,
// so running this against the existing Laravel database is safe.
const columns = [
  ['games', 'default_show_minutes', 'INT NOT NULL DEFAULT 15 AFTER is_active'],
  // Which today/yesterday table the game appears in on the home page (1 = first, 2 = second).
  ['games', 'result_section', 'TINYINT NOT NULL DEFAULT 1 AFTER default_show_minutes'],
  ['game_results', 'show_minutes', 'INT NOT NULL DEFAULT 0 AFTER result'],
  ['seo_pages', 'game_id', 'BIGINT UNSIGNED NULL AFTER page_key'],
  ['seo_pages', 'year', 'INT NULL AFTER game_id'],
  ['seo_pages', 'schema_markup', 'LONGTEXT NULL AFTER og_image'],
  ['seo_pages', 'page_content', 'LONGTEXT NULL AFTER schema_markup'],
  ['content_blocks', 'game_id', 'BIGINT UNSIGNED NULL AFTER id'],
  ['content_blocks', 'year', 'INT NULL AFTER game_id'],
];
for (const [table, column, def] of columns) {
  const [rows] = await db.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName(table), column],
  );
  if (!rows.length) {
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${def}`);
    console.log(`+ ${table}.${column}`);
  }
}
// Permission names from the Laravel app -> names that say what they unlock. Role assignments are kept.
const PERMISSION_RENAMES = {
  'dashboard view': 'view dashboard',
  'game-results view': 'update today results',
  'game-results views': 'manage game results',
  'games view': 'manage games',
  'games assign users': 'assign games to users',
  'chart-years view': 'manage chart years',
  'seo-content view': 'manage seo & content',
  'seo-pages view': 'manage seo pages',
  'content-blocks view': 'manage content blocks',
  'advertisements view': 'manage advertisements',
  'notices view': 'manage notices',
  'users view': 'manage users',
  'roles view': 'manage roles',
  'permissions view': 'manage permissions',
  'settings view': 'manage site settings',
};
// Seeded by the Laravel app but never checked anywhere.
const UNUSED_PERMISSIONS = ['role view', 'role create', 'role edit', 'role delete', 'user view', 'user create', 'user edit', 'user delete'];

for (const [from, to] of Object.entries(PERMISSION_RENAMES)) {
  const [[old]] = await db.query(`SELECT id FROM permissions WHERE name = ? AND guard_name = 'web'`, [from]);
  if (!old) continue;
  const [[target]] = await db.query(`SELECT id FROM permissions WHERE name = ? AND guard_name = 'web'`, [to]);
  if (target) {
    // Both exist: move the old one's role/user links onto the new one, then drop the old one.
    await db.query(`INSERT IGNORE INTO role_has_permissions (permission_id, role_id) SELECT ?, role_id FROM role_has_permissions WHERE permission_id = ?`, [target.id, old.id]);
    await db.query(
      `INSERT IGNORE INTO model_has_permissions (permission_id, model_type, model_id) SELECT ?, model_type, model_id FROM model_has_permissions WHERE permission_id = ?`,
      [target.id, old.id],
    );
    await db.query(`DELETE FROM permissions WHERE id = ?`, [old.id]);
  } else {
    await db.query(`UPDATE permissions SET name = ?, updated_at = NOW() WHERE id = ?`, [to, old.id]);
  }
  console.log(`~ permission "${from}" -> "${to}"`);
}
const [removed] = await db.query(`DELETE FROM permissions WHERE guard_name = 'web' AND name IN (?)`, [UNUSED_PERMISSIONS]);
if (removed.affectedRows) console.log(`- removed ${removed.affectedRows} unused permissions`);

// Move images uploaded before uploads were stored in the database (UPLOAD_DIR on disk) into `media`.
{
  const root = path.resolve(process.cwd(), env.UPLOAD_DIR || './storage/uploads');
  const mimes = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
  const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])) : []);
  let moved = 0;
  for (const file of walk(root)) {
    const mime = mimes[path.extname(file).slice(1).toLowerCase()];
    if (!mime) continue;
    const rel = path.relative(root, file).split(path.sep).join('/');
    const [r] = await db.query('INSERT IGNORE INTO media (path, mime, data, created_at) VALUES (?, ?, ?, NOW())', [rel, mime, fs.readFileSync(file)]);
    moved += r.affectedRows;
  }
  if (moved) console.log(`Copied ${moved} uploaded image(s) from disk into the database`);
}

// The 5 fixed WhatsApp slots (managed in Admin -> WhatsApp Sections). Created once, from the current
// Site Settings, so existing sites keep showing exactly what they showed before.
{
  const [rows] = await db.query('SELECT `key`, `value` FROM site_settings');
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  const channel = s.whatsapp_channel_url || 'https://www.whatsapp.com/channel/0029Vb67katLikgE57Pwhj0T';
  const channelText =
    s.whatsapp_channel_text || 'व्हाट्सएप पर सुपर फास्ट रिजल्ट देखने के लिए नीचे दिए गए लिंक पर जाएं और चैनल को फॉलो करें।';
  // Same content as the live site (chamelisattaking.com): Shanu Bhai contact banners + the channel banner.
  const LIVE_WA = 'https://wa.me/918171581056';
  const slots = [
    ['top', 'Top banner (under the logo)',
      '<p style="text-align: center;">नमस्कार साथियों<br>बिंदास गेम खेलिए सीधे कंपनी खाईवाल के पास और पाइए 1001% पेमेंट की गारंटी।<br>आपका अपना भाई </p><p style="text-align: center;"><strong>SHANU </strong><strong>BHAI</strong></p>',
      '/whatsapp-chat.png', LIVE_WA, 1],
    ['after_live', 'Below live results',
      '<p style="text-align: center;">सीधे सट्टा कंपनी का No 1 खाईवाल<br>✰✰ SHANU BHAI  ✰✰</p><p style="text-align: center;">     </p><p style="text-align: center;">🎯 पालिका बाजार ---------------- 1:20 PM<br>🎯 प्रयागराज -------------------- 2:00 PM<br>🎯 दिल्ली बाजार ---------------- 3:00 PM<br>🎯 दिल्ली दरबार ---------------- 3:30 PM<br>🎯 श्री गणेश -------------------- 4:30 PM<br>🎯 रूप नगर ---------------------- 5:10 PM<br>🎯 फरीदाबाद -------------------- 5:50 PM<br>🎯 फतेहपुर ---------------------- 7:10 PM<br>🎯 गाज़ियाबाद ------------------ 9:20 PM<br>🎯 नोएडा नाइट ----------------- 10:00 PM<br>🎯 गली --------------------------- 11:50 PM<br>🎯 दिसावर ----------------------- 3:00 AM</p><p style="text-align: center;"><br>जोड़ी रेट 10-------960<br>हरूफ रेट 100-----960<br>✰✰ SHANU BHAI ✰✰<br>Game Play करने के लिये नीचे लिंक पर क्लिक करे</p>',
      '/whatsapp-chat.png', LIVE_WA, 2],
    ['middle', 'Middle banner', `<p>${channelText}</p>`, '/join-whatsapp.png', channel, 3],
    ['after_chart', 'Below result chart', '<p style="text-align: center;">apni game or add dalwane k liye sampark karen</p>', '/whatsapp-chat.png', LIVE_WA, 4],
    ['floating', 'Floating button (bottom right) + Contact page', '', '/whatsapp-logo.webp', LIVE_WA, 5],
  ];
  let added = 0;
  for (const [slot, title, content, image, link, order] of slots) {
    const [r] = await db.query(
      `INSERT IGNORE INTO whatsapp_sections (slot, title, content, image, link, is_active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
      [slot, title, content, image, link, order],
    );
    added += r.affectedRows;
  }
  if (added) console.log(`Created ${added} WhatsApp section(s)`);
}

console.log('Schema ready.');

if (args.has('--seed')) {
  const PERMISSIONS = [...Object.values(PERMISSION_RENAMES), 'manage blog', 'manage whatsapp sections'];
  for (const name of PERMISSIONS) {
    await db.query(
      `INSERT IGNORE INTO permissions (name, guard_name, created_at, updated_at) VALUES (?, 'web', NOW(), NOW())`,
      [name],
    );
  }
  for (const role of ['super admin', 'admin']) {
    await db.query(
      `INSERT IGNORE INTO roles (name, guard_name, created_at, updated_at) VALUES (?, 'web', NOW(), NOW())`,
      [role],
    );
  }
  const [[superRole]] = await db.query(`SELECT id FROM roles WHERE name = 'super admin' AND guard_name = 'web'`);
  await db.query(
    `INSERT IGNORE INTO role_has_permissions (permission_id, role_id) SELECT id, ? FROM permissions WHERE guard_name = 'web'`,
    [superRole.id],
  );
  // "admin" gets everything except managing roles/permissions, but only if nobody has set it up yet.
  const [[adminRole]] = await db.query(`SELECT id FROM roles WHERE name = 'admin' AND guard_name = 'web'`);
  const [[{ n: adminPerms }]] = await db.query(`SELECT COUNT(*) AS n FROM role_has_permissions WHERE role_id = ?`, [adminRole.id]);
  if (adminPerms === 0) {
    await db.query(
      `INSERT IGNORE INTO role_has_permissions (permission_id, role_id)
       SELECT id, ? FROM permissions WHERE guard_name = 'web' AND name NOT IN ('manage roles', 'manage permissions')`,
      [adminRole.id],
    );
    console.log('Gave the "admin" role its default permissions');
  }
  // Permissions added after the admin role was set up: give them to "admin" once.
  await db.query(
    `INSERT IGNORE INTO role_has_permissions (permission_id, role_id)
     SELECT id, ? FROM permissions WHERE guard_name = 'web' AND name IN ('manage blog', 'manage whatsapp sections')`,
    [adminRole.id],
  );

  const email = env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const [existing] = await db.query(`SELECT id FROM users WHERE email = ?`, [email]);
  let adminId = existing[0]?.id;
  if (!adminId) {
    const hash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD || 'admin12345', 12);
    const [r] = await db.query(
      `INSERT INTO users (name, email, password, created_at, updated_at) VALUES ('Super Admin', ?, ?, NOW(), NOW())`,
      [email, hash],
    );
    adminId = r.insertId;
    console.log(`Created admin ${email}`);
  }
  await db.query(
    `INSERT IGNORE INTO model_has_roles (role_id, model_type, model_id) VALUES (?, 'App\\\\Models\\\\User', ?)`,
    [superRole.id, adminId],
  );

  const GAMES = [
    ['Disawar', '02:00:00'], ['Palika Bazar', '13:00:00'], ['Sadar Bazar', '13:30:00'],
    ['Prayagraj', '14:00:00'], ['Gwalior', '14:20:00'], ['Delhi Bazaar', '14:50:00'],
    ['Delhi Darbar', '15:40:00'], ['Shri Ganesh', '16:10:00'], ['Roop Nagar', '17:00:00'],
    ['Agra', '17:30:00'], ['Faridabad', '18:20:00'], ['Fatehpur', '19:10:00'],
    ['Alwar', '19:30:00'], ['Ghaziabad', '21:30:00'], ['Noida Night', '22:00:00'],
    ['Dwarka', '22:20:00'], ['Gali', '23:50:00'],
  ];
  const [[{ n: gameCount }]] = await db.query(`SELECT COUNT(*) AS n FROM games`);
  if (gameCount === 0) {
    let i = 1;
    for (const [name, time] of GAMES) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await db.query(
        `INSERT INTO games (name, slug, result_time, is_active, default_show_minutes, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 1, 15, ?, NOW(), NOW())`,
        [name, slug, time, i++],
      );
    }
    console.log(`Seeded ${GAMES.length} games`);
  }

  for (const page of SEO_SEED) {
    await db.query(
      `INSERT INTO seo_pages (page_key, meta_title, meta_description, meta_keywords, page_content, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE page_content = COALESCE(page_content, VALUES(page_content))`,
      [page.page_key, page.meta_title, page.meta_description, page.meta_keywords, page.page_content],
    );
  }
  console.log(`Seeded ${SEO_SEED.length} SEO pages`);

  const SETTINGS = {
    site_name: env.SEED_SITE_NAME || 'Satta King Live',
    brand_text: (env.SEED_SITE_NAME || 'Satta King Live').toUpperCase(),
    marquee_text:
      'satta king, gali satta, disawar satta, satta king gali disawar, satta king live result, satta chart, gali result, desawar result, faridabad result, ghaziabad result',
    live_hint_text: 'हा भाई यही आती हे सबसे पहले खबर रूको और देखो',
    whatsapp_number: '918168973121',
    whatsapp_channel_url: 'https://whatsapp.com/channel/0029Vb67katLikgE57Pwhj0T',
    footer_disclaimer: '!! DISCLAIMER:- This is a non-commercial website. Viewing this website is your own risk.',
    copyright_text: '© {year} {site}. All Rights Reserved',
    google_site_verification: '',
    ga4_measurement_id: '',
    site_schema: '',
    logo: '',
    section_1_title: '',
    section_2_title: '',
  };
  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.query(`INSERT IGNORE INTO site_settings (\`key\`, \`value\`, updated_at) VALUES (?, ?, NOW())`, [key, value]);
  }
  // Google Search Console code per website ('' = main site, Chameli). Only fills it in when empty, so a code set in Admin is never overwritten.
  const GSC = { '': 'FduG9cif9psz9bRGjUzRoN0xsc1u1plhO1nvkhgBuu8', a7: 'VKrMh1arA854nsGMBEfV1RgSTUuN7Jexna_w8Z2WEV4' };
  if (GSC[SITE_KEY]) {
    await db.query(
      "UPDATE site_settings SET `value` = ?, updated_at = NOW() WHERE `key` = 'google_site_verification' AND (`value` IS NULL OR `value` = '')",
      [GSC[SITE_KEY]],
    );
  }
  console.log('Seeded site settings');

  // (WhatsApp banners are permanent WhatsApp Sections now, created above; no default ads.)

  // One sample post so the blog section (after the FAQ) is visible from the start. Only when the blog is empty.
  const [[{ n: postCount }]] = await db.query(`SELECT COUNT(*) AS n FROM blog_posts`);
  if (postCount === 0) {
    const content = [
      '<h2>सट्टा किंग रिजल्ट और चार्ट कैसे देखें</h2>',
      '<p>{site} पर हर गेम का रिजल्ट उसी समय अपडेट होता है जब वह घोषित होता है। होम पेज पर सबसे ऊपर <strong>लाइव रिजल्ट</strong> दिखते हैं और नीचे टेबल में <strong>कल आया था</strong> और <strong>आज का रिज़ल्ट</strong> साथ-साथ दिखाई देते हैं।</p>',
      '<h3>रिजल्ट टेबल को कैसे पढ़ें</h3>',
      '<ul><li><strong>सट्टा का नाम</strong> – गेम का नाम और उसका रिजल्ट टाइम।</li><li><strong>कल आया था</strong> – पिछले दिन का घोषित नंबर।</li><li><strong>आज का रिज़ल्ट</strong> – आज का नंबर; घोषित होने तक यहाँ "wait" दिखता है।</li></ul>',
      '<h3>महीने का और पूरे साल का चार्ट</h3>',
      '<p>होम पेज पर इस महीने का पूरा चार्ट मिलता है। किसी भी गेम का पूरे साल का रिकॉर्ड देखने के लिए <a href="/chart">चार्ट पेज</a> खोलें और गेम पर क्लिक करें। पिछले सालों के चार्ट भी वहीं साल के बटन से खुलते हैं।</p>',
      '<h3>ध्यान रखें</h3>',
      '<blockquote>{site} केवल जानकारी के लिए रिजल्ट दिखाता है। हम कोई गेम नहीं चलाते और न ही कोई "फिक्स नंबर" या "लीक जोड़ी" बेचते हैं — ऐसा दावा करने वाला कोई भी व्यक्ति धोखा कर रहा है।</blockquote>',
    ].join('\n');
    await db.query(
      `INSERT INTO blog_posts (title, slug, excerpt, content, meta_title, meta_description, is_published, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(), NOW(), NOW())`,
      [
        'सट्टा किंग रिजल्ट और चार्ट कैसे देखें – पूरी जानकारी',
        'satta-king-result-chart-kaise-dekhe',
        'लाइव रिजल्ट, कल और आज का रिज़ल्ट, महीने का चार्ट और पूरे साल का रिकॉर्ड – सब कुछ एक जगह कैसे देखें, आसान भाषा में।',
        content,
        'सट्टा किंग रिजल्ट और चार्ट कैसे देखें {year} | {site}',
        'Satta King live result, kal aur aaj ka result, monthly chart aur saal ka record {site} par kaise dekhein – poori jaankari.',
      ],
    );
    console.log('Seeded sample blog post');
  }

  if (args.has('--demo')) {
    // Demo results: every game for every day of the current month up to yesterday (IST), plus
    // today's results for games whose time has already passed.
    const istNow = new Date(Date.now() + 330 * 60000);
    const y = istNow.getUTCFullYear();
    const m = istNow.getUTCMonth();
    const today = istNow.getUTCDate();
    const minutesNow = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
    const [games] = await db.query(`SELECT id, result_time FROM games`);
    let count = 0;
    for (let d = 1; d <= today; d++) {
      const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      for (const g of games) {
        const [hh, mm] = String(g.result_time || '00:00').split(':').map(Number);
        if (d === today && hh * 60 + mm > minutesNow) continue;
        const num = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        await db.query(
          `INSERT IGNORE INTO game_results (game_id, result_date, result, show_minutes, status, created_at, updated_at)
           VALUES (?, ?, ?, 15, 'declared', NOW(), NOW())`,
          [g.id, date, num],
        );
        count++;
      }
    }
    console.log(`Seeded ${count} demo results`);
  }
}

await db.end();
console.log('Done.');
