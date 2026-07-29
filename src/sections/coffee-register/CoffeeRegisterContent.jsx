'use client';
/**
 * CoffeeRegisterContent — Unified Register Kopi + Request Log
 * Alur: Kelola Produk → status blockchain per produk → server wallet → Solana
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    isPhantomInstalled, connectPhantom, disconnectPhantom,
    getSolBalance, shortenAddress,
} from '@/lib/phantom';
import { STORE_WALLET, normalizeExplorerUrl } from '@/lib/contractConfig';
import QRButton, { BlockchainQRCard } from '@/components/BlockchainQR/BlockchainQR';

/* ── Icons ─────────────────────────────────────────────────────── */
const IcoShield  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcoWallet  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>;
const IcoLink    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const IcoCoffee  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
const IcoClose   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoCheck   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IcoEye     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
const IcoReject  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
const IcoSpin    = () => <span style={{ display:'inline-block', animation:'spin 0.8s linear infinite', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />;
const IcoPhantom = () => (
  <img src="/solana-logo.png" alt="Solana" width="16" height="16" style={{ display: 'inline-block', objectFit: 'contain', verticalAlign: 'middle' }} />
);

const PROCESS_OPTIONS = ['Washed', 'Natural', 'Honey', 'Semi-Washed', 'Wet Hulled'];
const ROAST_OPTIONS   = ['Green Bean', 'Light', 'Medium', 'Medium-Dark', 'Dark'];
const STOCK_STAGES = [
    { id: 1, name: 'Panen & Sortasi' },
    { id: 2, name: 'Pencucian & Fermentasi' },
    { id: 3, name: 'Pengeringan' },
    { id: 4, name: 'Pengupasan & Penggilingan' },
    { id: 5, name: 'Pemanggangan' },
    { id: 6, name: 'Produk Jadi & Pengemasan' },
];

/* ── Style constants ───────────────────────────────────────────── */
const S = {
    card: { background:'rgba(255,255,255,0.02)', border:'1px solid rgba(74,124,40,0.18)', borderRadius:14, padding:20 },
    inp:  { width:'100%', padding:'9px 12px', borderRadius:8, background:'var(--color-input-bg,#1C261C)', border:'1px solid var(--color-input-border,rgba(74,124,40,0.25))', color:'var(--color-text,#E8F5E0)', fontSize:13, outline:'none', boxSizing:'border-box' },
    lbl:  { fontSize:11, color:'rgba(232,245,224,0.5)', fontWeight:600, display:'block', marginBottom:5 },
    btnG: { background:'linear-gradient(135deg,#4A7C28,#7ED44A)', color:'#fff', fontWeight:700, border:'none', borderRadius:9, cursor:'pointer', padding:'10px 20px', fontSize:13, display:'inline-flex', alignItems:'center', gap:7, transition:'opacity 0.2s' },
    btnP: { background:'linear-gradient(135deg,#512da8,#9c27b0)', color:'#fff', fontWeight:700, border:'none', borderRadius:9, cursor:'pointer', padding:'10px 20px', fontSize:13, display:'inline-flex', alignItems:'center', gap:7 },
    btnDanger: { background:'rgba(244,67,54,0.12)', color:'#ff8a80', fontWeight:700, border:'1px solid rgba(244,67,54,0.35)', borderRadius:9, cursor:'pointer', padding:'10px 20px', fontSize:13, display:'inline-flex', alignItems:'center', gap:7 },
};

/* ════════════════════════════════════════════════════════════════ */
export default function CoffeeRegisterContent() {
    const { user, getToken } = useAuth();

    /* ── State ── */
    const [tab, setTab]                   = useState('products');
    const [products, setProducts]         = useState([]);
    const [traces, setTraces]             = useState([]);
    const [productionBatches, setProductionBatches] = useState([]);
    const [productionLogs, setProductionLogs] = useState([]);
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
    const [rejectingId, setRejectingId]   = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [regMsg, setRegMsg]             = useState(null);
    const [previewOpen, setPreviewOpen]   = useState(false);
    const [detailProduct, setDetailProduct] = useState(null);
    const [certificationAudit, setCertificationAudit] = useState(null);
    const [certificationAuditLoading, setCertificationAuditLoading] = useState(false);

    /* ── Log search ── */
    const [logSearch, setLogSearch]       = useState('');

    /* ── Batch on-chain (server wallet) ── */
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchResult, setBatchResult]   = useState(null);
    const [batchAudit, setBatchAudit]     = useState(null);
    const requestedProductOpenedRef       = useRef(false);

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
        const provider = window.solana;
        const handleAccountChanged = (newKey) => {
            if (newKey) setWalletPK(newKey.toString());
            else { setWalletPK(null); setWalletBal(0); }
        };
        provider?.on?.('accountChanged', handleAccountChanged);
        return () => provider?.removeListener?.('accountChanged', handleAccountChanged);
    }, []);

    /* ── Load data ── */
    const loadProducts = useCallback(async () => {
        setLoadingProd(true);
        try {
            const token = await getToken();
            const res = await fetch('/api/products', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                cache: 'no-store',
            });
            const d = await res.json();
            if (!res.ok || !d.success) throw new Error(d.message || 'Gagal memuat antrean Register Kopi');
            setProducts(d.data || []);
        } catch (error) {
            setProducts([]);
            setRegMsg({ type: 'error', text: error.message || 'Gagal memuat antrean Register Kopi' });
        }
        setLoadingProd(false);
    }, [getToken]);

    const loadTraces = useCallback(async () => {
        setLoadingTrace(true);
        try {
            const res = await fetch('/api/coffee-trace');
            const d = await res.json();
            if (d.success) setTraces(d.data || []);
        } catch { }
        setLoadingTrace(false);
    }, []);

    const loadProductionAudit = useCallback(async () => {
        try {
            const token = await getToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const [batchRes, logRes] = await Promise.all([
                fetch('/api/production-batches?scope=review', { headers, cache: 'no-store' }),
                fetch('/api/production-stages?scope=review', { headers, cache: 'no-store' }),
            ]);
            const [batchData, logData] = await Promise.all([batchRes.json(), logRes.json()]);
            if (batchData.success) setProductionBatches(batchData.data || []);
            if (logData.success) setProductionLogs(logData.data || []);
        } catch { }
    }, [getToken]);

    const loadOnchainAudit = useCallback(async () => {
        try {
            const token = await getToken();
            if (!token || !['koperasi', 'developer', 'admin'].includes(user?.role)) return;
            const res = await fetch('/api/admin/batch-onchain', {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
            });
            const data = await res.json();
            if (data.success) setBatchAudit(data);
            else setBatchAudit({ success: false, remaining: null, message: data.message });
        } catch (error) {
            setBatchAudit({ success: false, remaining: null, message: error.message });
        }
    }, [getToken, user?.role]);

    useEffect(() => { loadProducts(); loadTraces(); loadProductionAudit(); loadOnchainAudit(); }, [loadProducts, loadTraces, loadProductionAudit, loadOnchainAudit]);

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
    const openRegister = useCallback((product) => {
        setRegProduct(product);
        setRegForm({
            farmerName: product.submittedByName || user?.name || '',
            harvestDate: '', processMethod: 'Washed',
            roastLevel: product.roast?.replace(/ Roast$/, '') || 'Medium',
            certification: '',
        });
        setRegMsg(null);
        setPreviewOpen(false);
        setCertificationAudit(null);
        setCertificationAuditLoading(true);

        const token = getToken();
        fetch(`/api/certification-audit?productId=${encodeURIComponent(product.id)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: 'no-store',
        })
            .then(async response => {
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message || 'Audit sertifikasi gagal');
                setCertificationAudit(data.data);
            })
            .catch(error => {
                setCertificationAudit({
                    eligible: false,
                    criteria: [],
                    error: error.message,
                });
            })
            .finally(() => setCertificationAuditLoading(false));
    }, [getToken, user?.name]);

    useEffect(() => {
        if (requestedProductOpenedRef.current || typeof window === 'undefined' || !products.length) return;

        const requestedProductId = new URLSearchParams(window.location.search).get('productId');
        if (!requestedProductId) return;

        requestedProductOpenedRef.current = true;
        const requestedProduct = products.find(product => (
            product.id === requestedProductId
            && !product.coffeeId
            && product.status === 'pending_certification'
        ));
        if (requestedProduct) {
            openRegister(requestedProduct);
            return;
        }
        setRegMsg({
            type: 'error',
            text: 'Produk belum berada di antrean sertifikasi. Pastikan petani sudah mengajukan ulang Tahap 6.',
        });
    }, [openRegister, products]);

    /* ── Submit: server wallet sign → Solana → save to DB ── */
    async function handleRegister(e) {
        e?.preventDefault();
        if (!regProduct) return;
        if (certificationAuditLoading || certificationAudit?.eligible !== true) {
            setRegMsg({
                type: 'error',
                text: certificationAuditLoading
                    ? 'Audit sertifikasi masih berjalan. Tunggu hingga seluruh kriteria diperiksa.'
                    : 'Produk belum lolos seluruh kriteria sertifikasi. Perbaiki item yang masih gagal.',
            });
            return;
        }
        if (e) {
            setPreviewOpen(true);
            return;
        }

        setSubmitting(true); setRegMsg(null);
        try {
            const token = await getToken();
            const tracePayload = {
                productId: regProduct.id,
                name: regProduct.name,
                origin: regProduct.origin || '',
                variety: regProduct.variety || 'Arabika',
                grade: regProduct.grade || 'A',
                weightKg: regProduct.weight?.[0] || 0,
                farmerName: regForm.farmerName,
                harvestDate: regForm.harvestDate,
                processMethod: regForm.processMethod,
                roastLevel: regForm.roastLevel,
                certification: regForm.certification,
                description: regProduct.description || '',
                registeredBy: user?.id || STORE_WALLET,
                paymentWallet: STORE_WALLET,
            };

            setRegMsg({ type: 'info', text: 'Memindahkan foto dan metadata produk ke IPFS...' });
            const proofResponse = await fetch('/api/coffee-trace/proof', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(tracePayload),
            });
            const proofData = await proofResponse.json();
            if (!proofData.success || !proofData.proof?.memo) {
                throw new Error(proofData.message || 'Gagal membuat bukti IPFS');
            }

            setRegMsg({ type: 'info', text: 'Server wallet sedang menulis bukti Memo ke Solana Testnet...' });

            const res = await fetch('/api/coffee-trace', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    ...tracePayload,
                    offchainProof: proofData.proof,
                }),
            });
            const data = await res.json();

            if (data.success) {
                setPreviewOpen(false);
                setRegMsg({
                    type: 'success',
                    text: `"${regProduct.name}" berhasil terdaftar di Solana Blockchain!`,
                    coffeeId:    data.data?.coffeeId,
                    txSig:       data.data?.txSignature,
                    explorerUrl: data.data?.explorerUrl,
                });
                await Promise.all([loadProducts(), loadTraces()]);
                setTimeout(() => { setRegProduct(null); setRegMsg(null); }, 4500);
            } else {
                setPreviewOpen(false);
                setRegMsg({ type: 'error', text: data.message || 'Gagal simpan ke DB' });
            }
        } catch (err) {
            setPreviewOpen(false);
            setRegMsg({ type: 'error', text: err.message || 'Terjadi kesalahan' });
        }
        setSubmitting(false);
    }

    function openRejectConfirmation(product) {
        setRejectTarget(product);
        setRejectReason('');
        setRegMsg(null);
    }

    async function handleReject() {
        const product = rejectTarget;
        if (!product?.id) return;
        if (!rejectReason.trim()) {
            setRegMsg({ type: 'error', text: 'Alasan penolakan wajib diisi agar petani mengetahui bagian yang harus diperbaiki.' });
            return;
        }

        setRejectingId(product.id);
        try {
            const token = await getToken();
            const res = await fetch('/api/products', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    id: product.id,
                    status: 'rejected',
                    rejectedReason: rejectReason.trim(),
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Gagal menolak produk');
            setDetailProduct(null);
            setRegProduct(current => current?.id === product.id ? null : current);
            setRejectTarget(null);
            setRejectReason('');
            await loadProducts();
        } catch (err) {
            alert(err.message || 'Gagal menolak produk');
        }
        setRejectingId(null);
    }

    /* ── Batch on-chain via server wallet ── */
    async function handleBatchOnchain() {
        const expectedTotal = batchAudit?.remaining ?? unregistered.length;
        if (!window.confirm(`Tulis ulang ${expectedTotal} data yang belum valid ke Solana Testnet menggunakan Server Wallet? Proses ini membutuhkan beberapa menit.`)) return;
        setBatchLoading(true); setBatchResult(null);
        try {
            const token = await getToken();
            if (!token) throw new Error('Sesi login tidak ditemukan');

            let remaining = expectedTotal;
            let succeeded = 0;
            const results = [];
            for (let round = 0; round < 50 && remaining > 0; round += 1) {
                setBatchResult({
                    success: true,
                    message: `Backfill berjalan: ${succeeded} berhasil, sekitar ${remaining} data tersisa...`,
                    results,
                });
                const res = await fetch('/api/admin/batch-onchain', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ limit: 3 }),
                });
                const data = await res.json();
                results.push(...(data.results || []));
                succeeded += Number(data.succeeded || 0);
                remaining = Number.isFinite(Number(data.remaining)) ? Number(data.remaining) : remaining;

                if (!res.ok || Number(data.failed || 0) > 0) {
                    throw new Error(data.message || 'Sebagian data gagal ditulis ke Solana');
                }
                if (!data.processed) break;
            }

            setBatchResult({
                success: remaining === 0,
                message: remaining === 0
                    ? `Selesai! ${succeeded} data berhasil dicatat permanen di Solana Testnet.`
                    : `${succeeded} data berhasil, tetapi masih ada ${remaining} data yang perlu diproses.`,
                results,
            });
            await Promise.all([loadProducts(), loadTraces(), loadOnchainAudit()]);
        } catch (err) {
            setBatchResult(current => ({
                success: false,
                message: err.message,
                results: current?.results || [],
            }));
            await loadOnchainAudit();
        }
        setBatchLoading(false);
    }

    /* ── Derived data ── */
    const unregistered    = products.filter(p => !p.coffeeId && p.status === 'pending_certification');
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
                        <IcoShield /> Persetujuan Produk & Register Kopi
                    </h1>
                    <p style={{ fontSize: 13, color: 'rgba(232,245,224,0.45)' }}>
                        Periksa deskripsi dan foto IPFS Tahap 1-6, lalu kirim hash traceability ke <strong style={{ color: '#9945FF' }}>Solana Testnet</strong>
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
                    { label: 'Audit Belum Valid', value: batchAudit?.remaining ?? unregistered.length, color: '#FFB300' },
                    { label: 'Sudah di-Chain',  value: registered.length,  color: '#7ED44A' },
                    { label: 'Total Trace',     value: traces.length,      color: '#b388ff' },
                ].map(s => (
                    <div key={s.label} style={{ ...S.card, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 110px' }}>
                        <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: 'rgba(232,245,224,0.4)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {['koperasi', 'developer', 'admin'].includes(user?.role) && (
                <div style={{ ...S.card, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', borderColor: batchAudit?.remaining > 0 ? 'rgba(255,179,0,0.35)' : 'rgba(76,175,80,0.3)' }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#E8F5E0', marginBottom: 4 }}>
                            Audit Solana Testnet
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(232,245,224,0.55)' }}>
                            {batchAudit?.remaining == null
                                ? (batchAudit?.message || 'Memeriksa signature di RPC Solana...')
                                : `${batchAudit.remaining} data belum memiliki signature yang benar-benar terkonfirmasi di Testnet.`}
                            {batchAudit?.wallet && ` Wallet ${shortenAddress(batchAudit.wallet.signer)}: ${Number(batchAudit.wallet.balanceSol || 0).toFixed(4)} SOL.`}
                        </div>
                        {batchAudit?.counts && (
                            <div style={{ marginTop: 5, fontSize: 11, color: 'rgba(232,245,224,0.4)' }}>
                                Trace {batchAudit.counts.coffee_traces || 0} · Produk {batchAudit.counts.products || 0} · Transaksi {batchAudit.counts.transactions || 0} · Order lunas {batchAudit.counts.orders || 0}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleBatchOnchain}
                        disabled={batchLoading || !batchAudit?.remaining || batchAudit?.wallet?.ready === false}
                        style={{ ...S.btnP, opacity: batchLoading || !batchAudit?.remaining || batchAudit?.wallet?.ready === false ? 0.55 : 1 }}
                    >
                        {batchLoading ? <><IcoSpin /> Menulis ke Solana...</> : 'Perbaiki Semua Data On-Chain'}
                    </button>
                </div>
            )}

            {batchResult && (
                <div style={{ padding:'12px 14px', borderRadius:10, marginBottom:18, fontSize:13, fontWeight:600,
                    background: batchResult.success ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
                    border: `1px solid ${batchResult.success ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'}`,
                    color: batchResult.success ? '#4CAF50' : '#f44336',
                }}>
                    {batchResult.message}
                    {batchResult.results?.length > 0 && (
                        <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
                            {batchResult.results.slice(-10).map((result, index) => (
                                <div key={`${result.source}-${result.id}-${index}`} style={{ fontSize:11, color: result.status === 'success' ? '#7ED44A' : '#f44336' }}>
                                    {result.source}: {result.name} {result.status === 'success' ? '✓' : `(${result.error || 'gagal'})`}
                                    {result.explorerUrl && <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ color:'#b388ff', marginLeft:6 }}>Explorer</a>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
                    <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(126,212,74,0.08)', border: '1px solid rgba(126,212,74,0.25)', fontSize: 13, color: 'rgba(232,245,224,0.6)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <IcoWallet />
                        Biaya transaksi trace inventory dan sertifikat dibayar oleh server wallet Testnet <strong style={{ color: '#7ED44A' }}>{shortenAddress(STORE_WALLET, 8)}</strong>. Proses ini bukan payment gateway atau pembayaran checkout.
                    </div>
                    {loadingProd ? (
                        <div style={{ textAlign: 'center', padding: 48, color: 'rgba(232,245,224,0.3)' }}>Memuat produk...</div>
                    ) : (
                        <>
                            {/* Unregistered */}
                            {unregistered.length > 0 && (
                                <>
                                    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#FFB300', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFB300', display: 'inline-block' }} />
                                            Menunggu Review Admin ({unregistered.length})
                                        </div>
                                    </div>
                                    {batchResult && (
                                        <div style={{ padding:'12px 14px', borderRadius:10, marginBottom:14, fontSize:13, fontWeight:600,
                                            background: batchResult.success ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
                                            border: `1px solid ${batchResult.success ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)'}`,
                                            color: batchResult.success ? '#4CAF50' : '#f44336',
                                        }}>
                                            {batchResult.message}
                                            {batchResult.results && (
                                                <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
                                                    {batchResult.results.map(r => (
                                                        <div key={r.id} style={{ fontSize:11, color: r.status==='success' ? '#7ED44A' : '#f44336' }}>
                                                            {r.status==='success' ? '' : ''} {r.name} {r.coffeeId ? `→ ${r.coffeeId}` : r.error ? `(${r.error})` : ''}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                                                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(255,152,0,0.1)', color: '#FFB300', border: '1px solid rgba(255,152,0,0.25)', fontWeight: 700 }}> Belum di-Chain</span>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); openRegister(p); }}
                                                    style={{ ...S.btnG, width: '100%', justifyContent: 'center', padding: '9px', fontSize: 12 }}>
                                                    <IcoShield /> Setujui & Kirim ke Solana
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setDetailProduct(p); }}
                                                    style={{ marginTop: 8, width: '100%', justifyContent: 'center', padding: '8px', fontSize: 12, borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.05)', color: 'var(--color-text,#E8F5E0)', border: '1px solid rgba(126,212,74,0.25)', fontWeight: 700 }}>
                                                    <IcoEye /> Detail Produk
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); openRejectConfirmation(p); }}
                                                    disabled={rejectingId === p.id}
                                                    style={{ ...S.btnDanger, marginTop: 8, width: '100%', justifyContent: 'center', padding: '8px', fontSize: 12, opacity: rejectingId === p.id ? 0.65 : 1, cursor: rejectingId === p.id ? 'not-allowed' : 'pointer' }}>
                                                    {rejectingId === p.id ? <IcoSpin /> : <IcoReject />} Tolak
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
                                                    <span style={{ fontSize: 10, color: '#7ED44A', background: 'rgba(74,124,40,0.1)', border: '1px solid rgba(126,212,74,0.25)', padding: '2px 7px', borderRadius: 100, fontWeight: 700 }}> On-Chain</span>
                                                </div>
                                                {/* QR + Link Bukti Blockchain */}
                                                <div style={{ marginTop: 10, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                                                    <button onClick={(e) => { e.stopPropagation(); setDetailProduct(p); }}
                                                        style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'var(--color-text,#E8F5E0)', fontWeight:700, padding:'4px 10px', borderRadius:7, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(126,212,74,0.25)', cursor:'pointer' }}>
                                                        <IcoEye /> Detail
                                                    </button>
                                                    <a href={`/trace?id=${p.coffeeId}`} target="_blank" rel="noopener noreferrer"
                                                        style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, color:'#7ED44A', textDecoration:'none', fontWeight:700, padding:'4px 10px', borderRadius:7, background:'rgba(74,124,40,0.1)', border:'1px solid rgba(74,124,40,0.25)' }}>
                                                        <IcoLink /> Trace Link
                                                    </a>
                                                    <QRButton
                                                        traceUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/trace?id=${p.coffeeId}`}
                                                        coffeeId={p.coffeeId}
                                                        productName={p.name}
                                                        label="QR Bukti Trace"
                                                    />
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
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                                    {t.txSignature ? (
                                        <>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#7ED44A', padding: '3px 9px', borderRadius: 7, background: 'rgba(74,124,40,0.15)', border: '1px solid rgba(126,212,74,0.25)' }}> Verified</span>
                                            <a href={normalizeExplorerUrl(t.explorerUrl) || getExplorerTxUrl(t.txSignature)} target="_blank" rel="noopener noreferrer"
                                                style={{ fontSize: 11, color: '#b388ff', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.25)' }}>
                                                <IcoLink /> Explorer
                                            </a>
                                            <QRButton
                                                explorerUrl={normalizeExplorerUrl(t.explorerUrl) || getExplorerTxUrl(t.txSignature)}
                                                traceUrl={t.coffeeId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trace?id=${t.coffeeId}` : undefined}
                                                coffeeId={t.coffeeId}
                                                productName={t.name}
                                                label="QR"
                                            />
                                        </>
                                    ) : (
                                        <span style={{ fontSize: 11, color: '#FFB300', fontWeight: 600, padding: '4px 10px', borderRadius: 7, background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.25)' }}>Pending</span>
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

                        <CertificationChecklist
                            audit={certificationAudit}
                            loading={certificationAuditLoading}
                        />

                        <PipelineAuditPanel
                            batch={findProductBatch(regProduct, productionBatches)}
                            logs={getProductStageLogs(regProduct, productionBatches, productionLogs)}
                        />

                        {/* Status message */}
                        {regMsg && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ padding: '12px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                    background: regMsg.type === 'success' ? 'rgba(76,175,80,0.1)' : regMsg.type === 'error' ? 'rgba(244,67,54,0.1)' : 'rgba(153,69,255,0.1)',
                                    border: `1px solid ${regMsg.type === 'success' ? 'rgba(76,175,80,0.3)' : regMsg.type === 'error' ? 'rgba(244,67,54,0.3)' : 'rgba(153,69,255,0.3)'}`,
                                    color: regMsg.type === 'success' ? '#4CAF50' : regMsg.type === 'error' ? '#f44336' : '#b388ff',
                                }}>
                                    {regMsg.text}
                                    {regMsg.coffeeId && <div style={{ fontSize: 11, marginTop: 6, color: 'rgba(232,245,224,0.6)' }}>Coffee ID: <strong style={{ color: '#7ED44A' }}>{regMsg.coffeeId}</strong></div>}
                                    {(regMsg.txSig || regMsg.coffeeId) && (
                                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                                            {regMsg.txSig && (
                                                <a href={normalizeExplorerUrl(regMsg.explorerUrl)} target="_blank" rel="noopener noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#b388ff', textDecoration: 'none', fontWeight: 700, padding: '5px 12px', borderRadius: 7, background: 'rgba(124,77,255,0.15)', border: '1px solid rgba(124,77,255,0.3)' }}>
                                                    <IcoLink /> Solana Explorer
                                                </a>
                                            )}
                                            {regMsg.coffeeId && (
                                                <a href={`/trace?id=${regMsg.coffeeId}`} target="_blank" rel="noopener noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#7ED44A', textDecoration: 'none', fontWeight: 700, padding: '5px 12px', borderRadius: 7, background: 'rgba(74,124,40,0.12)', border: '1px solid rgba(74,124,40,0.3)' }}>
                                                    <IcoLink /> Lihat Trace Publik
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* QR Code Bukti Blockchain — tampil saat sukses */}
                                {regMsg.type === 'success' && (regMsg.txSig || regMsg.coffeeId) && (
                                    <div style={{ marginTop: 16 }}>
                                        <BlockchainQRCard
                                            explorerUrl={normalizeExplorerUrl(regMsg.explorerUrl) || (regMsg.txSig ? getExplorerTxUrl(regMsg.txSig) : undefined)}
                                            traceUrl={regMsg.coffeeId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trace?id=${regMsg.coffeeId}` : undefined}
                                            coffeeId={regMsg.coffeeId}
                                            productName={regProduct?.name}
                                        />
                                    </div>
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
                                        <select style={S.inp} value={regForm.processMethod} onChange={e => setRegForm(f => ({ ...f, processMethod: e.target.value }))} aria-label="Metode Proses">
                                            {PROCESS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={S.lbl}>Level Roast</label>
                                        <select style={S.inp} value={regForm.roastLevel} onChange={e => setRegForm(f => ({ ...f, roastLevel: e.target.value }))} aria-label="Level Roast">
                                            {ROAST_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={S.lbl}>Sertifikasi (opsional)</label>
                                    <input style={S.inp} value={regForm.certification} onChange={e => setRegForm(f => ({ ...f, certification: e.target.value }))} placeholder="Organic, Fair Trade, dll." />
                                </div>
                                <div style={{ padding: '10px 13px', borderRadius: 8, background: 'rgba(126,212,74,0.07)', border: '1px solid rgba(126,212,74,0.2)', fontSize: 12, color: 'rgba(232,245,224,0.55)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <IcoWallet />
                                    Gas fee Memo dibayar otomatis oleh <strong style={{ color: '#7ED44A' }}>server wallet Testnet</strong>
                                </div>
                                <button type="button" onClick={() => setPreviewOpen(true)}
                                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text,#E8F5E0)', fontWeight: 700, border: '1px solid rgba(126,212,74,0.25)', borderRadius: 9, cursor: 'pointer', padding: '10px 14px', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                                    <IcoEye /> Lihat Semua Data
                                </button>
                                <button type="submit" disabled={submitting || certificationAuditLoading || certificationAudit?.eligible !== true} style={{ ...S.btnP, justifyContent: 'center', padding: '12px', fontSize: 14, opacity: submitting || certificationAuditLoading || certificationAudit?.eligible !== true ? 0.55 : 1 }}>
                                    {submitting ? <><IcoSpin /> Menulis Memo...</> : <><IcoEye /> Periksa & Ajukan Sertifikat</>}
                                </button>
                            </form>
                        )}

                        {previewOpen && (
                            <div className="cr-overlay" style={{ zIndex: 360, padding: 12 }} onClick={() => { if (!submitting) setPreviewOpen(false); }}>
                                <div className="cr-modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 800, color: '#E8F5E0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <IcoEye /> Preview Data Register
                                            </div>
                                            <div style={{ fontSize: 12, color: 'rgba(232,245,224,0.45)', marginTop: 3 }}>Periksa data sebelum server wallet menulis Memo.</div>
                                        </div>
                                        <button type="button" disabled={submitting} onClick={() => setPreviewOpen(false)}
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: 'rgba(232,245,224,0.7)', cursor: 'pointer' }}>
                                            <IcoClose />
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, alignItems: 'start' }}>
                                        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(74,124,40,0.25)', background: 'rgba(74,124,40,0.08)', minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {regProduct.image ? (
                                                <img src={regProduct.image} alt={regProduct.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ color: 'rgba(126,212,74,0.45)', display: 'grid', placeItems: 'center', gap: 6 }}>
                                                    <IcoCoffee />
                                                    <span style={{ fontSize: 12 }}>Belum ada foto</span>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                                            {[
                                                ['Nama Produk', regProduct.name],
                                                ['Asal', regProduct.origin],
                                                ['Varietas', regProduct.variety],
                                                ['Grade', regProduct.grade],
                                                ['Roast Produk', regProduct.roast],
                                                ['Stok', `${regProduct.stock ?? 0} unit`],
                                                ['Ukuran', Array.isArray(regProduct.weight) ? regProduct.weight.map(w => `${w}g`).join(', ') : '-'],
                                                ['Harga', Array.isArray(regProduct.pricePerUnit) ? regProduct.pricePerUnit.map(v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`).join(', ') : '-'],
                                                ['Stok per Ukuran', Array.isArray(regProduct.stockPerUnit) ? regProduct.stockPerUnit.map((stock, index) => `${regProduct.weight?.[index] || '-'}g: ${stock} unit`).join(', ') : `${regProduct.stock ?? 0} unit total`],
                                                ['Nama Petani', regForm.farmerName || '-'],
                                                ['Tanggal Panen', regForm.harvestDate || '-'],
                                                ['Metode Proses', regForm.processMethod],
                                                ['Level Roast', regForm.roastLevel],
                                                ['Sertifikasi', regForm.certification || '-'],
                                            ].map(([label, value]) => (
                                                <div key={label} style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(74,124,40,0.2)', borderRadius: 9, padding: 10 }}>
                                                    <div style={{ color: 'rgba(232,245,224,0.45)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                                                    <div style={{ color: '#E8F5E0', fontSize: 13, fontWeight: 700, wordBreak: 'break-word' }}>{value || '-'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {regProduct.description && (
                                        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(74,124,40,0.2)' }}>
                                            <div style={{ color: 'rgba(232,245,224,0.45)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 5 }}>Deskripsi</div>
                                            <div style={{ color: '#E8F5E0', fontSize: 13 }}>{regProduct.description}</div>
                                        </div>
                                    )}

                                    <div style={{ marginTop: 14, padding: '11px 13px', borderRadius: 10, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', color: 'rgba(255,236,193,0.82)', fontSize: 12, lineHeight: 1.55 }}>
                                        Pastikan seluruh data sudah benar. Setelah signature sertifikat tersimpan, signature tersebut tidak akan diganti.
                                    </div>
                                    <button type="button" disabled={submitting || certificationAuditLoading || certificationAudit?.eligible !== true} onClick={() => handleRegister()} style={{ ...S.btnG, marginTop: 12, width: '100%', justifyContent: 'center', opacity: submitting || certificationAuditLoading || certificationAudit?.eligible !== true ? 0.55 : 1 }}>
                                        {submitting ? <><IcoSpin /> Menulis ke Solana...</> : <><IcoShield /> Data Benar, Setujui & Kirim ke Solana</>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {detailProduct && (
                <div className="cr-overlay" style={{ zIndex: 340 }} onClick={() => setDetailProduct(null)}>
                    <div className="cr-modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#E8F5E0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <IcoEye /> Detail Produk
                                </div>
                                <div style={{ fontSize: 12, color: 'rgba(232,245,224,0.45)', marginTop: 3 }}>
                                    Data dari Kelola Produk untuk dicek sebelum on-chain.
                                </div>
                            </div>
                            <button type="button" onClick={() => setDetailProduct(null)}
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: 'rgba(232,245,224,0.7)', cursor: 'pointer' }}>
                                <IcoClose />
                            </button>
                        </div>

                        <ProductDetailView
                            product={detailProduct}
                            batch={findProductBatch(detailProduct, productionBatches)}
                            logs={getProductStageLogs(detailProduct, productionBatches, productionLogs)}
                        />

                        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                            {!detailProduct.coffeeId && (
                                <button type="button" onClick={() => { openRegister(detailProduct); setDetailProduct(null); }}
                                    style={{ ...S.btnG, flex: '1 1 220px', justifyContent: 'center' }}>
                                    <IcoShield /> Setujui & Kirim ke Solana
                                </button>
                            )}
                            {!detailProduct.coffeeId && (
                                <button type="button" onClick={() => openRejectConfirmation(detailProduct)}
                                    disabled={rejectingId === detailProduct.id}
                                    style={{ ...S.btnDanger, flex: '1 1 160px', justifyContent: 'center', opacity: rejectingId === detailProduct.id ? 0.65 : 1, cursor: rejectingId === detailProduct.id ? 'not-allowed' : 'pointer' }}>
                                    {rejectingId === detailProduct.id ? <IcoSpin /> : <IcoReject />} Tolak
                                </button>
                            )}
                            {detailProduct.coffeeId && (
                                <a href={`/trace?id=${detailProduct.coffeeId}`} target="_blank" rel="noopener noreferrer"
                                    style={{ ...S.btnG, flex: '1 1 220px', justifyContent: 'center', textDecoration: 'none' }}>
                                    <IcoLink /> Buka Trace
                                </a>
                            )}
                            <button type="button" onClick={() => setDetailProduct(null)}
                                style={{ flex: '1 1 160px', padding: '10px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', color: '#E8F5E0', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 700, cursor: 'pointer' }}>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {rejectTarget && (
                <div className="cr-overlay" style={{ zIndex: 380 }} onClick={event => { if (event.target === event.currentTarget && !rejectingId) setRejectTarget(null); }}>
                    <div className="cr-modal" role="alertdialog" aria-modal="true" aria-labelledby="reject-product-title" style={{ maxWidth: 520 }} onClick={event => event.stopPropagation()}>
                        <div style={{ color: '#ff8a80', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 7 }}>Konfirmasi Penolakan</div>
                        <h2 id="reject-product-title" style={{ color: '#E8F5E0', fontSize: 20, margin: 0 }}>Yakin ingin menolak produk ini?</h2>
                        <p style={{ color: 'rgba(232,245,224,0.55)', fontSize: 13, lineHeight: 1.6, margin: '9px 0 14px' }}>
                            Produk <strong style={{ color: '#E8F5E0' }}>{rejectTarget.name}</strong> akan dikembalikan kepada petani untuk memperbaiki pipeline Tahap 1-6.
                        </p>
                        <label style={S.lbl}>Alasan penolakan *</label>
                        <textarea
                            value={rejectReason}
                            onChange={event => setRejectReason(event.target.value)}
                            placeholder="Jelaskan data, deskripsi, atau foto tahap yang harus diperbaiki."
                            style={{ ...S.inp, minHeight: 105, resize: 'vertical' }}
                            disabled={!!rejectingId}
                        />
                        {regMsg?.type === 'error' && <div style={{ color: '#ff8a80', fontSize: 12, marginTop: 8 }}>{regMsg.text}</div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => setRejectTarget(null)} disabled={!!rejectingId} style={{ padding: '10px 18px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', color: '#E8F5E0', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 700, cursor: 'pointer' }}>Kembali</button>
                            <button type="button" onClick={handleReject} disabled={!!rejectingId || !rejectReason.trim()} style={{ ...S.btnDanger, opacity: rejectingId || !rejectReason.trim() ? 0.6 : 1 }}>
                                {rejectingId ? <IcoSpin /> : <IcoReject />} Ya, Tolak Produk
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProductDetailView({ product, batch, logs = [] }) {
    const weights = Array.isArray(product.weight) ? product.weight : [];
    const prices = Array.isArray(product.pricePerUnit) ? product.pricePerUnit : [];
    const rows = [
        ['Nama Produk', product.name],
        ['Asal', product.origin],
        ['Varietas', product.variety],
        ['Grade', product.grade],
        ['Roast', product.roast],
        ['Stok', `${product.stock ?? 0} unit`],
        ['Coffee ID', product.coffeeId || 'Belum terdaftar'],
        ['Status', product.status || 'published'],
        ['Ukuran', weights.length ? weights.map(w => `${w}g`).join(', ') : '-'],
        ['Harga', prices.length ? prices.map(v => `Rp ${Number(v || 0).toLocaleString('id-ID')}`).join(', ') : '-'],
        ['Diajukan Oleh', product.submittedByName || '-'],
        ['Role Pengaju', product.submittedByRole || '-'],
    ];

    return (
        <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, alignItems: 'start' }}>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(74,124,40,0.25)', background: 'rgba(74,124,40,0.08)', minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {product.image ? (
                        <img src={product.image} alt={product.name} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                    ) : (
                        <div style={{ color: 'rgba(126,212,74,0.45)', display: 'grid', placeItems: 'center', gap: 6 }}>
                            <IcoCoffee />
                            <span style={{ fontSize: 12 }}>Belum ada foto</span>
                        </div>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
                    {rows.map(([label, value]) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(74,124,40,0.2)', borderRadius: 9, padding: 10 }}>
                            <div style={{ color: 'rgba(232,245,224,0.45)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                            <div style={{ color: '#E8F5E0', fontSize: 13, fontWeight: 700, wordBreak: 'break-word' }}>{value || '-'}</div>
                        </div>
                    ))}
                </div>
            </div>

            {product.description && (
                <div style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(74,124,40,0.2)' }}>
                    <div style={{ color: 'rgba(232,245,224,0.45)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 5 }}>Tulisan/Deskripsi</div>
                    <div style={{ color: '#E8F5E0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{product.description}</div>
                </div>
            )}

            {Array.isArray(product.tags) && product.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {product.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 11, color: '#7ED44A', background: 'rgba(74,124,40,0.14)', border: '1px solid rgba(126,212,74,0.25)', borderRadius: 999, padding: '3px 9px', fontWeight: 700 }}>
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <div style={{ paddingTop: 4 }}>
                <div style={{ color: '#E8F5E0', fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Batch Produksi 1-6</div>
                {batch ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8, marginBottom: 12 }}>
                        {[
                            ['Nama Batch', batch.name],
                            ['Asal Panen', batch.origin],
                            ['Varietas', batch.variety],
                            ['Grade', batch.grade],
                            ['Berat Awal', batch.weightKg ? `${batch.weightKg} kg` : '-'],
                            ['Tahap Saat Ini', batch.currentStage],
                        ].map(([label, value]) => (
                            <div key={label} style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(74,124,40,0.2)', borderRadius: 9, padding: 10 }}>
                                <div style={{ color: 'rgba(232,245,224,0.45)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                                <div style={{ color: '#E8F5E0', fontSize: 13, fontWeight: 700, wordBreak: 'break-word' }}>{value || '-'}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ color: 'rgba(232,245,224,0.45)', fontSize: 12, marginBottom: 10 }}>
                        Produk ini belum punya riwayat batch dari Kelola Stok.
                    </div>
                )}

                <div style={{ display: 'grid', gap: 10 }}>
                    {STOCK_STAGES.map(stage => {
                        const log = logs.find(item => Number(item.stage) === stage.id);
                        return (
                            <div key={stage.id} style={{ border: '1px solid rgba(74,124,40,0.22)', borderRadius: 10, padding: 12, background: log ? 'rgba(74,124,40,0.08)' : 'rgba(255,255,255,0.025)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: log ? 10 : 0 }}>
                                    <div style={{ color: '#E8F5E0', fontSize: 13, fontWeight: 800 }}>{stage.id}. {stage.name}</div>
                                    <span style={{ fontSize: 11, color: log ? '#7ED44A' : '#FFB300', fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: log ? 'rgba(74,124,40,0.16)' : 'rgba(255,152,0,0.1)', border: `1px solid ${log ? 'rgba(126,212,74,0.25)' : 'rgba(255,152,0,0.25)'}` }}>
                                        {log ? (log.explorerUrl ? 'Sertifikat' : 'Terisi') : 'Belum ada'}
                                    </span>
                                </div>
                                {log && (
                                    <div style={{ display: 'grid', gap: 10 }}>
                                        {log.photoUrl && (
                                            <a href={log.photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                                <img src={log.photoUrl} alt={`Bukti ${stage.name}`} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(74,124,40,0.25)' }} />
                                            </a>
                                        )}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
                                            {Object.entries(log.data || {})
                                                .filter(([, value]) => value !== null && value !== undefined && value !== '')
                                                .map(([key, value]) => (
                                                    <div key={key} style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(74,124,40,0.16)', borderRadius: 8, padding: 8 }}>
                                                        <div style={{ color: 'rgba(232,245,224,0.42)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>{formatAuditKey(key)}</div>
                                                        <div style={{ color: '#E8F5E0', fontSize: 12, fontWeight: 700, wordBreak: 'break-word' }}>{formatAuditValue(value)}</div>
                                                    </div>
                                                ))}
                                        </div>
                                        {log.explorerUrl && (
                                            <a href={normalizeExplorerUrl(log.explorerUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#b388ff', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>
                                                Buka Sertifikat Solana
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function CertificationChecklist({ audit, loading }) {
    const eligible = audit?.eligible === true;
    return (
        <div style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 11,
            background: eligible ? 'rgba(76,175,80,0.07)' : 'rgba(255,152,0,0.07)',
            border: `1px solid ${eligible ? 'rgba(76,175,80,0.28)' : 'rgba(255,152,0,0.28)'}`,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <div>
                    <div style={{ color: '#E8F5E0', fontSize: 14, fontWeight: 900 }}>Checklist Kelayakan Sertifikasi</div>
                    <div style={{ color: 'rgba(232,245,224,0.5)', fontSize: 11, marginTop: 2 }}>
                        Seluruh kontrol wajib lulus sebelum server membuat transaksi Solana.
                    </div>
                </div>
                <span style={{
                    borderRadius: 999,
                    padding: '4px 9px',
                    color: eligible ? '#7ED44A' : '#FFB300',
                    background: eligible ? 'rgba(76,175,80,0.12)' : 'rgba(255,152,0,0.12)',
                    fontSize: 10,
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                }}>
                    {loading ? 'Memeriksa...' : eligible ? 'LAYAK' : 'BELUM LAYAK'}
                </span>
            </div>

            {audit?.error && (
                <div style={{ color: '#ff8a80', fontSize: 12 }}>{audit.error}</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 8 }}>
                {(audit?.criteria || []).map(item => (
                    <div key={item.id} style={{
                        display: 'flex',
                        gap: 8,
                        padding: 9,
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.12)',
                        border: `1px solid ${item.passed ? 'rgba(126,212,74,0.18)' : 'rgba(244,67,54,0.2)'}`,
                    }}>
                        <span style={{
                            color: item.passed ? '#7ED44A' : '#ff8a80',
                            fontSize: 10,
                            fontWeight: 900,
                            paddingTop: 1,
                        }}>
                            {item.passed ? 'OK' : 'FAIL'}
                        </span>
                        <div>
                            <div style={{ color: '#E8F5E0', fontSize: 11, fontWeight: 800 }}>{item.label}</div>
                            <div style={{ color: 'rgba(232,245,224,0.46)', fontSize: 10, lineHeight: 1.4, marginTop: 2 }}>{item.detail}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PipelineAuditPanel({ batch, logs = [], compact = false }) {
    return (
        <div style={{ paddingTop: compact ? 0 : 4, marginBottom: compact ? 18 : 0 }}>
            <div style={{ color: '#E8F5E0', fontSize: compact ? 13 : 15, fontWeight: 800, marginBottom: 8 }}>
                Pipeline Produksi 1-6
            </div>
            {batch ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8, marginBottom: 12 }}>
                    {[
                        ['Batch', batch.name],
                        ['Asal Panen', batch.origin],
                        ['Varietas', batch.variety],
                        ['Grade', batch.grade],
                        ['Berat Awal', batch.weightKg ? `${batch.weightKg} kg` : '-'],
                        ['Tahap Saat Ini', batch.currentStage],
                    ].map(([label, value]) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(74,124,40,0.2)', borderRadius: 9, padding: 9 }}>
                            <div style={{ color: 'rgba(232,245,224,0.45)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                            <div style={{ color: '#E8F5E0', fontSize: 12, fontWeight: 700, wordBreak: 'break-word' }}>{value || '-'}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ color: 'rgba(232,245,224,0.45)', fontSize: 12, marginBottom: 10 }}>
                    Produk ini belum punya riwayat batch dari Kelola Stok.
                </div>
            )}

            <div style={{ display: 'grid', gap: 8, maxHeight: compact ? 320 : undefined, overflow: compact ? 'auto' : undefined, paddingRight: compact ? 4 : 0 }}>
                {STOCK_STAGES.map(stage => {
                    const log = logs.find(item => Number(item.stage) === stage.id);
                    return (
                        <div key={stage.id} style={{ border: '1px solid rgba(74,124,40,0.22)', borderRadius: 10, padding: compact ? 10 : 12, background: log ? 'rgba(74,124,40,0.08)' : 'rgba(255,255,255,0.025)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: log ? 8 : 0 }}>
                                <div style={{ color: '#E8F5E0', fontSize: 12, fontWeight: 800 }}>{stage.id}. {stage.name}</div>
                                <span style={{ fontSize: 10, color: log ? '#7ED44A' : '#FFB300', fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: log ? 'rgba(74,124,40,0.16)' : 'rgba(255,152,0,0.1)', border: `1px solid ${log ? 'rgba(126,212,74,0.25)' : 'rgba(255,152,0,0.25)'}` }}>
                                    {log ? (log.photoUrl ? 'Foto lengkap' : 'Terisi') : 'Belum ada'}
                                </span>
                            </div>
                            {log && (
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {log.photoUrl && (
                                        <a href={log.photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                            <img src={log.photoUrl} alt={`Bukti ${stage.name}`} style={{ width: '100%', maxHeight: compact ? 120 : 180, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(74,124,40,0.25)' }} />
                                        </a>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 7 }}>
                                        {Object.entries(log.data || {})
                                            .filter(([, value]) => value !== null && value !== undefined && value !== '')
                                            .slice(0, compact ? 6 : undefined)
                                            .map(([key, value]) => (
                                                <div key={key} style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(74,124,40,0.16)', borderRadius: 8, padding: 8 }}>
                                                    <div style={{ color: 'rgba(232,245,224,0.42)', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>{formatAuditKey(key)}</div>
                                                    <div style={{ color: '#E8F5E0', fontSize: 12, fontWeight: 700, wordBreak: 'break-word' }}>{formatAuditValue(value)}</div>
                                                </div>
                                            ))}
                                    </div>
                                    {log.explorerUrl && (
                                        <a href={normalizeExplorerUrl(log.explorerUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#b388ff', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>
                                            Buka Sertifikat Solana
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function findProductBatch(product, batches) {
    if (!product) return null;
    return (batches || []).find(batch =>
        batch.productId === product.id ||
        (product.coffeeId && batch.coffeeId === product.coffeeId)
    ) || null;
}

function getProductStageLogs(product, batches, logs) {
    const batch = findProductBatch(product, batches);
    if (!batch) return [];
    return (logs || [])
        .filter(log => log.batchId === batch.id)
        .sort((a, b) => Number(a.stage) - Number(b.stage));
}

function formatAuditKey(key) {
    const labels = {
        notes: 'Catatan',
        processMethod: 'Metode Proses',
        moisturePercent: 'Kadar Air Akhir',
        operator: 'Operator',
        durationMinutes: 'Durasi',
        weightIn: 'Berat Masuk',
        weightOut: 'Berat Keluar',
        suhu: 'Suhu',
        levelRoast: 'Level Roast',
        ukuranGiling: 'Ukuran Giling',
        gasReleaseHours: 'Pelepasan Gas',
        productName: 'Nama Produk',
        stock: 'Stok',
        weights: 'Berat Kemasan',
        pricePerUnit: 'Harga',
        description: 'Deskripsi',
        roast: 'Roast',
        image: 'Foto',
    };
    return labels[key] || key.replace(/[A-Z]/g, letter => ` ${letter}`).trim();
}

function formatAuditValue(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}
