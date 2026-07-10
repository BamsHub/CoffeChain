import { SignJWT, jwtVerify } from 'jose';
import { readDb, writeDb } from './db';

// Lazy — dibaca saat runtime, bukan saat build
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set');
    return new TextEncoder().encode(secret);
}

const PASSWORD_ITERATIONS = 310_000;

function toBase64(bytes) {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function fromBase64(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function derivePassword(password, salt, iterations = PASSWORD_ITERATIONS) {
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits'],
    );
    return new Uint8Array(await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
        key,
        256,
    ));
}

/** Hash password dengan PBKDF2 + salt (kompatibel Node.js dan Edge). */
export async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const derived = await derivePassword(password, salt);
    return `pbkdf2$${PASSWORD_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

/** Verifikasi password. Hash SHA-256 lama dipertahankan sementara untuk migrasi akun. */
export async function verifyPassword(plain, hashed) {
    if (typeof hashed !== 'string') return false;
    const [scheme, iterationValue, saltValue, digestValue] = hashed.split('$');
    if (scheme === 'pbkdf2' && saltValue && digestValue) {
        const iterations = Number(iterationValue);
        if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
        const actual = await derivePassword(plain, fromBase64(saltValue), iterations);
        const expected = fromBase64(digestValue);
        if (actual.length !== expected.length) return false;
        let difference = 0;
        for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
        return difference === 0;
    }

    // Legacy format from versions before the security migration.
    if (!/^[a-f0-9]{64}$/i.test(hashed)) return false;
    const data = new TextEncoder().encode(plain);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const actual = Array.from(new Uint8Array(hashBuffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    return actual === hashed;
}

export function needsPasswordUpgrade(hashed) {
    return typeof hashed === 'string' && !hashed.startsWith('pbkdf2$');
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
