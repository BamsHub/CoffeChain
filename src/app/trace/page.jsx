'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getExplorerTxUrl } from '@/lib/contractConfig';
import { useTheme } from '@/context/ThemeContext';

const IconCoffee = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconShield = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7ED44A" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconExplorer = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconClock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconQR = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3" fill="currentColor"/><rect x="16" y="5" width="3" height="3" fill="currentColor"/><rect x="5" y="16" width="3" height="3" fill="currentColor"/></svg>;
const IconDownload = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconCopy = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;

/* ── Inline QR generator ── */
function CertQRImage({ url, size = 140 }) {
    const [qrSrc, setQrSrc] = useState(null);
    useEffect(() => {
        if (!url) return;
        let cancelled = false;
        import('qrcode').then(m => m.default.toDataURL(url, {
            width: size, margin: 1, color: { dark: '#000', light: '#fff' }, errorCorrectionLevel: 'M',
        })).then(d => { if (!cancelled) setQrSrc(d); }).catch(() => {});
        return () => { cancelled = true; };
    }, [url, size]);
    return (
        <div style={{ width: size, height: size, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 4, flexShrink: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
            {qrSrc
                ? <img src={qrSrc} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
                : <span style={{ fontSize: 10, color: '#aaa' }}>QR...</span>}
        </div>
    );
}

/* ── 1 card sertifikasi per produk ── */
function CertCard({ p }) {
    const [copied, setCopied] = useState(false);
    const certUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://coffeechain.vercel.app'}/trace?id=${p.coffeeId}`;

    function handleCopy() {
        navigator.clipboard.writeText(certUrl).then(() => {
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        });
    }
    function handleDownload(qrEl) {
        if (!qrEl) return;
        const img = qrEl.querySelector('img');
        if (!img) return;
        const a = document.createElement('a'); a.href = img.src;
        a.download = `sertifikasi-${p.coffeeId}.png`; a.click();
    }

    const qrRef = useCallback(node => { /* ref for download */ }, []);

    return (
        <div style={{ background: 'var(--color-bg-card)', border: '1.5px solid rgba(126,212,74,0.25)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Foto */}
            <div style={{ width: '100%', height: 140, overflow: 'hidden', position: 'relative', background: 'rgba(74,124,40,0.07)', flexShrink: 0 }}>
                {p.image
                    ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(126,212,74,0.3)' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg></div>
                }
                {/* Coffee ID badge overlay */}
                <div style={{ position: 'absolute', bottom: 8, left: 8, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#7ED44A', background: 'rgba(0,0,0,0.65)', padding: '3px 8px', borderRadius: 5, backdropFilter: 'blur(4px)' }}>
                    {p.coffeeId}
                </div>
            </div>

            {/* Konten */}
            <div style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>{p.origin} · {p.variety}</div>
                    {p.grade && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(126,212,74,0.12)', color: '#7ED44A', border: '1px solid rgba(126,212,74,0.3)', fontWeight: 700, marginRight: 4 }}>{p.grade}</span>}
                    {p.roast && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(245,166,35,0.1)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.25)', fontWeight: 700 }}>{p.roast}</span>}

                    {/* Buttons */}
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <a href={`/trace?id=${p.coffeeId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'linear-gradient(135deg,rgba(74,124,40,0.3),rgba(126,212,74,0.15))', border: '1px solid rgba(126,212,74,0.4)', color: '#7ED44A', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                            <IconQR /> Lihat Sertifikasi
                        </a>
                        <button onClick={handleCopy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: copied ? 'rgba(76,175,80,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${copied ? 'rgba(76,175,80,0.35)' : 'var(--color-border)'}`, color: copied ? '#4CAF50' : 'var(--color-text-muted)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                            <IconCopy /> {copied ? 'Tersalin!' : 'Salin Link'}
                        </button>
                    </div>
                </div>

                {/* QR Code */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }} ref={qrRef}>
                    <CertQRImage url={certUrl} size={110} />
                    <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Scan QR</span>
                </div>
            </div>
        </div>
    );
}

function TraceContent() {
    const searchParams = useSearchParams();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);
    const [allProducts, setAllProducts] = useState([]);

    useEffect(() => {
        fetch('/api/products')
            .then(r => r.json())
            .then(d => { if (d.success) setAllProducts(d.data.filter(p => p.status === 'published')); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const id = searchParams.get('id');
        if (id) { setQuery(id.toUpperCase()); doSearch(id.toUpperCase()); }
    }, [searchParams]);

    async function doSearch(q) {
        if (!q) return;
        setLoading(true); setError(null); setResult(null); setSearched(true);
        try {
            const res = await fetch(`/api/coffee-trace/${encodeURIComponent(q)}`);
            const data = await res.json();
            if (data.success) setResult(data.data);
            else setError(data.message || 'Tidak ditemukan');
        } catch { setError('Terjadi kesalahan koneksi'); }
        setLoading(false);
    }

    function handleSearch(e) { e.preventDefault(); doSearch(query.trim().toUpperCase()); }

    const row = (label, value) => value ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13, flexShrink: 0 }}>{label}</span>
            <span style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: 13, textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
        </div>
    ) : null;

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px 80px' }}>
            <div style={{ textAlign: 'center', marginBottom: 48, animation: 'fadeUp 0.5s ease' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,rgba(74,124,40,0.2),rgba(126,212,74,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#7ED44A' }}><IconShield /></div>
                <h1 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 12, letterSpacing: '-1px' }}>Sertifikasi Produk CoffeeChain</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>Masukkan Coffee ID untuk melihat sertifikasi yang tercatat permanen di blockchain Solana</p>
            </div>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 40, animation: 'fadeUp 0.6s ease' }}>
                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Masukkan Coffee ID (contoh: CF-A1B2C3)"
                    style={{ flex: 1, padding: '14px 18px', borderRadius: 12, background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text)', fontSize: 15, outline: 'none', letterSpacing: '0.5px', fontWeight: 600 }} />
                <button type="submit" disabled={loading} style={{ padding: '14px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#4A7C28,#7ED44A)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, opacity: loading ? 0.7 : 1 }}>
                    <IconSearch /> {loading ? 'Mencari...' : 'Verifikasi'}
                </button>
            </form>
            {loading && <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>{[1,2,3].map(i => <div key={i} className="trace-shimmer" style={{ height: 60, marginBottom: 8, borderRadius: 10 }} />)}</div>}
            {!loading && error && searched && (
                <div style={{ textAlign: 'center', padding: '48px 20px', animation: 'fadeUp 0.4s ease' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(244,67,54,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#f44336', fontSize: 24 }}>✕</div>
                    <p style={{ color: '#f44336', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Tidak Ditemukan</p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{error}</p>
                </div>
            )}
            {!loading && result && (() => {
                const img = allProducts.find(p => p.coffeeId === result.coffeeId)?.image;
                return (
                <div style={{ animation: 'fadeUp 0.4s ease', background: 'var(--color-bg-card)', border: '1.5px solid rgba(126,212,74,0.3)', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'row', minHeight: 420 }}>

                    {/* ── KIRI: Foto penuh tinggi ── */}
                    <div style={{ width: 220, flexShrink: 0, position: 'relative', background: 'rgba(10,18,10,0.95)', overflow: 'hidden' }}>
                        {img
                            ? <img src={img} alt={result.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(126,212,74,0.2)' }}>
                                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>
                              </div>
                        }
                        {/* gradient kanan agar menyatu dengan konten */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 60%, rgba(20,30,20,0.7) 100%)' }} />
                        {/* Coffee ID badge */}
                        <div style={{ position: 'absolute', top: 14, left: 12, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#7ED44A', background: 'rgba(0,0,0,0.65)', padding: '3px 8px', borderRadius: 5, backdropFilter: 'blur(6px)', border: '1px solid rgba(126,212,74,0.35)' }}>
                            {result.coffeeId}
                        </div>
                        {/* Verified badge (bawah kiri) */}
                        <div style={{ position: 'absolute', bottom: 14, left: 12, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 20, background: result.blockchainVerified ? 'rgba(30,70,20,0.9)' : 'rgba(100,60,0,0.9)', backdropFilter: 'blur(6px)', border: `1px solid ${result.blockchainVerified ? 'rgba(126,212,74,0.5)' : 'rgba(255,180,0,0.4)'}` }}>
                            {result.blockchainVerified ? <IconCheck /> : <IconClock />}
                            <span style={{ fontSize: 9, fontWeight: 700, color: result.blockchainVerified ? '#b8f5a0' : '#FFD54F' }}>{result.blockchainVerified ? 'Terverifikasi' : 'Pending'}</span>
                        </div>
                    </div>

                    {/* ── KANAN: Konten ── */}
                    <div style={{ flex: 1, minWidth: 0, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto' }}>
                        {/* Header nama produk */}
                        <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--color-border)' }}>
                            <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--color-text)', letterSpacing: '-0.5px', marginBottom: 4 }}>{result.name}</div>
                            {(result.origin || result.variety) && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{[result.origin, result.variety].filter(Boolean).join(' · ')}</div>}
                        </div>

                        {/* Detail rows */}
                        {row('Grade', result.grade)}
                        {row('Berat', result.weightKg ? `${result.weightKg} kg` : null)}
                        {row('Petani', result.farmerName)}
                        {row('Tanggal Panen', result.harvestDate)}
                        {row('Metode Proses', result.processMethod)}
                        {row('Level Roast', result.roastLevel)}
                        {row('Sertifikasi', result.certification)}
                        {row('Deskripsi', result.description)}
                        {row('Status', result.status?.toUpperCase())}
                        {row('Didaftarkan', result.createdAt ? new Date(result.createdAt).toLocaleString('id-ID') : null)}

                        {/* TX Signature */}
                        {result.txSignature && (
                            <div style={{ marginTop: 14 }}>
                                <div style={{ padding: '10px 12px', background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)', borderRadius: 9, wordBreak: 'break-all', marginBottom: 8 }}>
                                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>Solana TX Signature</div>
                                    <div style={{ fontSize: 11, color: '#7ED44A', fontFamily: 'monospace', fontWeight: 600 }}>{result.txSignature}</div>
                                </div>
                                <a href={result.explorerUrl || getExplorerTxUrl(result.txSignature)} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', borderRadius: 9, background: 'linear-gradient(135deg,#512da8,#7c4dff)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                                    <IconExplorer /> Lihat di Solana Explorer
                                </a>
                            </div>
                        )}

                        {/* QR + buttons */}
                        {result.coffeeId && (
                            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                                <CertQRImage url={`${typeof window !== 'undefined' ? window.location.origin : ''}/trace?id=${result.coffeeId}`} size={100} />
                                <div style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#7ED44A', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}><IconQR /> QR Sertifikasi</div>
                                    <a href={`/trace?id=${result.coffeeId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(74,124,40,0.18)', border: '1px solid rgba(126,212,74,0.4)', color: '#7ED44A', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                                        <IconQR /> Halaman Sertifikasi
                                    </a>
                                    {result.txSignature && (
                                        <a href={result.explorerUrl || getExplorerTxUrl(result.txSignature)} target="_blank" rel="noopener noreferrer"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(124,77,255,0.12)', border: '1px solid rgba(124,77,255,0.3)', color: '#b388ff', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
                                            <IconExplorer /> Solana Explorer
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}
            {!loading && !result && !error && !searched && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)', animation: 'fadeUp 0.7s ease' }}>
                    <IconShield /><br /><p style={{ marginTop: 12, fontSize: 13 }}>Masukkan Coffee ID di atas untuk mulai sertifikasi</p>
                </div>
            )}

            {/* All Products Certifications */}
            {allProducts.length > 0 && (
                <div style={{ marginTop: 64, animation: 'fadeUp 0.8s ease' }}>
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#7ED44A', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Sertifikasi Produk</div>
                        <h2 style={{ fontSize: 'clamp(18px,3.5vw,24px)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 6, letterSpacing: '-0.5px' }}>Semua Sertifikasi Kopi</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{allProducts.filter(p => p.coffeeId).length} produk tersertifikasi di blockchain</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
                        {allProducts.filter(p => p.coffeeId).map(p => (
                            <CertCard key={p.id} p={p} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Theme Toggle Button ── */
function ThemeToggle() {
    const { theme, toggleTheme, mounted } = useTheme();
    if (!mounted) return null;
    const isDark = theme === 'dark';
    return (
        <button
            onClick={toggleTheme}
            title={`Switch ke ${isDark ? 'Light' : 'Dark'} Mode`}
            style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 14px', borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'all 0.2s',
            }}
        >
            {isDark
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            }
            {isDark ? 'Light' : 'Dark'}
        </button>
    );
}

export default function TracePage() {
    return (
        <div style={{ background: 'var(--color-bg)', minHeight: '100vh', color: 'var(--color-text)', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <style>{`
                @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
                @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                .trace-shimmer { background: linear-gradient(90deg, rgba(74,124,40,0.1) 25%, rgba(74,124,40,0.2) 50%, rgba(74,124,40,0.1) 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
            `}</style>
            <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--color-bg-surface)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-border)', padding: '0 20px' }}>
                <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: '#7ED44A', letterSpacing: '-0.5px', lineHeight: 1 }}>CoffeeChain</div>
                            <div style={{ fontSize: 9, color: 'rgba(126,212,74,0.55)', letterSpacing: 1.2, textTransform: 'uppercase' }}>Blockchain Kopi</div>
                        </div>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ThemeToggle />
                        <Link href="/" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border)' }}>← Kembali</Link>
                    </div>
                </div>
            </nav>
            <Suspense fallback={<div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--color-text-muted)' }}>Memuat...</div>}>
                <TraceContent />
            </Suspense>
        </div>
    );
}
