/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },
  },
  // lib/uploads.ts reads files relative to the project folder, so file tracing would otherwise copy the
  // whole folder (including old build output) into the server function and blow Netlify's 250 MB limit.
  outputFileTracingExcludes: {
    '*': ['.netlify/**', '.next/**', '.git/**', 'storage/**', 'scripts/**', 'public/**', '*.md', '.env*'],
  },
};

export default nextConfig;
