import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const AGENT_LINK =
  '</.well-known/api-catalog>; rel="api-catalog", ' +
  '</openapi.json>; rel="service-desc"; type="application/json", ' +
  '</docs/api>; rel="service-doc"; type="text/html", ' +
  '</llms-full.txt>; rel="describedby"; type="text/markdown"';

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
      {
        source: '/',
        headers: [{ key: 'Link', value: AGENT_LINK }],
      },
      {
        // The param form does not match the bare root. Skip _next/ and api/
        // so static assets do not carry the discovery Link on every response.
        source: '/:path((?!_next/|api/).*)',
        headers: [{ key: 'Link', value: AGENT_LINK }],
      },
      {
        source: '/api/mcp',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'Content-Type, Accept, Authorization, mcp-session-id, last-event-id, mcp-protocol-version',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/.well-known/api-catalog',
          destination: '/api/well-known/api-catalog',
        },
        {
          source: '/.well-known/mcp/server-card.json',
          destination: '/api/well-known/mcp-server-card',
        },
        {
          source: '/.well-known/oauth-protected-resource',
          destination: '/api/well-known/oauth-protected-resource',
        },
        {
          source: '/.well-known/ai-catalog.json',
          destination: '/api/well-known/ai-catalog',
        },
        {
          source: '/.well-known/ard.json',
          destination: '/api/well-known/ard',
        },
        {
          source: '/.well-known/agent-skills/index.json',
          destination: '/api/well-known/agent-skills/index.json',
        },
        {
          source: '/.well-known/agent-skills/:name/SKILL.md',
          destination: '/api/well-known/agent-skills/:name/skill',
        },
      ],
    };
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
  serverExternalPackages: ['mcp-handler', '@modelcontextprotocol/server'],
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
