import { createHash } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { readDb, writeDb } from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'coffeechain-super-secret-key-1234');

/** Hash password dengan SHA-256 */
export function hashPassword(password) {
    return createHash('sha256').update(password).digest('hex');
}

/** Verifikasi password */
export function verifyPassword(plain, hashed) {
    return hashPassword(plain) === hashed;
}

/** Generate token JWT baru (stateless) */
export async function createSession(userId, role) {
    const token = await new SignJWT({ userId, role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d') // expired dalam 7 hari
        .sign(JWT_SECRET);
    return token;
}

/** Verifikasi JWT Token */
export async function verifyToken(token) {
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
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
