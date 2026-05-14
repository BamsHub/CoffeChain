/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // NOTE: Remove 'output: standalone' for Vercel deployment
    // 'standalone' is for Docker/self-hosted — Vercel handles output automatically
};

export default nextConfig;
