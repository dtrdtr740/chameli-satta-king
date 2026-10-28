/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Lets a second local dev server (e.g. the A7 site on port 3001) use its own build folder.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
  // lib/uploads.ts reads files relative to the project folder, so file tracing would otherwise copy the
  // whole folder (including Netlify's old build output in .netlify) into the server function and blow
  // Netlify's 250 MB limit. Next matches these patterns anywhere in a path, so keep them specific:
  // e.g. 'storage/**' would also drop node_modules/next/dist/server/async-storage and crash every page.
  // The route key must be '**': '*' does not match routes with a slash (e.g. /api/admin/upload), so the
  // rule silently never applied. .env files must never ship inside the function either.
  outputFileTracingExcludes: {
    '**': ['.netlify/**', '.git/**', '.env*', 'QA_BRIEF.md'],
  },
  // Stop other sites from framing pages (clickjacking on the admin). The CSP is limited to directives
  // that can't break Next's inline scripts, TinyMCE or third-party ad scripts.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
