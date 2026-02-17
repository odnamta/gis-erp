import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript and ESLint checking enabled for production builds
  // All type errors must be fixed before deployment

  // Remove console.log in production (keep error/warn for debugging)
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },

  // Allow file uploads up to 11MB via server actions (document attachments are max 10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '11mb',
    },
  },
};

export default withBundleAnalyzer(nextConfig);
