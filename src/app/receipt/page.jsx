'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { downloadReceiptPdf } from '@/lib/receiptPdf';
import ReceiptLoading from './ReceiptLoading';

const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IconArrow = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IconDownload = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

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

async function fetchReceiptData(orderId) {
    const res = await fetch(`/api/public/receipt?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
        const error = new Error(json.message || 'Receipt tidak ditemukan');
        error.status = res.status;
        error.payload = json;
        throw error;
    }
    return json.data;
}

async function syncMidtransReceipt(orderId, token) {
    if (!token) throw new Error('Silakan login kembali untuk menyinkronkan pembayaran');
    const res = await fetch(`/api/midtrans/status?orderId=${encodeURIComponent(orderId)}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
        const error = new Error(json.message || 'Gagal sinkronisasi pembayaran Midtrans');
        error.status = res.status;
        throw error;
    }
    return json.data;
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ReceiptContent() {
    const searchParams = useSearchParams();
    const { getToken } = useAuth();
    const orderId = searchParams.get('orderId');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [syncingTrace, setSyncingTrace] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);

    useEffect(() => {
        let alive = true;
        async function loadReceipt() {
            if (!orderId) {
                setError('Order ID tidak ditemukan.');
                setLoading(false);
                return;
            }
            try {
                const receipt = await fetchReceiptData(orderId);
                if (alive) setData(receipt);
            } catch (err) {
                if (err.status === 402) {
                    try {
                        const status = await syncMidtransReceipt(orderId, getToken());
                        if (status?.status === 'paid') {
                            const retryDelays = [400, 900, 1600, 2600];
                            for (const delay of retryDelays) {
                                await wait(delay);
                                try {
                                    const receipt = await fetchReceiptData(orderId);
                                    if (alive) {
                                        setData(receipt);
                                        setError('');
                                    }
                                    return;
                                } catch (retryErr) {
                                    if (retryErr.status !== 402 && retryErr.status !== 404) throw retryErr;
                                }
                            }
                        }

                        const message = status?.paymentInstruction || status?.midtransStatusMessage || err.message;
                        if (alive) setError(message || 'Pembayaran masih menunggu konfirmasi.');
                    } catch (syncErr) {
                        if (alive) setError(syncErr.message || err.message || 'Gagal memuat receipt');
                    }
                } else if (alive) {
                    setError(err.message || 'Gagal memuat receipt');
                }
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
        const hasPaymentTrace = Boolean(order?.txSignature);
        if (!order?.orderId || order.paymentMethod !== 'midtrans' || hasPaymentTrace) return;

        async function syncMidtransTrace() {
            setSyncingTrace(true);
            try {
                const token = getToken();
                const statusSync = syncMidtransReceipt(order.orderId, token).catch(error => error);

                // Solana Testnet dapat membutuhkan beberapa detik untuk confirmed/finalized.
                // Poll receipt secara terpisah agar signature langsung tampil begitu tersimpan.
                for (let attempt = 0; attempt < 45 && alive; attempt += 1) {
                    if (attempt > 0) await wait(2000);
                    try {
                        const receipt = await fetchReceiptData(order.orderId);
                        if (!alive) return;
                        setData(receipt);
                        if (receipt?.order?.txSignature) return;
                    } catch {
                        // Status Midtrans tetap berjalan; coba receipt lagi pada interval berikutnya.
                    }
                }

                await statusSync;
                const receipt = await fetchReceiptData(order.orderId);
                if (alive) setData(receipt);
            } catch (syncError) {
                if (alive) {
                    setData(current => current ? {
                        ...current,
                        order: {
                            ...current.order,
                            solanaTraceError: syncError.message || 'Sinkronisasi Solana belum selesai',
                        },
                    } : current);
                }
            } finally {
                if (alive) setSyncingTrace(false);
            }
        }

        syncMidtransTrace();
        return () => { alive = false; };
    }, [data?.order?.orderId, data?.order?.paymentMethod, data?.order?.txSignature]);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const order = data?.order;
    const receiptUrl = useMemo(() => order?.orderId ? `${origin}/receipt?orderId=${encodeURIComponent(order.orderId)}` : '', [origin, order?.orderId]);
    const qrTarget = receiptUrl;
    const txSignature = order?.txSignature || null;
    const explorerUrl = order?.explorerUrl || null;
    const coffeeId = order?.coffeeId;
    const certificationUrl = coffeeId
        ? `${origin}/trace?id=${encodeURIComponent(coffeeId)}`
        : null;

    async function handleDownloadPdf() {
        if (!order || !receiptUrl || downloadingPdf) return;
        setDownloadingPdf(true);
        try {
            await downloadReceiptPdf({
                order,
                receiptUrl,
                certificationUrl,
                explorerUrl,
            });
        } catch (pdfError) {
            alert(pdfError.message || 'Gagal membuat PDF receipt');
        } finally {
            setDownloadingPdf(false);
        }
    }

    return (
        <main style={{ minHeight: '100vh', background: 'var(--color-bg, #030d06)', color: 'var(--color-text, #E8F5E0)', padding: '48px 18px', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <div style={{ width: 'min(980px, 100%)', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                    <Link href="/" style={{ color: '#7ED44A', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>CoffeeChain</Link>
                    <Link href="/" style={{ color: 'var(--color-text-muted, rgba(232,245,224,0.55))', fontSize: 13, textDecoration: 'none' }}>Kembali ke Landing</Link>
                </div>

                {loading ? (
                    <ReceiptLoading />
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
                                    ['Subtotal', formatMoney(order.subtotalPrice ?? order.totalPrice)],
                                    ['Biaya trace Solana', formatMoney(order.solanaTraceFee)],
                                    [`PPN Indonesia ${Number(order.ppnRate || 0) * 100}%`, formatMoney(order.ppnAmount)],
                                    ['Total dibayar', formatMoney(order.totalPrice)],
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
                                <h2 style={{ fontSize: 18, marginBottom: 16 }}>Trace Pembayaran & QR Receipt</h2>
                                <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
                                    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(126,212,74,0.08)', border: '1px solid rgba(126,212,74,0.22)' }}>
                                        <div style={{ color: '#7ED44A', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 5 }}>Referensi Coffee ID Produk</div>
                                        <div style={{ fontFamily: 'monospace', fontWeight: 800 }}>{coffeeId || 'Belum tersedia'}</div>
                                    </div>
                                    <div style={{ padding: 14, borderRadius: 12, background: 'rgba(153,69,255,0.08)', border: '1px solid rgba(153,69,255,0.24)' }}>
                                        <div style={{ color: '#b388ff', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 5 }}>Payment Trace Solana</div>
                                        <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.45 }}>
                                            {txSignature
                                                || (syncingTrace
                                                    ? 'Sinkronisasi trace on-chain...'
                                                    : order.solanaTraceError || 'Menunggu trace on-chain')}
                                        </div>
                                        {!txSignature && syncingTrace && (
                                            <div style={{ marginTop: 7, color: 'rgba(232,245,224,0.58)', fontSize: 11, lineHeight: 1.5 }}>
                                                Konfirmasi Solana Testnet biasanya membutuhkan beberapa detik.
                                                Halaman ini memperbarui receipt otomatis sampai signature tersedia.
                                            </div>
                                        )}
                                        {order.solanaNetworkFeeLamports != null && (
                                            <div style={{ marginTop: 7, color: 'rgba(232,245,224,0.58)', fontSize: 11 }}>
                                                Network fee: {Number(order.solanaNetworkFeeLamports).toLocaleString('id-ID')} lamports
                                                {' '}({(Number(order.solanaNetworkFeeLamports) / 1e9).toFixed(9)} SOL)
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
                                    {certificationUrl && (
                                        <a href={certificationUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(126,212,74,0.35)', color: '#7ED44A', fontWeight: 900, textDecoration: 'none' }}>
                                            Lihat Sertifikasi Produk <IconArrow />
                                        </a>
                                    )}
                                    {explorerUrl && (
                                        <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(153,69,255,0.35)', color: '#b388ff', fontWeight: 900, textDecoration: 'none' }}>
                                            Solana Explorer <IconArrow />
                                        </a>
                                    )}
                                    <button type="button" onClick={handleDownloadPdf} disabled={downloadingPdf} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', color: '#E8F5E0', background: 'rgba(255,255,255,0.05)', fontWeight: 900, cursor: downloadingPdf ? 'wait' : 'pointer', opacity: downloadingPdf ? 0.65 : 1 }}>
                                        <IconDownload /> {downloadingPdf ? 'Membuat PDF...' : 'Download PDF'}
                                    </button>
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
        <Suspense fallback={<ReceiptLoading fullPage />}>
            <ReceiptContent />
        </Suspense>
    );
}
