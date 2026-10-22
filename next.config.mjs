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
};

export default nextConfig;
