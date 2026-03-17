'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_LABELS } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import styles from './ProfilePage.module.css';

const LANGUAGES = ['Indonesia', 'English', 'Bahasa Melayu', '日本語', '中文'];

// ── Password Change Modal ────────────────────────────────────────────────────
function PasswordModal({ onClose, userId }) {
    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confPw, setConfPw] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        if (newPw !== confPw) { setErr('Password baru tidak cocok!'); return; }
        if (newPw.length < 6) { setErr('Password minimal 6 karakter'); return; }
        setLoading(true); setErr('');
        try {
            const res = await fetch('/api/profile/password', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, oldPassword: oldPw, newPassword: newPw }),
            });
            const data = await res.json();
            if (!data.success) { setErr(data.message || 'Gagal mengubah password'); }
            else { setMsg('✅ Password berhasil diubah!'); setTimeout(onClose, 1500); }
        } catch { setErr('Koneksi error, coba lagi'); }
        setLoading(false);
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <span>🔑 Ubah Password</span>
                    <button onClick={onClose} className={styles.modalClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit} className={styles.modalBody}>
                    {['Password Lama', 'Password Baru (min 6 karakter)', 'Konfirmasi Password Baru'].map((label, i) => (
                        <div key={i} className={styles.field}>
                            <label>{label}</label>
                            <input
                                type="password"
                                className={styles.input}
                                placeholder="••••••••"
                                value={[oldPw, newPw, confPw][i]}
                                onChange={e => [setOldPw, setNewPw, setConfPw][i](e.target.value)}
                                required
                            />
                        </div>
                    ))}
                    {err && <div className={styles.errorBox}>⚠️ {err}</div>}
                    {msg && <div className={styles.successBox}>{msg}</div>}
                    <button type="submit" disabled={loading} className={styles.btnPrimary} style={{ width: '100%' }}>
                        {loading ? '⏳ Mengubah...' : '🔑 Ubah Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Phantom Wallet Modal ─────────────────────────────────────────────────────
function PhantomModal({ onClose, user, onUpdate }) {
    const [connecting, setConnecting] = useState(false);
    const [msg, setMsg] = useState('');

    async function connectPhantom() {
        if (typeof window === 'undefined' || !window.solana?.isPhantom) {
            setMsg('⚠️ Phantom Wallet tidak terdeteksi. Install ekstensi Phantom dulu!');
            return;
        }
        setConnecting(true); setMsg('');
        try {
            const resp = await window.solana.connect();
            const address = resp.publicKey.toString();
            // Simpan ke profil
            await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, wallet: address }),
            });
            onUpdate(address);
            setMsg(`✅ Wallet terhubung: ${address.slice(0, 8)}...`);
            setTimeout(onClose, 2000);
        } catch (e) {
            setMsg('❌ Gagal menghubungkan wallet: ' + e.message);
        }
        setConnecting(false);
    }

    async function disconnectPhantom() {
        try {
            if (window.solana?.isPhantom) await window.solana.disconnect();
            await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, wallet: '' }),
            });
            onUpdate('');
            setMsg('✅ Wallet berhasil diputus');
            setTimeout(onClose, 1500);
        } catch { setMsg('❌ Gagal memutus wallet'); }
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <span>👻 Kelola Phantom Wallet</span>
                    <button onClick={onClose} className={styles.modalClose}>✕</button>
                </div>
                <div className={styles.modalBody}>
                    <div className={styles.phantomCard}>
                        <div style={{ fontSize: 48 }}>👻</div>
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>Phantom Wallet</div>
                            {user?.wallet
                                ? <div style={{ fontSize: 12, color: '#A855F7', fontFamily: 'monospace' }}>{user.wallet}</div>
                                : <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Belum terhubung</div>
                            }
                        </div>
                    </div>
                    {msg && <div className={msg.includes('✅') ? styles.successBox : styles.errorBox}>{msg}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={connectPhantom} disabled={connecting} className={styles.btnPrimary} style={{ flex: 1 }}>
                            {connecting ? '⏳ Menghubungkan...' : '🔗 Hubungkan Wallet'}
                        </button>
                        {user?.wallet && (
                            <button onClick={disconnectPhantom} className={styles.btnSecondary}>
                                ✂️ Putuskan
                            </button>
                        )}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 8 }}>
                        Pastikan ekstensi Phantom sudah terinstall dan diset ke Devnet untuk testing
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { user, setUser, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('profile');
    const [form, setForm] = useState({ name: '', email: '', bio: '', location: '', phone: '', language: 'Indonesia' });
    const [photoPreview, setPhotoPreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({ orders: 0, spent: 0, products: 0 });
    const [walletAddr, setWalletAddr] = useState('');

    // Modals
    const [showPwModal, setShowPwModal] = useState(false);
    const [showPhantomModal, setShowPhantomModal] = useState(false);

    // Preferences state
    const [prefCurrency, setPrefCurrency] = useState(true);
    const [prefAnimation, setPrefAnimation] = useState(true);
    const [notifPrefs, setNotifPrefs] = useState({
        notif_product: true, notif_payment: true, notif_price: true,
        notif_blockchain: true, notif_email: false,
    });

    const roleInfo = user ? (ROLE_LABELS[user.role] || ROLE_LABELS.farmer) : null;
    const isDark = theme === 'dark';

    useEffect(() => {
        if (!user) { router.push('/login'); return; }
        setForm({
            name: user.name || '',
            email: user.email || '',
            bio: user.bio || '',
            location: user.location || '',
            phone: user.phone || '',
            language: user.language || 'Indonesia',
        });
        setWalletAddr(user.wallet || '');
        if (user.photoBase64) setPhotoPreview(user.photoBase64);
        fetchStats();
    }, [user]);

    async function fetchStats() {
        if (!user) return;
        try {
            const [ordersRes, productsRes] = await Promise.all([
                fetch('/api/orders'),
                fetch('/api/products'),
            ]);
            const ordersData = await ordersRes.json();
            const productsData = await productsRes.json();
            const allOrders = ordersData.data || [];

            let relevantOrders;
            if (user.role === 'developer' || user.role === 'koperasi') {
                // Admin/koperasi: lihat semua paid orders
                relevantOrders = allOrders.filter(o => o.status === 'paid');
            } else {
                // Farmer/user: coba cari berdasarkan userId atau email, fallback ke paid guest orders sesi
                const myOrders = allOrders.filter(o =>
                    (o.userId === user.id || o.userId === user.email) && o.status === 'paid'
                );
                // Jika tidak ada orders personal, tampilkan semua guest orders paid sebagai demo
                relevantOrders = myOrders.length > 0 ? myOrders :
                    allOrders.filter(o => o.userId === 'guest' && o.status === 'paid');
            }

            // Hitung produk unik yang pernah dibeli
            const uniqueProducts = new Set(relevantOrders.map(o => o.productId).filter(Boolean));

            setStats({
                orders: relevantOrders.length,
                spent: relevantOrders.reduce((s, o) => s + (o.totalPrice || 0), 0),
                products: (user.role === 'developer' || user.role === 'koperasi')
                    ? (productsData.data || []).length
                    : uniqueProducts.size,
            });
        } catch (e) { console.error('fetchStats:', e); }
    }

    function handlePhotoChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { setError('Ukuran foto max 2MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target.result);
        reader.readAsDataURL(file);
    }

    async function handleSave(e) {
        e.preventDefault();
        if (!form.name.trim()) { setError('Nama tidak boleh kosong'); return; }
        setSaving(true); setError(''); setSaved(false);
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, ...form, photoBase64: photoPreview }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.message || 'Gagal menyimpan'); setSaving(false); return; }
            if (setUser) setUser(prev => ({ ...prev, ...form, photoBase64: photoPreview }));
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch { setError('Koneksi error. Coba lagi.'); }
        setSaving(false);
    }

    async function handleLogoutAll() {
        if (!confirm('Logout dari semua sesi aktif? Anda akan diarahkan ke halaman login.')) return;
        logout?.();
        router.push('/login');
    }

    function handleWalletUpdate(addr) {
        setWalletAddr(addr);
        if (setUser) setUser(prev => ({ ...prev, wallet: addr }));
    }

    const F = (k, val) => setForm(f => ({ ...f, [k]: val }));

    const TABS = [
        { id: 'profile', label: 'Profil', icon: '👤' },
        { id: 'security', label: 'Keamanan', icon: '🔐' },
        { id: 'notifications', label: 'Notifikasi', icon: '🔔' },
        { id: 'preferences', label: 'Preferensi', icon: '⚙️' },
    ];

    return (
        <div className={styles.page}>
            {/* Modals */}
            {showPwModal && <PasswordModal onClose={() => setShowPwModal(false)} userId={user?.id} />}
            {showPhantomModal && (
                <PhantomModal
                    onClose={() => setShowPhantomModal(false)}
                    user={{ ...user, wallet: walletAddr }}
                    onUpdate={handleWalletUpdate}
                />
            )}

            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Pengaturan Akun</h1>
                    <p className={styles.pageSub}>Kelola profil, keamanan, dan preferensi akun kamu</p>
                </div>
                {/* THEME TOGGLE di header */}
                <button className={styles.themeToggleBtn} onClick={toggleTheme} title={`Switch ke ${isDark ? 'Light' : 'Dark'} Mode`}>
                    <span className={styles.themeToggleTrack} data-dark={isDark}>
                        <span className={styles.themeToggleThumb}>{isDark ? '🌙' : '☀️'}</span>
                    </span>
                    <span className={styles.themeToggleLabel}>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
            </div>

            <div className={styles.layout}>
                {/* Left Card */}
                <div className={styles.sideCard}>
                    <div className={styles.avatarSection}>
                        <div className={styles.avatarWrap} onClick={() => document.getElementById('photoInput').click()}>
                            {photoPreview
                                ? <img src={photoPreview} alt="avatar" className={styles.avatarImg} />
                                : <div className={styles.avatarInitials} style={{ background: roleInfo?.bg }}>
                                    {form.name ? form.name.substring(0, 2).toUpperCase() : '?'}
                                </div>
                            }
                            <div className={styles.avatarOverlay}>📷 Ganti Foto</div>
                        </div>
                        <input id="photoInput" type="file" accept="image/*" className={styles.fileInput} onChange={handlePhotoChange} />
                        <div className={styles.avatarName}>{form.name || 'Nama Pengguna'}</div>
                        <div className={styles.avatarEmail}>{form.email}</div>
                        <span className={styles.rolePill} style={{ background: roleInfo?.bg, color: roleInfo?.color }}>
                            {roleInfo?.emoji} {roleInfo?.label}
                        </span>
                    </div>

                    {walletAddr && (
                        <div className={styles.walletBadge}>
                            <span>👻</span>
                            <span className={styles.walletAddr}>{walletAddr.slice(0, 8)}...{walletAddr.slice(-4)}</span>
                        </div>
                    )}

                    <div className={styles.sideStats}>
                        <div className={styles.sideStat}>
                            <div className={styles.sideStatVal}>{stats.orders}</div>
                            <div className={styles.sideStatLabel}>Pembelian</div>
                        </div>
                        <div className={styles.sideStatDiv} />
                        <div className={styles.sideStat}>
                            <div className={styles.sideStatVal}>Rp {Math.round(stats.spent / 1000)}K</div>
                            <div className={styles.sideStatLabel}>Total Belanja</div>
                        </div>
                        <div className={styles.sideStatDiv} />
                        <div className={styles.sideStat}>
                            <div className={styles.sideStatVal}>{stats.products}</div>
                            <div className={styles.sideStatLabel}>Produk Tersedia</div>
                        </div>
                    </div>

                    <div className={styles.memberSince}>
                        🗓️ Member sejak {user?.createdAt ? new Date(user.createdAt).getFullYear() : '2024'}
                    </div>
                </div>

                {/* Right Panel */}
                <div className={styles.mainPanel}>
                    <div className={styles.tabs}>
                        {TABS.map(t => (
                            <button key={t.id} className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab(t.id)}>
                                <span>{t.icon}</span> {t.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.tabContent}>
                        {/* ── PROFIL TAB ── */}
                        {activeTab === 'profile' && (
                            <form onSubmit={handleSave} className={styles.form}>
                                <div className={styles.formSection}>
                                    <h3 className={styles.sectionTitle}>Informasi Pribadi</h3>
                                    <div className={styles.row2}>
                                        <div className={styles.field}>
                                            <label>Nama Lengkap *</label>
                                            <input value={form.name} onChange={e => F('name', e.target.value)} placeholder="Ahmad Sukarno" className={styles.input} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>Email <span className={styles.readOnlyTag}>(tidak dapat diubah)</span></label>
                                            <input value={form.email} readOnly className={`${styles.input} ${styles.inputReadOnly}`} />
                                        </div>
                                    </div>
                                    <div className={styles.field}>
                                        <label>Bio</label>
                                        <textarea value={form.bio} onChange={e => F('bio', e.target.value)}
                                            placeholder="Petani kopi Arabika generasi ketiga dari Gayo, Aceh..."
                                            className={styles.textarea} rows={3} />
                                    </div>
                                    <div className={styles.row2}>
                                        <div className={styles.field}>
                                            <label>Lokasi</label>
                                            <input value={form.location} onChange={e => F('location', e.target.value)} placeholder="Gayo, Aceh, Indonesia" className={styles.input} />
                                        </div>
                                        <div className={styles.field}>
                                            <label>Nomor Telepon</label>
                                            <input value={form.phone} onChange={e => F('phone', e.target.value)} placeholder="+62 812 3456 7890" className={styles.input} />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formSection}>
                                    <h3 className={styles.sectionTitle}>Foto Profil</h3>
                                    <div className={styles.photoRow}>
                                        <div className={styles.photoThumb}>
                                            {photoPreview
                                                ? <img src={photoPreview} alt="" className={styles.photoImg} />
                                                : <div className={styles.photoPlaceholder} style={{ background: roleInfo?.bg }}>
                                                    {form.name.substring(0, 2).toUpperCase() || '??'}
                                                </div>
                                            }
                                        </div>
                                        <div className={styles.photoActions}>
                                            <button type="button" className={styles.uploadBtn} onClick={() => document.getElementById('photoInput').click()}>
                                                📁 Upload Foto
                                            </button>
                                            {photoPreview && (
                                                <button type="button" className={styles.removeBtn} onClick={() => setPhotoPreview(null)}>
                                                    🗑️ Hapus
                                                </button>
                                            )}
                                            <p className={styles.photoHint}>JPG, PNG, WebP maksimum 2MB. Rekomendasi: 400×400px</p>
                                        </div>
                                    </div>
                                </div>

                                {error && <div className={styles.errorBox}>⚠️ {error}</div>}
                                {saved && <div className={styles.successBox}>✅ Profil berhasil disimpan!</div>}
                                <div className={styles.formFooter}>
                                    <button type="button" onClick={() => router.back()} className={styles.btnSecondary}>← Kembali</button>
                                    <button type="submit" disabled={saving} className={styles.btnPrimary}>
                                        {saving ? '⏳ Menyimpan...' : '💾 Simpan Perubahan'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ── SECURITY TAB ── */}
                        {activeTab === 'security' && (
                            <div className={styles.form}>
                                <div className={styles.formSection}>
                                    <h3 className={styles.sectionTitle}>Keamanan Akun</h3>

                                    <div className={styles.secCard}>
                                        <div className={styles.secIcon}>🔑</div>
                                        <div style={{ flex: 1 }}>
                                            <div className={styles.secTitle}>Password</div>
                                            <div className={styles.secDesc}>Terakhir diubah: belum pernah</div>
                                        </div>
                                        <button className={styles.secBtn} onClick={() => setShowPwModal(true)}>
                                            Ubah Password
                                        </button>
                                    </div>

                                    <div className={styles.secCard}>
                                        <div className={styles.secIcon}>🛡️</div>
                                        <div style={{ flex: 1 }}>
                                            <div className={styles.secTitle}>Autentikasi Dua Faktor (2FA)</div>
                                            <div className={styles.secDesc}>Tambahkan lapisan keamanan ekstra</div>
                                        </div>
                                        <span className={styles.comingSoonBadge}>Soon</span>
                                    </div>

                                    <div className={styles.secCard}>
                                        <div className={styles.secIcon}>👻</div>
                                        <div style={{ flex: 1 }}>
                                            <div className={styles.secTitle}>Phantom Wallet</div>
                                            <div className={styles.secDesc}>
                                                {walletAddr
                                                    ? <span style={{ color: '#A855F7', fontFamily: 'monospace', fontSize: 11 }}>{walletAddr.slice(0, 12)}...{walletAddr.slice(-6)}</span>
                                                    : 'Belum terhubung'
                                                }
                                            </div>
                                        </div>
                                        <button className={styles.secBtn} onClick={() => setShowPhantomModal(true)}>
                                            Kelola
                                        </button>
                                    </div>

                                    <div className={styles.secCard}>
                                        <div className={styles.secIcon}>📋</div>
                                        <div style={{ flex: 1 }}>
                                            <div className={styles.secTitle}>Sesi Aktif</div>
                                            <div className={styles.secDesc}>
                                                Browser ini — {typeof window !== 'undefined' ? (navigator.userAgent.match(/Chrome|Firefox|Safari|Edge|Opera/)?.[0] || 'Unknown') : 'Server'}
                                            </div>
                                        </div>
                                        <button className={`${styles.secBtn} ${styles.secBtnDanger}`} onClick={handleLogoutAll}>
                                            Logout Semua
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── NOTIFICATIONS TAB ── */}
                        {activeTab === 'notifications' && (
                            <div className={styles.form}>
                                <div className={styles.formSection}>
                                    <h3 className={styles.sectionTitle}>Preferensi Notifikasi</h3>
                                    {[
                                        { icon: '🛍️', title: 'Produk Baru Ditambahkan', desc: 'Notifikasi saat koperasi/developer menambah produk kopi baru', key: 'notif_product' },
                                        { icon: '💳', title: 'Status Pembayaran', desc: 'Konfirmasi pembayaran berhasil atau gagal', key: 'notif_payment' },
                                        { icon: '📈', title: 'Perubahan Harga Pasar', desc: 'Update harga kopi terbaru setiap hari', key: 'notif_price' },
                                        { icon: '🤝', title: 'Transaksi Blockchain', desc: 'Notifikasi transaksi on-chain pada Solana Devnet', key: 'notif_blockchain' },
                                        { icon: '📧', title: 'Email Digest Mingguan', desc: 'Ringkasan aktivitas minggu ini via email', key: 'notif_email' },
                                    ].map(item => (
                                        <div key={item.key} className={styles.notifRow}>
                                            <span className={styles.notifIcon}>{item.icon}</span>
                                            <div className={styles.notifInfo}>
                                                <div className={styles.notifTitle}>{item.title}</div>
                                                <div className={styles.notifDesc}>{item.desc}</div>
                                            </div>
                                            <label className={styles.toggle}>
                                                <input
                                                    type="checkbox"
                                                    checked={notifPrefs[item.key]}
                                                    onChange={e => setNotifPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                    className={styles.toggleInput}
                                                />
                                                <span className={styles.toggleSlider} />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.formFooter}>
                                    <button
                                        className={styles.btnPrimary}
                                        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}
                                    >
                                        💾 Simpan Preferensi Notifikasi
                                    </button>
                                </div>
                                {saved && <div className={styles.successBox}>✅ Preferensi notifikasi disimpan!</div>}
                            </div>
                        )}

                        {/* ── PREFERENCES TAB ── */}
                        {activeTab === 'preferences' && (
                            <form onSubmit={handleSave} className={styles.form}>
                                <div className={styles.formSection}>
                                    <h3 className={styles.sectionTitle}>Pengaturan Aplikasi</h3>

                                    {/* TEMA TOGGLE — fungsional sekarang */}
                                    <div className={styles.prefRow}>
                                        <div>
                                            <div className={styles.prefLabel}>{isDark ? '🌙 Tema Gelap' : '☀️ Tema Terang'}</div>
                                            <div className={styles.prefDesc}>
                                                {isDark ? 'Mode gelap aktif — klik untuk mode terang' : 'Mode terang aktif — klik untuk mode gelap'}
                                            </div>
                                        </div>
                                        <label className={styles.toggle} onClick={e => { e.preventDefault(); toggleTheme(); }}>
                                            <input type="checkbox" checked={isDark} readOnly className={styles.toggleInput} />
                                            <span className={styles.toggleSlider} />
                                        </label>
                                    </div>

                                    <div className={styles.field}>
                                        <label>Bahasa Antarmuka</label>
                                        <select value={form.language} onChange={e => F('language', e.target.value)} className={styles.select}>
                                            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                                        </select>
                                    </div>

                                    <div className={styles.prefRow}>
                                        <div>
                                            <div className={styles.prefLabel}>💱 Format Mata Uang IDR</div>
                                            <div className={styles.prefDesc}>Tampilkan harga dalam Rupiah (IDR)</div>
                                        </div>
                                        <label className={styles.toggle}>
                                            <input type="checkbox" checked={prefCurrency} onChange={e => setPrefCurrency(e.target.checked)} className={styles.toggleInput} />
                                            <span className={styles.toggleSlider} />
                                        </label>
                                    </div>

                                    <div className={styles.prefRow}>
                                        <div>
                                            <div className={styles.prefLabel}>✨ Animasi UI</div>
                                            <div className={styles.prefDesc}>Aktifkan transisi dan animasi halaman</div>
                                        </div>
                                        <label className={styles.toggle}>
                                            <input type="checkbox" checked={prefAnimation} onChange={e => setPrefAnimation(e.target.checked)} className={styles.toggleInput} />
                                            <span className={styles.toggleSlider} />
                                        </label>
                                    </div>
                                </div>

                                {saved && <div className={styles.successBox}>✅ Preferensi disimpan!</div>}
                                <div className={styles.formFooter}>
                                    <button type="submit" disabled={saving} className={styles.btnPrimary}>
                                        {saving ? '⏳ Menyimpan...' : '💾 Simpan Preferensi'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
