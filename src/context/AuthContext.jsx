'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { disconnectPhantom } from '@/lib/phantom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Hydrate session dari localStorage saat mount
    useEffect(() => {
        const token = localStorage.getItem('cc_token');
        if (!token) { setLoading(false); return; }

        fetch(`/api/auth/me?token=${token}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) setUser(data.user);
                else localStorage.removeItem('cc_token');
            })
            .catch(() => localStorage.removeItem('cc_token'))
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!data.success) {
            // Sertakan info tambahan (seperti needsVerification) dalam error
            const errorInfo = { message: data.message, needsVerification: data.needsVerification, email: data.email };
            throw new Error(JSON.stringify(errorInfo));
        }

        localStorage.setItem('cc_token', data.token);
        setUser(data.user);
        return data.user;
    }

    async function logout() {
        const token = localStorage.getItem('cc_token');
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
        }
        localStorage.removeItem('cc_token');
        setUser(null);

        // Putuskan koneksi wallet otomatis
        try {
            await disconnectPhantom();
        } catch (e) {
            console.error("Gagal memutus Phantom:", e);
        }

        router.push('/login');
    }

    function getToken() {
        return typeof window !== 'undefined' ? localStorage.getItem('cc_token') : null;
    }

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout, getToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth harus digunakan dalam AuthProvider');
    return ctx;
}

// Role info untuk display
export const ROLE_LABELS = {
    farmer: { label: 'Petani', emoji: '🌱', color: '#4CAF50', bg: 'rgba(76,175,80,0.15)' },
    koperasi: { label: 'Koperasi', emoji: '🏘️', color: '#F5A623', bg: 'rgba(245,166,35,0.15)' },
    developer: { label: 'Developer', emoji: '🛠️', color: '#00D4FF', bg: 'rgba(0,212,255,0.15)' },
};

// Nav items per role
export const ROLE_NAV = {
    // Farmer hanya bisa: Dashboard, Harga Pasar, Dompet, Beli Produk
    farmer: ['dashboard', 'market', 'wallet', 'shop'],
    // Koperasi: akses semua + markets
    koperasi: ['dashboard', 'transactions', 'farmers', 'supply-chain', 'market', 'wallet', 'shop', 'markets'],
    developer: ['dashboard', 'transactions', 'farmers', 'supply-chain', 'market', 'wallet', 'shop', 'markets'],
};

