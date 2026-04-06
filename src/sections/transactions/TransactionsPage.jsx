'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AddTransactionModal from '@/sections/dashboard/AddTransactionModal';
import styles from './TransactionsPage.module.css';

// Solana Explorer URL builder
function explorerUrl(hashOrSig) {
    if (!hashOrSig || hashOrSig.startsWith('0x') || hashOrSig.includes('...')) return null;
    // Jika ini adalah signature Solana asli (base58, panjang > 50 char)
    if (hashOrSig.length >= 60) {
        return `https://explorer.solana.com/tx/${hashOrSig}?cluster=devnet`;
    }
    return null;
}

const STATUS_COLORS = {
    Confirmed: '#4CAF50',
    confirmed: '#4CAF50',
    paid: '#4CAF50',
    Pending: '#FF9800',
    pending: '#FF9800',
    Failed: '#f44336',
    failed: '#f44336',
    expired: '#888',
};

export default function TransactionsPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('Semua');
    const [deletingId, setDeletingId] = useState(null);

    const canDelete = user?.role === 'developer';
    const canSeeDetails = user?.role === 'developer' || user?.role === 'koperasi';
    const canAddTx = user?.role === 'developer' || user?.role === 'koperasi';
    const [showAddModal, setShowAddModal] = useState(false);
    const [dateRange,   setDateRange]   = useState('all');  // 'all' | '30d'
    const [clickedDay,  setClickedDay]  = useState(null);   // 'YYYY-MM-DD' | null
    const todayStr = new Date().toISOString().slice(0, 10);

    // Fetch data dari API
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [txRes, orderRes] = await Promise.all([
                fetch('/api/transactions'),
                fetch('/api/orders'),
            ]);
            const txData = await txRes.json();
            const orderData = await orderRes.json();
            setTransactions(txData.data || []);
            // developer & koperasi melihat SEMUA order; lainnya hanya paid
            setOrders(orderData.data || []);
        } catch (e) {
            console.error('Failed to load data:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // developer & koperasi lihat SEMUA; farmer lihat order mereka sendiri (by email); lainnya hanya paid
    const ordersToShow = canSeeDetails
        ? orders
        : user?.role === 'farmer'
            ? orders.filter(o => o.buyerEmail?.toLowerCase() === user?.email?.toLowerCase() || o.userId === user?.id)
            : orders.filter(o => o.status === 'paid');

    // Gabungkan transaksi + orders sebagai unified list

    const allItems = [
        // Orders dari landing page (Rupiah & Solana)
        ...ordersToShow.map(o => ({
            id: o.orderId || o.id,
            hash: o.txSignature || o.orderId,
            txSignature: o.txSignature,
            farmer: o.userName || 'Pelanggan',
            buyerEmail: o.buyerEmail || o.userEmail || '—',
            buyerPhone: o.buyerPhone || '—',
            location: '—',
            weight: `${o.weight || 0}g`,
            variety: o.productName || '—',
            amount: `Rp ${(o.totalPrice || 0).toLocaleString('id-ID')}`,
            paymentMethod: o.paymentMethod || '—',
            paymentCurrency: o.paymentCurrency || (o.walletAddress ? 'SOL' : 'IDR'),
            walletAddress: o.walletAddress || '—',
            status: o.status === 'paid' ? 'Confirmed' : o.status,
            time: new Date(o.createdAt || Date.now()).toLocaleString('id-ID'),
            rawDate: (o.createdAt || o.paidAt || '').slice(0, 10),
            block: '—',
            source: 'order',
        })),
        // Transaksi kopi tradisional + approval events
        ...transactions.map(t => ({
            id: t.id,
            hash: t.hash,
            txSignature: null,
            farmer: t.type === 'product_approval' ? `${t.farmer} (Petani)` : t.farmer,
            buyerEmail: t.email || '—',
            buyerPhone: t.phone || '—',
            location: t.location || '—',
            weight: t.type === 'product_approval' ? '—' : `${t.weight} kg`,
            variety: t.type === 'product_approval' ? `📦 ${t.productName || 'Produk'}` : t.variety,
            amount: t.type === 'product_approval'
                ? `Disetujui oleh ${t.approvedBy || 'Admin'}`
                : `Rp ${(t.amount || 0).toLocaleString('id-ID')}`,
            paymentMethod: t.type === 'product_approval' ? 'approval' : 'transfer',
            paymentCurrency: 'IDR',
            walletAddress: '—',
            status: t.status,
            time: new Date(t.createdAt || t.timestamp || Date.now()).toLocaleString('id-ID'),
            rawDate: (t.createdAt || t.timestamp || '').slice(0, 10),
            block: t.block || '—',
            source: t.type === 'product_approval' ? 'approval' : 'transaction',
            isApproval: t.type === 'product_approval',
            approvalNote: t.note || null,
            farmerId: t.farmerId || null,
        })),
    ];

    // Filter berdasarkan role
    // Farmer: lihat transaksi dengan nama/email mereka + approval event yang terkait mereka
    const visibleItems = user?.role === 'farmer'
        ? allItems.filter(tx => {
            if (tx.isApproval && tx.farmerId === user?.id) return true;
            if (tx.isApproval && tx.farmer?.includes(user?.name || user?.email || '')) return true;
            const buyerMatch = tx.buyerEmail && user?.email && tx.buyerEmail.toLowerCase() === user.email.toLowerCase();
            const nameMatch = tx.farmer && (user?.name || user?.email) &&
                (tx.farmer.toLowerCase().includes((user.name || '').toLowerCase()) ||
                 tx.farmer.toLowerCase().includes((user.email || '').toLowerCase()));
            return buyerMatch || nameMatch;
          })
        : allItems;

    // Filter UI
    const filtered = visibleItems.filter(tx => {
        const q = search.toLowerCase();
        const matchSearch = !q || 
            tx.farmer?.toLowerCase().includes(q) ||
            tx.hash?.toLowerCase().includes(q) ||
            tx.variety?.toLowerCase().includes(q) ||
            tx.location?.toLowerCase().includes(q) ||
            tx.buyerEmail?.toLowerCase().includes(q) ||
            tx.buyerPhone?.toLowerCase().includes(q) ||
            tx.paymentMethod?.toLowerCase().includes(q);
        const matchFilter = filter === 'Semua' || tx.status === filter ||
            (filter === 'Confirmed' && tx.status === 'paid');
        return matchSearch && matchFilter;
    });

    function handleTransactionAdded(newTx) {
        setTransactions(prev => [newTx, ...prev]);
        setShowAddModal(false);
    }

    async function handleDelete(item) {
        if (!canDelete) return;
        if (!confirm(`Hapus transaksi ${item.hash}?`)) return;
        setDeletingId(item.id);
        try {
            const endpoint = item.source === 'order'
                ? `/api/orders?id=${item.id}`
                : `/api/transactions?id=${item.id}`;
            await fetch(endpoint, { method: 'DELETE' });
            await fetchData();
        } catch (e) {
            alert('Gagal menghapus: ' + e.message);
        } finally {
            setDeletingId(null);
        }
    }

    const counts = {
        total: allItems.length,
        confirmed: allItems.filter(t => ['Confirmed', 'paid', 'confirmed'].includes(t.status)).length,
        pending: allItems.filter(t => ['Pending', 'pending'].includes(t.status)).length,
        failed: allItems.filter(t => ['Failed', 'failed', 'expired'].includes(t.status)).length,
    };

    // ── Date range filtering ──────────────────────────────────────────────
    const thirtyDaysAgoStr = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        return d.toISOString().slice(0, 10);
    })();

    // Items after status/search filter + date range
    const dateFiltered = (() => {
        if (clickedDay) return filtered.filter(tx => tx.rawDate === clickedDay);
        if (dateRange === '30d') return filtered.filter(tx => tx.rawDate >= thirtyDaysAgoStr);
        return filtered;
    })();

    // Per-day summary for 30d view (only when not drilled into a day)
    const groupedByDay = (dateRange === '30d' && !clickedDay)
        ? Object.entries(
            dateFiltered.reduce((acc, tx) => {
                const d = tx.rawDate || 'unknown';
                if (!acc[d]) acc[d] = [];
                acc[d].push(tx);
                return acc;
            }, {})
          ).sort(([a], [b]) => b.localeCompare(a))
        : null;

    // Stats for clickedDay banner
    const dayTotal   = clickedDay ? dateFiltered.length : 0;
    const dayRevenue = clickedDay
        ? dateFiltered.reduce((s, tx) => {
            const num = parseInt((tx.amount || '').replace(/[^0-9]/g, ''), 10) || 0;
            return s + num;
          }, 0)
        : 0;

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Transaksi Blockchain</h1>
                    <p className={styles.pageSubtitle}>
                        Riwayat lengkap semua transaksi kopi on-chain
                        {user?.role === 'farmer' && <span style={{ color: '#F5A623', marginLeft: 6 }}>— Hanya transaksi Anda</span>}
                    </p>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    {/* Date range toggle */}
                    <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:9, padding:3, border:'1px solid var(--color-border)' }}>
                        {[['all','Semua'],['30d','30 Hari']].map(([val,label]) => (
                            <button key={val} onClick={() => { setDateRange(val); setClickedDay(null); }}
                                style={{ padding:'6px 14px', borderRadius:7, fontSize:12, fontWeight:700, border:'none', cursor:'pointer', transition:'all 0.15s',
                                    background: dateRange === val ? 'var(--color-primary)' : 'transparent',
                                    color: dateRange === val ? '#fff' : 'var(--color-text-muted)' }}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {canAddTx && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:10, background:'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color:'#fff', fontWeight:700, border:'none', cursor:'pointer', fontSize:13 }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                            Tambah Transaksi DB
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Chips */}
            <div className={styles.summaryRow}>
                {[
                    { label: 'Total', val: counts.total, color: '#4A7C28' },
                    { label: 'Confirmed', val: counts.confirmed, color: '#4CAF50' },
                    { label: 'Pending', val: counts.pending, color: '#FF9800' },
                    { label: 'Failed', val: counts.failed, color: '#f44336' },
                ].map((s, i) => (
                    <div key={i} className={styles.summaryChip} style={{ borderColor: s.color + '44' }}>
                        <span className={styles.summaryVal} style={{ color: s.color }}>{s.val}</span>
                        <span className={styles.summaryLabel}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Clicked-day banner */}
            {clickedDay && (
                <div style={{ margin:'0 0 16px', padding:'14px 18px', borderRadius:12,
                    background:'rgba(126,212,74,0.08)', border:'1px solid rgba(126,212,74,0.35)',
                    display:'flex', flexWrap:'wrap', alignItems:'center', gap:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#7ED44A" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#7ED44A" strokeWidth="2" strokeLinecap="round"/></svg>
                        <span style={{ fontSize:13, fontWeight:700, color:'#7ED44A' }}>
                            {new Date(clickedDay + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                        </span>
                    </div>
                    <span style={{ fontSize:13, color:'var(--color-text-muted)' }}>
                        <strong style={{ color:'var(--color-text)' }}>{dayTotal}</strong> transaksi &nbsp;·&nbsp;
                        Revenue: <strong style={{ color:'#7ED44A' }}>Rp {dayRevenue.toLocaleString('id-ID')}</strong>
                    </span>
                    {clickedDay === todayStr && (
                        <span style={{ fontSize:11, padding:'2px 9px', borderRadius:100,
                            background:'rgba(0,212,255,0.12)', color:'#00D4FF',
                            border:'1px solid rgba(0,212,255,0.3)', fontWeight:700 }}>
                            Hari Ini
                        </span>
                    )}
                    <button onClick={() => setClickedDay(null)}
                        style={{ marginLeft:'auto', fontSize:12, color:'var(--color-text-muted)', background:'none', border:'none', cursor:'pointer', padding:'4px 8px', borderRadius:6 }}>
                        ✕ Tutup
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className={styles.filterRow}>
                <div className={styles.searchBox}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    <input placeholder="Cari hash, petani, lokasi, produk..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
                </div>
                <div className={styles.filterBtns}>
                    {['Semua', 'Confirmed', 'Pending', 'Failed'].map(f => (
                        <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.activeFilter : ''}`} onClick={() => setFilter(f)}>{f}</button>
                    ))}
                </div>
            </div>

            {/* 30-day per-day summary list (drill-down) */}
            {groupedByDay && (
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--color-text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>
                        Klik tanggal untuk melihat detail transaksi hari tersebut
                    </div>
                    {groupedByDay.length === 0 ? (
                        <div style={{ padding:'24px', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>Tidak ada transaksi dalam 30 hari terakhir.</div>
                    ) : groupedByDay.map(([day, items]) => {
                        const dayRevTotal = items.reduce((s, tx) => s + (parseInt((tx.amount || '').replace(/[^0-9]/g,''), 10) || 0), 0);
                        const confirmed   = items.filter(tx => ['Confirmed','paid','confirmed'].includes(tx.status)).length;
                        const isToday     = day === todayStr;
                        return (
                            <button key={day} onClick={() => setClickedDay(day)}
                                style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:11,
                                    background: isToday ? 'rgba(126,212,74,0.07)' : 'rgba(255,255,255,0.03)',
                                    border: isToday ? '1px solid rgba(126,212,74,0.35)' : '1px solid var(--color-border)',
                                    cursor:'pointer', textAlign:'left', width:'100%', transition:'all 0.15s' }}>
                                <div style={{ minWidth:110 }}>
                                    <div style={{ fontSize:13, fontWeight:700, color: isToday ? '#7ED44A' : 'var(--color-text)' }}>
                                        {isToday ? '⚡ Hari Ini' : new Date(day + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
                                    </div>
                                    <div style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:2 }}>{day}</div>
                                </div>
                                <div style={{ display:'flex', gap:20, flex:1, flexWrap:'wrap' }}>
                                    <div><div style={{ fontSize:18, fontWeight:800, color:'#00D4FF' }}>{items.length}</div><div style={{ fontSize:10, color:'var(--color-text-muted)' }}>Transaksi</div></div>
                                    <div><div style={{ fontSize:18, fontWeight:800, color:'#4CAF50' }}>{confirmed}</div><div style={{ fontSize:10, color:'var(--color-text-muted)' }}>Confirmed</div></div>
                                    <div><div style={{ fontSize:14, fontWeight:700, color:'#7ED44A' }}>Rp {dayRevTotal >= 1_000_000 ? `${(dayRevTotal/1_000_000).toFixed(1)} Jt` : dayRevTotal.toLocaleString('id-ID')}</div><div style={{ fontSize:10, color:'var(--color-text-muted)' }}>Revenue</div></div>
                                </div>
                                <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>Klik untuk detail →</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Table — shown when not in 30d group view OR when a day is selected */}
            {(!groupedByDay || clickedDay) && <div className={styles.card}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                        <div style={{ width: 36, height: 36, border: '3px solid rgba(74,124,40,0.2)', borderTopColor: '#7ED44A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                        Memuat riwayat transaksi...
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Hash / TX</th>
                                    <th>Pembeli / Petani</th>
                                    {canSeeDetails && <th>Email</th>}
                                    {canSeeDetails && <th>No. HP</th>}
                                    {canSeeDetails && <th>Metode Bayar</th>}
                                    <th>Produk</th>
                                    <th>Berat</th>
                                    <th>Nilai</th>
                                    <th>Status</th>
                                    <th>Waktu</th>
                                    {canDelete && <th>Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {dateFiltered.length === 0 && (
                                    <tr><td colSpan={canDelete ? (canSeeDetails ? 11 : 8) : (canSeeDetails ? 10 : 7)} style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.3)' }}>Tidak ada transaksi ditemukan</td></tr>
                                )}
                                {dateFiltered.map((tx, i) => {
                                    const solUrl = explorerUrl(tx.txSignature || tx.hash);
                                    const statusColor = STATUS_COLORS[tx.status] || '#888';
                                    const isApproval = tx.isApproval || tx.source === 'approval';
                                    const pmLabel = {
                                        'transfer': 'Transfer SOL',
                                        'qr': 'Solana Pay QR',
                                        'transfer-idr': 'Transfer Bank IDR',
                                        'qr-idr': 'QR Code IDR',
                                        'approval': 'Persetujuan Produk',
                                    }[tx.paymentMethod] || tx.paymentMethod || '—';
                                    return (
                                        <tr key={tx.id || i} style={isApproval ? { background: 'rgba(74,124,40,0.06)', borderLeft: '3px solid rgba(126,212,74,0.4)' } : undefined}>
                                            <td>
                                                {isApproval ? (
                                                    <span className={styles.txHash} style={{ color: '#7ED44A', fontSize: 11 }}>APPROVAL</span>
                                                ) : solUrl ? (
                                                    <a href={solUrl} target="_blank" rel="noreferrer" className={styles.txHashLink}>
                                                        <span className={styles.txHash}>{(tx.txSignature || tx.hash).slice(0, 12)}...</span>
                                                        <span className={styles.explorerIcon}>↗</span>
                                                    </a>
                                                ) : (
                                                    <span className={styles.txHash}>{(tx.hash || '').slice(0, 14)}</span>
                                                )}
                                            </td>
                                            <td className={styles.bold} style={isApproval ? { color: '#7ED44A' } : undefined}>{tx.farmer}</td>
                                            {canSeeDetails && <td className={styles.muted} style={{ fontSize:12 }}>{tx.buyerEmail}</td>}
                                            {canSeeDetails && <td className={styles.muted} style={{ fontSize:12 }}>{tx.buyerPhone}</td>}
                                            {canSeeDetails && (
                                                <td>
                                                    <span style={{ fontSize:11, padding:'2px 7px', borderRadius:100,
                                                        background: isApproval ? 'rgba(126,212,74,0.12)' : tx.paymentCurrency==='SOL' ? 'rgba(153,69,255,0.12)' : 'rgba(245,166,35,0.12)',
                                                        color: isApproval ? '#7ED44A' : tx.paymentCurrency==='SOL' ? '#9945FF' : '#F5A623',
                                                        border: `1px solid ${isApproval ? 'rgba(126,212,74,0.3)' : tx.paymentCurrency==='SOL' ? 'rgba(153,69,255,0.3)' : 'rgba(245,166,35,0.3)'}`,
                                                        fontWeight:600 }}>
                                                        {pmLabel}
                                                    </span>
                                                </td>
                                            )}
                                            <td className={styles.muted}>{isApproval ? <span style={{ color: '#7ED44A', fontWeight: 600 }}>{tx.variety}</span> : tx.variety}</td>
                                            <td className={styles.muted}>{tx.weight}</td>
                                            <td className={styles.amount} style={isApproval ? { fontSize: 11, color: '#7ED44A' } : undefined}>{tx.amount}</td>
                                            <td>
                                                <span className={styles.badge} style={{ background: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44` }}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className={styles.time}>{tx.time}</td>
                                            {canDelete && (
                                                <td>
                                                    <button className={styles.deleteBtn} onClick={() => handleDelete(tx)} disabled={deletingId === tx.id}>
                                                        {deletingId === tx.id ? '...' : '×'}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            }
            {/* Add Transaction Modal */}
            {showAddModal && canAddTx && (
                <AddTransactionModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={handleTransactionAdded}
                />
            )}
        </div>
    );
}
