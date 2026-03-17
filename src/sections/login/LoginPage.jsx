'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, ROLE_LABELS } from '@/context/AuthContext';
import styles from './LoginPage.module.css';

const DEMO_ACCOUNTS = [
    { email: 'admin@coffeechain.io', password: 'admin123', role: 'developer', name: 'Administrator', desc: 'Akses penuh semua fitur' },
    { email: 'koperasi@coffeechain.io', password: 'kop123', role: 'koperasi', name: 'Koperasi Gayo Murni', desc: 'Kelola petani & transaksi' },
    { email: 'petani@coffeechain.io', password: 'petani123', role: 'farmer', name: 'Pak Slamet Riyadi', desc: 'Akses dashboard & transaksi' },
];

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [resendEmail, setResendEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMsg, setResendMsg] = useState('');

    const { login, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) router.push('/dashboard');
    }, [user, router]);

    function fillDemo(account) {
        setForm({ email: account.email, password: account.password });
        setError('');
        setNeedsVerification(false);
        setResendMsg('');
    }

    async function handleResendVerification() {
        setResendLoading(true);
        setResendMsg('');
        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resendEmail }),
            });
            const data = await res.json();
            setResendMsg(data.message || (data.success ? 'Email verifikasi dikirim!' : 'Gagal mengirim.'));
        } catch {
            setResendMsg('Koneksi gagal. Coba lagi.');
        } finally {
            setResendLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.email || !form.password) { setError('Email dan password wajib diisi'); return; }
        setLoading(true);
        setError('');
        setNeedsVerification(false);
        try {
            await login(form.email, form.password);
            router.push('/dashboard');
        } catch (err) {
            try {
                const parsed = JSON.parse(err.message);
                if (parsed.needsVerification) {
                    setNeedsVerification(true);
                    setResendEmail(parsed.email || form.email);
                    setError('');
                    return;
                }
            } catch { /* not JSON */ }
            setError(err.message || 'Login gagal. Periksa email dan password.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>

            {/* ══ BACKGROUND KOMODITAS KOPI MODERN ══ */}

            {/* Deep Space Background Layer (Sekarang statis 1 lapis di CSS) */}
            <div className={styles.deepSpace} />

            {/* ══ MAIN LOGIN CARD (Statis + Ringan) ══ */}
            <div className={styles.card}>

                <div className={styles.logoSection}>
                    <div className={styles.logoIcon}>
                        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="24" r="22" stroke="url(#lg)" strokeWidth="2" />
                            <path d="M24 10 L36 18 L36 30 L24 38 L12 30 L12 18 Z" fill="url(#lg2)" opacity="0.3" />
                            <circle cx="24" cy="24" r="6" fill="url(#lg)" />
                            <defs>
                                <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7ED44A" /><stop offset="100%" stopColor="#4A7C28" /></linearGradient>
                                <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7ED44A" /><stop offset="100%" stopColor="#F5A623" /></linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div>
                        <h1 className={styles.logoText}>CoffeeChain</h1>
                        <p className={styles.logoSub}>Blockchain Industri Kopi Indonesia</p>
                    </div>
                </div>

                <div className={styles.divider}><span>SECURE LOGIN</span></div>

                <div className={styles.demoSection}>
                    <p className={styles.demoLabel}>🔑 Demo Akun – Klik untuk auto-isi:</p>
                    <div className={styles.demoCards}>
                        {DEMO_ACCOUNTS.map(acc => {
                            const roleInfo = ROLE_LABELS[acc.role];
                            return (
                                <button key={acc.email} className={styles.demoCard} onClick={() => fillDemo(acc)} type="button">
                                    <span className={styles.demoEmoji}>{roleInfo.emoji}</span>
                                    <div className={styles.demoInfo}>
                                        <span className={styles.demoName}>{acc.name}</span>
                                        <span className={styles.demoDesc}>{acc.desc}</span>
                                    </div>
                                    <span className={styles.demoRoleBadge} style={{ background: roleInfo.bg, color: roleInfo.color }}>
                                        {roleInfo.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Alamat Email
                        </label>
                        <div className={styles.inputWrapper}>
                            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={styles.input} placeholder="contoh@coffeechain.io" autoComplete="email" />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            Password
                        </label>
                        <div className={styles.inputWrapper}>
                            <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={styles.input} placeholder="Masukkan password" autoComplete="current-password" />
                            <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                                {showPass ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className={styles.errorBox}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            {error}
                        </div>
                    )}

                    {needsVerification && (
                        <div className={styles.verifyBox}>
                            <p className={styles.verifyTitle}>📧 Email belum diverifikasi</p>
                            <p className={styles.verifyText}>Cek inbox <strong>{resendEmail}</strong> dan klik link verifikasi. Cek folder Spam jika tidak ada.</p>
                            {resendMsg ? (
                                <p className={styles.resendMsg}>{resendMsg}</p>
                            ) : (
                                <button type="button" className={styles.resendBtn} onClick={handleResendVerification} disabled={resendLoading}>
                                    {resendLoading ? 'Mengirim...' : '🔄 Kirim ulang email verifikasi'}
                                </button>
                            )}
                        </div>
                    )}

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading
                            ? <><span className={styles.btnSpinner} /> Memverifikasi...</>
                            : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> Masuk ke Dashboard</>
                        }
                    </button>
                </form>

                <div className={styles.registerSection}>
                    <p className={styles.registerText}>
                        Belum punya akun?{' '}
                        <Link href="/register" className={styles.registerLink}>Daftar sekarang</Link>
                    </p>
                </div>

                <div className={styles.footer}>
                    <span className={styles.footerBadge}>🔒 SHA-256</span>
                    <span className={styles.footerBadge}>⛓️ Solana Blockchain</span>
                    <span className={styles.footerBadge}>🌿 CoffeeChain v1.0</span>
                </div>
            </div>
        </div>
    );
}
