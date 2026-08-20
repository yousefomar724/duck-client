import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Hero videos and the local font are versioned by filename (-vN) and are
        // never replaced in place -- a content change ships under a new filename.
        // See scripts/encode-videos.mjs.
        source: '/:path(videos|fonts)/:file*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Must be revalidated on every load, or an updated service worker
        // never reaches installed clients.
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // 31 days — Cloudinary uploads are immutable once published.
    minimumCacheTTL: 2678400,
    qualities: [50, 75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'duckapi.alefmenu.com',
        pathname: '/**',
      },
    ],
  },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      'date-fns',
      'radix-ui',
      'embla-carousel-react',
    ],
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
