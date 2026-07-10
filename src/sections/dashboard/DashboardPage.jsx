'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import AddTransactionModal from '@/sections/dashboard/AddTransactionModal';
import DashboardCalendar from '@/sections/dashboard/DashboardCalendar';
import { supabase } from '@/lib/supabase';
import styles from './DashboardPage.module.css';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const topFarmers = [
    { name: 'Koperasi Gayo Murni', region: 'Aceh', volume: '24.5 Ton', tx: 128 },
    { name: 'Pak Slamet Riyadi', region: 'Aceh', volume: '18.2 Ton', tx: 96 },
    { name: 'Toraja Coffee Estate', region: 'Sulawesi', volume: '15.7 Ton', tx: 84 },
    { name: 'CV Flores Arabika', region: 'NTT', volume: '12.3 Ton', tx: 67 },
    { name: 'Pak Bambang S.', region: 'Jawa Barat', volume: '9.8 Ton', tx: 52 },
];

export default function DashboardPage({ walletPublicKey }) {
    const [mounted, setMounted] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({ total: 0, volume: 0, farmers: 3921, price: 68500 });
    const [selectedDate, setSelectedDate] = useState(null);
    const [loadingTx, setLoadingTx] = useState(true);
    const [recentOrders, setRecentOrders] = useState([]);
    const [orderStats, setOrderStats] = useState({ count: 0, totalKg: 0, totalRevenue: 0 });
    const [chartPeriod, setChartPeriod] = useState('7');
    const [dailyTarget, setDailyTarget] = useState(10);
    const [dailyTargetInput, setDailyTargetInput] = useState('10');
    const [savingTarget, setSavingTarget] = useState(false);
    const [targetMessage, setTargetMessage] = useState('');
    const realtimeRef = useRef(null);
    const todayLabel = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    useEffect(() => { setMounted(true); }, []);

    const refreshData = useCallback(async () => {
        setLoadingTx(true);
        try {
            const [txRes, orderRes, settingsRes] = await Promise.all([
                fetch('/api/transactions?includeOrders=true'),
                fetch('/api/orders'),
                fetch('/api/dashboard-settings'),
            ]);
            const txData = await txRes.json();
            const orderData = await orderRes.json();
            const settingsData = await settingsRes.json();

            const feed = txData.data || [];
            setTransactions(feed);

            const paid = (orderData.data || []).filter(o => o.status === 'paid');
            const totalKg = paid.reduce((s, o) => s + (o.weight || 0), 0);
            const totalRevenue = paid.reduce((s, o) => s + (o.totalPrice || 0), 0);
            setOrderStats({ count: paid.length, totalKg, totalRevenue });
            setRecentOrders(paid.slice(0, 5));

            const vol = feed.reduce((sum, t) => {
                const w = Number(t.weight) || 0;
                return sum + (t.weightUnit === 'g' ? w / 1000 : w);
            }, 0);
            setStats(prev => ({ ...prev, total: feed.length, volume: vol }));
            if (settingsData.success && Number.isInteger(Number(settingsData.dailyTransactionTarget))) {
                const target = Number(settingsData.dailyTransactionTarget);
                setDailyTarget(target);
                setDailyTargetInput(String(target));
            }
        } catch { /* offline mode */ }
        finally { setLoadingTx(false); }
    }, []);

    useEffect(() => {
        refreshData();

        const channel = supabase
            .channel('dashboard-transactions-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refreshData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, refreshData)
            .subscribe();
        realtimeRef.current = channel;

        const poll = setInterval(refreshData, 15000);
        const onFocus = () => refreshData();
        window.addEventListener('focus', onFocus);

        return () => {
            if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
            clearInterval(poll);
            window.removeEventListener('focus', onFocus);
        };
    }, [refreshData]);

    async function saveDailyTarget(event) {
        event.preventDefault();
        const target = Number(dailyTargetInput);
        if (!Number.isInteger(target) || target < 0 || target > 100000) {
            setTargetMessage('Masukkan angka 0–100.000.');
            return;
        }
        setSavingTarget(true);
        setTargetMessage('Menyimpan...');
        try {
            const token = localStorage.getItem('cc_token');
            const response = await fetch('/api/dashboard-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ dailyTransactionTarget: target }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Gagal menyimpan');
            setDailyTarget(Number(data.dailyTransactionTarget));
            setDailyTargetInput(String(data.dailyTransactionTarget));
            setTargetMessage('Tersimpan');
        } catch (error) {
            setTargetMessage(error.message);
        } finally {
            setSavingTarget(false);
            window.setTimeout(() => setTargetMessage(''), 2500);
        }
    }

    function handleTransactionAdded(newTx) {
        setTransactions(prev => [{ ...newTx, source: 'transaction', weightUnit: 'kg' }, ...prev]);
        setStats(prev => ({ ...prev, total: prev.total + 1, volume: prev.volume + (newTx.weight || 0) }));
        setShowModal(false);
        refreshData();
    }

    async function handleDeleteTx(id) {
        if (!confirm('Hapus transaksi ini?')) return;
        await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
        refreshData();
    }

    function formatWeight(tx) {
        const w = tx.weight ?? 0;
        return tx.weightUnit === 'g' ? `${w}g` : `${w} kg`;
    }

    function formatAmount(tx) {
        const amount = Number(tx.amount) || 0;
        if (tx.source === 'order') return `Rp ${amount.toLocaleString('id-ID')}`;
        return `Rp ${(amount / 1000000).toFixed(2)} Jt`;
    }

    const statsData = [
        { title: 'Total Transaksi', value: stats.total.toLocaleString(), change: '+18.4%', positive: true, sub: 'Blockchain transactions', color: '#4A7C28', bg: 'rgba(74,124,40,0.1)' },
        { title: 'Kopi Terbeli', value: orderStats.totalKg >= 1000 ? `${(orderStats.totalKg / 1000).toFixed(1)} Kg` : `${orderStats.totalKg} g`, change: `${orderStats.count} order`, positive: true, sub: 'Total dari database', color: '#F5A623', bg: 'rgba(245,166,35,0.1)' },
        { title: 'Petani Aktif', value: stats.farmers.toLocaleString(), change: '+241', positive: true, sub: 'Terdaftar di blockchain', color: '#00D4FF', bg: 'rgba(0,212,255,0.1)' },
        { title: 'Total Revenue', value: orderStats.totalRevenue >= 1000000 ? `Rp ${(orderStats.totalRevenue / 1000000).toFixed(1)} Jt` : `Rp ${orderStats.totalRevenue.toLocaleString('id-ID')}`, change: `${orderStats.count} produk lunas`, positive: true, sub: 'Dari pembelian produk kopi', color: '#4CAF50', bg: 'rgba(76,175,80,0.1)' },
    ];

    const periodDays = chartPeriod === 'all' ? null : Number(chartPeriod);
    const chartRows = (() => {
        const dated = transactions
            .map(tx => ({ tx, date: new Date(tx.timestamp || tx.createdAt || tx.paidAt) }))
            .filter(item => !Number.isNaN(item.date.getTime()));
        const latest = new Date();
        latest.setHours(23, 59, 59, 999);
        const earliest = periodDays ? new Date(latest.getTime() - (periodDays - 1) * 86400000) : dated.reduce((min, item) => item.date < min ? item.date : min, latest);
        earliest.setHours(0, 0, 0, 0);
        const rows = [];
        const cursor = new Date(earliest);
        while (cursor <= latest) {
            const key = cursor.toISOString().slice(0, 10);
            const dayItems = dated.filter(item => item.date.toISOString().slice(0, 10) === key);
            rows.push({
                key,
                label: cursor.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                count: dayItems.length,
                amount: dayItems.reduce((sum, item) => sum + (Number(item.tx.amount) || 0), 0) / 1000000,
                volume: dayItems.reduce((sum, item) => {
                    const weight = Number(item.tx.weight) || 0;
                    return sum + (item.tx.weightUnit === 'g' ? weight / 1000 : weight);
                }, 0),
            });
            cursor.setDate(cursor.getDate() + 1);
        }
        return rows;
    })();
    const chartSubtitle = chartPeriod === 'all' ? 'Semua data tersimpan' : `${chartPeriod} hari terakhir`;
    const maxChartValue = Math.max(dailyTarget, ...chartRows.map(row => row.count), 1);
    const txChartOptions = {
        chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
        colors: ['#4A7C28', '#F5A623', '#00D4FF'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.01, stops: [0, 100] } },
        dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 2.5 },
        grid: { borderColor: 'rgba(74,124,40,0.1)', strokeDashArray: 4 },
        xaxis: { categories: chartRows.map(row => row.label), labels: { style: { colors: '#5E7A5A', fontSize: '12px' }, hideOverlappingLabels: true }, axisBorder: { show: false } },
        yaxis: { min: 0, max: maxChartValue, labels: { style: { colors: '#5E7A5A', fontSize: '12px' } } },
        legend: { labels: { colors: '#9DB89A' }, position: 'top' },
        tooltip: { theme: 'dark' },
    };
    const txChartSeries = [
        { name: 'Transaksi', data: chartRows.map(row => row.count) },
        { name: 'Target harian', data: chartRows.map(() => dailyTarget) },
        { name: 'Volume (Ton)', data: chartRows.map(row => row.volume) },
    ];

    const donutOptions = {
        chart: { type: 'donut', background: 'transparent' },
        colors: ['#4A7C28', '#F5A623', '#00D4FF', '#FF6B6B', '#9B59B6'],
        labels: ['Aceh', 'Toraja', 'Flores', 'Jawa', 'Mandheling'],
        legend: { position: 'bottom', labels: { colors: '#9DB89A' } },
        dataLabels: { enabled: false },
        plotOptions: { pie: { donut: { size: '70%', labels: { show: true, total: { show: true, label: 'Total', color: '#9DB89A', formatter: () => '2,340 Ton' } } } } },
        stroke: { colors: ['#111811'] }, tooltip: { theme: 'dark' },
    };
    const donutSeries = [680, 520, 390, 420, 330];

    return (
        <div className={styles.page}>
            {/* Page Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Dashboard</h1>
                    <p className={styles.pageSubtitle}>
                        {walletPublicKey ? ` Phantom: ${walletPublicKey.slice(0, 8)}...${walletPublicKey.slice(-6)} • ` : ''}
                        Selamat datang! Ringkasan aktivitas blockchain hari ini.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.dateChip}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        {selectedDate ? selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : todayLabel}
                    </div>
                    <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                        Tambahkan Transaksi
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                {statsData.map((stat, i) => (
                    <div key={i} className={styles.statCard} style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className={styles.statTop}>
                            {stat.icon && (
                                <div className={styles.statIcon} style={{ background: stat.bg }}>
                                    <span style={{ fontSize: 20 }}>{stat.icon}</span>
                                </div>
                            )}
                            <span className={`${styles.statChange} ${stat.positive ? styles.positive : styles.negative}`}>
                                {stat.positive ? '↑' : '↓'} {stat.change}
                            </span>
                        </div>
                        <div className={styles.statValue}>{stat.value}</div>
                        <div className={styles.statTitle}>{stat.title}</div>
                        <div className={styles.statSub}>{stat.sub}</div>
                    </div>
                ))}
            </div>

            {/* Charts + Calendar Row */}
            <div className={styles.chartsRow}>
                <div className={styles.card} style={{ flex: 2 }}>
                    <div className={styles.cardHeader}>
                        <div><h3 className={styles.cardTitle}>Aktivitas Transaksi & Volume</h3><p className={styles.cardSubtitle}>{chartSubtitle} · data tersimpan di database</p></div>
                        <div className={styles.chartControls}>
                            <select className={styles.selectBox} value={chartPeriod} onChange={event => setChartPeriod(event.target.value)} aria-label="Periode grafik">
                                <option value="1">1 Hari</option><option value="3">3 Hari</option><option value="7">7 Hari</option><option value="30">30 Hari</option><option value="90">90 Hari</option><option value="all">Semua Hari</option>
                            </select>
                            <form className={styles.targetForm} onSubmit={saveDailyTarget}>
                                <label htmlFor="daily-target">Target/hari</label>
                                <input id="daily-target" type="number" min="0" max="100000" value={dailyTargetInput} onChange={event => setDailyTargetInput(event.target.value)} />
                                <button type="submit" disabled={savingTarget} title="Simpan target transaksi harian">Simpan</button>
                                {targetMessage && <span className={styles.targetMessage}>{targetMessage}</span>}
                            </form>
                        </div>
                    </div>
                    {mounted && <ReactApexChart options={txChartOptions} series={txChartSeries} type="area" height={240} />}
                </div>
                {/* Calendar Widget */}
                <div>
                    <DashboardCalendar onDateSelect={setSelectedDate} />
                </div>
            </div>

            {/* Donut + Top Farmers Row */}
            <div className={styles.chartsRow}>
                <div className={styles.card} style={{ flex: 1 }}>
                    <div className={styles.cardHeader}><div><h3 className={styles.cardTitle}>Distribusi per Wilayah</h3><p className={styles.cardSubtitle}>Volume kopi (Ton)</p></div></div>
                    {mounted && <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={240} />}
                </div>
                <div className={styles.card} style={{ flex: 1 }}>
                    <div className={styles.cardHeader}><h3 className={styles.cardTitle}>Top Petani</h3><a href="/farmers" className={styles.seeAll}>Lihat Semua →</a></div>
                    <div className={styles.farmerList}>
                        {topFarmers.map((f, i) => (
                            <div key={i} className={styles.farmerRow}>
                                <div className={styles.farmerRank}>{i + 1}</div>
                                <div className={styles.farmerAvatar}>{f.name.substring(0, 2).toUpperCase()}</div>
                                <div className={styles.farmerInfo}><div className={styles.farmerName}>{f.name}</div><div className={styles.farmerRegion}>{f.region}</div></div>
                                <div className={styles.farmerStats}><div className={styles.farmerVolume}>{f.volume}</div><div className={styles.farmerTx}>{f.tx} Tx</div></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Transactions from DB */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div><h3 className={styles.cardTitle}>Transaksi Terbaru</h3><p className={styles.cardSubtitle}>Blockchain + pembelian produk • {transactions.length} transaksi</p></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className={styles.btnPrimarySmall} onClick={() => setShowModal(true)}>+ Tambah</button>
                        <a href="/transactions" className={styles.seeAll}>Lihat Semua →</a>
                    </div>
                </div>
                {loadingTx ? (
                    <div className={styles.loadingRow}><div className={styles.loadingSpinner} /> Memuat data...</div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead><tr>
                                <th>Hash</th><th>Petani</th><th>Lokasi</th><th>Berat</th>
                                <th>Nilai</th><th>Status</th><th>Waktu</th><th></th>
                            </tr></thead>
                            <tbody>
                                {transactions.slice(0, 8).map((tx) => (
                                    <tr key={tx.id || tx.orderId}>
                                        <td><span className={styles.txHash}>{tx.hash}</span></td>
                                        <td className={styles.txFarmer}>{tx.farmer}</td>
                                        <td className={styles.txLocation}>{tx.location}</td>
                                        <td className={styles.txWeight}>{formatWeight(tx)}</td>
                                        <td className={styles.txAmount}>{formatAmount(tx)}</td>
                                        <td><span className={`${styles.badge} ${styles['badge' + tx.status]}`}>{tx.status}</span></td>
                                        <td className={styles.txTime}>{new Date(tx.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{tx.source === 'transaction' && (
                                            <button className={styles.deleteBtn} onClick={() => handleDeleteTx(tx.id)} title="Hapus">✕</button>
                                        )}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Recent Purchases from orders database ── */}
            {recentOrders.length > 0 && (
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div><h3 className={styles.cardTitle}>Riwayat Pembelian Produk Kopi</h3><p className={styles.cardSubtitle}>Data real dari database — {orderStats.count} transaksi lunas · {orderStats.totalKg}g terbeli · Rp {orderStats.totalRevenue.toLocaleString('id-ID')} revenue</p></div>
                        <a href="/market" className={styles.seeAll}>Lihat di Pasar →</a>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead><tr>
                                <th>Produk</th><th>Pembeli</th><th>Berat</th><th>Metode</th><th>Total</th><th>Status</th><th>Waktu</th>
                            </tr></thead>
                            <tbody>
                                {recentOrders.map(o => (
                                    <tr key={o.id}>
                                        <td className={styles.txFarmer}>{o.productName}</td>
                                        <td className={styles.txLocation}>{o.userName}</td>
                                        <td className={styles.txWeight}>{o.weight}g</td>
                                        <td><span style={{ fontSize: 11, fontWeight: 600, color: o.paymentMethod === 'qris' ? '#A855F7' : '#4CAF50' }}>{o.paymentMethod === 'qris' ? 'QRIS' : 'Phantom'}</span></td>
                                        <td className={styles.txAmount}>Rp {(o.totalPrice || 0).toLocaleString('id-ID')}</td>
                                        <td><span className={`${styles.badge} ${styles.badgecompleted}`}> LUNAS</span></td>
                                        <td className={styles.txTime}>{o.paidAt ? new Date(o.paidAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Blockchain Live Feed */}
            <div className={styles.blockchainFeed}>
                <div className={styles.feedHeader}><span className={styles.feedDot} /><span className={styles.feedTitle}>Live Blockchain Feed — Solana Testnet</span></div>
                <div className={styles.feedRow}>
                    {[1, 2, 3, 4, 5, 6].map((b) => (
                        <div key={b} className={styles.blockCard}>
                            <div className={styles.blockNum}>#{(18293041 + b).toLocaleString()}</div>
                            <div className={styles.blockTxs}>{Math.floor(Math.random() * 50 + 10)} txs</div>
                            <div className={styles.blockTime}>{b * 12}s lalu</div>
                            <div className={styles.blockMiner}>Validator: 0x{Math.random().toString(16).substr(2, 6)}...</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Transaction Modal */}
            {showModal && (
                <AddTransactionModal
                    onClose={() => setShowModal(false)}
                    onSuccess={handleTransactionAdded}
                    walletPublicKey={walletPublicKey}
                />
            )}
        </div>
    );
}
