'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function StockManagement() {
    const { user } = useAuth();
    const isFarmer = user?.role === 'farmer';
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stockDraft, setStockDraft] = useState({}); // { [id]: newStockValue }
    const [saving, setSaving] = useState(null); // id currently being saved
    const [msg, setMsg] = useState(null); // { type:'ok'|'err', text }
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            if (data.success) {
                setProducts(data.data);
                // Initialise stock drafts from current values
                const drafts = {};
                (data.data || []).forEach(p => { drafts[p.id] = p.stock ?? 0; });
                setStockDraft(drafts);
            }
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleSave(product) {
        const newStock = Number(stockDraft[product.id]) || 0;
        if (newStock === product.stock) {
            setMsg({ type: 'err', text: 'Stok tidak berubah.' });
            return;
        }
        setSaving(product.id);
        setMsg(null);
        try {
            const res = await fetch('/api/products', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: product.id, stock: newStock }),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'ok', text: `Stok "${product.name}" diperbarui menjadi ${newStock} unit.` });
                load();
            } else {
                setMsg({ type: 'err', text: data.message || 'Gagal menyimpan' });
            }
        } catch { setMsg({ type: 'err', text: 'Koneksi error' }); }
        setSaving(null);
    }

    const filtered = products.filter(p =>
        !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.origin?.toLowerCase().includes(search.toLowerCase())
    );

    /* ── STYLES ── */
    const card = { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20 };
    const input = { width: '100%', padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
    const label = { fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5, fontWeight: 600 };
    const badge = (color) => ({ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: `${color}22`, color, border: `1px solid ${color}44`, fontWeight: 700 });

    function stockBadgeColor(stock) {
        if (stock === 0) return '#f44336';
        if (stock < 10) return '#FF9800';
        return '#4CAF50';
    }

    return (
        <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1100, margin: '0 auto' }}>

            {/* Sub Nav Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <Link href="/products" style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                    Kelola Produk
                </Link>
                <span style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color: '#fff', cursor: 'default' }}>
                    Kelola Stok
                </span>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>Kelola Stok</h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Update jumlah stok untuk setiap produk langsung ke database</p>
                    {isFarmer && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#F5A623', fontWeight: 600, background: 'rgba(245,166,35,0.09)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 8, padding: '6px 12px', display: 'inline-block' }}>
                            Hanya bisa melihat stok — hubungi koperasi/developer untuk ubah stok
                        </div>
                    )}
                </div>
            </div>

            {/* Toast */}
            {msg && (
                <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: msg.type === 'ok' ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)', border: `1px solid ${msg.type === 'ok' ? 'rgba(76,175,80,0.35)' : 'rgba(244,67,54,0.35)'}`, color: msg.type === 'ok' ? '#4CAF50' : '#f44336', fontSize: 13, fontWeight: 600 }}>
                    {msg.type === 'ok' ? '✓ ' : '✕ '}{msg.text}
                </div>
            )}

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
                <input style={{ ...input, maxWidth: 320 }} placeholder="Cari nama / asal produk..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ ...card, textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>Memuat data...</div>
            ) : filtered.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>Tidak ada produk ditemukan.</div>
            ) : (
                <div style={{ ...card, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ ...th, textAlign: 'left' }}>Produk</th>
                                <th style={{ ...th, textAlign: 'left' }}>Asal</th>
                                <th style={{ ...th, textAlign: 'left' }}>Grade</th>
                                <th style={{ ...th, textAlign: 'center' }}>Stok Saat Ini</th>
                                <th style={{ ...th, textAlign: 'center' }}>Stok Baru</th>
                                <th style={{ ...th, textAlign: 'center' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={td}>
                                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{p.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{p.id?.slice(0, 8)}…</div>
                                    </td>
                                    <td style={td}><span style={{ color: 'var(--color-text-muted)' }}>{p.origin || '—'}</span></td>
                                    <td style={td}>{p.grade ? <span style={badge('#7ED44A')}>{p.grade}</span> : '—'}</td>
                                    <td style={{ ...td, textAlign: 'center' }}>
                                        <span style={badge(stockBadgeColor(p.stock ?? 0))}>{p.stock ?? 0} unit</span>
                                    </td>
                                        <td style={{ ...td, textAlign: 'center' }}>
                                        <input
                                            type="number"
                                            min={0}
                                            value={stockDraft[p.id] ?? p.stock ?? 0}
                                            onChange={e => !isFarmer && setStockDraft(prev => ({ ...prev, [p.id]: e.target.value }))}
                                            disabled={isFarmer}
                                            style={{ ...input, width: 90, textAlign: 'center', padding: '7px 8px', opacity: isFarmer ? 0.5 : 1, cursor: isFarmer ? 'not-allowed' : 'auto' }}
                                        />
                                    </td>
                                    <td style={{ ...td, textAlign: 'center' }}>
                                        {isFarmer ? (
                                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Read-only</span>
                                        ) : (
                                        <button
                                            onClick={() => handleSave(p)}
                                            disabled={saving === p.id}
                                            style={{ background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer', padding: '7px 18px', fontSize: 12, opacity: saving === p.id ? 0.6 : 1 }}
                                        >
                                            {saving === p.id ? '...' : 'Simpan'}
                                        </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const th = { padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const td = { padding: '14px 14px', verticalAlign: 'middle', color: 'var(--color-text)' };
