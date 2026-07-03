'use client';

import { useState, useRef, useEffect } from 'react';

// ── WhatsApp Config ─────────────────────────────────────────────
// Ganti nomor di bawah dengan nomor WhatsApp tujuan (format: 62xxx tanpa +)
const WHATSAPP_NUMBER = '6287857417132';

// ── Kategori Pengaduan ──────────────────────────────────────────
const CATEGORIES = [
    { key: 'quality', icon: '☕', label: 'Kualitas Produk', desc: 'Masalah dengan kualitas kopi' },
    { key: 'delivery', icon: '🚚', label: 'Pengiriman', desc: 'Keterlambatan atau kerusakan pengiriman' },
    { key: 'payment', icon: '💳', label: 'Pembayaran', desc: 'Masalah transaksi atau refund' },
    { key: 'blockchain', icon: '⛓️', label: 'Blockchain', desc: 'Masalah traceability atau sertifikasi' },
    { key: 'account', icon: '👤', label: 'Akun', desc: 'Login, registrasi, atau keamanan akun' },
    { key: 'suggestion', icon: '💡', label: 'Saran & Masukan', desc: 'Ide perbaikan untuk CoffeeChain' },
    { key: 'other', icon: '📋', label: 'Lainnya', desc: 'Pertanyaan umum atau topik lain' },
];

// ── Floating particles ──────────────────────────────────────────
function ParticleCanvas() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let particles = [];
        function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        resize();
        window.addEventListener('resize', resize);
        for (let i = 0; i < 35; i++) {
            particles.push({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                r: Math.random() * 2 + 0.5, dx: (Math.random() - 0.5) * 0.3,
                dy: (Math.random() - 0.5) * 0.3, opacity: Math.random() * 0.3 + 0.1,
            });
        }
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p) => {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(37, 211, 102, ${p.opacity})`; ctx.fill();
                p.x += p.dx; p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            });
            animId = requestAnimationFrame(draw);
        }
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

// ═══════════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function ContactPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [category, setCategory] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [urgency, setUrgency] = useState('normal');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    // Build WhatsApp message
    const buildWhatsAppMessage = () => {
        const cat = CATEGORIES.find((c) => c.key === category);
        const urgencyLabel = urgency === 'urgent' ? '🔴 URGENT' : urgency === 'high' ? '🟡 Prioritas Tinggi' : '🟢 Normal';

        let text = `📩 *PENGADUAN COFFEECHAIN*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        if (name) text += `👤 *Nama:* ${name}\n`;
        if (phone) text += `📱 *No. HP:* ${phone}\n`;
        text += `📂 *Kategori:* ${cat ? `${cat.icon} ${cat.label}` : 'Belum dipilih'}\n`;
        text += `⚡ *Urgensi:* ${urgencyLabel}\n`;
        if (subject) text += `📌 *Subjek:* ${subject}\n`;
        text += `\n💬 *Pesan:*\n${message || '(tidak ada pesan)'}\n`;
        text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        text += `_Dikirim via CoffeeChain Contact_`;

        return text;
    };

    const handleSendWhatsApp = () => {
        setError('');

        if (!category) { setError('Pilih kategori pengaduan'); return; }
        if (!message.trim()) { setError('Tulis pesan pengaduan Anda'); return; }

        const text = buildWhatsAppMessage();
        const encoded = encodeURIComponent(text);
        const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;

        window.open(url, '_blank');
        setSent(true);
        setTimeout(() => setSent(false), 5000);
    };

    const handleClear = () => {
        setName(''); setPhone(''); setCategory(''); setSubject('');
        setMessage(''); setUrgency('normal'); setError(''); setSent(false);
    };

    const charCount = message.length;
    const selectedCat = CATEGORIES.find((c) => c.key === category);

    return (
        <div style={styles.wrapper}>
            <ParticleCanvas />

            {/* Header */}
            <header style={styles.header}>
                <a href="/" style={styles.logoLink}>
                    <span style={styles.logoIcon}>☕</span>
                    <span style={styles.logoText}>CoffeeChain</span>
                </a>
                <nav style={styles.nav}>
                    <a href="/login" style={styles.navLink}>Login</a>
                    <a href="/register" style={styles.navLinkPrimary}>Daftar</a>
                </nav>
            </header>

            <div style={styles.container}>
                {/* Title */}
                <div style={styles.titleSection}>
                    <div style={styles.titleBadge}>📞 Layanan Pengaduan</div>
                    <h1 style={styles.title}>
                        Hubungi <span style={styles.titleAccent}>Kami</span>
                    </h1>
                    <p style={styles.subtitle}>
                        Sampaikan pengaduan, saran, atau pertanyaan langsung via WhatsApp.
                        <br />Tim CoffeeChain siap membantu Anda.
                    </p>
                </div>

                {/* Main Layout */}
                <div style={styles.mainGrid}>
                    {/* Left: Form */}
                    <div style={styles.formCard}>
                        <div style={styles.formHeader}>
                            <span style={styles.formHeaderIcon}>📝</span>
                            <div>
                                <div style={styles.formHeaderTitle}>Form Pengaduan</div>
                                <div style={styles.formHeaderDesc}>Isi form di bawah, lalu kirim via WhatsApp</div>
                            </div>
                        </div>

                        <div style={styles.formBody}>
                            {/* Name & Phone */}
                            <div style={styles.fieldRow}>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>👤 Nama <span style={styles.optional}>(opsional)</span></label>
                                    <input
                                        type="text" placeholder="Nama lengkap Anda"
                                        value={name} onChange={(e) => setName(e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.fieldGroup}>
                                    <label style={styles.label}>📱 No. HP <span style={styles.optional}>(opsional)</span></label>
                                    <input
                                        type="tel" placeholder="08xx-xxxx-xxxx"
                                        value={phone} onChange={(e) => setPhone(e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            {/* Category */}
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>📂 Kategori <span style={styles.required}>*</span></label>
                                <div style={styles.categoryGrid}>
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.key}
                                            onClick={() => setCategory(cat.key)}
                                            style={{
                                                ...styles.categoryBtn,
                                                ...(category === cat.key ? styles.categoryBtnActive : {}),
                                            }}
                                        >
                                            <span style={styles.categoryIcon}>{cat.icon}</span>
                                            <span style={styles.categoryLabel}>{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                                {selectedCat && (
                                    <div style={styles.categoryHint}>
                                        {selectedCat.icon} {selectedCat.desc}
                                    </div>
                                )}
                            </div>

                            {/* Urgency */}
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>⚡ Urgensi</label>
                                <div style={styles.urgencyRow}>
                                    {[
                                        { key: 'normal', label: '🟢 Normal', color: '#4CAF50' },
                                        { key: 'high', label: '🟡 Prioritas Tinggi', color: '#FF9800' },
                                        { key: 'urgent', label: '🔴 Urgent', color: '#f44336' },
                                    ].map((u) => (
                                        <button
                                            key={u.key}
                                            onClick={() => setUrgency(u.key)}
                                            style={{
                                                ...styles.urgencyBtn,
                                                ...(urgency === u.key
                                                    ? { ...styles.urgencyBtnActive, borderColor: u.color, boxShadow: `0 0 12px ${u.color}30` }
                                                    : {}),
                                            }}
                                        >
                                            {u.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subject */}
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>📌 Subjek <span style={styles.optional}>(opsional)</span></label>
                                <input
                                    type="text" placeholder="Ringkasan singkat masalah Anda"
                                    value={subject} onChange={(e) => setSubject(e.target.value)}
                                    style={styles.input}
                                />
                            </div>

                            {/* Message */}
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>
                                    💬 Pesan <span style={styles.required}>*</span>
                                    <span style={styles.charCount}>{charCount} karakter</span>
                                </label>
                                <textarea
                                    placeholder={"Jelaskan pengaduan, saran, atau pertanyaan Anda secara detail...\n\nContoh:\n- Apa yang terjadi?\n- Kapan kejadiannya?\n- Nomor pesanan (jika ada)"}
                                    value={message} onChange={(e) => setMessage(e.target.value)}
                                    style={styles.textarea}
                                    rows={6}
                                />
                            </div>

                            {/* Error */}
                            {error && <div style={styles.errorMsg}>⚠️ {error}</div>}

                            {/* Actions */}
                            <div style={styles.actionRow}>
                                <button onClick={handleClear} style={styles.clearBtn}>
                                    ✕ Bersihkan
                                </button>
                                <button
                                    onClick={handleSendWhatsApp}
                                    style={{ ...styles.sendBtn, ...(sent ? styles.sendBtnSent : {}) }}
                                >
                                    {sent ? '✅ WhatsApp Terbuka!' : '💬 Kirim via WhatsApp'}
                                </button>
                            </div>

                            {sent && (
                                <div style={styles.successMsg}>
                                    ✅ Jendela WhatsApp sudah terbuka! Klik <strong>Kirim</strong> di WhatsApp untuk menyelesaikan pengaduan.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Info & Preview */}
                    <div style={styles.rightCol}>
                        {/* WhatsApp Info Card */}
                        <div style={styles.waCard}>
                            <div style={styles.waIconLarge}>💬</div>
                            <h3 style={styles.waTitle}>WhatsApp Direct</h3>
                            <p style={styles.waDesc}>
                                Pesan langsung terkirim ke tim support CoffeeChain via WhatsApp. Respons cepat di jam kerja.
                            </p>
                            <div style={styles.waHours}>
                                <div style={styles.waHoursRow}>
                                    <span>🕐 Senin - Jumat</span>
                                    <span style={styles.waHoursValue}>08:00 - 17:00 WIB</span>
                                </div>
                                <div style={styles.waHoursRow}>
                                    <span>🕐 Sabtu</span>
                                    <span style={styles.waHoursValue}>09:00 - 14:00 WIB</span>
                                </div>
                                <div style={styles.waHoursRow}>
                                    <span>🕐 Minggu</span>
                                    <span style={styles.waHoursValue}>Libur</span>
                                </div>
                            </div>
                            <a
                                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                                target="_blank" rel="noopener noreferrer"
                                style={styles.waDirectBtn}
                            >
                                📲 Chat Langsung
                            </a>
                        </div>

                        {/* Preview Card */}
                        {(category || message) && (
                            <div style={styles.previewCard}>
                                <div style={styles.previewTitle}>👁️ Preview Pesan</div>
                                <div style={styles.previewBody}>
                                    <pre style={styles.previewText}>{buildWhatsAppMessage()}</pre>
                                </div>
                            </div>
                        )}

                        {/* Quick Contact */}
                        <div style={styles.quickCard}>
                            <h4 style={styles.quickTitle}>🚀 Kontak Cepat</h4>
                            <a
                                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Halo CoffeeChain, saya butuh bantuan.')}`}
                                target="_blank" rel="noopener noreferrer"
                                style={styles.quickBtn}
                            >
                                💬 Chat Cepat (tanpa form)
                            </a>
                            <a href="mailto:support@coffeechain.id" style={styles.quickBtnAlt}>
                                📧 Email Support
                            </a>
                        </div>
                    </div>
                </div>

                {/* Info Cards */}
                <div style={styles.infoGrid}>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}>⚡</div>
                        <h3 style={styles.infoTitle}>Respons Cepat</h3>
                        <p style={styles.infoDesc}>Tim kami merespons dalam 1x24 jam di hari kerja.</p>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}>🔒</div>
                        <h3 style={styles.infoTitle}>Privasi Terjaga</h3>
                        <p style={styles.infoDesc}>Data pengaduan Anda dijaga kerahasiaannya.</p>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}>📱</div>
                        <h3 style={styles.infoTitle}>Via WhatsApp</h3>
                        <p style={styles.infoDesc}>Langsung chat, tidak perlu install aplikasi tambahan.</p>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}>🆓</div>
                        <h3 style={styles.infoTitle}>Gratis & Tanpa Login</h3>
                        <p style={styles.infoDesc}>Siapa saja bisa mengirim pengaduan tanpa perlu akun.</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer style={styles.footer}>
                <p>© 2025 CoffeeChain — Blockchain Industri Kopi Indonesia</p>
            </footer>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ── STYLES ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const styles = {
    wrapper: { minHeight: '100vh', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' },

    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backdropFilter: 'blur(12px)', background: 'rgba(10, 15, 10, 0.6)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 100 },
    logoLink: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
    logoIcon: { fontSize: 28 },
    logoText: { fontSize: 20, fontWeight: 700, color: 'var(--color-logo-text)', letterSpacing: '-0.02em' },
    nav: { display: 'flex', gap: 12, alignItems: 'center' },
    navLink: { padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)', transition: 'var(--transition)', textDecoration: 'none' },
    navLinkPrimary: { padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', textDecoration: 'none', transition: 'var(--transition)' },

    container: { maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px', flex: 1, width: '100%' },

    titleSection: { textAlign: 'center', marginBottom: 36, animation: 'fadeInUp 0.5s ease both' },
    titleBadge: { display: 'inline-block', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: 'rgba(37, 211, 102, 0.12)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.25)', marginBottom: 16 },
    title: { fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 12, color: 'var(--color-text)' },
    titleAccent: { background: 'linear-gradient(135deg, #25D366, #128C7E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    subtitle: { fontSize: 16, color: 'var(--color-text-secondary)', maxWidth: 550, margin: '0 auto', lineHeight: 1.6 },

    mainGrid: { display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, marginBottom: 48, animation: 'fadeInUp 0.6s ease both' },

    /* Form Card */
    formCard: { background: 'var(--color-bg-card)', borderRadius: 20, border: '1px solid var(--color-border)', overflow: 'hidden' },
    formHeader: { display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card2)' },
    formHeaderIcon: { fontSize: 28 },
    formHeaderTitle: { fontSize: 16, fontWeight: 700, color: 'var(--color-text)' },
    formHeaderDesc: { fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 },
    formBody: { padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },

    fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
    label: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 },
    required: { color: '#f44336', fontSize: 12 },
    optional: { color: 'var(--color-text-muted)', fontWeight: 400, fontSize: 11 },
    charCount: { marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 },
    input: { padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s ease' },
    textarea: { padding: '12px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, transition: 'border-color 0.2s ease' },

    /* Category */
    categoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 },
    categoryBtn: { padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-card2)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)' },
    categoryBtnActive: { background: 'rgba(37, 211, 102, 0.1)', borderColor: '#25D366', color: '#25D366', boxShadow: '0 0 12px rgba(37, 211, 102, 0.1)' },
    categoryIcon: { fontSize: 18 },
    categoryLabel: { fontWeight: 500 },
    categoryHint: { fontSize: 12, color: 'var(--color-text-muted)', padding: '6px 12px', background: 'rgba(37, 211, 102, 0.05)', borderRadius: 8, marginTop: 4 },

    /* Urgency */
    urgencyRow: { display: 'flex', gap: 8 },
    urgencyBtn: { flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-card2)', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'center' },
    urgencyBtnActive: { background: 'var(--color-bg-card)', color: 'var(--color-text)' },

    /* Actions */
    actionRow: { display: 'flex', gap: 12, marginTop: 4 },
    clearBtn: { padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 500, background: 'rgba(248, 113, 113, 0.08)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.2)', cursor: 'pointer', transition: 'all 0.2s ease' },
    sendBtn: { flex: 1, padding: '14px 24px', borderRadius: 12, fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 20px rgba(37, 211, 102, 0.3)', letterSpacing: '0.02em' },
    sendBtnSent: { background: 'linear-gradient(135deg, #4CAF50, #2E7D32)', boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)' },

    errorMsg: { padding: '10px 16px', borderRadius: 10, fontSize: 13, color: '#f87171', background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.15)' },
    successMsg: { padding: '14px 18px', borderRadius: 12, fontSize: 14, color: '#4CAF50', background: 'rgba(76, 175, 80, 0.08)', border: '1px solid rgba(76, 175, 80, 0.2)', lineHeight: 1.6 },

    /* Right Column */
    rightCol: { display: 'flex', flexDirection: 'column', gap: 20 },

    /* WhatsApp Card */
    waCard: { background: 'var(--color-bg-card)', borderRadius: 20, border: '1px solid var(--color-border)', padding: 28, textAlign: 'center' },
    waIconLarge: { fontSize: 48, marginBottom: 12 },
    waTitle: { fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 },
    waDesc: { fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 20 },
    waHours: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, padding: '16px', borderRadius: 12, background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)' },
    waHoursRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)' },
    waHoursValue: { fontWeight: 600, color: 'var(--color-text)' },
    waDirectBtn: { display: 'block', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', textDecoration: 'none', textAlign: 'center', transition: 'all 0.25s ease', boxShadow: '0 4px 16px rgba(37, 211, 102, 0.25)' },

    /* Preview Card */
    previewCard: { background: 'var(--color-bg-card)', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden', animation: 'fadeInUp 0.3s ease both' },
    previewTitle: { padding: '12px 18px', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card2)' },
    previewBody: { padding: 16, maxHeight: 260, overflowY: 'auto' },
    previewText: { fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', lineHeight: 1.6, margin: 0 },

    /* Quick Card */
    quickCard: { background: 'var(--color-bg-card)', borderRadius: 16, border: '1px solid var(--color-border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 },
    quickTitle: { fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 },
    quickBtn: { display: 'block', padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'rgba(37, 211, 102, 0.1)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.25)', textDecoration: 'none', textAlign: 'center', transition: 'all 0.2s ease' },
    quickBtnAlt: { display: 'block', padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: 'var(--color-bg-card2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', textDecoration: 'none', textAlign: 'center', transition: 'all 0.2s ease' },

    /* Info Cards */
    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, animation: 'fadeInUp 0.8s ease both' },
    infoCard: { padding: '24px 20px', borderRadius: 14, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', textAlign: 'center', transition: 'all 0.25s ease' },
    infoIcon: { fontSize: 28, marginBottom: 10 },
    infoTitle: { fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 },
    infoDesc: { fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 },

    footer: { textAlign: 'center', padding: '24px 16px', fontSize: 13, color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' },
};
