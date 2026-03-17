'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './VerifyEmailPage.module.css';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('loading'); // loading | success | error | expired | no-token
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('no-token');
            return;
        }
        async function verify() {
            try {
                const res = await fetch(`/api/auth/verify-email?token=${token}`);
                const data = await res.json();
                if (data.success) {
                    setStatus('success');
                    setMessage(data.message);
                } else if (res.status === 410) {
                    setStatus('expired');
                    setMessage(data.message);
                } else {
                    setStatus('error');
                    setMessage(data.message || 'Verifikasi gagal');
                }
            } catch {
                setStatus('error');
                setMessage('Koneksi gagal. Coba lagi.');
            }
        }
        verify();
    }, [token]);

    const ICONS = {
        loading: (
            <div className={styles.spinner} />
        ),
        success: <div className={styles.iconCircle} style={{ background: 'rgba(126,212,74,0.15)', border: '2px solid #7ED44A' }}>✅</div>,
        error: <div className={styles.iconCircle} style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid #ef4444' }}>❌</div>,
        expired: <div className={styles.iconCircle} style={{ background: 'rgba(245,166,35,0.15)', border: '2px solid #F5A623' }}>⏱️</div>,
        'no-token': <div className={styles.iconCircle} style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid #ef4444' }}>🔗</div>,
    };

    const TITLES = {
        loading: 'Memverifikasi Email...',
        success: 'Email Terverifikasi!',
        error: 'Verifikasi Gagal',
        expired: 'Link Kedaluwarsa',
        'no-token': 'Link Tidak Valid',
    };

    const MESSAGES = {
        loading: 'Mohon tunggu, kami sedang memverifikasi email Anda.',
        success: message || 'Email berhasil diverifikasi! Akun Anda sudah aktif.',
        error: message || 'Token tidak valid atau sudah digunakan.',
        expired: message || 'Link verifikasi sudah kedaluwarsa (berlaku 24 jam). Minta link baru dari halaman register.',
        'no-token': 'Tidak ada token verifikasi. Pastikan Anda menggunakan link dari email.',
    };

    return (
        <div className={styles.card}>
            {/* Logo */}
            <div className={styles.logoSection}>
                <div className={styles.logoIcon}>
                    <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="22" stroke="url(#vlg)" strokeWidth="2" />
                        <circle cx="24" cy="24" r="6" fill="url(#vlg)" />
                        <defs>
                            <linearGradient id="vlg" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#7ED44A" />
                                <stop offset="100%" stopColor="#4A7C28" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <span className={styles.logoText}>CoffeeChain</span>
            </div>

            <div className={styles.iconWrapper}>{ICONS[status]}</div>
            <h2 className={styles.title}>{TITLES[status]}</h2>
            <p className={styles.desc}>{MESSAGES[status]}</p>

            {status === 'success' && (
                <Link href="/login" className={styles.btn} style={{ background: 'linear-gradient(135deg,#4A7C28,#7ED44A)' }}>
                    🔑 Masuk ke Dashboard
                </Link>
            )}
            {(status === 'error' || status === 'expired' || status === 'no-token') && (
                <div className={styles.actions}>
                    <Link href="/register" className={styles.btn} style={{ background: 'linear-gradient(135deg,#4A7C28,#7ED44A)' }}>
                        Daftar Ulang
                    </Link>
                    <Link href="/login" className={styles.btnOutline}>
                        Kembali ke Login
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className={styles.container}>
            <div className={styles.bgGrid} />
            <div className={styles.bgGlow1} />
            <div className={styles.bgGlow2} />
            <Suspense fallback={
                <div className={styles.card}>
                    <div className={styles.spinner} />
                    <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 16 }}>Memuat...</p>
                </div>
            }>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}
