'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = [
    { key: 'quality', label: 'Kualitas Produk' },
    { key: 'delivery', label: 'Pengiriman' },
    { key: 'payment', label: 'Pembayaran' },
    { key: 'blockchain', label: 'Blockchain dan Sertifikasi' },
    { key: 'account', label: 'Akun' },
    { key: 'suggestion', label: 'Saran dan Masukan' },
    { key: 'other', label: 'Lainnya' },
];

const initialForm = {
    phone: '',
    category: '',
    urgency: 'normal',
    subject: '',
    message: '',
};

export default function ContactPage() {
    const { user, getToken } = useAuth();
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState(null);

    const input = {
        width: '100%', padding: '11px 12px', borderRadius: 9,
        background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)',
        color: 'var(--color-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    };
    const label = { display: 'block', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 800, marginBottom: 6 };

    function setField(key, value) {
        setForm(current => ({ ...current, [key]: value }));
    }

    async function submitTicket(event) {
        event.preventDefault();
        setSaving(true);
        setResult(null);
        try {
            const token = await getToken();
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(form),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Gagal membuat tiket');
            setResult({ type: 'ok', text: `Tiket ${data.id} berhasil dibuat dan sudah masuk ke Pesan Pengaduan admin.` });
            setForm(initialForm);
        } catch (error) {
            setResult({ type: 'err', text: error.message });
        }
        setSaving(false);
    }

    if (user?.role !== 'farmer') {
        return (
            <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(18px,3vw,32px)' }}>
                <div style={{ padding: 24, borderRadius: 12, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Tiket pengaduan khusus petani terdaftar</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>Daftar sebagai petani dan verifikasi email terlebih dahulu agar identitas pengirim serta riwayat pipeline dapat ditautkan dengan aman.</div>
                    {!user && <a href="/register" style={{ color: 'var(--color-primary-light)', fontWeight: 800, textDecoration: 'none' }}>Daftar sebagai Petani</a>}
                    {user && <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Admin menerima dan mengelola tiket melalui menu Pesan Pengaduan.</div>}
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(18px,3vw,32px)' }}>
            <div style={{ marginBottom: 22 }}>
                <div style={{ color: 'var(--color-primary-light)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}>Bantuan Petani</div>
                <h1 style={{ color: 'var(--color-text)', fontSize: 'clamp(24px,4vw,32px)', margin: 0, fontWeight: 900 }}>Hubungi Kami</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6, margin: '7px 0 0' }}>
                    Buat tiket bantuan tanpa meninggalkan dashboard. Tiket hanya dapat dilihat dan ditangani oleh admin.
                </p>
            </div>

            {result && (
                <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 9, color: result.type === 'ok' ? '#7ED44A' : '#ff6b6b', background: result.type === 'ok' ? 'rgba(126,212,74,0.09)' : 'rgba(244,67,54,0.09)', border: `1px solid ${result.type === 'ok' ? 'rgba(126,212,74,0.3)' : 'rgba(244,67,54,0.3)'}`, fontSize: 13, fontWeight: 700 }}>
                    {result.text}
                </div>
            )}

            <form onSubmit={submitTicket} style={{ padding: 'clamp(18px,3vw,26px)', borderRadius: 14, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ color: 'var(--color-text)', fontSize: 17, fontWeight: 900 }}>Form Tiket Bantuan</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>Pengirim: {user?.name || user?.email}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
                    <div>
                        <label style={label}>Kategori *</label>
                        <select required value={form.category} onChange={event => setField('category', event.target.value)} style={input}>
                            <option value="">Pilih kategori</option>
                            {CATEGORIES.map(category => <option key={category.key} value={category.key}>{category.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={label}>Prioritas *</label>
                        <select required value={form.urgency} onChange={event => setField('urgency', event.target.value)} style={input}>
                            <option value="normal">Normal</option>
                            <option value="high">Prioritas Tinggi</option>
                            <option value="urgent">Mendesak</option>
                        </select>
                    </div>
                    <div>
                        <label style={label}>Nomor HP</label>
                        <input type="tel" value={form.phone} onChange={event => setField('phone', event.target.value)} style={input} placeholder="08xx-xxxx-xxxx" />
                    </div>
                    <div>
                        <label style={label}>Subjek *</label>
                        <input required value={form.subject} onChange={event => setField('subject', event.target.value)} style={input} placeholder="Ringkasan masalah" />
                    </div>
                </div>

                <div style={{ marginTop: 14 }}>
                    <label style={label}>Pesan *</label>
                    <textarea required minLength={10} maxLength={2000} value={form.message} onChange={event => setField('message', event.target.value)} style={{ ...input, minHeight: 150, resize: 'vertical' }} placeholder="Jelaskan masalah secara lengkap, termasuk batch atau ID produk jika terkait." />
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11, textAlign: 'right', marginTop: 5 }}>{form.message.length}/2000</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => setForm(initialForm)} disabled={saving} style={{ padding: '10px 16px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 800, cursor: 'pointer' }}>Bersihkan</button>
                    <button type="submit" disabled={saving} style={{ padding: '10px 18px', borderRadius: 9, background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', border: 'none', color: '#fff', fontWeight: 900, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.65 : 1 }}>
                        {saving ? 'Membuat Tiket...' : 'Buat Tiket'}
                    </button>
                </div>
            </form>
        </div>
    );
}
