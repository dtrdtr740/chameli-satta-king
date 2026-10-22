// Self-hosted TinyMCE loads its skins/plugins/icons at runtime, so they must be served from /public.
import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('node_modules/tinymce');
const dest = path.resolve('public/tinymce');
if (!fs.existsSync(src)) process.exit(0);
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, {
  recursive: true,
  filter: (p) => !/[\\/](README\.md|CHANGELOG\.md|package\.json|composer\.json|bower\.json)$/.test(p) && !p.endsWith('.d.ts'),
});
console.log('Copied TinyMCE to public/tinymce');
