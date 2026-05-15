'use client';
/**
 * CoffeeRegisterContent — Unified Register Kopi + Request Log
 * Alur: Kelola Produk → status blockchain per produk → klik → Phantom sign → Solana
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    isPhantomInstalled, connectPhantom, disconnectPhantom,
    getSolBalance, shortenAddress, sendMemoWithPhantom,
} from '@/lib/phantom';
import { getExplorerTxUrl } from '@/lib/contractConfig';

/* ── Icons ─────────────────────────────────────────────────────── */
const IcoShield  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoWallet  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>;
const IcoLink    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const IcoCoffee  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
const IcoClose   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoCheck   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IcoSpin    = () => <span style={{ display:'inline-block', animation:'spin 0.8s linear infinite', fontSize:14 }}>⏳</span>;
const IcoPhantom = () => <svg width="16" height="16" viewBox="0 0 128 128" fill="none"><circle cx="64" cy="64" r="64" fill="#9945FF"/><path d="M64 24C42 24 24 42 24 64s18 40 40 40 40-18 40-40S86 24 64 24zm16 52a10 10 0 110-20 10 10 0 010 20zm-32 0a10 10 0 110-20 10 10 0 010 20z" fill="white"/><path d="M44 64h40" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.35"/></svg>;

const PROCESS_OPTIONS = ['Washed', 'Natural', 'Honey', 'Semi-Washed', 'Wet Hulled'];
const ROAST_OPTIONS   = ['Green Bean', 'Light', 'Medium', 'Medium-Dark', 'Dark'];

const DEVNET_EXPLORER = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

/* ── Style constants ───────────────────────────────────────────── */
const S = {
    card: { background:'rgba(255,255,255,0.02)', border:'1px solid rgba(74,124,40,0.18)', borderRadius:14, padding:20 },
    inp:  { width:'100%', padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(74,124,40,0.25)', color:'var(--color-text,#E8F5E0)', fontSize:13, outline:'none', boxSizing:'border-box' },
    lbl:  { fontSize:11, color:'rgba(232,245,224,0.5)', fontWeight:600, display:'block', marginBottom:5 },
    btnG: { background:'linear-gradient(135deg,#4A7C28,#7ED44A)', color:'#fff', fontWeight:700, border:'none', borderRadius:9, cursor:'pointer', padding:'10px 20px', fontSize:13, display:'inline-flex', alignItems:'center', gap:7, transition:'opacity 0.2s' },
    btnP: { background:'linear-gradient(135deg,#512da8,#9c27b0)', color:'#fff', fontWeight:700, border:'none', borderRadius:9, cursor:'pointer', padding:'10px 20px', fontSize:13, display:'inline-flex', alignItems:'center', gap:7 },
};

/* ════════════════════════════════════════════════════════════════ */
export default function CoffeeRegisterContent() {
    const { user } = useAuth();

    /* ── State ── */
    const [tab, setTab]                   = useState('products');
    const [products, setProducts]         = useState([]);
    const [traces, setTraces]             = useState([]);
    const [loadingProd, setLoadingProd]   = useState(true);
    const [loadingTrace, setLoadingTrace] = useState(false);

    /* ── Phantom ── */
    const [walletPK, setWalletPK]         = useState(null);
    const [walletBal, setWalletBal]       = useState(0);
    const [walletConn, setWalletConn]     = useState(false);
    const [walletMenu, setWalletMenu]     = useState(false);

    /* ── Register modal state ── */
    const [regProduct, setRegProduct]     = useState(null);
    const [regForm, setRegForm]           = useState({ farmerName:'', harvestDate:'', processMethod:'Washed', roastLevel:'Medium', certification:'' });
    const [submitting, setSubmitting]     = useState(false);
    const [regMsg, setRegMsg]             = useState(null);

    /* ── Log search ── */
    const [logSearch, setLogSearch]       = useState('');

    /* ── Auto-connect Phantom ── */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const tryAuto = async () => {
            try {
                if (window.solana?.isPhantom && window.solana.isConnected && window.solana.publicKey) {
                    const pk = window.solana.publicKey.toString();
                    const bal = await getSolBalance(pk);
                    setWalletPK(pk); setWalletBal(bal);
                }
            } catch { }
        };
        tryAuto();
        if (window.solana) {
            window.solana.on('accountChanged', (newKey) => {
                if (newKey) setWalletPK(newKey.toString());
                else { setWalletPK(null); setWalletBal(0); }
            });
        }
    }, []);

    /* ── Load data ── */
    const loadProducts = useCallback(async () => {
        setLoadingProd(true);
        try {
            const res = await fetch('/api/products');
            const d = await res.json();
            if (d.success) setProducts(d.data || []);
        } catch { }
        setLoadingProd(false);
    }, []);

    const loadTraces = useCallback(async () => {
        setLoadingTrace(true);
        try {
            const res = await fetch('/api/coffee-trace');
            const d = await res.json();
            if (d.success) setTraces(d.data || []);
        } catch { }
        setLoadingTrace(false);
    }, []);

    useEffect(() => { loadProducts(); loadTraces(); }, [loadProducts, loadTraces]);

    /* ── Phantom Wallet Handlers ── */
    async function handleConnect() {
        if (!isPhantomInstalled()) { window.open('https://phantom.app/', '_blank'); return; }
        setWalletConn(true);
        try {
            const { publicKey } = await connectPhantom();
            const bal = await getSolBalance(publicKey);
            setWalletPK(publicKey); setWalletBal(bal);
        } catch (e) { alert(e.message || 'Gagal konek Phantom'); }
        setWalletConn(false);
    }
    async function handleDisconnect() {
        await disconnectPhantom();
        setWalletPK(null); setWalletBal(0); setWalletMenu(false);
    }

    /* ── Open Register Modal ── */
    function openRegister(product) {
        setRegProduct(product);
        setRegForm({
            farmerName: product.submittedByName || user?.name || '',
            harvestDate: '', processMethod: 'Washed',
            roastLevel: product.roast?.replace(/ Roast$/, '') || 'Medium',
            certification: '',
        });
        setRegMsg(null);
    }

    /* ── Submit: Phantom sign → Solana → save to DB ── */
    async function handleRegister(e) {
        e.preventDefault();
        if (!regProduct) return;
        if (!walletPK) { alert('Hubungkan Phantom Wallet terlebih dahulu!'); return; }

        setSubmitting(true); setRegMsg(null);
        try {
            const memoData = JSON.stringify({
                v: 1, type: 'coffee-trace',
                name: regProduct.name?.slice(0, 30),
                origin: regProduct.origin?.slice(0, 20),
                variety: regProduct.variety?.slice(0, 15),
                grade: regProduct.grade,
                farmer: regForm.farmerName?.slice(0, 25),
                harvest: regForm.harvestDate,
                process: regForm.processMethod,
                roast: regForm.roastLevel,
                cert: regForm.certification?.slice(0, 20),
                ts: Math.floor(Date.now() / 1000),
            });

            setRegMsg({ type: 'info', text: 'Menunggu tanda tangan Phantom Wallet... Konfirmasi di popup Phantom Anda.' });

            let phantomTxSignature;
            try {
                phantomTxSignature = await sendMemoWithPhantom(walletPK, memoData);
            } catch (phantomErr) {
                if (phantomErr.message?.includes('rejected') || phantomErr.code === 4001) {
                    setRegMsg({ type: 'error', text: 'Transaksi dibatalkan oleh pengguna.' });
                    setSubmitting(false); return;
                }
                throw phantomErr;
            }

            setRegMsg({ type: 'info', text: 'TX diterima Solana! Menyimpan data trace ke database...' });

            const res = await fetch('/api/coffee-trace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId:            regProduct.id,
                    name:                 regProduct.name,
                    origin:               regProduct.origin || '',
                    variety:              regProduct.variety || 'Arabika',
                    grade:                regProduct.grade || 'A',
                    weightKg:             regProduct.weight?.[0] || 0,
                    farmerName:           regForm.farmerName,
                    harvestDate:          regForm.harvestDate,
                    processMethod:        regForm.processMethod,
                    roastLevel:           regForm.roastLevel,
                    certification:        regForm.certification,
                    description:          regProduct.description || '',
                    registeredBy:         user?.id || walletPK,
                    paymentWallet:        walletPK,
                    phantomTxSignature,
                    phantomWalletAddress: walletPK,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setRegMsg({
                    type: 'success',
                    text: `"${regProduct.name}" berhasil terdaftar di Solana Blockchain!`,
                    coffeeId:    data.data?.coffeeId,
                    txSig:       phantomTxSignature,
                    explorerUrl: DEVNET_EXPLORER(phantomTxSignature),
                });
                await Promise.all([loadProducts(), loadTraces()]);
                setTimeout(() => { setRegProduct(null); setRegMsg(null); }, 4500);
            } else {
                setRegMsg({ type: 'error', text: data.message || 'Gagal simpan ke DB' });
            }
        } catch (err) {
            setRegMsg({ type: 'error', text: err.message || 'Terjadi kesalahan' });
        }
        setSubmitting(false);
    }

    /* ── Derived data ── */
    const unregistered    = products.filter(p => !p.coffeeId);
    const registered      = products.filter(p => !!p.coffeeId);
    const filteredTraces  = traces.filter(t => {
        const q = logSearch.toLowerCase();
        return !q || t.coffeeId?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q) || t.origin?.toLowerCase().includes(q);
    });

    /* ── Render ── */
    return (
        <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1100, margin: '0 auto' }}>
            <style>{`
                @keyframes spin { to { transform:rotate(360deg); } }
                @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                .cr-card { transition:transform 0.18s,border-color 0.18s; cursor:pointer; }
                .cr-card:hover { transform:translateY(-3px); border-color:rgba(126,212,74,0.4) !important; }
                .cr-card.done { cursor:default; opacity:0.7; }
                .cr-card.done:hover { transform:none; }
                .cr-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.75); z-index:300; display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.2s ease; }
                .cr-modal { background:#0e1a0e; border:1px solid rgba(74,124,40,0.3); border-radius:18px; padding:28px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; }
            `}</style>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, color: 'var(--color-text,#E8F5E0)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IcoShield /> Register Kopi ke Blockchain
                    </h1>
                    <p style={{ fontSize: 13, color: 'rgba(232,245,224,0.45)' }}>
                        Daftarkan produk ke Solana Devnet via <strong style={{ color: '#9945FF' }}>Phantom Wallet</strong>
                    </p>
                </div>

                {/* Phantom Wallet Button */}
                {walletPK ? (
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setWalletMenu(m => !m)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 10, background: 'rgba(81,45,168,0.25)', border: '1px solid rgba(147,51,234,0.4)', color: '#E8F5E0', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                            <IcoPhantom />
                            <span>{shortenAddress(walletPK)}</span>
                            <span style={{ color: '#7ED44A', fontSize: 12 }}>{walletBal.toFixed(3)} SOL</span>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7ED44A', display: 'inline-block' }} />
                        </button>
                        {walletMenu && (
                            <div style={{ position: 'absolute', top: '110%', right: 0, background: '#0e1a0e', border: '1px solid rgba(74,124,40,0.3)', borderRadius: 10, padding: 8, minWidth: 200, zIndex: 10 }}>
                                <div style={{ padding: '6px 10px', fontSize: 11, color: 'rgba(232,245,224,0.4)', borderBottom: '1px solid rgba(74,124,40,0.15)', marginBottom: 6 }}>
                                    {shortenAddress(walletPK, 8)}<br />
                                    <span style={{ color: '#7ED44A' }}>{walletBal.toFixed(5)} SOL</span>
                                </div>
                                <button onClick={handleDisconnect}
                                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.2)', borderRadius: 7, color: '#f44336', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <IcoClose /> Putuskan Koneksi
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button onClick={handleConnect} disabled={walletConn} style={{ ...S.btnP }}>
                        {walletConn ? <IcoSpin /> : <IcoPhantom />}
                        {walletConn ? 'Menghubungkan...' : 'Hubungkan Phantom'}
                    </button>
                )}
            </div>

            {/* ── STATS ── */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Produk',    value: products.length,    color: 'rgba(232,245,224,0.7)' },
                    { label: 'Belum di-Chain',  value: unregistered.length, color: '#FFB300' },
                    { label: 'Sudah di-Chain',  value: registered.length,  color: '#7ED44A' },
                    { label: 'Total Trace',     value: traces.length,      color: '#b388ff' },
                ].map(s => (
                    <div key={s.label} style={{ ...S.card, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 110px' }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: 'rgba(232,245,224,0.4)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── TABS ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid rgba(74,124,40,0.15)' }}>
                {[
                    { id: 'products', label: `Produk (${products.length})`, badge: unregistered.length || null },
                    { id: 'log',      label: `Log Blockchain (${traces.length})` },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        style={{ padding: '10px 18px', borderRadius: '10px 10px 0 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 6,
                            background:   tab === t.id ? 'rgba(74,124,40,0.2)' : 'transparent',
                            borderBottom: tab === t.id ? '2px solid #7ED44A' : '2px solid transparent',
                            color:        tab === t.id ? '#7ED44A' : 'rgba(232,245,224,0.45)',
                        }}>
                        {t.label}
                        {t.badge ? <span style={{ background: '#f44336', color: '#fff', borderRadius: '50%', width: 17, height: 17, fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</span> : null}
                    </button>
                ))}
            </div>

            {/* ══ TAB: PRODUCTS ══ */}
            {tab === 'products' && (
                <div>
                    {!walletPK && (
                        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(153,69,255,0.08)', border: '1px solid rgba(153,69,255,0.25)', fontSize: 13, color: 'rgba(232,245,224,0.6)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <IcoPhantom />
                            Hubungkan <strong style={{ color: '#9945FF' }}>Phantom Wallet</strong> untuk mendaftarkan produk ke Solana.
                        </div>
                    )}
                    {loadingProd ? (
                        <div style={{ textAlign: 'center', padding: 48, color: 'rgba(232,245,224,0.3)' }}>Memuat produk...</div>
                    ) : (
                        <>
                            {/* Unregistered */}
                            {unregistered.length > 0 && (
                                <>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#FFB300', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFB300', display: 'inline-block' }} />
                                        Belum Terdaftar di Blockchain ({unregistered.length})
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14, marginBottom: 28 }}>
                                        {unregistered.map(p => (
                                            <div key={p.id} className="cr-card" onClick={() => openRegister(p)}
                                                style={{ ...S.card, borderColor: 'rgba(255,152,0,0.2)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,152,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFB300', flexShrink: 0 }}>
                                                        <IcoCoffee />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                                        <div style={{ fontSize: 11, color: 'rgba(232,245,224,0.4)' }}>{p.origin} · {p.variety}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                                                    {[p.grade, p.roast].filter(Boolean).map(tag => (
                                                        <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(74,124,40,0.12)', color: '#7ED44A', border: '1px solid rgba(126,212,74,0.2)' }}>{tag}</span>
                                                    ))}
                                                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(255,152,0,0.1)', color: '#FFB300', border: '1px solid rgba(255,152,0,0.25)', fontWeight: 700 }}>⛓ Belum di-Chain</span>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); openRegister(p); }}
                                                    style={{ ...S.btnG, width: '100%', justifyContent: 'center', padding: '9px', fontSize: 12 }}>
                                                    <IcoShield /> Daftarkan ke Blockchain
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Registered */}
                            {registered.length > 0 && (
                                <>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#7ED44A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <IcoCheck /> Sudah Terdaftar ({registered.length})
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 14 }}>
                                        {registered.map(p => (
                                            <div key={p.id} className="cr-card done" style={{ ...S.card, borderColor: 'rgba(74,124,40,0.3)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(74,124,40,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ED44A', flexShrink: 0 }}>
                                                        <IcoCoffee />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                                        <div style={{ fontSize: 11, color: 'rgba(232,245,224,0.4)' }}>{p.origin} · {p.variety}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#7ED44A', background: 'rgba(74,124,40,0.15)', padding: '3px 8px', borderRadius: 6 }}>{p.coffeeId}</span>
                                                    <span style={{ fontSize: 10, color: '#7ED44A', background: 'rgba(74,124,40,0.1)', border: '1px solid rgba(126,212,74,0.25)', padding: '2px 7px', borderRadius: 100, fontWeight: 700 }}>✅ On-Chain</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {products.length === 0 && (
                                <div style={{ textAlign: 'center', padding: 48, color: 'rgba(232,245,224,0.3)' }}>Belum ada produk. Tambahkan di <strong>Kelola Produk</strong>.</div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ══ TAB: LOG ══ */}
            {tab === 'log' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                        <span style={{ fontSize: 13, color: 'rgba(232,245,224,0.45)' }}>{filteredTraces.length} trace ditemukan</span>
                        <input value={logSearch} onChange={e => setLogSearch(e.target.value)}
                            placeholder="Cari Coffee ID, nama, asal..."
                            style={{ ...S.inp, maxWidth: 260 }} />
                    </div>
                    {loadingTrace && <div style={{ textAlign: 'center', padding: 40, color: 'rgba(232,245,224,0.3)' }}>Memuat log...</div>}
                    <div style={{ display: 'grid', gap: 10 }}>
                        {filteredTraces.map(t => (
                            <div key={t.id} style={{ ...S.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderColor: t.txSignature ? 'rgba(74,124,40,0.25)' : 'rgba(255,152,0,0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#7ED44A', background: 'rgba(74,124,40,0.15)', padding: '5px 10px', borderRadius: 7, flexShrink: 0 }}>{t.coffeeId}</span>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                        <div style={{ fontSize: 11, color: 'rgba(232,245,224,0.4)', marginTop: 2 }}>
                                            {[t.origin, t.variety, t.grade].filter(Boolean).join(' · ')}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                                    {t.txSignature ? (
                                        <>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#7ED44A', padding: '3px 9px', borderRadius: 7, background: 'rgba(74,124,40,0.15)', border: '1px solid rgba(126,212,74,0.25)' }}>✅ Verified</span>
                                            <a href={t.explorerUrl || DEVNET_EXPLORER(t.txSignature)} target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: 11, color: '#b388ff', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.25)' }}>
                                                <IcoLink /> Explorer
                                            </a>
                                        </>
                                    ) : (
                                        <span style={{ fontSize: 11, color: '#FFB300', fontWeight: 600, padding: '4px 10px', borderRadius: 7, background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.25)' }}>⏳ Pending</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!loadingTrace && filteredTraces.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 48, color: 'rgba(232,245,224,0.25)', fontSize: 13 }}>Belum ada log blockchain</div>
                        )}
                    </div>
                </div>
            )}

            {/* ══ MODAL: REGISTER FORM ══ */}
            {regProduct && (
                <div className="cr-overlay" onClick={() => { if (!submitting) { setRegProduct(null); setRegMsg(null); } }}>
                    <div className="cr-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 18, color: '#E8F5E0', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <IcoShield /> Daftarkan ke Blockchain
                                </div>
                                <div style={{ fontSize: 12, color: 'rgba(232,245,224,0.45)' }}>Produk: <strong style={{ color: '#7ED44A' }}>{regProduct.name}</strong></div>
                            </div>
                            {!submitting && (
                                <button onClick={() => { setRegProduct(null); setRegMsg(null); }}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: 'rgba(232,245,224,0.6)', cursor: 'pointer' }}>
                                    <IcoClose />
                                </button>
                            )}
                        </div>

                        {/* Product preview */}
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(74,124,40,0.06)', border: '1px solid rgba(74,124,40,0.2)', marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[['Nama', regProduct.name], ['Asal', regProduct.origin], ['Varietas', regProduct.variety], ['Grade', regProduct.grade]].map(([k, v]) => (
                                <div key={k}><div style={{ fontSize: 10, color: 'rgba(232,245,224,0.4)' }}>{k}</div><div style={{ fontSize: 13, fontWeight: 600 }}>{v || '-'}</div></div>
                            ))}
                        </div>

                        {/* Status message */}
                        {regMsg && (
                            <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
                                background: regMsg.type === 'success' ? 'rgba(76,175,80,0.1)' : regMsg.type === 'error' ? 'rgba(244,67,54,0.1)' : 'rgba(153,69,255,0.1)',
                                border: `1px solid ${regMsg.type === 'success' ? 'rgba(76,175,80,0.3)' : regMsg.type === 'error' ? 'rgba(244,67,54,0.3)' : 'rgba(153,69,255,0.3)'}`,
                                color: regMsg.type === 'success' ? '#4CAF50' : regMsg.type === 'error' ? '#f44336' : '#b388ff',
                            }}>
                                {regMsg.text}
                                {regMsg.coffeeId && <div style={{ fontSize: 11, marginTop: 6, color: 'rgba(232,245,224,0.6)' }}>Coffee ID: <strong style={{ color: '#7ED44A' }}>{regMsg.coffeeId}</strong></div>}
                                {regMsg.txSig && (
                                    <a href={regMsg.explorerUrl} target="_blank" rel="noopener noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: '#b388ff', textDecoration: 'none', fontWeight: 700, padding: '5px 12px', borderRadius: 7, background: 'rgba(124,77,255,0.15)', border: '1px solid rgba(124,77,255,0.3)' }}>
                                        <IcoLink /> Lihat di Solana Explorer
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Register Form */}
                        {regMsg?.type !== 'success' && (
                            <form onSubmit={handleRegister} style={{ display: 'grid', gap: 14 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={S.lbl}>Nama Petani</label>
                                        <input style={S.inp} value={regForm.farmerName} onChange={e => setRegForm(f => ({ ...f, farmerName: e.target.value }))} placeholder="Nama petani" />
                                    </div>
                                    <div>
                                        <label style={S.lbl}>Tanggal Panen</label>
                                        <input type="date" style={S.inp} value={regForm.harvestDate} onChange={e => setRegForm(f => ({ ...f, harvestDate: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label style={S.lbl}>Metode Proses</label>
                                        <select style={S.inp} value={regForm.processMethod} onChange={e => setRegForm(f => ({ ...f, processMethod: e.target.value }))}>
                                            {PROCESS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={S.lbl}>Level Roast</label>
                                        <select style={S.inp} value={regForm.roastLevel} onChange={e => setRegForm(f => ({ ...f, roastLevel: e.target.value }))}>
                                            {ROAST_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={S.lbl}>Sertifikasi (opsional)</label>
                                    <input style={S.inp} value={regForm.certification} onChange={e => setRegForm(f => ({ ...f, certification: e.target.value }))} placeholder="Organic, Fair Trade, dll." />
                                </div>
                                <div style={{ padding: '10px 13px', borderRadius: 8, background: 'rgba(153,69,255,0.07)', border: '1px solid rgba(153,69,255,0.2)', fontSize: 12, color: 'rgba(232,245,224,0.55)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <IcoPhantom />
                                    Gas fee ~0.000005 SOL dari <strong style={{ color: '#9945FF' }}>wallet Phantom Anda</strong>
                                    {walletPK && <span style={{ marginLeft: 'auto', color: '#7ED44A', fontWeight: 700 }}>{walletBal.toFixed(4)} SOL</span>}
                                </div>
                                {walletPK ? (
                                    <button type="submit" disabled={submitting} style={{ ...S.btnP, justifyContent: 'center', padding: '12px', fontSize: 14, opacity: submitting ? 0.7 : 1 }}>
                                        {submitting ? <><IcoSpin /> Menunggu Phantom...</> : <><IcoPhantom /> Sign & Kirim ke Solana</>}
                                    </button>
                                ) : (
                                    <button type="button" onClick={handleConnect} style={{ ...S.btnP, justifyContent: 'center', padding: '12px', fontSize: 14 }}>
                                        <IcoPhantom /> Hubungkan Phantom untuk Lanjutkan
                                    </button>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
