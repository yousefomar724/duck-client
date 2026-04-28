import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * Origin for proxying `/api` and `/uploads` (rewrite targets).
 * Uses BACKEND_ORIGIN when set; otherwise derives from NEXT_PUBLIC_API_URL so production
 * does not send traffic to localhost:8080.
 */
function getBackendOrigin(): string {
  const explicit = process.env.BACKEND_ORIGIN;
  if (explicit) {
    try {
      const raw = explicit.includes('://') ? explicit : `http://${explicit}`;
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl && !apiUrl.startsWith('/')) {
    try {
      const raw = apiUrl.includes('://') ? apiUrl : `https://${apiUrl}`;
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  return 'http://localhost:8080';
}

const nextConfig: NextConfig = {
  async rewrites() {
    const origin = getBackendOrigin();
    return [
      {
        source: '/api/:path*',
        destination: `${origin}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${origin}/uploads/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'duckapi.alefmenu.com',
        pathname: '/uploads/**',
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);