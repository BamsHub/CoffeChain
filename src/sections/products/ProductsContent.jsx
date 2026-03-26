'use client';
import { useState, useEffect, useCallback } from 'react';

const GRADES = ['A', 'B', 'C', 'Specialty', 'Premium'];
const VARIETIES = ['Arabika', 'Robusta', 'Liberika', 'Excelsa'];
const ROASTS = ['Light Roast', 'Medium Roast', 'Medium-Dark Roast', 'Dark Roast'];
const WEIGHT_OPTIONS = [100, 200, 250, 500, 1000];

const initialForm = {
    name: '', origin: '', variety: 'Arabika', grade: 'A', roast: 'Medium Roast',
    description: '', stock: 50,
    weights: [{ gram: 250, price: 75000 }],
};

export default function ProductsContent() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null); // {type:'ok'|'err', text}
    const [deleting, setDeleting] = useState(null);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            if (data.success) setProducts(data.data);
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    function setField(key, val) { setForm(f => ({ ...f, [key]: val })); }

    function addWeightRow() {
        setForm(f => ({ ...f, weights: [...f.weights, { gram: 500, price: 0 }] }));
    }
    function removeWeightRow(i) {
        setForm(f => ({ ...f, weights: f.weights.filter((_, idx) => idx !== i) }));
    }
    function updateWeight(i, key, val) {
        setForm(f => ({ ...f, weights: f.weights.map((w, idx) => idx === i ? { ...w, [key]: Number(val) || 0 } : w) }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (form.weights.some(w => !w.gram || !w.price)) {
            setMsg({ type: 'err', text: 'Isi semua ukuran berat dan harga' }); return;
        }
        setSaving(true); setMsg(null);
        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name, origin: form.origin, variety: form.variety,
                    grade: form.grade, roast: form.roast, description: form.description,
                    stock: form.stock,
                    weight: form.weights.map(w => w.gram),
                    pricePerUnit: form.weights.map(w => w.price),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'ok', text: `Produk "${data.data.name}" berhasil ditambahkan!` });
                setForm(initialForm);
                setShowForm(false);
                load();
            } else {
                setMsg({ type: 'err', text: data.message || 'Gagal menyimpan' });
            }
        } catch { setMsg({ type: 'err', text: 'Koneksi error' }); }
        setSaving(false);
    }

    async function handleDelete(id, name) {
        if (!confirm(`Hapus produk "${name}"?`)) return;
        setDeleting(id);
        try {
            const res = await fetch('/api/products', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'ok', text: `Produk "${name}" dihapus.` });
                load();
            } else setMsg({ type: 'err', text: data.message });
        } catch { setMsg({ type: 'err', text: 'Gagal menghapus' }); }
        setDeleting(null);
    }

    const filtered = products.filter(p =>
        !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.origin?.toLowerCase().includes(search.toLowerCase())
    );

    /* ── STYLES ── */
    const card = { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20 };
    const input = { width: '100%', padding: '10px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
    const label = { fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5, fontWeight: 600 };
    const badge = (color) => ({ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: `${color}18`, color, border: `1px solid ${color}44`, fontWeight: 600 });
    const btnPrimary = { background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 9, cursor: 'pointer', padding: '10px 20px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 7 };
    const btnDanger = { background: 'rgba(244,67,54,0.1)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, cursor: 'pointer', padding: '6px 12px', fontSize: 12, fontWeight: 600 };

    return (
        <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1100, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>Kelola Produk</h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{products.length} produk terdaftar di database</p>
                </div>
                <button style={btnPrimary} onClick={() => { setShowForm(s => !s); setMsg(null); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {showForm ? 'Batal' : 'Tambah Produk'}
                </button>
            </div>

            {/* Toast */}
            {msg && (
                <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: msg.type === 'ok' ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)', border: `1px solid ${msg.type === 'ok' ? 'rgba(76,175,80,0.35)' : 'rgba(244,67,54,0.35)'}`, color: msg.type === 'ok' ? '#4CAF50' : '#f44336', fontSize: 13, fontWeight: 600 }}>
                    {msg.type === 'ok' ? '✓ ' : '✕ '}{msg.text}
                </div>
            )}

            {/* ADD FORM */}
            {showForm && (
                <div style={{ ...card, marginBottom: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-light)" strokeWidth="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>
                        Data Produk Baru
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={label}>Nama Produk *</label>
                                <input style={input} required value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Arabika Gayo Special" />
                            </div>
                            <div>
                                <label style={label}>Asal Daerah *</label>
                                <input style={input} required value={form.origin} onChange={e => setField('origin', e.target.value)} placeholder="Aceh Tengah" />
                            </div>
                            <div>
                                <label style={label}>Varietas</label>
                                <select style={input} value={form.variety} onChange={e => setField('variety', e.target.value)}>
                                    {VARIETIES.map(v => <option key={v}>{v}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={label}>Grade</label>
                                <select style={input} value={form.grade} onChange={e => setField('grade', e.target.value)}>
                                    {GRADES.map(g => <option key={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={label}>Tingkat Roast</label>
                                <select style={input} value={form.roast} onChange={e => setField('roast', e.target.value)}>
                                    {ROASTS.map(r => <option key={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={label}>Stok (unit)</label>
                                <input style={input} type="number" min={0} value={form.stock} onChange={e => setField('stock', e.target.value)} />
                            </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={label}>Deskripsi</label>
                            <textarea style={{ ...input, resize: 'vertical', minHeight: 72 }} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Catatan rasa, proses, sertifikasi, dll." />
                        </div>

                        {/* Weight + Price Rows */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label style={label}>Ukuran & Harga *</label>
                                <button type="button" onClick={addWeightRow} style={{ fontSize: 12, color: 'var(--color-primary-light)', background: 'rgba(74,124,40,0.1)', border: '1px solid var(--color-border)', borderRadius: 7, padding: '4px 10px', cursor: 'pointer' }}>+ Tambah Ukuran</button>
                            </div>
                            {form.weights.map((w, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 140px' }}>
                                        <input style={{ ...input, width: 90 }} type="number" min={50} max={5000} value={w.gram} onChange={e => updateWeight(i, 'gram', e.target.value)} placeholder="gram" />
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: 13, flexShrink: 0 }}>gram</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 160px' }}>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: 13, flexShrink: 0 }}>Rp</span>
                                        <input style={{ ...input }} type="number" min={0} value={w.price} onChange={e => updateWeight(i, 'price', e.target.value)} placeholder="harga" />
                                    </div>
                                    {form.weights.length > 1 && (
                                        <button type="button" onClick={() => removeWeightRow(i)} style={{ color: '#f44336', background: 'rgba(244,67,54,0.08)', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>✕</button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => { setShowForm(false); setForm(initialForm); }} style={{ ...btnDanger, padding: '10px 20px' }}>Batal</button>
                            <button type="submit" style={btnPrimary} disabled={saving}>
                                {saving ? 'Menyimpan...' : 'Simpan Produk'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* SEARCH */}
            <div style={{ marginBottom: 16 }}>
                <input style={{ ...input, maxWidth: 320 }} placeholder="Cari nama / asal produk..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* PRODUCT LIST */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ ...card, height: 140, opacity: 0.4 }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.4 }}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                    <p style={{ fontSize: 14 }}>Belum ada produk. Klik "Tambah Produk" untuk mulai.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {filtered.map(p => (
                        <div key={p.id} style={card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>{p.origin} · {p.variety}</div>
                                </div>
                                <button onClick={() => handleDelete(p.id, p.name)} disabled={deleting === p.id} style={btnDanger}>
                                    {deleting === p.id ? '...' : 'Hapus'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                                {p.grade && <span style={badge('#7ED44A')}>{p.grade}</span>}
                                {p.roast && <span style={badge('#F5A623')}>{p.roast}</span>}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                Stok: <strong style={{ color: 'var(--color-text)' }}>{p.stock}</strong> unit
                            </div>
                            {p.weight?.map((w, i) => (
                                w >= 50 && w <= 5000 && p.pricePerUnit?.[i] <= 10_000_000 ? (
                                    <div key={w} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderTop: '1px solid var(--color-border)' }}>
                                        <span style={{ color: 'var(--color-text-muted)' }}>{w}g</span>
                                        <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>Rp {p.pricePerUnit[i]?.toLocaleString('id-ID')}</span>
                                    </div>
                                ) : null
                            ))}
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, fontFamily: 'monospace' }}>ID: {p.id}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
