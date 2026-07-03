import { SignJWT, jwtVerify } from 'jose';
import { readDb, writeDb } from './db';

// Lazy — dibaca saat runtime, bukan saat build
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');
    return new TextEncoder().encode(secret);
}

/** Hash password dengan SHA-256 (Web Crypto API kompatibel dengan Cloudflare Edge) */
export async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Verifikasi password */
export async function verifyPassword(plain, hashed) {
    return (await hashPassword(plain)) === hashed;
}

/** Generate token JWT baru (stateless) */
export async function createSession(userId, role) {
    const token = await new SignJWT({ userId, role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d') // expired dalam 7 hari
        .sign(getJwtSecret());
    return token;
}

/** Verifikasi JWT Token */
export async function verifyToken(token) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, getJwtSecret());
        return {
            userId: payload.userId,
            role: payload.role,
        };
    } catch (err) {
        return null;
    }
}

/** Hapus session (logout) - untuk JWT client-side, cukup hapus token dari frontend.
 *  Sisi backend bisa mem-blacklist token, namun sementara ini stateless JWT 
 *  adalah pendekatan standar Next.js yang cukup aman. 
 */
export async function deleteSession(token) {
    // Tidak perlu berbuat apa-apa di database (Stateless)
}

/** Permission check per role */
export const ROLE_PERMISSIONS = {
    farmer: {
        nav: ['dashboard', 'transactions', 'supply-chain', 'market', 'wallet'],
        canEdit: false,
        canDelete: false,
        canManageUsers: false,
        canViewAllFarmers: false,
    },
    koperasi: {
        nav: ['dashboard', 'transactions', 'farmers', 'supply-chain', 'market', 'wallet'],
        canEdit: true,
        canDelete: false,
        canManageUsers: false,
        canViewAllFarmers: true,
    },
    developer: {
        nav: ['dashboard', 'transactions', 'farmers', 'supply-chain', 'market', 'wallet', 'admin'],
        canEdit: true,
        canDelete: true,
        canManageUsers: true,
        canViewAllFarmers: true,
    },
};

export function hasPermission(role, permission) {
    return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

export function canAccessRoute(role, route) {
    return ROLE_PERMISSIONS[role]?.nav?.includes(route) ?? false;
}
