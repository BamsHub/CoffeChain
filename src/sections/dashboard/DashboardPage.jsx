'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

import DashboardCalendar from '@/sections/dashboard/DashboardCalendar';
import FarmerDashboardPage from '@/sections/dashboard/FarmerDashboardPage';
import { useAuth } from '@/context/AuthContext';
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
    const { user } = useAuth();
    const isFarmer = user?.role === 'farmer';

    const [mounted, setMounted] = useState(false);

    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({ total: 0, volume: 0, farmers: 0, price: 68500 });
    const [selectedDate, setSelectedDate] = useState(null);
    const [loadingTx, setLoadingTx] = useState(true);
    const [recentOrders, setRecentOrders] = useState([]);
    const [orderStats, setOrderStats] = useState({ count: 0, totalKg: 0, totalRevenue: 0 });
    const [dailyLabels, setDailyLabels] = useState(['Sen','Sel','Rab','Kam','Jum','Sab','Min']);
    const [dailyRevenueSeries, setDailyRevenueSeries] = useState([0,0,0,0,0,0,0]);
    const [dailyCountSeries, setDailyCountSeries] = useState([0,0,0,0,0,0,0]);
    const [allOrders, setAllOrders] = useState([]); // semua order dari DB (landing page)

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        fetchTransactions();
        fetchOrderStats();
        fetchFarmerCount();
    }, []);

    // Auto-refresh tepat jam 12 malam — reset daily stats
    useEffect(() => {
        const midnightTimer = setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                fetchOrderStats();
                fetchFarmerCount();
                fetchTransactions();
                setSelectedDate(null); // hapus filter tanggal saat midnight
            }
        }, 60_000);
        return () => clearInterval(midnightTimer);
    }, []);

    async function fetchFarmerCount() {
        try {
            // Hitung user terdaftar dengan role farmer — bukan entitas farmers table
            const res = await fetch('/api/users?role=farmer');
            const data = await res.json();
            const count = data.count ?? (data.data || []).length;
            setStats(prev => ({ ...prev, farmers: count }));
        } catch { }
    }

    async function fetchOrderStats() {
        try {
            const res = await fetch('/api/orders');
            const data = await res.json();
            const fetchedOrders = data.data || [];
            setAllOrders(fetchedOrders);          // simpan semua order ke state
            const paid = fetchedOrders.filter(o => o.status === 'paid');
            const totalKg = paid.reduce((s, o) => s + (o.weight || 0), 0);
            const totalRevenue = paid.reduce((s, o) => s + (o.totalPrice || 0), 0);
            setOrderStats({ count: paid.length, totalKg, totalRevenue });
            setRecentOrders(paid.slice(0, 5));

            // Compute last 7 days daily chart
            const days = [];
            const dayLabels = [];
            const dayRevArr = [];
            const dayCountArr = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dayStr = d.toISOString().slice(0, 10);
                days.push(dayStr);
                dayLabels.push(d.toLocaleDateString('id-ID', { weekday: 'short' }));
            }
            days.forEach((dayStr, idx) => {
                const dayOrders = paid.filter(o => (o.createdAt || o.paidAt || '').startsWith(dayStr));
                dayRevArr.push(parseFloat((dayOrders.reduce((s, o) => s + (o.totalPrice || 0), 0) / 1_000_000).toFixed(2)));
                dayCountArr.push(dayOrders.length);
            });
            setDailyLabels(dayLabels);
            setDailyRevenueSeries(dayRevArr);
            setDailyCountSeries(dayCountArr);
        } catch { }
    }

    async function fetchTransactions() {
        setLoadingTx(true);
        try {
            const res = await fetch('/api/transactions');
            const data = await res.json();
            setTransactions(data.data || []);
            const vol = (data.data || []).reduce((sum, t) => sum + (t.weight || 0), 0);
            setStats(prev => ({ ...prev, total: data.data?.length || 0, volume: vol }));
        } catch { /* offline mode */ }
        finally { setLoadingTx(false); }
    }

    async function handleDeleteTx(id) {
        if (!confirm('Hapus transaksi ini?')) return;
        await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
        setTransactions(prev => prev.filter(t => t.id !== id));
    }

    // ── Selected date drill-down (from calendar click) ───────────────────────────
    const selectedDayStr     = selectedDate ? selectedDate.toISOString().slice(0, 10) : null;
    const todayDashStr       = new Date().toISOString().slice(0, 10);
    const selectedDayOrders  = selectedDate
        ? allOrders.filter(o => (o.createdAt || o.paidAt || '').slice(0, 10) === selectedDayStr)
        : [];
    const selectedDayPaid    = selectedDayOrders.filter(o => o.status === 'paid');
    const selectedDayRevenue = selectedDayPaid.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const selectedDayKg      = selectedDayPaid.reduce((s, o) => s + (o.weight || 0), 0);
    // Tabel orders: jika tanggal dipilih → orders hari itu; else → 10 terbaru
    const displayOrders      = selectedDate ? selectedDayOrders : allOrders.slice(0, 10);

    const statsData = [
        { title: 'Total Transaksi', value: stats.total.toLocaleString(), change: '+18.4%', positive: true, sub: 'Blockchain transactions', icon: <svg width='20' height='20' fill='none' viewBox='0 0 24 24'><path d='M23 4v6h-6M1 20v-6h6' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/><path d='M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg>, color: '#4A7C28', bg: 'rgba(74,124,40,0.1)' },
        { title: 'Kopi Terbeli', value: orderStats.totalKg >= 1000 ? `${(orderStats.totalKg / 1000).toFixed(1)} Kg` : `${orderStats.totalKg} g`, change: `${orderStats.count} order`, positive: true, sub: 'Total dari database', icon: <svg width='20' height='20' fill='none' viewBox='0 0 24 24'><path d='M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg>, color: '#F5A623', bg: 'rgba(245,166,35,0.1)' },
        { title: 'Petani Aktif', value: stats.farmers.toLocaleString(), change: '+241', positive: true, sub: 'Terdaftar di blockchain', icon: <svg width='20' height='20' fill='none' viewBox='0 0 24 24'><path d='M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/><circle cx='9' cy='7' r='4' stroke='currentColor' strokeWidth='2'/><path d='M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg>, color: '#00D4FF', bg: 'rgba(0,212,255,0.1)' },
        { title: 'Total Revenue', value: orderStats.totalRevenue >= 1000000 ? `Rp ${(orderStats.totalRevenue / 1000000).toFixed(1)} Jt` : `Rp ${orderStats.totalRevenue.toLocaleString('id-ID')}`, change: `${orderStats.count} produk lunas`, positive: true, sub: 'Dari pembelian produk kopi', icon: <svg width='20' height='20' fill='none' viewBox='0 0 24 24'><path d='M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg>, color: '#4CAF50', bg: 'rgba(76,175,80,0.1)' },
    ];

    const txChartOptions = {
        chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
        colors: ['#4A7C28', '#F5A623'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.01, stops: [0, 100] } },
        dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 2.5 },
        grid: { borderColor: 'rgba(74,124,40,0.1)', strokeDashArray: 4 },
        xaxis: { categories: dailyLabels, labels: { style: { colors: '#5E7A5A', fontSize: '12px' } }, axisBorder: { show: false } },
        yaxis: { labels: { style: { colors: '#5E7A5A', fontSize: '12px' } } },
        legend: { labels: { colors: '#9DB89A' }, position: 'top' },
        tooltip: { theme: 'dark' },
    };
    const txChartSeries = [
        { name: 'Revenue (Juta Rp)', data: dailyRevenueSeries },
        { name: 'Jumlah Order', data: dailyCountSeries },
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

    // ── Petani → tampilkan Dashboard Penjualan khusus petani ──────
    // Semua hooks sudah dideklarasikan di atas (Rules of Hooks terpenuhi).
    // Data farmer diambil dari tabel `sales` + filter user_id di API.
    if (isFarmer) {
        return <FarmerDashboardPage walletPublicKey={walletPublicKey} />;
    }

    return (
        <div className={styles.page}>
            {/* Page Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Dashboard</h1>
                    <p className={styles.pageSubtitle}>
                        {walletPublicKey ? `Phantom: ${walletPublicKey.slice(0, 8)}...${walletPublicKey.slice(-6)} • ` : ''}
                        Selamat datang! Ringkasan aktivitas blockchain hari ini.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.dateChip}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        {selectedDate ? selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '27 Februari 2026'}
                    </div>

                    {isFarmer && (
                        <div className={styles.dateChip} style={{ background: 'rgba(126,212,74,0.08)', borderColor: 'rgba(126,212,74,0.2)', color: 'var(--color-primary-light)', fontSize: 12 }}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                            Mode Baca — Petani
                        </div>
                    )}
                </div>
            </div>

            {/* Day-stats banner — tampil saat tanggal dari kalender diklik */}
            {selectedDate && (
                <div style={{ margin: '0 0 20px', padding: '16px 20px', borderRadius: 14,
                    background: 'rgba(126,212,74,0.07)', border: '1px solid rgba(126,212,74,0.3)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="#7ED44A" strokeWidth="2"/>
                                <path d="M16 2v4M8 2v4M3 10h18" stroke="#7ED44A" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            <span style={{ fontWeight: 800, color: '#7ED44A', fontSize: 15 }}>
                                {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            {selectedDayStr === todayDashStr && (
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
                                    background: 'rgba(0,212,255,0.15)', color: '#00D4FF',
                                    border: '1px solid rgba(0,212,255,0.35)', fontWeight: 700 }}>
                                    Hari Ini
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1 }}>
                            {[
                                { label: 'Total Order', value: selectedDayOrders.length, color: '#00D4FF' },
                                { label: 'Lunas', value: selectedDayPaid.length, color: '#4CAF50' },
                                { label: 'Revenue', value: selectedDayRevenue >= 1_000_000 ? `Rp ${(selectedDayRevenue/1_000_000).toFixed(1)} Jt` : `Rp ${selectedDayRevenue.toLocaleString('id-ID')}`, color: '#7ED44A' },
                                { label: 'Kopi Terbeli', value: selectedDayKg >= 1000 ? `${(selectedDayKg/1000).toFixed(1)} Kg` : `${selectedDayKg} g`, color: '#F5A623' },
                            ].map((s, i) => (
                                <div key={i}>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setSelectedDate(null)}
                            style={{ padding: '5px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer' }}>
                            ✕ Reset
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                {statsData.map((stat, i) => (
                    <div key={i} className={styles.statCard} style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className={styles.statTop}>
                            <div className={styles.statIcon} style={{ background: stat.bg }}>
                                <span style={{display:'flex',alignItems:'center',justifyContent:'center',color:'var(--color-text-muted)'}}>{stat.icon}</span>
                            </div>
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
                        <div><h3 className={styles.cardTitle}>Riwayat Pembelian Harian (7 Hari)</h3><p className={styles.cardSubtitle}>Data real dari database — revenue &amp; jumlah order per hari</p></div>
                        <select className={styles.selectBox}><option>7 Hari</option><option>30 Hari</option></select>
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

            {/* ── Pembelian dari Landing Page ── */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>Pembelian dari Landing Page</h3>
                        <p className={styles.cardSubtitle}>
                            {selectedDate
                                ? `${selectedDayOrders.length} order pada ${selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                : `${allOrders.length} total order — menampilkan 10 terbaru`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {selectedDate && (
                            <button onClick={() => setSelectedDate(null)}
                                style={{ padding: '5px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer' }}>
                                ✕ Reset Filter
                            </button>
                        )}

                        <a href="/transactions" className={styles.seeAll}>Lihat Semua →</a>
                    </div>
                </div>
                {loadingTx ? (
                    <div className={styles.loadingRow}><div className={styles.loadingSpinner} /> Memuat data...</div>
                ) : displayOrders.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                        {selectedDate ? 'Tidak ada order pada tanggal ini.' : 'Belum ada order dari landing page.'}
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead><tr>
                                <th>Produk</th><th>Pembeli</th><th>Email</th><th>No. HP</th>
                                <th>Metode</th><th>Total</th><th>Status</th><th>Waktu</th>
                            </tr></thead>
                            <tbody>
                                {displayOrders.map((o) => {
                                    const st = o.status === 'paid' ? 'paid' : (o.status || 'pending');
                                    const stColor = { paid: '#4CAF50', pending: '#FF9800', expired: '#888', failed: '#f44336' }[st] || '#888';
                                    const pmLabel = { 'transfer': 'SOL Phantom', 'qr': 'Solana Pay', 'transfer-idr': 'Transfer Bank', 'qr-idr': 'QR IDR' }[o.paymentMethod] || o.paymentMethod || '—';
                                    return (
                                        <tr key={o.id || o.orderId}>
                                            <td className={styles.txFarmer}>
                                                <div style={{ fontWeight: 600 }}>{o.productName || '—'}</div>
                                                {o.weight ? <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{o.weight}g</div> : null}
                                            </td>
                                            <td className={styles.txFarmer}>{o.userName || o.buyerName || '—'}</td>
                                            <td className={styles.txLocation} style={{ fontSize: 12 }}>{o.buyerEmail || '—'}</td>
                                            <td className={styles.txLocation} style={{ fontSize: 12 }}>{o.buyerPhone || '—'}</td>
                                            <td>
                                                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 100,
                                                    background: o.paymentCurrency === 'SOL' ? 'rgba(153,69,255,0.12)' : 'rgba(245,166,35,0.12)',
                                                    color: o.paymentCurrency === 'SOL' ? '#9945FF' : '#F5A623',
                                                    border: `1px solid ${o.paymentCurrency === 'SOL' ? 'rgba(153,69,255,0.3)' : 'rgba(245,166,35,0.3)'}`,
                                                    fontWeight: 600 }}>
                                                    {pmLabel}
                                                </span>
                                            </td>
                                            <td className={styles.txAmount}>Rp {(o.totalPrice || 0).toLocaleString('id-ID')}</td>
                                            <td>
                                                <span className={styles.badge} style={{ background: stColor + '22', color: stColor, border: `1px solid ${stColor}44` }}>
                                                    {st === 'paid' ? 'LUNAS' : st.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className={styles.txTime}>
                                                {o.createdAt ? new Date(o.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Summary + shortcut row for orders ── */}
            <div className={styles.card} style={{ marginTop: 0 }}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>Ringkasan Pembelian Kopi</h3>
                        <p className={styles.cardSubtitle}>Akumulasi dari database — {orderStats.count} transaksi lunas &nbsp;·&nbsp; {orderStats.totalKg >= 1000 ? `${(orderStats.totalKg/1000).toFixed(1)} Kg` : `${orderStats.totalKg} g`} terbeli &nbsp;·&nbsp; Rp {orderStats.totalRevenue.toLocaleString('id-ID')} revenue</p>
                    </div>
                    <a href="/transactions" className={styles.seeAll}>Lihat Semua Transaksi →</a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, padding: '4px 0' }}>
                    {[
                        { label: 'Order Lunas', value: orderStats.count, color: '#4CAF50', icon: '✓' },
                        { label: 'Total Kopi', value: orderStats.totalKg >= 1000 ? `${(orderStats.totalKg/1000).toFixed(1)} Kg` : `${orderStats.totalKg} g`, color: '#F5A623', icon: '\u2615' },
                        { label: 'Total Revenue', value: orderStats.totalRevenue >= 1000000 ? `Rp ${(orderStats.totalRevenue/1000000).toFixed(1)} Jt` : `Rp ${orderStats.totalRevenue.toLocaleString('id-ID')}`, color: '#7ED44A', icon: 'Rp' },
                        { label: 'Hari Ini', value: dailyCountSeries[dailyCountSeries.length-1] + ' order', color: '#00D4FF', icon: '\u25cb' },
                    ].map((s,i) => (
                        <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: 12, padding: '14px 16px' }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Blockchain Live Feed */}
            <div className={styles.blockchainFeed}>
                <div className={styles.feedHeader}><span className={styles.feedDot} /><span className={styles.feedTitle}>Live Blockchain Feed — Solana Devnet</span></div>
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


        </div>
    );
}
