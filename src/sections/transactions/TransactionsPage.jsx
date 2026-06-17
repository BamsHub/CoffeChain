'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getExplorerTxUrl } from '@/lib/contractConfig';
import styles from './TransactionsPage.module.css';

function explorerUrl(hashOrSig) {
    if (!hashOrSig || hashOrSig.startsWith('0x') || hashOrSig.includes('...')) return null;
    if (hashOrSig.length >= 60) {
        return getExplorerTxUrl(hashOrSig);
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

function formatWeight(tx) {
    const w = tx.weight ?? 0;
    return tx.weightUnit === 'g' ? `${w}g` : `${w} kg`;
}

function formatAmount(tx) {
    const amount = Number(tx.amount) || 0;
    if (tx.source === 'order') return `Rp ${amount.toLocaleString('id-ID')}`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default function TransactionsPage() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('Semua');
    const [deletingId, setDeletingId] = useState(null);
    const realtimeRef = useRef(null);

    const canDelete = user?.role === 'developer';

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/transactions?includeOrders=true');
            const data = await res.json();
            setItems(data.data || []);
        } catch (e) {
            console.error('Failed to load data:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('transactions-page-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchData)
            .subscribe();
        realtimeRef.current = channel;

        const poll = setInterval(fetchData, 15000);
        const onFocus = () => fetchData();
        window.addEventListener('focus', onFocus);

        return () => {
            if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
            clearInterval(poll);
            window.removeEventListener('focus', onFocus);
        };
    }, [fetchData]);

    const visibleItems = user?.role === 'farmer'
        ? items.filter(tx => tx.farmer?.toLowerCase() === user?.name?.toLowerCase() || tx.farmer?.includes(user?.name || ''))
        : items;

    const filtered = visibleItems.filter(tx => {
        const q = search.toLowerCase();
        const matchSearch = tx.farmer?.toLowerCase().includes(q) ||
            tx.hash?.toLowerCase().includes(q) ||
            tx.variety?.toLowerCase().includes(q) ||
            tx.location?.toLowerCase().includes(q);
        const matchFilter = filter === 'Semua' || tx.status === filter;
        return matchSearch && matchFilter;
    });

    async function handleDelete(item) {
        if (!canDelete || item.source === 'order') return;
        if (!confirm(`Hapus transaksi ${item.hash}?`)) return;
        setDeletingId(item.id);
        try {
            await fetch(`/api/transactions?id=${item.id}`, { method: 'DELETE' });
            await fetchData();
        } catch (e) {
            alert('Gagal menghapus: ' + e.message);
        } finally {
            setDeletingId(null);
        }
    }

    const counts = {
        total: visibleItems.length,
        confirmed: visibleItems.filter(t => ['Confirmed', 'paid', 'confirmed'].includes(t.status)).length,
        pending: visibleItems.filter(t => ['Pending', 'pending'].includes(t.status)).length,
        failed: visibleItems.filter(t => ['Failed', 'failed', 'expired'].includes(t.status)).length,
    };

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Transaksi Blockchain</h1>
                    <p className={styles.pageSubtitle}>
                        Riwayat lengkap transaksi on-chain dan pembelian produk
                        {user?.role === 'farmer' && <span style={{ color: '#F5A623', marginLeft: 6 }}>— Hanya transaksi Anda</span>}
                    </p>
                </div>
            </div>

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

            <div className={styles.card}>
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
                                    <th>Hash / TX Solana</th>
                                    <th>Petani / Pembeli</th>
                                    <th>Lokasi / Produk</th>
                                    <th>Berat</th>
                                    <th>Jenis</th>
                                    <th>Nilai</th>
                                    <th>Block</th>
                                    <th>Status</th>
                                    <th>Waktu</th>
                                    {canDelete && <th>Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && (
                                    <tr><td colSpan={canDelete ? 10 : 9} style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.3)' }}>Tidak ada transaksi ditemukan</td></tr>
                                )}
                                {filtered.map((tx, i) => {
                                    const solUrl = explorerUrl(tx.txSignature || tx.hash);
                                    const statusColor = STATUS_COLORS[tx.status] || '#888';
                                    return (
                                        <tr key={tx.id || tx.orderId || i}>
                                            <td>
                                                {solUrl ? (
                                                    <a
                                                        href={solUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={styles.txHashLink}
                                                        title={`Lihat di Solana Explorer: ${tx.txSignature || tx.hash}`}
                                                    >
                                                        <span className={styles.txHash}>
                                                            {(tx.txSignature || tx.hash).slice(0, 12)}...
                                                        </span>
                                                        <span className={styles.explorerIcon}>Link</span>
                                                    </a>
                                                ) : (
                                                    <span className={styles.txHash}>{tx.hash}</span>
                                                )}
                                            </td>
                                            <td className={styles.bold}>{tx.farmer}</td>
                                            <td className={styles.muted}>{tx.variety || tx.location}</td>
                                            <td className={styles.muted}>{formatWeight(tx)}</td>
                                            <td><span className={styles.typeBadge}>{tx.source === 'order' ? 'Pembelian' : tx.variety}</span></td>
                                            <td className={styles.amount}>{formatAmount(tx)}</td>
                                            <td className={styles.block}>{tx.block !== '—' ? `#${tx.block}` : '—'}</td>
                                            <td>
                                                <span className={styles.badge} style={{ background: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}44` }}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className={styles.time}>{new Date(tx.timestamp).toLocaleString('id-ID')}</td>
                                            {canDelete && (
                                                <td>
                                                    {tx.source === 'transaction' && (
                                                        <button
                                                            className={styles.deleteBtn}
                                                            onClick={() => handleDelete(tx)}
                                                            disabled={deletingId === tx.id}
                                                            title="Hapus transaksi (Admin only)"
                                                        >
                                                            {deletingId === tx.id ? '...' : 'Hapus'}
                                                        </button>
                                                    )}
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
        </div>
    );
}
