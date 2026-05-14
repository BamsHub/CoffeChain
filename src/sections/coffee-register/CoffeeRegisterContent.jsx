'use client';
import { useState, useEffect } from 'react';
import { getExplorerTxUrl } from '@/lib/contractConfig';

export default function CoffeeRegisterContent() {
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [traces, setTraces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState(null);
    const [search, setSearch] = useState('');
    const [extraFields, setExtraFields] = useState({
        farmerName: '', harvestDate: '', processMethod: 'Washed',
        roastLevel: 'Medium', certification: '', paymentWallet: '',
    });

    useEffect(() => {
        loadProducts();
        loadTraces();
    }, []);

    async function loadProducts() {
        setLoadingProducts(true);
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            if (data.success) setProducts(data.data || []);
        } catch { }
        setLoadingProducts(false);
    }

    async function loadTraces() {
        setLoading(true);
        try {
            const res = await fetch('/api/coffee-trace');
            const data = await res.json();
            if (data.success) setTraces(data.data);
        } catch { }
        setLoading(false);
    }

    const selectedProduct = products.find(p => p.id === selectedProductId);
    // Only show products that don't have a coffeeId yet
    const unregisteredProducts = products.filter(p => !p.coffeeId && p.status !== 'pending');

    async function handleSubmit(e) {
        e.preventDefault();
        if (!selectedProduct) {
            setMsg({ type: 'error', text: 'Pilih produk terlebih dahulu!' });
            return;
        }
        setSubmitting(true); setMsg(null);
        try {
            const payload = {
                productId: selectedProduct.id,
                name: selectedProduct.name,
                origin: selectedProduct.origin || '',
                variety: selectedProduct.variety || 'Arabika',
                grade: selectedProduct.grade || 'A',
                weightKg: selectedProduct.weight?.[0] || 0,
                farmerName: extraFields.farmerName || selectedProduct.submittedByName || '',
                harvestDate: extraFields.harvestDate || '',
                processMethod: extraFields.processMethod,
                roastLevel: extraFields.roastLevel || selectedProduct.roast || 'Medium',
                certification: extraFields.certification || '',
                description: selectedProduct.description || '',
                paymentWallet: extraFields.paymentWallet || '',
            };
            const res = await fetch('/api/coffee-trace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({
                    type: data.verified ? 'success' : 'warning',
                    text: data.message,
                    coffeeId: data.data.coffeeId,
                    productId: data.data.productId,
                    txSignature: data.data.txSignature,
                    explorerUrl: data.data.explorerUrl,
                });
                setSelectedProductId('');
                setExtraFields({ farmerName: '', harvestDate: '', processMethod: 'Washed', roastLevel: 'Medium', certification: '', paymentWallet: '' });
                loadTraces();
                loadProducts();
            } else {
                setMsg({ type: 'error', text: data.message });
            }
        } catch { setMsg({ type: 'error', text: 'Koneksi error' }); }
        setSubmitting(false);
    }

    const EF = (k, v) => setExtraFields(f => ({ ...f, [k]: v }));

    const inputStyle = {
        padding: '10px 12px', borderRadius: 8,
        background: 'var(--color-surface, rgba(255,255,255,0.04))',
        border: '1px solid var(--border-color, rgba(74,124,40,0.25))',
        color: 'var(--text-primary, #E8F5E0)', fontSize: 14, outline: 'none',
        width: '100%', boxSizing: 'border-box',
    };
    const labelStyle = { fontSize: 12, color: 'rgba(232,245,224,0.55)', fontWeight: 600 };

    const filtered = traces.filter(t =>
        !search || t.coffeeId?.toLowerCase().includes(search.toLowerCase()) ||
        t.name?.toLowerCase().includes(search.toLowerCase())
    );

    // Color for message banner
    const msgColor = {
        success: { bg: 'rgba(74,124,40,0.15)', border: 'rgba(126,212,74,0.3)', title: '#7ED44A', icon: '✅' },
        warning: { bg: 'rgba(245,152,0,0.1)', border: 'rgba(245,152,0,0.3)', title: '#FFB300', icon: '⚠️' },
        error:   { bg: 'rgba(244,67,54,0.1)',  border: 'rgba(244,67,54,0.3)',  title: '#f44336', icon: '❌' },
    };

    return (
        <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Register Kopi ke Blockchain
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, rgba(232,245,224,0.5))', marginBottom: 24 }}>
                Pilih produk untuk didaftarkan ke Solana Devnet. Gas fee otomatis dipotong dari wallet server.
            </p>

            {/* Result Message */}
            {msg && (
                <div style={{ padding: '14px 16px', borderRadius: 10, marginBottom: 20, background: msgColor[msg.type]?.bg, border: `1px solid ${msgColor[msg.type]?.border}` }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: msgColor[msg.type]?.title, marginBottom: 6 }}>
                        {msgColor[msg.type]?.icon} {msg.type === 'success' ? 'Berhasil Diverifikasi!' : msg.type === 'warning' ? 'Tersimpan (blockchain gagal)' : 'Gagal'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary, rgba(232,245,224,0.7))' }}>{msg.text}</div>
                    {msg.coffeeId && (
                        <div style={{ fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ color: 'rgba(232,245,224,0.5)' }}>Coffee ID:</span>
                            <strong style={{ color: '#7ED44A', fontFamily: 'monospace', fontSize: 13 }}>{msg.coffeeId}</strong>
                            {msg.productId && (
                                <>
                                    <span style={{ color: 'rgba(232,245,224,0.3)' }}>|</span>
                                    <span style={{ color: 'rgba(232,245,224,0.5)' }}>Product:</span>
                                    <strong style={{ color: 'rgba(232,245,224,0.7)', fontFamily: 'monospace', fontSize: 13 }}>{msg.productId}</strong>
                                </>
                            )}
                        </div>
                    )}
                    {msg.txSignature && (
                        <a href={msg.explorerUrl || getExplorerTxUrl(msg.txSignature)} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: '#7c4dff', textDecoration: 'none', fontWeight: 700, padding: '6px 14px', borderRadius: 8, background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.3)' }}>
                            🔗 Lihat TX di Solana Explorer
                        </a>
                    )}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ marginBottom: 32, padding: 20, borderRadius: 14, background: 'var(--color-surface, rgba(255,255,255,0.02))', border: '1px solid var(--border-color, rgba(74,124,40,0.15))' }}>

                {/* Product Selector */}
                <div style={{ marginBottom: 16 }}>
                    <label style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>Pilih Produk yang Belum Terdaftar *</label>
                    {loadingProducts ? (
                        <div style={{ padding: 12, color: 'rgba(232,245,224,0.4)', fontSize: 13 }}>Memuat produk...</div>
                    ) : unregisteredProducts.length === 0 ? (
                        <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', fontSize: 13, color: '#F5A623' }}>
                            ⚠️ Semua produk sudah terdaftar di blockchain, atau belum ada produk yang disetujui. Tambahkan produk baru di <strong>Kelola Produk</strong>.
                        </div>
                    ) : (
                        <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option value="">-- Pilih produk untuk didaftarkan --</option>
                            {unregisteredProducts.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} — {p.origin} ({p.variety || 'Arabika'}, {p.grade || 'A'})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Product Preview Card */}
                {selectedProduct && (
                    <div style={{ padding: '14px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(74,124,40,0.08)', border: '1px solid rgba(126,212,74,0.2)' }}>
                        <div style={{ fontSize: 11, color: 'rgba(232,245,224,0.5)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>📦 Preview Produk Terpilih</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                            {[
                                ['Nama', selectedProduct.name],
                                ['Asal', selectedProduct.origin || '-'],
                                ['Varietas', selectedProduct.variety || '-'],
                                ['Grade', selectedProduct.grade || '-'],
                                ['Roast', selectedProduct.roast || '-'],
                                ['Stok', selectedProduct.stock ?? '-'],
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <div style={{ fontSize: 10, color: 'rgba(232,245,224,0.4)', marginBottom: 2 }}>{label}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{val}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(126,212,74,0.1)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 11, color: 'rgba(232,245,224,0.4)' }}>
                                ID Produk: <span style={{ fontFamily: 'monospace', color: 'rgba(232,245,224,0.7)' }}>{selectedProduct.id}</span>
                            </div>
                            {selectedProduct.coffeeId ? (
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#7ED44A', background: 'rgba(74,124,40,0.2)', padding: '2px 8px', borderRadius: 6 }}>
                                    Sudah ada CF ID: {selectedProduct.coffeeId}
                                </span>
                            ) : (
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#FFB300', background: 'rgba(255,152,0,0.1)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(255,152,0,0.25)' }}>
                                    ⚡ CF ID akan dibuat otomatis saat register
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Extra Fields */}
                {selectedProduct && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={labelStyle}>Nama Petani</label>
                            <input type="text" value={extraFields.farmerName}
                                onChange={e => EF('farmerName', e.target.value)}
                                placeholder={selectedProduct.submittedByName || 'Nama Petani'}
                                style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={labelStyle}>Tanggal Panen</label>
                            <input type="date" value={extraFields.harvestDate}
                                onChange={e => EF('harvestDate', e.target.value)}
                                style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={labelStyle}>Metode Proses</label>
                            <select value={extraFields.processMethod} onChange={e => EF('processMethod', e.target.value)} style={inputStyle}>
                                {['Washed', 'Natural', 'Honey', 'Semi-Washed', 'Wet Hulled'].map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={labelStyle}>Level Roast</label>
                            <select value={extraFields.roastLevel} onChange={e => EF('roastLevel', e.target.value)} style={inputStyle}>
                                {['Green Bean', 'Light', 'Medium', 'Medium-Dark', 'Dark'].map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={labelStyle}>Sertifikasi</label>
                            <input type="text" value={extraFields.certification}
                                onChange={e => EF('certification', e.target.value)}
                                placeholder="Organic, Fair Trade" style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <label style={labelStyle}>Wallet Pembayaran (Opsional)</label>
                            <input type="text" value={extraFields.paymentWallet}
                                onChange={e => EF('paymentWallet', e.target.value)}
                                placeholder="Kosongkan = wallet sistem" style={inputStyle} />
                        </div>
                    </div>
                )}

                {/* Gas Fee Info */}
                {selectedProduct && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(124,77,255,0.06)', border: '1px solid rgba(124,77,255,0.2)', marginBottom: 14, fontSize: 12, color: 'rgba(232,245,224,0.6)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⛽</span>
                        <span>Gas fee ~0.000005 SOL ≈ Rp 10 — dipotong dari <strong style={{ color: 'rgba(232,245,224,0.9)' }}>wallet server CoffeeChain</strong></span>
                    </div>
                )}

                <button type="submit" disabled={submitting || !selectedProductId}
                    style={{
                        padding: '12px 28px', borderRadius: 10,
                        background: selectedProductId ? 'linear-gradient(135deg,#4A7C28,#7ED44A)' : 'rgba(255,255,255,0.06)',
                        color: selectedProductId ? '#fff' : 'rgba(232,245,224,0.3)',
                        border: 'none', cursor: selectedProductId ? 'pointer' : 'not-allowed',
                        fontWeight: 700, fontSize: 14, opacity: submitting ? 0.7 : 1,
                        display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
                    }}>
                    {submitting
                        ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> Mengirim &amp; Verify ke Solana Devnet...</>
                        : '🔗 Register ke Blockchain'
                    }
                </button>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </form>

            {/* Trace List */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Kopi Terdaftar ({filtered.length})</h3>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Cari coffee ID atau nama..."
                    style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface, rgba(255,255,255,0.04))', border: '1px solid var(--border-color, rgba(74,124,40,0.2))', color: 'var(--text-primary, #E8F5E0)', fontSize: 13, outline: 'none', width: 220 }} />
            </div>

            {loading && <div style={{ textAlign: 'center', padding: 32, color: 'rgba(232,245,224,0.3)' }}>Memuat...</div>}

            <div style={{ display: 'grid', gap: 10 }}>
                {filtered.map(t => (
                    <div key={t.id} style={{
                        padding: '14px 16px', borderRadius: 12,
                        background: 'var(--color-surface, rgba(255,255,255,0.02))',
                        border: `1px solid ${t.txSignature ? 'rgba(74,124,40,0.2)' : 'rgba(255,152,0,0.2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#7ED44A', background: 'rgba(74,124,40,0.15)', padding: '4px 10px', borderRadius: 6, flexShrink: 0, fontFamily: 'monospace' }}>
                                {t.coffeeId}
                            </span>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                <div style={{ fontSize: 11, color: 'rgba(232,245,224,0.4)' }}>
                                    {t.origin} · {t.variety} · {t.grade}
                                    {t.productId && <span> · <span style={{ fontFamily: 'monospace', color: 'rgba(232,245,224,0.5)' }}>{t.productId}</span></span>}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {t.txSignature ? (
                                <>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#7ED44A', padding: '3px 8px', borderRadius: 6, background: 'rgba(74,124,40,0.15)', border: '1px solid rgba(126,212,74,0.25)' }}>✅ Verified</span>
                                    <a href={t.explorerUrl || getExplorerTxUrl(t.txSignature)} target="_blank" rel="noopener noreferrer"
                                        style={{ fontSize: 11, color: '#7c4dff', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.25)' }}>
                                        🔗 Explorer
                                    </a>
                                </>
                            ) : (
                                <span style={{ fontSize: 11, color: '#FFB300', fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.25)' }}>⏳ Pending</span>
                            )}
                        </div>
                    </div>
                ))}
                {!loading && filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'rgba(232,245,224,0.3)', fontSize: 13 }}>Belum ada kopi terdaftar</div>
                )}
            </div>
        </div>
    );
}
