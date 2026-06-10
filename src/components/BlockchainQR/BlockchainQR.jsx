'use client';
/**
 * BlockchainQR — Komponen QR Code untuk bukti trace Solana Blockchain
 * Menggunakan library `qrcode` (sudah terinstall) secara dinamis di client.
 * Mendukung tema gelap dan terang via CSS variables.
 */
import { useEffect, useState, useCallback } from 'react';

/* ── Icons ── */
const IcoDownload = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
);
const IcoCopy = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
);
const IcoExplorer = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
);
const IcoClose = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);
const IcoQR = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        <rect x="5" y="5" width="3" height="3" fill="currentColor"/><rect x="16" y="5" width="3" height="3" fill="currentColor"/>
        <rect x="5" y="16" width="3" height="3" fill="currentColor"/>
        <line x1="14" y1="14" x2="14" y2="14"/><line x1="17" y1="14" x2="17" y2="14"/><line x1="20" y1="14" x2="20" y2="14"/>
        <line x1="14" y1="17" x2="14" y2="17"/><line x1="17" y1="17" x2="17" y2="20"/>
        <line x1="20" y1="17" x2="20" y2="17"/><line x1="20" y1="20" x2="20" y2="20"/>
    </svg>
);

/**
 * Menghasilkan QR code data URL dari URL yang diberikan.
 * Dijalankan secara lazy agar tidak mempengaruhi performa awal.
 */
async function generateQR(url) {
    try {
        const QRCode = (await import('qrcode')).default;
        return await QRCode.toDataURL(url, {
            width: 220,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'M',
        });
    } catch {
        return null;
    }
}

/**
 * BlockchainQRCard — Kartu QR inline (tidak dalam modal)
 * Props:
 *   - explorerUrl: URL Solana Explorer (untuk bukti on-chain)
 *   - traceUrl:    URL halaman trace internal (/trace?id=...)
 *   - coffeeId:    Coffee ID (CF-XXXXXX)
 *   - productName: Nama produk (untuk label)
 *   - compact:     Tampilan ringkas (hanya QR kecil + tautan)
 */
export function BlockchainQRCard({ explorerUrl, traceUrl, coffeeId, productName, compact = false }) {
    const [qrData, setQrData] = useState(null);
    const [activeUrl, setActiveUrl] = useState(explorerUrl || traceUrl || '');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const target = explorerUrl || traceUrl;
        if (!target) return;
        setActiveUrl(target);
        setLoading(true);
        generateQR(target).then(data => {
            setQrData(data);
            setLoading(false);
        });
    }, [explorerUrl, traceUrl]);

    function switchUrl(url) {
        if (url === activeUrl) return;
        setActiveUrl(url);
        setLoading(true);
        generateQR(url).then(data => {
            setQrData(data);
            setLoading(false);
        });
    }

    function handleCopy() {
        navigator.clipboard.writeText(activeUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    function handleDownload() {
        if (!qrData) return;
        const a = document.createElement('a');
        a.href = qrData;
        a.download = `qr-${coffeeId || 'blockchain'}.png`;
        a.click();
    }

    return (
        <div style={{
            background: 'var(--color-bg-card2, #1C261C)',
            border: '1.5px solid rgba(74,124,40,0.55)',
            borderRadius: 14,
            padding: compact ? 14 : 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        }}>
            {/* Label */}
            {!compact && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#7ED44A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                        Sertifikasi
                    </div>
                    {productName && (
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text, #E8F5E0)' }}>{productName}</div>
                    )}
                    {coffeeId && (
                        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#7ED44A', marginTop: 2 }}>{coffeeId}</div>
                    )}
                </div>
            )}

            {/* URL Switcher Tabs */}
            {explorerUrl && traceUrl && (
                <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 3, borderRadius: 8 }}>
                    {[
                        { url: explorerUrl, label: 'Solana' },
                        { url: traceUrl, label: 'Sertifikasi' },
                    ].map(({ url, label }) => (
                        <button key={label} onClick={() => switchUrl(url)} style={{
                            padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            fontSize: 11, fontWeight: 600,
                            background: activeUrl === url ? 'var(--color-primary-light, #4A7C28)' : 'transparent',
                            color: activeUrl === url ? '#fff' : 'var(--color-text-muted, #9DB89A)',
                            transition: 'all 0.15s',
                        }}>
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* QR Code */}
            <div style={{
                width: compact ? 130 : 200,
                height: compact ? 130 : 200,
                borderRadius: 10,
                overflow: 'hidden',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                flexShrink: 0,
            }}>
                {loading ? (
                    <div style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>Memuat QR...</div>
                ) : qrData ? (
                    <img src={qrData} alt={`QR Code ${coffeeId || ''}`} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
                ) : (
                    <div style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>Gagal buat QR</div>
                )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {explorerUrl && (
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 7,
                        background: 'rgba(124,77,255,0.15)', border: '1px solid rgba(124,77,255,0.3)',
                        color: '#b388ff', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                    }}>
                        <IcoExplorer /> Solana Explorer
                    </a>
                )}
                {traceUrl && (
                    <a href={traceUrl} target="_blank" rel="noopener noreferrer" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 7,
                        background: 'rgba(74,124,40,0.12)', border: '1px solid rgba(74,124,40,0.3)',
                        color: '#7ED44A', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                    }}>
                        Halaman Sertifikasi
                    </a>
                )}
                <button onClick={handleCopy} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 11px', borderRadius: 7, border: '1px solid var(--color-border, rgba(74,124,40,0.25))',
                    background: copied ? 'rgba(76,175,80,0.1)' : 'rgba(255,255,255,0.04)',
                    color: copied ? '#4CAF50' : 'var(--color-text-muted, #9DB89A)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                }}>
                    <IcoCopy /> {copied ? 'Tersalin!' : 'Salin URL'}
                </button>
                <button onClick={handleDownload} disabled={!qrData} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 11px', borderRadius: 7, border: '1px solid var(--color-border, rgba(74,124,40,0.25))',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--color-text-muted, #9DB89A)',
                    fontSize: 12, fontWeight: 600, cursor: qrData ? 'pointer' : 'default',
                    opacity: qrData ? 1 : 0.4,
                }}>
                    <IcoDownload /> Unduh QR
                </button>
            </div>
        </div>
    );
}

/**
 * BlockchainQRModal — Modal popup untuk menampilkan QR code
 * Props:
 *   - open:         boolean
 *   - onClose:      () => void
 *   - explorerUrl:  URL Solana Explorer
 *   - traceUrl:     URL /trace?id=...
 *   - coffeeId:     string
 *   - productName:  string
 */
export function BlockchainQRModal({ open, onClose, explorerUrl, traceUrl, coffeeId, productName }) {
    useEffect(() => {
        if (!open) return;
        function onKey(e) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0,0,0,0.72)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 20,
                animation: 'qrFadeIn 0.18s ease',
            }}
        >
            <style>{`@keyframes qrFadeIn { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }`}</style>
            <div style={{
                background: 'var(--color-bg-card2, #1C261C)',
                border: '1.5px solid rgba(74,124,40,0.55)',
                borderRadius: 18,
                padding: 24,
                width: '100%', maxWidth: 360,
                maxHeight: '90vh', overflowY: 'auto',
                position: 'relative',
                boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            }}>
                {/* Close button */}
                <button onClick={onClose} style={{
                    position: 'absolute', top: 14, right: 14,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border, rgba(74,124,40,0.2))',
                    borderRadius: 8, padding: '5px 8px', cursor: 'pointer',
                    color: 'var(--color-text-muted, #9DB89A)', display: 'flex', alignItems: 'center',
                }}>
                    <IcoClose />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>⛓</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text, #E8F5E0)' }}>
                        Sertifikasi
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted, #9DB89A)', marginTop: 4 }}>
                        Scan QR untuk memverifikasi keaslian kopi
                    </div>
                </div>

                <BlockchainQRCard
                    explorerUrl={explorerUrl}
                    traceUrl={traceUrl}
                    coffeeId={coffeeId}
                    productName={productName}
                />
            </div>
        </div>
    );
}

/**
 * QRButton — Tombol kecil untuk membuka modal QR
 * Penggunaan: <QRButton explorerUrl={...} traceUrl={...} coffeeId={...} />
 */
export default function QRButton({ explorerUrl, traceUrl, coffeeId, productName, label = 'QR Sertifikasi' }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                title="Lihat QR Code bukti blockchain"
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 11px', borderRadius: 7, border: '1px solid rgba(126,212,74,0.3)',
                    background: 'rgba(74,124,40,0.1)', color: '#7ED44A',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s',
                }}
            >
                <IcoQR /> {label}
            </button>
            <BlockchainQRModal
                open={open}
                onClose={() => setOpen(false)}
                explorerUrl={explorerUrl}
                traceUrl={traceUrl}
                coffeeId={coffeeId}
                productName={productName}
            />
        </>
    );
}

