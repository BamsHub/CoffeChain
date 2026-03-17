'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './RegisterPage.module.css';

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 8 + 4,
    delay: Math.random() * 4,
    duration: Math.random() * 6 + 8,
}));

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', region: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => { setMounted(true); }, []);

    function update(key, val) {
        setForm(p => ({ ...p, [key]: val }));
        setError('');
    }

    // Password strength
    const passLen = form.password.length;
    const hasUpper = /[A-Z]/.test(form.password);
    const hasNumber = /\d/.test(form.password);
    const strength = passLen === 0 ? 0 : passLen >= 8 && hasUpper && hasNumber ? 3 : passLen >= 8 ? 2 : 1;
    const strengthLabel = ['', 'Lemah', 'Cukup', 'Kuat'][strength];
    const strengthColor = ['', '#ef4444', '#F5A623', '#7ED44A'][strength];

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.name || !form.email || !form.password || !form.confirmPassword) {
            setError('Semua kolom wajib diisi kecuali wilayah');
            return;
        }
        if (form.password.length < 8) {
            setError('Password minimal 8 karakter');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Konfirmasi password tidak cocok');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    region: form.region,
                }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.message || 'Pendaftaran gagal');
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError('Koneksi gagal. Periksa internet Anda.');
        } finally {
            setLoading(false);
        }
    }

    // ── Success screen ──────────────────────────────────────────
    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.bgGrid} />
                <div className={styles.bgGlow1} />
                <div className={styles.bgGlow2} />
                <div className={styles.card}>
                    <div className={styles.successIcon}>📧</div>
                    <h2 className={styles.successTitle}>Cek Email Anda!</h2>
                    <p className={styles.successText}>
                        Email verifikasi telah dikirim ke{' '}
                        <strong style={{ color: '#7ED44A' }}>{form.email}</strong>.
                        Klik link di email untuk mengaktifkan akun Anda.
                    </p>
                    <p className={styles.successHint}>
                        Tidak ada email? Cek folder <strong>Spam / Junk</strong>, atau{' '}
                        <button
                            className={styles.resendBtn}
                            onClick={async () => {
                                try {
                                    await fetch('/api/auth/resend-verification', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email: form.email }),
                                    });
                                    alert('Link verifikasi baru telah dikirim.');
                                } catch {
                                    alert('Gagal mengirim ulang. Coba lagi.');
                                }
                            }}
                        >
                            kirim ulang
                        </button>.
                    </p>
                    <Link href="/login" className={styles.backToLogin}>
                        ← Kembali ke Login
                    </Link>
                </div>
            </div>
        );
    }

    // ── Register form ───────────────────────────────────────────
    return (
        <div className={styles.container}>
            <div className={styles.bgGrid} />
            <div className={styles.bgGlow1} />
            <div className={styles.bgGlow2} />
            <div className={styles.bgGlow3} />

            {mounted && PARTICLES.map(p => (
                <div
                    key={p.id}
                    className={styles.particle}
                    style={{
                        left: `${p.left}%`, top: `${p.top}%`,
                        width: p.size, height: p.size,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                    }}
                />
            ))}

            {/* Left chain */}
            <div className={styles.chainLeft}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={styles.chainBlock} style={{ animationDelay: `${i * 0.3}s` }}>
                        <span>#{(18293040 + i).toLocaleString()}</span>
                    </div>
                ))}
            </div>

            <div className={styles.card}>
                {/* Logo */}
                <div className={styles.logoSection}>
                    <div className={styles.logoIcon}>
                        <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="24" r="22" stroke="url(#rlg)" strokeWidth="2" />
                            <path d="M24 10 L36 18 L36 30 L24 38 L12 30 L12 18 Z" fill="url(#rlg2)" opacity="0.3" />
                            <circle cx="24" cy="24" r="6" fill="url(#rlg)" />
                            <defs>
                                <linearGradient id="rlg" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#7ED44A" />
                                    <stop offset="100%" stopColor="#4A7C28" />
                                </linearGradient>
                                <linearGradient id="rlg2" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#7ED44A" />
                                    <stop offset="100%" stopColor="#F5A623" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div>
                        <h1 className={styles.logoText}>CoffeeChain</h1>
                        <p className={styles.logoSub}>Daftar Akun Petani Kopi</p>
                    </div>
                </div>

                <div className={styles.divider}><span>BUAT AKUN BARU</span></div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    {/* Nama */}
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Nama Lengkap <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => update('name', e.target.value)}
                                className={styles.input}
                                placeholder="Contoh: Pak Slamet Riyadi"
                                autoComplete="name"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Alamat Email <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => update('email', e.target.value)}
                                className={styles.input}
                                placeholder="nama@gmail.com"
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    {/* Wilayah */}
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" /></svg>
                            Wilayah / Daerah
                            <span className={styles.optional}> (opsional)</span>
                        </label>
                        <div className={styles.inputWrapper}>
                            <input
                                type="text"
                                value={form.region}
                                onChange={e => update('region', e.target.value)}
                                className={styles.input}
                                placeholder="Contoh: Gayo, Aceh"
                                autoComplete="address-level2"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            Password <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={form.password}
                                onChange={e => update('password', e.target.value)}
                                className={styles.input}
                                placeholder="Minimal 8 karakter"
                                autoComplete="new-password"
                            />
                            <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(!showPass)}>
                                {showPass ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {/* Strength bar */}
                        {form.password.length > 0 && (
                            <div className={styles.strengthBar}>
                                <div className={styles.strengthTrack}>
                                    <div
                                        className={styles.strengthFill}
                                        style={{ width: `${(strength / 3) * 100}%`, background: strengthColor }}
                                    />
                                </div>
                                <span className={styles.strengthLabel} style={{ color: strengthColor }}>
                                    {strengthLabel}
                                </span>
                            </div>
                        )}
                        <p className={styles.hint}>Gunakan huruf besar dan angka untuk password yang kuat</p>
                    </div>

                    {/* Konfirmasi Password */}
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            Konfirmasi Password <span className={styles.required}>*</span>
                        </label>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={form.confirmPassword}
                                onChange={e => update('confirmPassword', e.target.value)}
                                className={`${styles.input} ${form.confirmPassword && form.password !== form.confirmPassword ? styles.inputError : ''}`}
                                placeholder="Ulangi password"
                                autoComplete="new-password"
                            />
                            <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
                                {showConfirm ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {form.confirmPassword && form.password !== form.confirmPassword && (
                            <p className={styles.mismatch}>Password tidak cocok</p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className={styles.errorBox}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            {error}
                        </div>
                    )}

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? (
                            <>
                                <span className={styles.btnSpinner} />
                                Membuat Akun...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM19 8v6M22 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                Daftar & Kirim Verifikasi Email
                            </>
                        )}
                    </button>
                </form>

                <p className={styles.loginLink}>
                    Sudah punya akun?{' '}
                    <Link href="/login" className={styles.link}>Masuk di sini</Link>
                </p>

                <div className={styles.footer}>
                    <span className={styles.footerBadge}>🔒 Terenkripsi SHA-256</span>
                    <span className={styles.footerBadge}>⛓️ Solana Blockchain</span>
                    <span className={styles.footerBadge}>🌿 CoffeeChain v1.0</span>
                </div>
            </div>

            {/* Right chain */}
            <div className={styles.chainRight}>
                {['TX', 'BLOCK', 'HASH', 'NODE', 'SYNC'].map((label, i) => (
                    <div key={label} className={styles.techLabel} style={{ animationDelay: `${i * 0.5}s` }}>
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}
