'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getExplorerTxUrl } from '@/lib/contractConfig';
import { useTheme } from '@/context/ThemeContext';
import { BlockchainQRCard } from '@/components/BlockchainQR/BlockchainQR';

const IconCoffee = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconShield = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7ED44A" strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconExplorer = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconClock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

function TraceContent() {
    const searchParams = useSearchParams();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searched, setSearched] = useState(false);

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
                <h1 style={{ fontSize: 'clamp(28px,5vw,42px)', fontWeight: 900, color: 'var(--color-text)', marginBottom: 12, letterSpacing: '-1px' }}>Verifikasi Keaslian Kopi</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 15, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>Masukkan Coffee ID untuk melihat data traceability yang tercatat permanen di blockchain Solana</p>
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
            {!loading && result && (
                <div style={{ animation: 'fadeUp 0.4s ease' }}>
                    {/* Blockchain status badge */}
                    <div style={{ background: result.blockchainVerified ? 'linear-gradient(135deg,rgba(74,124,40,0.15),rgba(126,212,74,0.08))' : 'rgba(255,152,0,0.1)', border: `1px solid ${result.blockchainVerified ? 'rgba(126,212,74,0.35)' : 'rgba(255,152,0,0.3)'}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        {result.blockchainVerified ? <IconCheck /> : <IconClock />}
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: result.blockchainVerified ? '#7ED44A' : '#FFB300' }}>{result.blockchainVerified ? '✅ Terverifikasi di Blockchain Solana' : '⏳ Belum Terverifikasi (Pending)'}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{result.blockchainVerified ? 'Data kopi tercatat permanen di Solana Devnet' : 'Memo transaksi belum terkirim ke Solana'}</div>
                        </div>
                    </div>

                    {/* Detail card */}
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(74,124,40,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ED44A' }}><IconCoffee /></div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-text)' }}>{result.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>ID: <span style={{ color: '#7ED44A', fontWeight: 700, letterSpacing: '0.5px' }}>{result.coffeeId}</span></div>
                            </div>
                        </div>
                        {row('Asal', result.origin)}
                        {row('Varietas', result.variety)}
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
                        {result.txSignature && (
                            <>
                                <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)', borderRadius: 10, wordBreak: 'break-all' }}>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>Solana TX Signature</div>
                                    <div style={{ fontSize: 12, color: '#7ED44A', fontFamily: 'monospace', fontWeight: 600 }}>{result.txSignature}</div>
                                </div>
                                <a href={result.explorerUrl || getExplorerTxUrl(result.txSignature)} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, padding: '13px', borderRadius: 10, background: 'linear-gradient(135deg,#512da8,#7c4dff)', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                                    <IconExplorer /> Lihat di Solana Explorer
                                </a>
                            </>
                        )}
                    </div>

                    {/* QR Code Bukti Blockchain */}
                    {result.txSignature && (
                        <div style={{ animation: 'fadeUp 0.5s ease' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3" fill="currentColor"/><rect x="16" y="5" width="3" height="3" fill="currentColor"/><rect x="5" y="16" width="3" height="3" fill="currentColor"/></svg>
                                QR Code Bukti Blockchain
                            </div>
                            <BlockchainQRCard
                                explorerUrl={result.explorerUrl || getExplorerTxUrl(result.txSignature)}
                                traceUrl={result.coffeeId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trace?id=${result.coffeeId}` : undefined}
                                coffeeId={result.coffeeId}
                                productName={result.name}
                            />
                        </div>
                    )}
                </div>
            )}
            {!loading && !result && !error && !searched && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)', animation: 'fadeUp 0.7s ease' }}>
                    <IconShield /><br /><p style={{ marginTop: 12, fontSize: 13 }}>Masukkan Coffee ID di atas untuk mulai verifikasi</p>
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
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4A7C28,#7ED44A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><IconCoffee /></div>
                        <span style={{ fontWeight: 800, fontSize: 16, color: '#7ED44A' }}>CoffeeChain</span>
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
