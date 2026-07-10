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
    const [selectedDate, setSelectedDate] = useState(null);
    const [loadingTx, setLoadingTx] = useState(true);
    const [orders, setOrders] = useState([]);
    const [chartPeriod, setChartPeriod] = useState('7');
    const [dailyTarget, setDailyTarget] = useState(10);
    const [dailyTargetInput, setDailyTargetInput] = useState('10');
    const [savingTarget, setSavingTarget] = useState(false);
    const [targetMessage, setTargetMessage] = useState('');
    const realtimeRef = useRef(null);
    const todayLabel = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    useEffect(() => { setMounted(true); }, []);

    const refreshData = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoadingTx(true);
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

            setOrders(orderData.data || []);
            if (settingsData.success && Number.isInteger(Number(settingsData.dailyTransactionTarget))) {
                const target = Number(settingsData.dailyTransactionTarget);
                setDailyTarget(target);
                setDailyTargetInput(String(target));
            }
        } catch { /* offline mode */ }
        finally { if (!silent) setLoadingTx(false); }
    }, []);

    useEffect(() => {
        refreshData();

        const channel = supabase
            .channel('dashboard-transactions-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => refreshData({ silent: true }))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => refreshData({ silent: true }))
            .subscribe();
        realtimeRef.current = channel;

        return () => {
            if (realtimeRef.current) supabase.removeChannel(realtimeRef.current);
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

    const periodDays = chartPeriod === 'all' ? null : Number(chartPeriod);
    const useWeeklyBuckets = chartPeriod === '30' || chartPeriod === '90';
    const bucketDays = useWeeklyBuckets ? 7 : 1;
    const dateOf = item => new Date(item?.timestamp || item?.paidAt || item?.createdAt);
    const allActivityDates = [...transactions, ...orders]
        .map(dateOf)
        .filter(date => !Number.isNaN(date.getTime()));
    const periodEnd = new Date();
    periodEnd.setHours(23, 59, 59, 999);
    const periodStart = periodDays
        ? new Date(periodEnd.getTime() - (periodDays - 1) * 86400000)
        : allActivityDates.reduce((min, date) => date < min ? date : min, periodEnd);
    periodStart.setHours(0, 0, 0, 0);
    const inSelectedPeriod = item => {
        const date = dateOf(item);
        return !Number.isNaN(date.getTime()) && date >= periodStart && date <= periodEnd;
    };
    const periodTransactions = transactions.filter(inSelectedPeriod);
    const periodPaidOrders = orders.filter(order => order.status === 'paid' && inSelectedPeriod(order));
    const periodOrderWeight = periodPaidOrders.reduce((sum, order) => sum + (Number(order.weight) || 0), 0);
    const periodRevenue = periodPaidOrders.reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);
    const activeFarmers = new Set(periodTransactions.map(tx => tx.farmerId || tx.farmer).filter(Boolean)).size;
    const periodLabel = chartPeriod === 'all' ? 'Semua periode' : `${chartPeriod} hari terakhir`;
    const statsData = [
        { title: 'Total Transaksi', value: periodTransactions.length.toLocaleString(), change: periodLabel, positive: true, sub: 'Sesuai periode grafik', color: '#4A7C28', bg: 'rgba(74,124,40,0.1)' },
        { title: 'Kopi Terbeli', value: periodOrderWeight >= 1000 ? `${(periodOrderWeight / 1000).toFixed(1)} Kg` : `${periodOrderWeight} g`, change: `${periodPaidOrders.length} order`, positive: true, sub: 'Pembelian lunas dalam periode', color: '#F5A623', bg: 'rgba(245,166,35,0.1)' },
        { title: 'Petani Aktif', value: activeFarmers.toLocaleString(), change: periodLabel, positive: true, sub: 'Petani dalam transaksi periode', color: '#00D4FF', bg: 'rgba(0,212,255,0.1)' },
        { title: 'Total Revenue', value: periodRevenue >= 1000000 ? `Rp ${(periodRevenue / 1000000).toFixed(1)} Jt` : `Rp ${periodRevenue.toLocaleString('id-ID')}`, change: `${periodPaidOrders.length} produk lunas`, positive: true, sub: 'Revenue dalam periode', color: '#4CAF50', bg: 'rgba(76,175,80,0.1)' },
    ];

    const chartRows = (() => {
        const dated = transactions
            .map(tx => ({ tx, date: dateOf(tx) }))
            .filter(item => !Number.isNaN(item.date.getTime()) && item.date >= periodStart && item.date <= periodEnd);
        const latest = periodEnd;
        const earliest = periodStart;
        const dayKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const rows = [];
        const cursor = new Date(earliest);
        while (cursor <= latest) {
            const bucketStart = new Date(cursor);
            const bucketEnd = new Date(cursor);
            bucketEnd.setDate(bucketEnd.getDate() + bucketDays - 1);
            if (bucketEnd > latest) bucketEnd.setTime(latest.getTime());
            const bucketLength = Math.round((bucketEnd.getTime() - bucketStart.getTime()) / 86400000) + 1;
            const dayItems = dated.filter(item => item.date >= bucketStart && item.date <= bucketEnd);
            rows.push({
                key: `${dayKey(bucketStart)}-${dayKey(bucketEnd)}`,
                label: useWeeklyBuckets
                    ? `${bucketStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${bucketEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                    : bucketStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                count: dayItems.length,
                target: dailyTarget * bucketLength,
                amount: dayItems.reduce((sum, item) => sum + (Number(item.tx.amount) || 0), 0) / 1000000,
                volume: dayItems.reduce((sum, item) => {
                    const weight = Number(item.tx.weight) || 0;
                    return sum + (item.tx.weightUnit === 'g' ? weight / 1000 : weight);
                }, 0),
            });
            cursor.setDate(cursor.getDate() + bucketDays);
        }
        return rows;
    })();
    const chartSubtitle = chartPeriod === 'all'
        ? 'Semua data tersimpan'
        : `${chartPeriod} hari terakhir${useWeeklyBuckets ? ' · diringkas per minggu' : ''}`;
    const targetSeriesLabel = useWeeklyBuckets ? 'Target mingguan' : 'Target harian';
    const maxChartValue = Math.max(...chartRows.map(row => Math.max(row.count, row.target)), 1);
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
        { name: targetSeriesLabel, data: chartRows.map(row => row.target) },
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

            {/* Unified activity feed: blockchain transactions and paid purchases */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div><h3 className={styles.cardTitle}>Riwayat Aktivitas</h3><p className={styles.cardSubtitle}>Blockchain + pembelian produk • {periodTransactions.length} aktivitas • {periodPaidOrders.length} pembelian lunas • {periodLabel}</p></div>
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
                                <th>Hash / Order</th><th>Jenis</th><th>Pelaku</th><th>Produk / Lokasi</th><th>Berat</th>
                                <th>Nilai</th><th>Status</th><th>Waktu</th><th></th>
                            </tr></thead>
                            <tbody>
                                {periodTransactions.slice(0, 8).map((tx) => (
                                    <tr key={tx.id || tx.orderId}>
                                        <td><span className={styles.txHash}>{tx.hash}</span></td>
                                        <td className={styles.txLocation}>{tx.source === 'order' ? 'Pembelian' : 'Blockchain'}</td>
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
                                {!periodTransactions.length && <tr><td colSpan="9" className={styles.emptyState}>Tidak ada aktivitas pada {periodLabel.toLowerCase()}.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Recent Purchases from orders database ── */}
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
