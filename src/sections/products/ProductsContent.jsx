'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import QRButton from '@/components/BlockchainQR/BlockchainQR';
import { getExplorerTxUrl, normalizeExplorerUrl } from '@/lib/contractConfig';

const GRADES = ['A', 'B', 'C', 'Specialty', 'Premium'];
const VARIETIES = ['Arabika', 'Robusta', 'Liberika', 'Excelsa'];
const ROASTS = ['Light Roast', 'Medium Roast', 'Medium-Dark Roast', 'Dark Roast'];
const WEIGHT_OPTIONS = [100, 200, 250, 500, 1000];

const initialForm = {
    name: '', origin: '', variety: 'Arabika', grade: 'A', roast: 'Medium Roast',
    description: '', stock: 50, coffeeId: '', image: '',
    weights: [{ gram: 250, price: 75000 }],
};

export default function ProductsContent() {
    const { user, getToken } = useAuth();
    const isFarmer = user?.role === 'farmer';
    const canApprove = user?.role === 'developer' || user?.role === 'koperasi';

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null); // {type:'ok'|'err', text}
    const [deleting, setDeleting] = useState(null);
    const [search, setSearch] = useState('');    const [editingProduct, setEditingProduct] = useState(null);
    const [editForm, setEditForm] = useState(initialForm);
    const [approving, setApproving] = useState(null);
    const [verifying, setVerifying] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Farmers only see their own products; developer/koperasi/admin see all
            const myProductsUrl = isFarmer && user?.id
                ? `/api/products?submittedBy=${encodeURIComponent(user.id)}`
                : '/api/products';
            const allRes = await fetch(myProductsUrl);
            const allData = await allRes.json();
            if (allData.success) setProducts(allData.data);
        } catch { }
        setLoading(false);
    }, [isFarmer, user?.id]);

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
            const token = await getToken();
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    name: form.name, origin: form.origin, variety: form.variety,
                    grade: form.grade, roast: form.roast, description: form.description,
                    stock: form.stock,
                    coffeeId: form.coffeeId || null,
                    image: form.image || null,
                    weight: form.weights.map(w => w.gram),
                    pricePerUnit: form.weights.map(w => w.price),
                    submittedBy: user?.id || null,
                    submittedByName: user?.name || user?.email || null,
                    submittedByRole: user?.role || null,
                }),
            });
            const data = await res.json();
            if (data.success) {
                const pendingMsg = isFarmer
                    ? `Permintaan produk "${data.data.name}" dikirim! Menunggu persetujuan koperasi/developer.`
                    : `Produk "${data.data.name}" berhasil ditambahkan!`;
                setMsg({ type: 'ok', text: pendingMsg, landingLink: !isFarmer });
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
        if (!confirm(`Arsipkan "${name}" dari landing page? Coffee ID dan sertifikat Solana akan tetap tersimpan.`)) return;
        setDeleting(id);
        try {
            const token = await getToken();
            const res = await fetch('/api/products', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'ok', text: data.message || `Produk "${name}" diarsipkan dari landing page.`, landingLink: true });
                load();
            } else setMsg({ type: 'err', text: data.message });
        } catch { setMsg({ type: 'err', text: 'Gagal menghapus' }); }
        setDeleting(null);
    }

    async function handleRestore(product) {
        setDeleting(product.id);
        try {
            const token = await getToken();
            const res = await fetch('/api/products', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ id: product.id, status: 'published', action: 'restore' }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Gagal menampilkan produk');
            setMsg({ type: 'ok', text: `Produk "${product.name}" kembali tampil di landing page.`, landingLink: true });
            load();
        } catch (error) {
            setMsg({ type: 'err', text: error.message || 'Gagal menampilkan produk' });
        }
        setDeleting(null);
    }

    async function handleApprove(product) {
        setApproving(`approve-${product.id}`);
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
                    status: 'published',
                    approvedBy: user?.id || 'admin',
                    approvedByName: user?.name || user?.email || 'Admin',
                    approvedAt: new Date().toISOString(),
                }),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'ok', text: `Produk "${product.name}" dari ${product.submittedByName || 'petani'} berhasil disetujui dan kini tampil di katalog!` });
                load();
            } else setMsg({ type: 'err', text: data.message });
        } catch { setMsg({ type: 'err', text: 'Gagal menyetujui' }); }
        setApproving(null);
    }

    async function handleReject(product) {
        const reason = prompt(`Alasan penolakan produk "${product.name}"? (opsional)`);
        if (reason === null) return;
        if (!window.confirm(`Yakin ingin menolak produk "${product.name}"? Produk akan dikembalikan ke petani untuk diperbaiki.`)) return;
        setApproving(`reject-${product.id}`);
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
                    rejectedReason: reason || 'Tidak memenuhi standar',
                }),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'ok', text: `Produk "${product.name}" ditolak.` });
                load();
            } else setMsg({ type: 'err', text: data.message });
        } catch { setMsg({ type: 'err', text: 'Gagal menolak' }); }
        setApproving(null);
    }

    function openEditModal(product) {
        setEditingProduct(product);
        setEditForm({
            name: product.name || '',
            origin: product.origin || '',
            variety: product.variety || 'Arabika',
            grade: product.grade || 'A',
            roast: product.roast || 'Medium Roast',
            description: product.description || '',
            stock: product.stock ?? 0,            image: product.image || '',            weights: (product.weight || [250]).map((g, i) => ({ gram: g, price: product.pricePerUnit?.[i] || 0 })),
        });
        setMsg(null);
    }

    function setEditField(key, val) { setEditForm(f => ({ ...f, [key]: val })); }
    function addEditWeightRow() { setEditForm(f => ({ ...f, weights: [...f.weights, { gram: 500, price: 0 }] })); }
    function removeEditWeightRow(i) { setEditForm(f => ({ ...f, weights: f.weights.filter((_, idx) => idx !== i) })); }
    function updateEditWeight(i, key, val) { setEditForm(f => ({ ...f, weights: f.weights.map((w, idx) => idx === i ? { ...w, [key]: Number(val) || 0 } : w) })); }

    async function handleEditSubmit(e) {
        e.preventDefault();
        if (!editingProduct) return;
        if (editForm.weights.some(w => !w.gram || !w.price)) {
            setMsg({ type: 'err', text: 'Isi semua ukuran berat dan harga' }); return;
        }
        setSaving(true); setMsg(null);
        try {
            const token = await getToken();
            const res = await fetch('/api/products', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    id: editingProduct.id,
                    name: editForm.name,
                    origin: editForm.origin,
                    variety: editForm.variety,
                    grade: editForm.grade,
                    roast: editForm.roast,
                    description: editForm.description,
                    stock: Number(editForm.stock) || 0,
                    weight: editForm.weights.map(w => w.gram),
                    pricePerUnit: editForm.weights.map(w => w.price),
                    // Farmer edits go back to pending for re-approval
                    ...(isFarmer ? { status: 'pending', submittedAt: new Date().toISOString() } : {}),
                }),
            });
            const data = await res.json();
            if (data.success) {
                const editMsg = isFarmer
                    ? `Perubahan produk "${editForm.name}" dikirim! Menunggu persetujuan koperasi/developer.`
                    : `Produk "${editForm.name}" berhasil diperbarui!`;
                setMsg({ type: 'ok', text: editMsg });
                setEditingProduct(null);
                load();
            } else {
                setMsg({ type: 'err', text: data.message || 'Gagal menyimpan' });
            }
        } catch { setMsg({ type: 'err', text: 'Koneksi error' }); }
        setSaving(false);
    }

    async function uploadPhoto(file, setter, setUploading) {
        setUploading(true);
        try {
            const token = await getToken();
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: fd
            });
            const data = await res.json();
            if (data.success) setter(data.url);
            else setMsg({ type: 'err', text: data.message || 'Upload gagal' });
        } catch { setMsg({ type: 'err', text: 'Gagal mengunggah foto' }); }
        setUploading(false);
    }

    async function handleVerifyBlockchain(product) {
        if (verifying) return;
        setVerifying(product.id);
        setMsg({ type: 'ok', text: ` Mengirim "${product.name}" ke Solana Testnet... (maks 30 detik)` });
        try {
            const token = getToken();
            const payload = {
                productId: product.id,
                name: product.name,
                origin: product.origin || 'Tidak diketahui',
                variety: product.variety || 'Arabika',
                grade: product.grade || 'A',
                weightKg: product.weight?.[0] || 0,
                farmerName: product.submittedByName || 'Koperasi CoffeeChain',
                harvestDate: new Date().toISOString().split('T')[0],
                processMethod: 'Washed',
                roastLevel: product.roast || 'Medium',
                certification: product.tags?.join(', ') || '',
                description: product.description || '',
            };
            const res = await fetch('/api/coffee-trace', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success && data.verified && data.data?.txSignature) {
                // Full on-chain success
                const explorerUrl = normalizeExplorerUrl(data.data.explorerUrl) || getExplorerTxUrl(data.data.txSignature);
                setMsg({
                    type: 'ok',
                    text: ` "${product.name}" berhasil terverifikasi di Solana! Coffee ID: ${data.data.coffeeId} — Gas fee dipotong dari wallet server.`,
                    explorerUrl,
                    txSig: data.data.txSignature,
                });
                load();
            } else if (data.success && data.data?.txSignature) {
                // TX sent but confirmation pending
                const explorerUrl = normalizeExplorerUrl(data.data.explorerUrl) || getExplorerTxUrl(data.data.txSignature);
                setMsg({
                    type: 'ok',
                    text: ` TX dikirim! Coffee ID: ${data.data.coffeeId} — Konfirmasi sedang berlangsung di Solana.`,
                    explorerUrl,
                    txSig: data.data.txSignature,
                });
                load();
            } else if (data.success) {
                setMsg({ type: 'err', text: ` "${product.name}" tersimpan tapi TX gagal on-chain. Coba lagi atau cek saldo wallet server.` });
                load();
            } else {
                setMsg({ type: 'err', text: data.message || 'Gagal verifikasi blockchain' });
            }
        } catch (e) {
            setMsg({ type: 'err', text: `Koneksi error: ${e.message}` });
        }
        setVerifying(null);
    }

    const filtered = products.filter(p => {
        // Farmer only sees their own products
        if (isFarmer && p.submittedBy && p.submittedBy !== (user?.id || '')) return false;
        const q = search.toLowerCase();
        return !search || p.name?.toLowerCase().includes(q) || p.origin?.toLowerCase().includes(q);
    });

    /* ── STYLES ── */
    const card = { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20 };
    const input = { width: '100%', padding: '10px 13px', borderRadius: 9, background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
    const label = { fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5, fontWeight: 600 };
    const badge = (color) => ({ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: `${color}18`, color, border: `1px solid ${color}44`, fontWeight: 600 });
    const btnPrimary = { background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 9, cursor: 'pointer', padding: '10px 20px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 7 };
    const btnDanger = { background: 'rgba(244,67,54,0.1)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, cursor: 'pointer', padding: '6px 12px', fontSize: 12, fontWeight: 600 };

    return (
        <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1100, margin: '0 auto' }}>

            {/* Sub Nav Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                <span style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color: '#fff', cursor: 'default' }}>
                    {isFarmer ? 'Produk Saya' : 'Kelola Produk'}
                </span>
                <Link href="/products/stock" style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                    Kelola Stok
                </Link>

                {isFarmer && (
                    <span style={{ padding: '8px 18px', borderRadius: 9, fontSize: 12, background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', color: '#F5A623' }}>
                        Produk baru memerlukan persetujuan koperasi/developer
                    </span>
                )}
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                        {isFarmer ? 'Produk Saya' : 'Kelola Produk'}
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {loading ? 'Memuat...' : isFarmer
                            ? `${products.length} produk yang kamu ajukan`
                            : `${products.length} produk terdaftar di database`}
                    </p>
                </div>
                <Link href="/products/stock" style={{ ...btnPrimary, textDecoration: 'none' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Tambah Lewat Pipeline Stok
                </Link>
            </div>

            {/* Toast */}
            {msg && (
                <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: msg.type === 'ok' ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)', border: `1px solid ${msg.type === 'ok' ? 'rgba(76,175,80,0.35)' : 'rgba(244,67,54,0.35)'}`, color: msg.type === 'ok' ? '#4CAF50' : '#f44336', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span>{msg.type === 'ok' ? '\u2713 ' : '\u2715 '}{msg.text}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {msg.type === 'ok' && msg.explorerUrl && (
                            <a href={normalizeExplorerUrl(msg.explorerUrl)} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 7, background: 'rgba(124,77,255,0.15)', border: '1px solid rgba(124,77,255,0.3)', color: '#b388ff', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                Solana Explorer
                            </a>
                        )}
                        {msg.type === 'ok' && msg.txSig && (
                            <QRButton
                                explorerUrl={normalizeExplorerUrl(msg.explorerUrl)}
                                coffeeId={msg.txSig?.slice(0, 8) + '...'}
                                label="QR Sertifikasi"
                            />
                        )}
                        {msg.type === 'ok' && msg.landingLink && (
                            <a href="/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 7, background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.35)', color: '#4CAF50', fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                                <svg width="13" height="13" fill="none" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                Lihat di Landing Page
                            </a>
                        )}
                    </div>
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
                            <div>
                                <label style={label}>Kopi ID (Opsional)</label>
                                <input style={input} value={form.coffeeId} onChange={e => setField('coffeeId', e.target.value)} placeholder="CF-XXXXXX" />
                                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3, display: 'block' }}>Masukkan ID seri kopi jika sudah ada. Kosongkan jika belum.</span>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={label}>Foto Produk (Opsional)</label>
                                <div style={{ display: 'none', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                    {form.image && (
                                        <img src={form.image} alt="preview" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', flexShrink: 0 }} />
                                    )}
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 8, background: 'rgba(74,124,40,0.12)', border: '1px solid rgba(74,124,40,0.35)', color: 'var(--color-primary-light)', fontSize: 13, fontWeight: 600, cursor: uploadingPhoto ? 'wait' : 'pointer', marginBottom: 8 }}>
                                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
                                            {uploadingPhoto ? 'Mengunggah...' : 'Upload Foto'}
                                            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingPhoto} onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f, url => setField('image', url), setUploadingPhoto); }} />
                                        </label>
                                        <input style={{ ...input, fontSize: 12 }} value={form.image} onChange={e => setField('image', e.target.value)} placeholder="atau tempel URL foto..." />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, border: '1px solid var(--color-border)', borderRadius: 9, background: 'rgba(255,255,255,0.025)' }}>
                                    {editForm.image && <img src={editForm.image} alt="Foto produk dari pipeline" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }} />}
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: 12, lineHeight: 1.55 }}>Foto produk dikunci dari Tahap 6 Pipeline Stok. Upload dan perubahan foto hanya dilakukan melalui pipeline.</span>
                                </div>
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

            {/* PENDING APPROVAL PANEL — removed */}
            {false && (
                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F5A623', display: 'inline-block' }} />
                        Produk Menunggu Persetujuan ({pendingProducts.length})
                    </h2>
                    {pendingProducts.length === 0 ? (
                        <div style={{ ...card, textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>Tidak ada produk yang menunggu persetujuan.</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
                            {pendingProducts.map(p => (
                                <div key={p.id} style={{ ...card, border: '1px solid rgba(245,166,35,0.35)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{p.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{p.origin} · {p.variety}</div>
                                        </div>
                                        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 100, background: 'rgba(245,166,35,0.15)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.35)', fontWeight: 700, flexShrink: 0 }}>Menunggu</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, padding: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                                        <div>Diajukan oleh: <strong style={{ color: 'var(--color-text)' }}>{p.submittedByName || 'Petani'}</strong></div>
                                        <div>Stok: {p.stock} · Grade: {p.grade} · {p.roast}</div>
                                        <div>Diajukan: {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('id-ID') : '—'}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => handleApprove(p)} disabled={!!approving} style={{ flex: 1, padding: '9px 0', background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: approving ? 0.6 : 1 }}>
                                            {approving === `approve-${p.id}` ? 'Memproses...' : 'Setujui'}
                                        </button>
                                        <button onClick={() => handleReject(p)} disabled={!!approving} style={{ flex: 1, padding: '9px 0', background: 'rgba(244,67,54,0.1)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: approving ? 0.6 : 1 }}>
                                            {approving === `reject-${p.id}` ? 'Memproses...' : 'Tolak'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* PRODUCT LIST */}
            {(loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ ...card, height: 140, opacity: 0.4 }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: 0.4 }}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
                    <p style={{ fontSize: 14 }}>Belum ada produk. Tambahkan batch di Kelola Stok agar melewati upload bukti dan audit tahap produksi.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {filtered.map(p => (
                        <div key={p.id} style={{ ...card, border: p.status === 'pending' ? '1px solid rgba(245,166,35,0.35)' : undefined, padding: 0, overflow: 'hidden' }}>
                            {/* Product Image */}
                            <div style={{ width: '100%', height: 110, background: 'rgba(74,124,40,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', borderBottom: '1px solid var(--color-border)' }}>
                                {p.image ? (
                                    <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                                ) : null}
                                <div style={{ display: p.image ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'rgba(126,212,74,0.35)' }}>
                                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>{p.variety || 'Kopi'}</span>
                                </div>
                            </div>
                            <div style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>{p.origin} · {p.variety}</div>
                                    {p.status === 'pending' && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(245,166,35,0.15)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.35)', fontWeight: 700 }}>Menunggu Persetujuan</span>}
                                    {p.status === 'pending_certification' && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(245,166,35,0.15)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.35)', fontWeight: 700 }}>Menunggu Register Admin</span>}
                                    {p.status === 'rejected' && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(244,67,54,0.12)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', fontWeight: 700 }}>Ditolak</span>}
                                    {p.status === 'archived' && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 100, background: 'rgba(179,136,255,0.12)', color: '#b388ff', border: '1px solid rgba(179,136,255,0.3)', fontWeight: 700 }}>Diarsipkan dari Landing</span>}
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    {/* Non-farmer: Edit + Delete */}
                                    {!isFarmer && p.status !== 'archived' && <button onClick={() => openEditModal(p)} style={{ background: 'rgba(74,124,40,0.12)', color: 'var(--color-primary-light)', border: '1px solid rgba(74,124,40,0.3)', borderRadius: 8, cursor: 'pointer', padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>Edit</button>}
                                    {!isFarmer && p.status !== 'archived' && <button onClick={() => handleDelete(p.id, p.name)} disabled={deleting === p.id} style={btnDanger}>{deleting === p.id ? '...' : 'Arsipkan'}</button>}
                                    {!isFarmer && p.status === 'archived' && <button onClick={() => handleRestore(p)} disabled={deleting === p.id} style={{ ...btnDanger, color: '#7ED44A', borderColor: 'rgba(126,212,74,0.3)', background: 'rgba(126,212,74,0.1)' }}>{deleting === p.id ? '...' : 'Tampilkan Lagi'}</button>}
                                    {isFarmer && p.submittedBy === (user?.id || '') && !p.coffeeId && (
                                        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'rgba(245,166,35,0.1)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.25)', fontWeight: 600 }}>Menunggu review</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8, marginTop: 8 }}>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>ID: {p.id}</div>
                                {p.coffeeId ? (
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#7ED44A', background: 'rgba(74,124,40,0.15)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(126,212,74,0.25)' }}> On-Chain: {p.coffeeId}</span>
                                        <QRButton
                                            traceUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/trace?id=${p.coffeeId}`}
                                            coffeeId={p.coffeeId}
                                            productName={p.name}
                                            label="QR Sertifikasi"
                                        />
                                    </div>
                                ) : p.status === 'pending' ? (
                                    <span style={{ fontSize: 10, fontWeight: 600, color: '#FFB300', padding: '3px 8px', borderRadius: 6, background: 'rgba(255,152,0,0.08)', border: '1px solid rgba(255,152,0,0.2)' }}> Menunggu Persetujuan</span>
                                ) : (
                                    <Link href="/coffee-register"
                                        style={{
                                            fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7,
                                            background: 'rgba(153,69,255,0.1)', color: '#9945FF',
                                            border: '1px solid rgba(153,69,255,0.3)',
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            textDecoration: 'none', transition: 'all 0.2s',
                                        }}>
                                         Daftarkan ke Blockchain
                                    </Link>
                                )}
                            </div>
                            </div>{/* end padding div */}
                        </div>
                    ))}
                </div>
            ))}

            {/* EDIT MODAL */}
            {editingProduct && (
                <div role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => { if (e.target === e.currentTarget) setEditingProduct(null); }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="edit-product-title" style={{ background: '#101410', border: '1px solid rgba(126,212,74,0.28)', borderRadius: 18, padding: 0, width: '100%', maxWidth: 760, maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 30px 100px rgba(0,0,0,0.78)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: '20px 24px', borderBottom: '1px solid rgba(126,212,74,0.18)', background: '#121812' }}>
                            <div>
                                <div style={{ color: '#7ED44A', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Kelola Data Katalog</div>
                                <h2 id="edit-product-title" style={{ fontSize: 21, fontWeight: 900, color: '#F2F7EF', margin: 0 }}>
                                    {isFarmer ? 'Ajukan Perubahan Produk' : 'Edit Produk'}
                                </h2>
                                <p style={{ fontSize: 12, color: isFarmer ? '#F5C15D' : 'rgba(232,245,224,0.58)', margin: '5px 0 0', fontWeight: 600, lineHeight: 1.5 }}>
                                    {isFarmer ? 'Perubahan akan dikirim kembali untuk ditinjau admin.' : 'Ubah informasi katalog, stok, kemasan, dan harga produk.'}
                                </p>
                            </div>
                            <button type="button" aria-label="Tutup edit produk" onClick={() => setEditingProduct(null)} style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#C7D2C2', cursor: 'pointer', fontSize: 20, lineHeight: 1, flexShrink: 0 }}>×</button>
                        </div>
                        <form onSubmit={handleEditSubmit} style={{ padding: '20px 24px 18px', maxHeight: 'calc(90vh - 92px)', overflowY: 'auto' }}>
                            <div style={{ color: '#F2F7EF', fontSize: 14, fontWeight: 900, marginBottom: 10 }}>Informasi Produk</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 14, padding: 16, borderRadius: 12, background: '#151B15', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div>
                                    <label style={label}>Nama Produk *</label>
                                    <input style={input} required value={editForm.name} onChange={e => setEditField('name', e.target.value)} />
                                </div>
                                <div>
                                    <label style={label}>Asal Daerah</label>
                                    <input style={input} value={editForm.origin} onChange={e => setEditField('origin', e.target.value)} />
                                </div>
                                <div>
                                    <label style={label}>Varietas</label>
                                    <select style={input} value={editForm.variety} onChange={e => setEditField('variety', e.target.value)}>
                                        {VARIETIES.map(v => <option key={v}>{v}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={label}>Grade</label>
                                    <select style={input} value={editForm.grade} onChange={e => setEditField('grade', e.target.value)}>
                                        {GRADES.map(g => <option key={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={label}>Tingkat Roast</label>
                                    <select style={input} value={editForm.roast} onChange={e => setEditField('roast', e.target.value)}>
                                        {ROASTS.map(r => <option key={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={label}>Stok (unit)</label>
                                    <input style={input} type="number" min={0} value={editForm.stock} onChange={e => setEditField('stock', e.target.value)} />
                                </div>
                            </div>
                            <div style={{ marginBottom: 14, padding: 16, borderRadius: 12, background: '#151B15', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <label style={{ ...label, color: '#F2F7EF', fontSize: 14 }}>Deskripsi Produk</label>
                                <textarea style={{ ...input, resize: 'vertical', minHeight: 105, lineHeight: 1.55 }} value={editForm.description} onChange={e => setEditField('description', e.target.value)} placeholder="Jelaskan karakter, proses, dan keunggulan produk." />
                            </div>
                            <div style={{ marginBottom: 14, padding: 16, borderRadius: 12, background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.25)' }}>
                                <label style={{ ...label, color: '#F5C15D', fontSize: 14 }}>Foto Produk dari Pipeline</label>
                                <div style={{ display: 'flex', gap: 14, alignItems: 'center', paddingTop: 4, flexWrap: 'wrap' }}>
                                    {editForm.image ? <img src={editForm.image} alt="Foto produk dari Tahap 6 pipeline" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(245,166,35,0.35)', flexShrink: 0 }} /> : <div style={{ width: 84, height: 84, borderRadius: 10, border: '1px dashed rgba(245,166,35,0.4)', color: '#F5C15D', display: 'grid', placeItems: 'center', fontSize: 11 }}>Belum ada foto</div>}
                                    <div style={{ flex: '1 1 260px' }}>
                                        <div style={{ color: '#F2F7EF', fontSize: 13, fontWeight: 800, marginBottom: 4 }}>Foto dikunci untuk menjaga bukti traceability</div>
                                        <div style={{ color: 'rgba(232,245,224,0.58)', fontSize: 12, lineHeight: 1.55 }}>Perubahan foto dan deskripsi tiap tahap dilakukan dari Kelola Stok. Produk ditolak dapat diperbaiki pada card pipeline Tahap 1-6.</div>
                                        <Link href="/products/stock" style={{ display: 'inline-flex', marginTop: 9, padding: '7px 11px', borderRadius: 8, color: '#F5C15D', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.28)', textDecoration: 'none', fontSize: 11, fontWeight: 900 }}>Buka Kelola Stok</Link>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: '#151B15', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <div>
                                        <div style={{ color: '#F2F7EF', fontSize: 14, fontWeight: 900 }}>Ukuran Kemasan & Harga</div>
                                        <div style={{ color: 'rgba(232,245,224,0.48)', fontSize: 11, marginTop: 3 }}>Atur satu atau beberapa varian penjualan.</div>
                                    </div>
                                    <button type="button" onClick={addEditWeightRow} style={{ fontSize: 12, color: '#7ED44A', background: 'rgba(126,212,74,0.08)', border: '1px solid rgba(126,212,74,0.28)', borderRadius: 8, padding: '7px 11px', cursor: 'pointer', fontWeight: 800 }}>Tambah Ukuran</button>
                                </div>
                                {editForm.weights.map((w, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 140px' }}>
                                            <input style={{ ...input, width: 90 }} type="number" min={50} max={5000} value={w.gram} onChange={e => updateEditWeight(i, 'gram', e.target.value)} placeholder="gram" />
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: 13, flexShrink: 0 }}>gram</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 160px' }}>
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: 13, flexShrink: 0 }}>Rp</span>
                                            <input style={{ ...input }} type="number" min={0} value={w.price} onChange={e => updateEditWeight(i, 'price', e.target.value)} placeholder="harga" />
                                        </div>
                                        {editForm.weights.length > 1 && (
                                            <button type="button" onClick={() => removeEditWeightRow(i)} style={{ color: '#f44336', background: 'rgba(244,67,54,0.08)', border: 'none', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}>✕</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', position: 'sticky', bottom: -18, margin: '18px -24px -18px', padding: '14px 24px', borderTop: '1px solid rgba(126,212,74,0.18)', background: '#121812' }}>
                                <button type="button" onClick={() => setEditingProduct(null)} style={{ padding: '10px 18px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#D8E2D3', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Tutup Tanpa Menyimpan</button>
                                <button type="submit" style={{ ...btnPrimary, padding: '10px 20px' }} disabled={saving}>
                                    {saving ? 'Menyimpan...' : (isFarmer ? 'Kirim Perubahan' : 'Simpan Perubahan')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
