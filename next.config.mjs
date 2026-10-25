/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
  // lib/uploads.ts reads files relative to the project folder, so file tracing would otherwise copy the
  // whole folder (including Netlify's old build output in .netlify) into the server function and blow
  // Netlify's 250 MB limit. Next matches these patterns anywhere in a path, so keep them specific:
  // e.g. 'storage/**' would also drop node_modules/next/dist/server/async-storage and crash every page.
  outputFileTracingExcludes: {
    '*': ['.netlify/**', '.git/**'],
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
