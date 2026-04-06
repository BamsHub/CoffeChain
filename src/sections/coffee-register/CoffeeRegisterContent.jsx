'use client';
import { useState, useEffect } from 'react';
import { getExplorerTxUrl } from '@/lib/contractConfig';

export default function CoffeeRegisterContent() {
    const [form, setForm] = useState({
        name: '', origin: '', variety: 'Arabika', grade: 'Grade A',
        weightKg: '', farmerName: '', harvestDate: '', processMethod: 'Washed',
        roastLevel: 'Medium', certification: '', description: '',
    });
    const [traces, setTraces] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => { loadTraces(); }, []);

    async function loadTraces() {
        setLoading(true);
        try {
            const res = await fetch('/api/coffee-trace');
            const data = await res.json();
            if (data.success) setTraces(data.data);
        } catch { }
        setLoading(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true); setMsg(null);
        try {
            const res = await fetch('/api/coffee-trace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, weightKg: parseFloat(form.weightKg) || 0 }),
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'success', text: data.message, coffeeId: data.data.coffeeId, txSignature: data.data.txSignature });
                setForm({ name: '', origin: '', variety: 'Arabika', grade: 'Grade A', weightKg: '', farmerName: '', harvestDate: '', processMethod: 'Washed', roastLevel: 'Medium', certification: '', description: '' });
                loadTraces();
            } else {
                setMsg({ type: 'error', text: data.message });
            }
        } catch { setMsg({ type: 'error', text: 'Koneksi error' }); }
        setSubmitting(false);
    }

    const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const inp = (label, k, type = 'text', placeholder = '') => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: 'rgba(232,245,224,0.55)', fontWeight: 600 }}>{label}</label>
            <input type={type} value={form[k]} onChange={e => F(k, e.target.value)} placeholder={placeholder}
                style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-surface, rgba(255,255,255,0.04))', border: '1px solid var(--border-color, rgba(74,124,40,0.25))', color: 'var(--text-primary, #E8F5E0)', fontSize: 14, outline: 'none' }} />
        </div>
    );
    const sel = (label, k, options) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 12, color: 'rgba(232,245,224,0.55)', fontWeight: 600 }}>{label}</label>
            <select value={form[k]} onChange={e => F(k, e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-surface, rgba(255,255,255,0.04))', border: '1px solid var(--border-color, rgba(74,124,40,0.25))', color: 'var(--text-primary, #E8F5E0)', fontSize: 14, outline: 'none' }}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );

    const filtered = traces.filter(t =>
        !search || t.coffeeId?.toLowerCase().includes(search.toLowerCase()) ||
        t.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Register Kopi ke Blockchain
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, rgba(232,245,224,0.5))', marginBottom: 24 }}>
                Daftarkan kopi baru ke Solana Devnet. Data akan tercatat permanen dan bisa diverifikasi siapa saja.
            </p>

            {/* Message */}
            {msg && (
                <div style={{ padding: '14px 16px', borderRadius: 10, marginBottom: 20, background: msg.type === 'success' ? 'rgba(74,124,40,0.15)' : 'rgba(244,67,54,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(126,212,74,0.3)' : 'rgba(244,67,54,0.3)'}` }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: msg.type === 'success' ? '#7ED44A' : '#f44336', marginBottom: 4 }}>
                        {msg.type === 'success' ? '✅ Berhasil!' : '❌ Gagal'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary, rgba(232,245,224,0.6))' }}>{msg.text}</div>
                    {msg.coffeeId && <div style={{ fontSize: 12, marginTop: 6 }}>Coffee ID: <strong style={{ color: '#7ED44A' }}>{msg.coffeeId}</strong></div>}
                    {msg.txSignature && (
                        <a href={getExplorerTxUrl(msg.txSignature)} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#7c4dff', textDecoration: 'none', fontWeight: 600 }}>
                            🔗 Lihat di Solana Explorer
                        </a>
                    )}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 32, padding: 20, borderRadius: 14, background: 'var(--color-surface, rgba(255,255,255,0.02))', border: '1px solid var(--border-color, rgba(74,124,40,0.15))' }}>
                {inp('Nama Kopi *', 'name', 'text', 'Arabika Gayo Premium')}
                {inp('Asal / Daerah *', 'origin', 'text', 'Aceh Tengah')}
                {sel('Varietas', 'variety', ['Arabika', 'Robusta', 'Liberika', 'Excelsa'])}
                {sel('Grade', 'grade', ['Grade AA', 'Grade A', 'Grade B', 'Grade C', 'Specialty'])}
                {inp('Berat (kg)', 'weightKg', 'number', '10')}
                {inp('Nama Petani', 'farmerName', 'text', 'Ahmad Gayo')}
                {inp('Tanggal Panen', 'harvestDate', 'date')}
                {sel('Metode Proses', 'processMethod', ['Washed', 'Natural', 'Honey', 'Semi-Washed', 'Wet Hulled'])}
                {sel('Level Roast', 'roastLevel', ['Green Bean', 'Light', 'Medium', 'Medium-Dark', 'Dark'])}
                {inp('Sertifikasi', 'certification', 'text', 'Organic, Fair Trade')}
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 12, color: 'rgba(232,245,224,0.55)', fontWeight: 600 }}>Deskripsi</label>
                    <textarea value={form.description} onChange={e => F('description', e.target.value)} rows={3} placeholder="Deskripsi singkat tentang kopi ini..."
                        style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-surface, rgba(255,255,255,0.04))', border: '1px solid var(--border-color, rgba(74,124,40,0.25))', color: 'var(--text-primary, #E8F5E0)', fontSize: 14, outline: 'none', resize: 'vertical' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <button type="submit" disabled={submitting || !form.name || !form.origin}
                        style={{ padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg,#4A7C28,#7ED44A)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: submitting ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        {submitting ? '⏳ Mendaftarkan ke Solana...' : '🔗 Register ke Blockchain'}
                    </button>
                </div>
            </form>

            {/* List of registered coffees */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Kopi Terdaftar ({filtered.length})</h3>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari coffee ID atau nama..."
                    style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--color-surface, rgba(255,255,255,0.04))', border: '1px solid var(--border-color, rgba(74,124,40,0.2))', color: 'var(--text-primary, #E8F5E0)', fontSize: 13, outline: 'none', width: 220 }} />
            </div>

            {loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary, rgba(232,245,224,0.4))' }}>Memuat...</div>}

            <div style={{ display: 'grid', gap: 10 }}>
                {filtered.map(t => (
                    <div key={t.id} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--color-surface, rgba(255,255,255,0.02))', border: '1px solid var(--border-color, rgba(74,124,40,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#7ED44A', background: 'rgba(74,124,40,0.15)', padding: '4px 8px', borderRadius: 6, flexShrink: 0 }}>{t.coffeeId}</span>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary, rgba(232,245,224,0.4))' }}>{t.origin} · {t.variety} · {t.grade}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            {t.txSignature ? (
                                <a href={getExplorerTxUrl(t.txSignature)} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 11, color: '#7c4dff', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: 'rgba(124,77,255,0.1)', border: '1px solid rgba(124,77,255,0.25)' }}>
                                    🔗 Explorer
                                </a>
                            ) : (
                                <span style={{ fontSize: 11, color: '#FFB300', fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.25)' }}>⏳ Pending</span>
                            )}
                        </div>
                    </div>
                ))}
                {!loading && filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary, rgba(232,245,224,0.3))', fontSize: 13 }}>Belum ada kopi terdaftar</div>
                )}
            </div>
        </div>
    );
}
