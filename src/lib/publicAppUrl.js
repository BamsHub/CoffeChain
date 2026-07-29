const DEFAULT_PUBLIC_APP_URL = 'https://coffe-chain.vercel.app';

function normalizeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;

    try {
        const url = new URL(raw);
        if (!['http:', 'https:'].includes(url.protocol)) return null;
        return url.origin;
    } catch {
        return null;
    }
}

function getLocalRequestUrl(request) {
    const forwardedHost = request?.headers?.get('x-forwarded-host');
    const host = forwardedHost || request?.headers?.get('host') || '';
    const hostname = host.split(':')[0].toLowerCase();
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (!isLocal) return null;

    const proto = request?.headers?.get('x-forwarded-proto') || 'http';
    return normalizeUrl(`${proto}://${host}`);
}

/**
 * Email links must never inherit a protected Vercel Preview hostname.
 * Local development keeps localhost; every hosted environment uses the
 * configured canonical URL or the public CoffeeChain production alias.
 */
export function getPublicAppUrl(request) {
    return getLocalRequestUrl(request)
        || normalizeUrl(process.env.APP_URL)
        || normalizeUrl(process.env.NEXT_PUBLIC_APP_URL)
        || DEFAULT_PUBLIC_APP_URL;
}

export { DEFAULT_PUBLIC_APP_URL };
