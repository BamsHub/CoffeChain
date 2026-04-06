'use client';

import { useState } from 'react';

const VARIETIES = ['Arabika', 'Robusta', 'Liberika', 'Excelsa'];
const GRADES    = ['Grade 1', 'Grade 2', 'Grade 3', 'Speciality', 'Premium'];
const METHODS   = [
    { value: 'transfer', label: 'Transfer Bank' },
    { value: 'cash',     label: 'Tunai' },
    { value: 'qr',       label: 'QR / Solana Pay' },
];

export default function AddSaleModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({
        productName:   '',
        variety:       'Arabika',
        grade:         'Grade 1',
        quantityKg:    '',
        pricePerKg:    '',
        buyerName:     '',
        paymentMethod: 'transfer',
        notes:         '',
    });
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState('');

    const totalPrice = Math.round((Number(form.quantityKg) || 0) * (Number(form.pricePerKg) || 0));

    function handleChange(e) {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (!form.productName.trim()) { setError('Nama produk wajib diisi.'); return; }
        if (!form.quantityKg || Number(form.quantityKg) <= 0) { setError('Berat (kg) harus lebih dari 0.'); return; }
        if (!form.pricePerKg || Number(form.pricePerKg) <= 0) { setError('Harga per kg harus lebih dari 0.'); return; }

        setSaving(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('cc_token') : null;
            const res = await fetch('/api/sales', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body:    JSON.stringify({ ...form, quantityKg: Number(form.quantityKg), pricePerKg: Number(form.pricePerKg) }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.error || 'Gagal menyimpan.'); return; }
            onSuccess(data.data);
        } catch (err) {
            setError('Terjadi kesalahan jaringan.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
        }}>
            <div style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 24px 0' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 17, fontWeight: 700 }}>
                            Catat Penjualan Baru
                        </h3>
                        <p style={{ margin: '3px 0 0', color: 'var(--color-text-muted)', fontSize: 12 }}>
                            Data tersimpan ke database khusus petani
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'var(--color-surface-2)', border: 'none', borderRadius: 8, width: 32, height: 32,
                        cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 16,
                    }}>✕</button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
                    {/* Product name */}
                    <label style={labelStyle}>Nama Produk / Kopi *</label>
                    <input name="productName" value={form.productName} onChange={handleChange}
                        placeholder="Contoh: Arabika Gayo Grade 1"
                        style={inputStyle} required />

                    {/* Variety + Grade */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div>
                            <label style={labelStyle}>Varietas</label>
                            <select name="variety" value={form.variety} onChange={handleChange} style={inputStyle}>
                                {VARIETIES.map(v => <option key={v}>{v}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Grade</label>
                            <select name="grade" value={form.grade} onChange={handleChange} style={inputStyle}>
                                {GRADES.map(g => <option key={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Qty + Price */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div>
                            <label style={labelStyle}>Berat (kg) *</label>
                            <input name="quantityKg" type="number" min="0.1" step="0.1"
                                value={form.quantityKg} onChange={handleChange}
                                placeholder="Contoh: 50" style={inputStyle} required />
                        </div>
                        <div>
                            <label style={labelStyle}>Harga / kg (Rp) *</label>
                            <input name="pricePerKg" type="number" min="1"
                                value={form.pricePerKg} onChange={handleChange}
                                placeholder="Contoh: 85000" style={inputStyle} required />
                        </div>
                    </div>

                    {/* Total preview */}
                    {totalPrice > 0 && (
                        <div style={{
                            marginBottom: 14, padding: '10px 14px', borderRadius: 10,
                            background: 'rgba(126,212,74,0.07)', border: '1px solid rgba(126,212,74,0.25)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Total Penjualan</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#7ED44A' }}>
                                Rp {totalPrice.toLocaleString('id-ID')}
                            </span>
                        </div>
                    )}

                    {/* Buyer name */}
                    <label style={labelStyle}>Nama Pembeli (opsional)</label>
                    <input name="buyerName" value={form.buyerName} onChange={handleChange}
                        placeholder="Nama koperasi / perusahaan pembeli" style={inputStyle} />

                    {/* Payment method */}
                    <label style={labelStyle}>Metode Pembayaran</label>
                    <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} style={inputStyle}>
                        {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>

                    {/* Notes */}
                    <label style={labelStyle}>Catatan (opsional)</label>
                    <textarea name="notes" value={form.notes} onChange={handleChange}
                        rows={2} placeholder="Keterangan tambahan..." style={{ ...inputStyle, resize: 'vertical', height: 64 }} />

                    {error && (
                        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 9,
                            background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)',
                            color: '#f44336', fontSize: 13 }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button type="button" onClick={onClose} style={{
                            flex: 1, padding: '11px 0', borderRadius: 10, cursor: 'pointer',
                            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                            color: 'var(--color-text-muted)', fontSize: 14, fontWeight: 600,
                        }}>Batal</button>
                        <button type="submit" disabled={saving} style={{
                            flex: 2, padding: '11px 0', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                            background: saving ? 'rgba(126,212,74,0.3)' : 'var(--color-primary)',
                            border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, opacity: saving ? 0.7 : 1,
                        }}>
                            {saving ? 'Menyimpan...' : 'Simpan Penjualan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--color-text-muted)', marginBottom: 5, marginTop: 0,
};
const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    borderRadius: 9, color: 'var(--color-text-primary)', fontSize: 14,
    outline: 'none', marginBottom: 14,
};
