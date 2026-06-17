'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IconQr = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" /><rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" /><rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" /><path d="M14 14h3v3h-3zM19 19h2M14 21h3M21 14v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
const IconArrow = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function ReceiptQR({ value }) {
    const [src, setSrc] = useState('');

    useEffect(() => {
        let alive = true;
        if (!value) return;
        import('qrcode')
            .then(mod => mod.default.toDataURL(value, {
                width: 220,
                margin: 2,
                color: { dark: '#111827', light: '#ffffff' },
            }))
            .then(url => { if (alive) setSrc(url); })
            .catch(() => { if (alive) setSrc(''); });
        return () => { alive = false; };
    }, [value]);

    return (
        <div style={{ width: 220, height: 220, borderRadius: 14, background: '#fff', display: 'grid', placeItems: 'center', padding: 12, boxShadow: '0 18px 50px rgba(0,0,0,0.28)' }}>
            {src ? <img src={src} alt="QR Receipt" style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} /> : <span style={{ color: '#52624d', fontSize: 12 }}>Memuat QR...</span>}
        </div>
    );
}

function formatMoney(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDate(value) {
    if (!value) return '-';
    return new Date(String(value).replace(' ', 'T')).toLocaleString('id-ID');
}

function paymentLabel(method) {
    if (method === 'midtrans') return 'Midtrans';
    if (method === 'transfer') return 'Transfer SOL';
    if (method === 'qr') return 'Solana Pay QR';
    if (method === 'transfer-idr') return 'Transfer IDR';
    if (method === 'qr-idr') return 'QR IDR';
    return method || '-';
}

function ReceiptContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [syncingTrace, setSyncingTrace] = useState(false);
    const [traceSyncAttempted, setTraceSyncAttempted] = useState(false);

    useEffect(() => {
        let alive = true;
        async function loadReceipt() {
            if (!orderId) {
                setError('Order ID tidak ditemukan.');
                setLoading(false);
                return;
            }
            try {
                const res = await fetch(`/api/public/receipt?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
                const json = await res.json();
                if (!json.success) throw new Error(json.message || 'Receipt tidak ditemukan');
                if (alive) setData(json.data);
            } catch (err) {
                if (alive) setError(err.message || 'Gagal memuat receipt');
            } finally {
                if (alive) setLoading(false);
            }
        }
        loadReceipt();
        return () => { alive = false; };
    }, [orderId]);

    useEffect(() => {
        let alive = true;
        const order = data?.order;
        const hasTrace = Boolean(data?.trace?.txSignature || order?.txSignature || data?.trace?.coffeeId || order?.coffeeId);
        if (!order?.orderId || order.paymentMethod !== 'midtrans' || hasTrace || syncingTrace || traceSyncAttempted) return;

        async function syncMidtransTrace() {
            setTraceSyncAttempted(true);
            setSyncingTrace(true);
            try {
                await fetch(`/api/midtrans/status?orderId=${encodeURIComponent(order.orderId)}`, { cache: 'no-store' });
                const res = await fetch(`/api/public/receipt?orderId=${encodeURIComponent(order.orderId)}`, { cache: 'no-store' });
                const json = await res.json();
                if (alive && json.success) setData(json.data);
            } catch {
                // Receipt still renders the payment data even if trace sync is delayed.
            } finally {
                if (alive) setSyncingTrace(false);
            }
        }

        syncMidtransTrace();
        return () => { alive = false; };
    }, [data, syncingTrace, traceSyncAttempted]);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const order = data?.order;
    const trace = data?.trace;
    const receiptUrl = useMemo(() => order?.orderId ? `${origin}/receipt?orderId=${encodeURIComponent(order.orderId)}` : '', [origin, order?.orderId]);
    const traceUrl = trace?.traceUrl ? `${origin}${trace.traceUrl}` : order?.traceUrl ? `${origin}${order.traceUrl}` : '';
    const qrTarget = traceUrl || receiptUrl;
    const txSignature = trace?.txSignature || order?.txSignature;
    const explorerUrl = trace?.explorerUrl || order?.explorerUrl;
    const coffeeId = trace?.coffeeId || order?.coffeeId;

    return (
        <main style={{ minHeight: '100vh', background: 'var(--color-bg, #030d06)', color: 'var(--color-text, #E8F5E0)', padding: '48px 18px', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <div style={{ width: 'min(980px, 100%)', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                    <Link href="/" style={{ color: '#7ED44A', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>CoffeeChain</Link>
                    <Link href="/" style={{ color: 'var(--color-text-muted, rgba(232,245,224,0.55))', fontSize: 13, textDecoration: 'none' }}>Kembali ke Landing</Link>
                </div>

                {loading ? (
                    <div style={{ padding: 42, border: '1px solid var(--color-border, rgba(74,124,40,0.25))', borderRadius: 16, background: 'var(--color-bg-card, rgba(255,255,255,0.03))', textAlign: 'center' }}>Memuat receipt...</div>
                ) : error ? (
                    <div style={{ padding: 42, border: '1px solid rgba(244,67,54,0.35)', borderRadius: 16, background: 'rgba(244,67,54,0.08)', textAlign: 'center', color: '#ff8a80', fontWeight: 800 }}>{error}</div>
                ) : (
                    <section style={{ border: '1px solid var(--color-border, rgba(74,124,40,0.25))', borderRadius: 18, background: 'var(--color-bg-surface, #101a10)', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '24px clamp(18px, 4vw, 36px)', borderBottom: '1px solid var(--color-border, rgba(74,124,40,0.18))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#7ED44A', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
                                    <IconCheck /> Pembayaran Berhasil
                                </div>
                                <h1 style={{ marginTop: 10, fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.05, letterSpacing: 0 }}>Receipt Transaksi</h1>
                                <p style={{ color: 'var(--color-text-muted, rgba(232,245,224,0.55))', marginTop: 8, fontSize: 14 }}>Order {order.orderId}</p>
                            </div>
                            <ReceiptQR value={qrTarget} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 0 }}>
                            <div style={{ padding: '28px clamp(18px, 4vw, 36px)', borderRight: '1px solid var(--color-border, rgba(74,124,40,0.18))' }}>
                                <h2 style={{ fontSize: 18, marginBottom: 16 }}>Detail Pembelian</h2>
                                {[
                                    ['Produk', order.productName],
                                    ['Metode', paymentLabel(order.paymentMethod)],
                                    ['Jumlah', `${order.quantity || 1} x ${order.weight || '-'}g`],
                                    ['Total', formatMoney(order.totalPrice)],
                                    ['Dibuat', formatDate(order.createdAt)],
                                    ['Dibayar', formatDate(order.paidAt)],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '11px 0', borderBottom: '1px solid var(--color-border, rgba(74,124,40,0.12))', fontSize: 14 }}>
                                        <span style={{ color: 'var(--color-text-muted, rgba(232,245,224,0.5))' }}>{label}</span>
                                        <strong style={{ textAlign: 'right', wordBreak: 'break-word' }}>{value || '-'}</strong>
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '28px clamp(18px, 4vw, 36px)' }}>
                                <h2 style={{ fontSize: 18, marginBottom: 16 }}>Trace & QR</h2>
                                <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
                                    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(126,212,74,0.08)', border: '1px solid rgba(126,212,74,0.22)' }}>
                                        <div style={{ color: '#7ED44A', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 5 }}>Coffee ID</div>
                                        <div style={{ fontFamily: 'monospace', fontWeight: 800 }}>{coffeeId || 'Belum tersedia'}</div>
                                    </div>
                                    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(153,69,255,0.08)', border: '1px solid rgba(153,69,255,0.24)' }}>
                                        <div style={{ color: '#b388ff', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 5 }}>Solana Signature</div>
                                        <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.45 }}>{txSignature || (syncingTrace ? 'Sinkronisasi trace on-chain...' : 'Menunggu trace on-chain')}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
                                    {traceUrl && (
                                        <a href={traceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#4A7C28,#7ED44A)', color: '#fff', fontWeight: 900, textDecoration: 'none' }}>
                                            <IconQr /> Buka Trace Sertifikasi <IconArrow />
                                        </a>
                                    )}
                                    {explorerUrl && (
                                        <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(153,69,255,0.35)', color: '#b388ff', fontWeight: 900, textDecoration: 'none' }}>
                                            Solana Explorer <IconArrow />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}

export default function ReceiptPage() {
    return (
        <Suspense fallback={<main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Memuat receipt...</main>}>
            <ReceiptContent />
        </Suspense>
    );
}
