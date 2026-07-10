/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // NOTE: Remove 'output: standalone' for Vercel deployment
    // 'standalone' is for Docker/self-hosted — Vercel handles output automatically
    headers: async () => [
        {
            source: '/:path*',
            headers: [
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
                { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
            ],
        },
        {
            source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|woff|woff2)',
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
