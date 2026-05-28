/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // NOTE: Remove 'output: standalone' for Vercel deployment
    // 'standalone' is for Docker/self-hosted — Vercel handles output automatically
    headers: async () => [
        {
            source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|woff|woff2)',
            headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
            ],
        },
        {
            source: '/_next/static/:path*',
            headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
            ],
        },
    ],
    experimental: {
        optimizeCss: true,
    },
};

export default nextConfig;
