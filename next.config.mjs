/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    // NOTE: Remove 'output: standalone' for Vercel deployment
    // 'standalone' is for Docker/self-hosted — Vercel handles output automatically
    headers: async () => [
        {
            source: '/:path*',
            headers: [
                { key: 'Content-Security-Policy', value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://app.midtrans.com https://app.sandbox.midtrans.com https://va.vercel-scripts.com; connect-src 'self' https://*.supabase.co https://api.devnet.solana.com https://api.testnet.solana.com https://api.mainnet-beta.solana.com https://api.midtrans.com https://api.sandbox.midtrans.com https://app.midtrans.com https://app.sandbox.midtrans.com https://api.resend.com https://*.vercel-insights.com; frame-src https://app.midtrans.com https://app.sandbox.midtrans.com; upgrade-insecure-requests" },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
                { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
                { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
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
