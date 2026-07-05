'use client';

import { useState, useEffect, useCallback } from 'react';

const CATEGORY_MAP = {
    quality: { icon: '', label: 'Kualitas Produk' },
    delivery: { icon: '', label: 'Pengiriman' },
    payment: { icon: '', label: 'Pembayaran' },
    blockchain: { icon: '', label: 'Blockchain' },
    account: { icon: '', label: 'Akun' },
    suggestion: { icon: '', label: 'Saran & Masukan' },
    other: { icon: '', label: 'Lainnya' },
};

const STATUS_MAP = {
    new: { label: 'Baru', color: '#2196F3', bg: 'rgba(33,150,243,0.1)' },
    read: { label: 'Dibaca', color: '#FF9800', bg: 'rgba(255,152,0,0.1)' },
    replied: { label: 'Dibalas', color: '#4CAF50', bg: 'rgba(76,175,80,0.1)' },
    closed: { label: 'Selesai', color: '#9E9E9E', bg: 'rgba(158,158,158,0.1)' },
};

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminContactPage() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedMsg, setSelectedMsg] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [updating, setUpdating] = useState(false);

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('cc_token') : null;

    const fetchMessages = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const token = getToken();
            if (!token) { setError('Login sebagai admin diperlukan.'); setLoading(false); return; }

            const params = new URLSearchParams();
            if (filterStatus) params.set('status', filterStatus);
            if (filterCategory) params.set('category', filterCategory);

            const res = await fetch(`/api/contact?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Gagal memuat pesan');

            setMessages(data.messages || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterCategory]);

    useEffect(() => { fetchMessages(); }, [fetchMessages]);

    const handleUpdateStatus = async (id, newStatus) => {
        setUpdating(true);
        try {
            const token = getToken();
            const res = await fetch('/api/contact', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ id, status: newStatus, admin_notes: adminNotes || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setMessages((prev) => prev.map((m) => m.id === id ? { ...m, ...data.data } : m));
            if (selectedMsg?.id === id) setSelectedMsg({ ...selectedMsg, ...data.data });
        } catch (e) {
            setError(e.message);
        } finally {
            setUpdating(false);
        }
    };

    const openDetail = (msg) => {
        setSelectedMsg(msg);
        setAdminNotes(msg.admin_notes || '');
        if (msg.status === 'new') handleUpdateStatus(msg.id, 'read');
    };

    const countByStatus = (s) => messages.filter((m) => m.status === s).length;

    return (
        <div style={styles.wrapper}>
            {/* Header */}
            <header style={styles.header}>
                <a href="/" style={styles.logoLink}>
                    <span style={styles.logoIcon}></span>
                    <span style={styles.logoText}>CoffeeChain</span>
                </a>
                <div style={styles.headerRight}>
                    <span style={styles.headerBadge}> Admin</span>
                    <a href="/dashboard" style={styles.navLink}>Dashboard</a>
                </div>
            </header>

            <div style={styles.container}>
                {/* Title */}
                <div style={styles.titleSection}>
                    <h1 style={styles.title}> Pesan Pengaduan</h1>
                    <p style={styles.subtitle}>Kelola dan tanggapi pesan masuk dari pengguna</p>
                </div>

                {/* Stats */}
                <div style={styles.statsGrid}>
                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                        <div key={key} style={{ ...styles.statCard, borderLeft: `4px solid ${val.color}` }}
                             onClick={() => setFilterStatus(filterStatus === key ? '' : key)}>
                            <div style={{ ...styles.statCount, color: val.color }}>{countByStatus(key)}</div>
                            <div style={styles.statLabel}>{val.label}</div>
                        </div>
                    ))}
                    <div style={{ ...styles.statCard, borderLeft: '4px solid var(--color-primary-light)' }}
                         onClick={() => setFilterStatus('')}>
                        <div style={{ ...styles.statCount, color: 'var(--color-primary-light)' }}>{messages.length}</div>
                        <div style={styles.statLabel}>Total</div>
                    </div>
                </div>

                {/* Filters */}
                <div style={styles.filterRow}>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
                        <option value="">Semua Status</option>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={styles.filterSelect}>
                        <option value="">Semua Kategori</option>
                        {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                    <button onClick={fetchMessages} style={styles.refreshBtn}> Refresh</button>
                </div>

                {error && <div style={styles.errorMsg}> {error}</div>}

                {/* Layout */}
                <div style={styles.mainGrid}>
                    {/* Message List */}
                    <div style={styles.listCard}>
                        <div style={styles.listHeader}> Daftar Pesan ({messages.length})</div>
                        {loading ? (
                            <div style={styles.loadingBox}> Memuat...</div>
                        ) : messages.length === 0 ? (
                            <div style={styles.emptyBox}> Belum ada pesan masuk</div>
                        ) : (
                            <div style={styles.listBody}>
                                {messages.map((msg) => {
                                    const cat = CATEGORY_MAP[msg.category] || { icon: '', label: msg.category };
                                    const st = STATUS_MAP[msg.status] || STATUS_MAP.new;
                                    const isActive = selectedMsg?.id === msg.id;
                                    return (
                                        <div key={msg.id} onClick={() => openDetail(msg)}
                                             style={{ ...styles.msgItem, ...(isActive ? styles.msgItemActive : {}), ...(msg.status === 'new' ? styles.msgItemNew : {}) }}>
                                            <div style={styles.msgTop}>
                                                <span style={styles.msgCat}>{cat.icon} {cat.label}</span>
                                                <span style={{ ...styles.msgStatus, color: st.color, background: st.bg }}>{st.label}</span>
                                            </div>
                                            <div style={styles.msgSubject}>{msg.subject || msg.message?.slice(0, 60) || 'Tanpa subjek'}...</div>
                                            <div style={styles.msgMeta}>
                                                <span> {msg.name || 'Anonim'}</span>
                                                <span>{formatDate(msg.created_at)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Message Detail */}
                    <div style={styles.detailCard}>
                        {!selectedMsg ? (
                            <div style={styles.emptyDetail}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}></div>
                                <div style={{ color: 'var(--color-text-secondary)' }}>Pilih pesan untuk melihat detail</div>
                            </div>
                        ) : (
                            <>
                                <div style={styles.detailHeader}>
                                    <h3 style={styles.detailTitle}>{selectedMsg.subject || 'Pesan Pengaduan'}</h3>
                                    <span style={{ ...styles.msgStatus, color: STATUS_MAP[selectedMsg.status]?.color, background: STATUS_MAP[selectedMsg.status]?.bg }}>
                                        {STATUS_MAP[selectedMsg.status]?.label}
                                    </span>
                                </div>

                                <div style={styles.detailMeta}>
                                    <div style={styles.metaRow}><span style={styles.metaLabel}> Nama:</span> {selectedMsg.name || 'Anonim'}</div>
                                    <div style={styles.metaRow}><span style={styles.metaLabel}> Telepon:</span> {selectedMsg.phone || '-'}</div>
                                    <div style={styles.metaRow}><span style={styles.metaLabel}> Kategori:</span> {CATEGORY_MAP[selectedMsg.category]?.icon} {CATEGORY_MAP[selectedMsg.category]?.label}</div>
                                    <div style={styles.metaRow}><span style={styles.metaLabel}> Urgensi:</span>
                                        {selectedMsg.urgency === 'urgent' ? ' Urgent' : selectedMsg.urgency === 'high' ? ' Prioritas Tinggi' : ' Normal'}
                                    </div>
                                    <div style={styles.metaRow}><span style={styles.metaLabel}> Dikirim:</span> {formatDate(selectedMsg.created_at)}</div>
                                </div>

                                <div style={styles.detailMessage}>
                                    <div style={styles.detailMsgLabel}> Pesan:</div>
                                    <div style={styles.detailMsgText}>{selectedMsg.message}</div>
                                </div>

                                <div style={styles.adminSection}>
                                    <div style={styles.adminLabel}> Catatan Admin:</div>
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Tambahkan catatan internal..."
                                        style={styles.adminTextarea}
                                        rows={3}
                                    />
                                </div>

                                <div style={styles.actionRow}>
                                    {selectedMsg.status !== 'read' && (
                                        <button onClick={() => handleUpdateStatus(selectedMsg.id, 'read')} disabled={updating}
                                            style={{ ...styles.actionBtn, borderColor: '#FF9800', color: '#FF9800' }}>
                                             Tandai Dibaca
                                        </button>
                                    )}
                                    <button onClick={() => handleUpdateStatus(selectedMsg.id, 'replied')} disabled={updating}
                                        style={{ ...styles.actionBtn, borderColor: '#4CAF50', color: '#4CAF50' }}>
                                         Tandai Dibalas
                                    </button>
                                    <button onClick={() => handleUpdateStatus(selectedMsg.id, 'closed')} disabled={updating}
                                        style={{ ...styles.actionBtn, borderColor: '#9E9E9E', color: '#9E9E9E' }}>
                                         Selesai
                                    </button>
                                    {selectedMsg.phone && (
                                        <a href={`https://wa.me/${selectedMsg.phone.replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                                           target="_blank" rel="noopener noreferrer" style={styles.waReplyBtn}>
                                             Balas via WA
                                        </a>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
const styles = {
    wrapper: { minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' },

    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 28px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card)' },
    logoLink: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
    logoIcon: { fontSize: 24 },
    logoText: { fontSize: 18, fontWeight: 700, color: 'var(--color-text)' },
    headerRight: { display: 'flex', alignItems: 'center', gap: 14 },
    headerBadge: { padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(255, 152, 0, 0.1)', color: '#FF9800', border: '1px solid rgba(255, 152, 0, 0.25)' },
    navLink: { fontSize: 14, color: 'var(--color-text-secondary)', textDecoration: 'none' },

    container: { maxWidth: 1200, margin: '0 auto', padding: '28px 24px' },

    titleSection: { marginBottom: 24 },
    title: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
    subtitle: { fontSize: 14, color: 'var(--color-text-secondary)' },

    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 },
    statCard: { padding: '16px 18px', borderRadius: 12, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.2s ease' },
    statCount: { fontSize: 28, fontWeight: 700 },
    statLabel: { fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 },

    filterRow: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    filterSelect: { padding: '8px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 13, outline: 'none' },
    refreshBtn: { padding: '8px 18px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', color: 'var(--color-text)', fontSize: 13, cursor: 'pointer', fontWeight: 500 },

    errorMsg: { padding: '10px 16px', borderRadius: 10, fontSize: 13, color: '#f87171', background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.15)', marginBottom: 16 },

    mainGrid: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, minHeight: 500 },

    listCard: { borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    listHeader: { padding: '14px 18px', borderBottom: '1px solid var(--color-border)', fontSize: 14, fontWeight: 600, background: 'var(--color-bg-card2)' },
    listBody: { flex: 1, overflowY: 'auto', maxHeight: 600 },
    loadingBox: { padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' },
    emptyBox: { padding: 40, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 },

    msgItem: { padding: '14px 18px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.15s ease' },
    msgItemActive: { background: 'rgba(74, 124, 40, 0.08)', borderLeft: '3px solid var(--color-primary-light)' },
    msgItemNew: { borderLeft: '3px solid #2196F3' },
    msgTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    msgCat: { fontSize: 12, color: 'var(--color-text-secondary)' },
    msgStatus: { padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
    msgSubject: { fontSize: 14, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6, lineHeight: 1.4 },
    msgMeta: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' },

    detailCard: { borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
    emptyDetail: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },

    detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    detailTitle: { fontSize: 18, fontWeight: 700 },

    detailMeta: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', padding: '16px', borderRadius: 12, background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)' },
    metaRow: { fontSize: 13, color: 'var(--color-text)' },
    metaLabel: { fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: 6 },

    detailMessage: { padding: 16, borderRadius: 12, background: 'var(--color-bg)', border: '1px solid var(--color-border)' },
    detailMsgLabel: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 },
    detailMsgText: { fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' },

    adminSection: {},
    adminLabel: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 },
    adminTextarea: { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit' },

    actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
    actionBtn: { padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'transparent', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s ease' },
    waReplyBtn: { padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', border: 'none', textDecoration: 'none', textAlign: 'center', cursor: 'pointer' },
};
