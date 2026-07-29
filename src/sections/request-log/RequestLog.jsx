'use client';
/**
 * RequestLog — standalone section (src/sections/request-log/)
 * Separate from products/ to avoid merge conflicts in production.
 * Route: /products/requests  (src/app/products/requests/page.jsx)
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const STATUS_CONFIG = {
    pending:   { label: 'Menunggu', color: '#F5A623', bg: 'rgba(245,166,35,0.12)' },
    published: { label: 'Disetujui', color: '#4CAF50', bg: 'rgba(76,175,80,0.12)' },
    rejected:  { label: 'Ditolak',  color: '#f44336', bg: 'rgba(244,67,54,0.12)' },
};

// ---------------------------------------------------------------------------
export default function RequestLog() {
    const { user, getToken } = useAuth();
    const canApprove = ['developer', 'admin', 'koperasi'].includes(user?.role);

    const [pending,    setPending]   = useState([]);
    const [history,    setHistory]   = useState([]);
    const [loading,    setLoading]   = useState(true);
    const [activeTab,  setActiveTab] = useState('pending');
    const [approving,  setApproving] = useState(null);
    const [msg,        setMsg]       = useState(null);
    const [search,     setSearch]    = useState('');

    // ── fetch ──────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const [pendRes, allRes] = await Promise.all([
                fetch('/api/products?status=pending_certification', { headers, cache: 'no-store' }),
                fetch('/api/products', { headers, cache: 'no-store' }),
            ]);
            const pendData = await pendRes.json();
            const allData  = await allRes.json();

            setPending(pendData.data || []);

            const approvedProducts = (allData.data || []).filter(p =>
                p.status === 'published' || p.status === 'rejected'
            );
            const histItems = approvedProducts.map(p => {
                return {
                    id:              p.id,
                    productId:       p.id,
                    productName:     p.name,
                    origin:          p.origin,
                    variety:         p.variety,
                    grade:           p.grade,
                    roast:           p.roast,
                    stock:           p.stock,
                    submittedByName: p.submittedByName || 'Petani',
                    submittedByRole: p.submittedByRole || 'farmer',
                    submittedAt:     p.submittedAt || p.createdAt || null,
                    status:          p.status,
                    approvedByName:  p.approvedByName || '—',
                    approvedAt:      p.approvedAt || null,
                    rejectedReason:  p.rejectedReason || null,
                    type: 'add',
                };
            });

            setHistory(histItems.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)));
        } catch { /* offline */ }
        setLoading(false);
    }, [getToken]);

    useEffect(() => { load(); }, [load]);

    // ── approve / reject ───────────────────────────────────────────────────
    function handleApprove(product) {
        window.location.assign(`/coffee-register?productId=${encodeURIComponent(product.id)}`);
    }

    async function handleReject(product) {
        const reason = prompt(`Alasan penolakan untuk "${product.name}"?`);
        if (reason === null) return;
        if (!window.confirm(`Yakin ingin menolak produk "${product.name}"? Produk akan dikembalikan ke petani untuk diperbaiki.`)) return;
        setApproving(`reject-${product.id}`);
        setMsg(null);
        try {
            const token = await getToken();
            const res  = await fetch('/api/products', {
                method:  'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    id:             product.id,
                    status:         'rejected',
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

    // ── filtered lists ─────────────────────────────────────────────────────
    const filteredPending = pending.filter(p =>
        !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.submittedByName?.toLowerCase().includes(search.toLowerCase())
    );
    const filteredHistory = history.filter(p =>
        !search ||
        p.productName?.toLowerCase().includes(search.toLowerCase()) ||
        p.submittedByName?.toLowerCase().includes(search.toLowerCase()) ||
        p.approvedByName?.toLowerCase().includes(search.toLowerCase())
    );

    // ── style helpers ──────────────────────────────────────────────────────
    const card  = { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 20 };
    const inp   = { padding: '9px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
    const badge = (color, bg) => ({ fontSize: 11, padding: '3px 9px', borderRadius: 100, background: bg || `${color}18`, color, border: `1px solid ${color}44`, fontWeight: 700 });

    // ── guard ──────────────────────────────────────────────────────────────
    if (!canApprove) {
        return (
            <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ ...card, textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
                        style={{ margin: '0 auto 12px', display: 'block', opacity: 0.35 }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <p style={{ fontSize: 14 }}>Halaman ini hanya dapat diakses oleh <strong>Koperasi</strong> atau <strong>Developer</strong>.</p>
                </div>
            </div>
        );
    }

    // ── render ─────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1100, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
                        Request Log Produk
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        Permintaan penambahan / edit produk dari petani — persetujuan &amp; riwayat lengkap
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {[
                        { count: pending.length, label: 'Menunggu', color: '#F5A623', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.25)' },
                        { count: history.filter(h => h.status === 'published').length, label: 'Disetujui', color: '#4CAF50', bg: 'rgba(76,175,80,0.1)', border: 'rgba(76,175,80,0.25)' },
                        { count: history.filter(h => h.status === 'rejected').length,  label: 'Ditolak',   color: '#f44336', bg: 'rgba(244,67,54,0.08)', border: 'rgba(244,67,54,0.2)' },
                    ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '8px 18px' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toast */}
            {msg && (
                <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10,
                    background: msg.type === 'ok' ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)',
                    border: `1px solid ${msg.type === 'ok' ? 'rgba(76,175,80,0.35)' : 'rgba(244,67,54,0.35)'}`,
                    color: msg.type === 'ok' ? '#4CAF50' : '#f44336', fontSize: 13, fontWeight: 600 }}>
                    {msg.type === 'ok' ? '✓ ' : '✕ '}{msg.text}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {[
                    { key: 'pending', label: 'Menunggu Persetujuan', count: pending.length },
                    { key: 'history', label: 'Riwayat Persetujuan',  count: history.length },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        style={{ padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', border: 'none',
                            display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s',
                            background: activeTab === tab.key ? 'rgba(126,212,74,0.15)' : 'rgba(255,255,255,0.04)',
                            color: activeTab === tab.key ? '#7ED44A' : 'var(--color-text-muted)',
                            outline: activeTab === tab.key ? '1px solid rgba(126,212,74,0.4)' : '1px solid var(--color-border)',
                        }}>
                        {tab.label}
                        {tab.count > 0 && (
                            <span style={{ background: activeTab === tab.key ? '#7ED44A' : '#555',
                                color: activeTab === tab.key ? '#0a1a0a' : '#ccc',
                                borderRadius: '50%', width: 20, height: 20, fontSize: 10, fontWeight: 800,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
                <input style={{ ...inp, maxWidth: 360, width: '100%' }}
                    placeholder="Cari nama produk atau petani..."
                    value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* ── PENDING TAB ─────────────────────────────────────────────────────── */}
            {activeTab === 'pending' && (
                loading ? (
                    <div style={{ ...card, textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>Memuat...</div>
                ) : filteredPending.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '56px 0' }}>
                        <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.3"
                            style={{ margin: '0 auto 14px', display: 'block', opacity: 0.3 }}>
                            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                        </svg>
                        <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Tidak ada permintaan yang menunggu persetujuan.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {filteredPending.map(p => (
                            <div key={p.id} style={{ ...card, border: '1px solid rgba(245,166,35,0.35)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 220 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text)' }}>{p.name}</div>
                                            <span style={badge('#F5A623')}>Menunggu</span>
                                            <span style={badge('#7ED44A', 'rgba(126,212,74,0.08)')}>{p.variety || 'Arabika'}</span>
                                            {p.grade && <span style={badge('#a855f7', 'rgba(168,85,247,0.08)')}>{p.grade}</span>}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                            {p.origin} · {p.roast}
                                        </div>
                                        <div style={{ fontSize: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '4px 16px' }}>
                                            <div><span style={{ color: 'var(--color-text-muted)' }}>Petani:</span> <strong style={{ color: 'var(--color-text)' }}>{p.submittedByName || 'Petani'}</strong></div>
                                            <div><span style={{ color: 'var(--color-text-muted)' }}>Stok:</span> <strong style={{ color: 'var(--color-text)' }}>{p.stock ?? 0} unit</strong></div>
                                            <div><span style={{ color: 'var(--color-text-muted)' }}>Tanggal:</span> <strong style={{ color: 'var(--color-text)' }}>{p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</strong></div>
                                            {p.description && <div style={{ gridColumn: '1/-1', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: 4 }}>"{p.description}"</div>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                        <button onClick={() => handleApprove(p)} disabled={!!approving}
                                            style={{ padding: '9px 20px', background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: approving ? 0.6 : 1 }}>
                                            Register Solana
                                        </button>
                                        <button onClick={() => handleReject(p)} disabled={!!approving}
                                            style={{ padding: '9px 20px', background: 'rgba(244,67,54,0.1)', color: '#f44336', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: approving ? 0.6 : 1 }}>
                                            {approving === `reject-${p.id}` ? 'Memproses...' : '✕ Tolak'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── HISTORY TAB ──────────────────────────────────────────────────────── */}
            {activeTab === 'history' && (
                loading ? (
                    <div style={{ ...card, textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>Memuat...</div>
                ) : filteredHistory.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '56px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
                        Belum ada riwayat persetujuan.
                    </div>
                ) : (
                    <div style={{ ...card, overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {['Nama Produk', 'Asal / Varietas', 'Petani / Pemohon', 'Tgl Permintaan', 'Diproses oleh', 'Tgl Diproses', 'Status'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHistory.map((item, i) => {
                                    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                                    return (
                                        <tr key={item.id || i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                                                <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{item.productName || item.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', gap: 4 }}>
                                                    {item.grade && <span style={{ background: 'rgba(126,212,74,0.1)', color: '#7ED44A', borderRadius: 4, padding: '1px 6px' }}>{item.grade}</span>}
                                                    {item.roast && <span style={{ background: 'rgba(245,166,35,0.08)', color: '#F5A623', borderRadius: 4, padding: '1px 6px' }}>{item.roast}</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px', verticalAlign: 'middle', color: 'var(--color-text-muted)' }}>
                                                <div>{item.origin || '—'}</div>
                                                <div style={{ fontSize: 11 }}>{item.variety || '—'}</div>
                                            </td>
                                            <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.submittedByName || '—'}</div>
                                                <div style={{ fontSize: 11, color: '#7ED44A' }}>{item.submittedByRole || 'farmer'}</div>
                                            </td>
                                            <td style={{ padding: '14px', verticalAlign: 'middle', color: 'var(--color-text-muted)', fontSize: 12 }}>
                                                {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            </td>
                                            <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                                                {item.approvedByName && item.approvedByName !== '—' ? (
                                                    <>
                                                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.approvedByName}</div>
                                                        <div style={{ fontSize: 11, color: item.status === 'published' ? '#4CAF50' : '#f44336' }}>
                                                            {item.status === 'published' ? 'Menyetujui' : 'Menolak'}
                                                        </div>
                                                    </>
                                                ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                                            </td>
                                            <td style={{ padding: '14px', verticalAlign: 'middle', color: 'var(--color-text-muted)', fontSize: 12 }}>
                                                {item.approvedAt ? new Date(item.approvedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            </td>
                                            <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                                                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 100, background: sc.bg, color: sc.color, border: `1px solid ${sc.color}44`, fontWeight: 700 }}>
                                                    {sc.label}
                                                </span>
                                                {item.rejectedReason && (
                                                    <div style={{ fontSize: 10, color: '#f44336', marginTop: 3, maxWidth: 160, fontStyle: 'italic' }}>"{item.rejectedReason}"</div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}
