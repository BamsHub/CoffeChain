'use client';

/**
 * FarmerDashboardPage — Dashboard Penjualan Petani
 *
 * Tampilan identik dengan DashboardPage (Dev/Koperasi) agar pengalaman
 * konsisten, NAMUN data diambil dari tabel `sales` di Supabase yang
 * sudah dilindungi RLS + filter user_id di sisi API route.
 *
 * Artinya setiap petani HANYA melihat data penjualannya sendiri — petani
 * lain tidak pernah muncul di sini. "Database dipisah" = tabel `sales`
 * tersendiri, endpoint `/api/sales` tersendiri, filter user_id tersendiri.
 */

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';   // anon client — untuk Realtime
import DashboardCalendar from '@/sections/dashboard/DashboardCalendar';
import AddSaleModal from '@/sections/dashboard/AddSaleModal';
import styles from './DashboardPage.module.css';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function FarmerDashboardPage({ walletPublicKey }) {
    const { user, getToken } = useAuth();
    const [mounted, setMounted]         = useState(false);
    const [sales,   setSales]           = useState([]);
    const [loading, setLoading]         = useState(true);
    const [showModal, setShowModal]     = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

    // ── Stats dari Supabase (Total Produk, Stok, Transaksi bulan ini) ──
    const [dbStats, setDbStats] = useState({
        totalProducts:     0,
        totalStock:        0,
        totalTxThisMonth:  0,
        revenueThisMonth:  0,
        month:             '',
        loadingStats:      true,
    });
    const realtimeRef = useRef(null); // referensi channel Realtime

    // ── Derived stats ─────────────────────────────────────────────
    const paidSales    = sales.filter(s => s.status === 'paid');
    const totalRevenue = paidSales.reduce((acc, s) => acc + (s.totalPrice || 0), 0);
    const totalKg      = paidSales.reduce((acc, s) => acc + (s.quantityKg || 0), 0);

    // ── Selected-day drill-down (dari kalender) ────────────────────
    const selectedDayStr    = selectedDate ? selectedDate.toISOString().slice(0, 10) : null;
    const todayStr          = new Date().toISOString().slice(0, 10);
    const selectedDaySales  = selectedDate
        ? sales.filter(s => (s.createdAt || '').slice(0, 10) === selectedDayStr)
        : [];
    const selectedDayPaid    = selectedDaySales.filter(s => s.status === 'paid');
    const selectedDayRevenue = selectedDayPaid.reduce((acc, s) => acc + (s.totalPrice || 0), 0);
    const selectedDayKg      = selectedDayPaid.reduce((acc, s) => acc + (s.quantityKg || 0), 0);

    // Tabel: jika tanggal dipilih → penjualan hari itu, else → 10 terbaru
    const displaySales = selectedDate ? selectedDaySales : sales.slice(0, 10);

    // ── Chart: last 7 days ─────────────────────────────────────────
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
    });
    const dayLabels      = last7.map(d => new Date(d).toLocaleDateString('id-ID', { weekday: 'short' }));
    const dayRevSeries   = last7.map(d => {
        const day = paidSales.filter(s => (s.createdAt || '').startsWith(d));
        return parseFloat((day.reduce((acc, s) => acc + (s.totalPrice || 0), 0) / 1_000_000).toFixed(2));
    });
    const dayCountSeries = last7.map(d => paidSales.filter(s => (s.createdAt || '').startsWith(d)).length);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        fetchSales();
        fetchStats();
        setupRealtime();
        return () => {
            // Bersihkan subscription Realtime saat komponen unmount
            if (realtimeRef.current) {
                supabase.removeChannel(realtimeRef.current);
            }
        };
    }, []);

    // ── fetchStats: ambil 3 angka dari /api/farmer/stats ───────────
    async function fetchStats() {
        setDbStats(prev => ({ ...prev, loadingStats: true }));
        try {
            const token = getToken();
            const res   = await fetch('/api/farmer/stats', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const json  = await res.json();
            if (json.success) {
                setDbStats({
                    totalProducts:    json.data.totalProducts,
                    totalStock:       json.data.totalStock,
                    totalTxThisMonth: json.data.totalTxThisMonth,
                    revenueThisMonth: json.data.revenueThisMonth,
                    month:            json.data.month,
                    loadingStats:     false,
                });
            }
        } catch {
            setDbStats(prev => ({ ...prev, loadingStats: false }));
        }
    }

    // ── setupRealtime: subscribe perubahan DB → auto-refresh angka ──
    // Menggunakan Supabase Realtime (anon client).
    // Saat ada INSERT/UPDATE/DELETE di tabel `sales` atau `products`,
    // fetchStats() dan/atau fetchSales() otomatis dipanggil ulang.
    function setupRealtime() {
        const channel = supabase
            .channel('farmer-dashboard-realtime')
            // ── Pantau tabel sales ──────────────────────────────────
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sales' },
                () => {
                    fetchSales();   // refresh daftar penjualan
                    fetchStats();   // refresh angka bulan ini
                }
            )
            // ── Pantau tabel products (stok berubah saat admin approve) ──
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                () => {
                    fetchStats();   // refresh Total Produk + Total Stok
                }
            )
            .subscribe();

        realtimeRef.current = channel;
    }

    // Auto-refresh tengah malam
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                fetchSales();
                fetchStats();       // refresh bulan baru saat midnight
                setSelectedDate(null);
            }
        }, 60_000);
        return () => clearInterval(timer);
    }, []);

    async function fetchSales() {
        setLoading(true);
        try {
            const token = getToken();
            const res = await fetch('/api/sales', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = await res.json();
            setSales(data.data || []);
        } catch { /* offline */ }
        finally { setLoading(false); }
    }

    function handleSaleAdded(newSale) {
        setSales(prev => [newSale, ...prev]);
        setShowModal(false);
    }

    async function handleDeleteSale(id) {
        if (!confirm('Hapus entri penjualan ini?')) return;
        const token = getToken();
        await fetch(`/api/sales?id=${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setSales(prev => prev.filter(s => s.id !== id));
    }

    // ── Stats Cards — data real dari Supabase ─────────────────────
    const loadTxt = dbStats.loadingStats ? '…' : null;
    const statsData = [
        {
            title:    'Total Produk',
            value:    loadTxt ?? dbStats.totalProducts.toLocaleString(),
            change:   dbStats.totalProducts > 0 ? 'di database' : 'Belum ada produk',
            positive: true,
            sub:      'Produk yang kamu daftarkan',
            // Ikon box / package
            icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="2"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/></svg>,
            color: '#4A7C28', bg: 'rgba(74,124,40,0.1)',
        },
        {
            title:    'Total Stok',
            value:    loadTxt ?? (
                          dbStats.totalStock >= 1000
                            ? `${(dbStats.totalStock / 1000).toFixed(1)} Ton`
                            : `${dbStats.totalStock.toLocaleString()} kg`
                      ),
            change:   `${dbStats.totalProducts} produk`,
            positive: true,
            sub:      'Stok kopi tersisa di gudang',
            // Ikon database / tumpukan
            icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="2"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" stroke="currentColor" strokeWidth="2"/></svg>,
            color: '#F5A623', bg: 'rgba(245,166,35,0.1)',
        },
        {
            title:    `Transaksi ${dbStats.month || 'Bulan Ini'}`,
            value:    loadTxt ?? dbStats.totalTxThisMonth.toLocaleString(),
            change:   dbStats.totalTxThisMonth > 0 ? `+${dbStats.totalTxThisMonth} entri` : 'Belum ada',
            positive: dbStats.totalTxThisMonth > 0,
            sub:      'Penjualan bulan berjalan',
            // Ikon receipt / transaksi
            icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
            color: '#00D4FF', bg: 'rgba(0,212,255,0.1)',
        },
        {
            title:    'Total Revenue',
            value:    loadTxt ?? (
                          totalRevenue >= 1_000_000
                            ? `Rp ${(totalRevenue / 1_000_000).toFixed(1)} Jt`
                            : `Rp ${totalRevenue.toLocaleString('id-ID')}`
                      ),
            change:   `${paidSales.length} transaksi lunas`,
            positive: true,
            sub:      'Akumulasi semua penjualan',
            icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
            color: '#4CAF50', bg: 'rgba(76,175,80,0.1)',
        },
    ];

    // ── Chart config ───────────────────────────────────────────────
    const chartOptions = {
        chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
        colors: ['#4A7C28', '#F5A623'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.01, stops: [0, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2.5 },
        grid: { borderColor: 'rgba(74,124,40,0.1)', strokeDashArray: 4 },
        xaxis: { categories: dayLabels, labels: { style: { colors: '#5E7A5A', fontSize: '12px' } }, axisBorder: { show: false } },
        yaxis: { labels: { style: { colors: '#5E7A5A', fontSize: '12px' } } },
        legend: { labels: { colors: '#9DB89A' }, position: 'top' },
        tooltip: { theme: 'dark' },
    };
    const chartSeries = [
        { name: 'Revenue (Juta Rp)', data: dayRevSeries },
        { name: 'Jumlah Penjualan',  data: dayCountSeries },
    ];

    const pmLabels = { transfer: 'Transfer Bank', cash: 'Tunai', qr: 'QR Pay' };

    return (
        <div className={styles.page}>
            {/* ── Page Header ─────────────────────────────────────── */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Dashboard Penjualan</h1>
                    <p className={styles.pageSubtitle}>
                        {walletPublicKey ? `Phantom: ${walletPublicKey.slice(0, 8)}...${walletPublicKey.slice(-6)} • ` : '-'}
                        Hanya menampilkan data penjualan milik <strong>{user?.name || 'kamu'}</strong>.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.dateChip}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        {selectedDate
                            ? selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                            : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>

                </div>
            </div>

            {/* ── Day-stats banner ────────────────────────────────── */}
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
                            {selectedDayStr === todayStr && (
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
                                    background: 'rgba(0,212,255,0.15)', color: '#00D4FF',
                                    border: '1px solid rgba(0,212,255,0.35)', fontWeight: 700 }}>
                                    Hari Ini
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1 }}>
                            {[
                                { label: 'Total Entri',  value: selectedDaySales.length, color: '#00D4FF' },
                                { label: 'Lunas',        value: selectedDayPaid.length, color: '#4CAF50' },
                                { label: 'Revenue',      value: selectedDayRevenue >= 1_000_000 ? `Rp ${(selectedDayRevenue/1_000_000).toFixed(1)} Jt` : `Rp ${selectedDayRevenue.toLocaleString('id-ID')}`, color: '#7ED44A' },
                                { label: 'Kopi Terjual', value: `${selectedDayKg.toFixed(1)} kg`, color: '#F5A623' },
                            ].map((s, i) => (
                                <div key={i}>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setSelectedDate(null)}
                            style={{ padding: '5px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.06)',
                                border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
                                fontSize: 12, cursor: 'pointer' }}>
                            ✕ Reset
                        </button>
                    </div>
                </div>
            )}

            {/* ── Stats Cards ──────────────────────────────────────── */}
            <div className={styles.statsGrid}>
                {statsData.map((stat, i) => (
                    <div key={i} className={styles.statCard} style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className={styles.statTop}>
                            <div className={styles.statIcon} style={{ background: stat.bg }}>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                                    {stat.icon}
                                </span>
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

            {/* ── Chart + Calendar ─────────────────────────────────── */}
            <div className={styles.chartsRow}>
                <div className={styles.card} style={{ flex: 2 }}>
                    <div className={styles.cardHeader}>
                        <div>
                            <h3 className={styles.cardTitle}>Riwayat Penjualan Harian (7 Hari)</h3>
                            <p className={styles.cardSubtitle}>Data dari database kamu — revenue &amp; jumlah penjualan per hari</p>
                        </div>
                    </div>
                    {mounted && (
                        <ReactApexChart options={chartOptions} series={chartSeries} type="area" height={240} />
                    )}
                </div>
                <div>
                    <DashboardCalendar onDateSelect={setSelectedDate} />
                </div>
            </div>

            {/* ── Sales History Table ───────────────────────────────── */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>Riwayat Penjualan Kamu</h3>
                        <p className={styles.cardSubtitle}>
                            {selectedDate
                                ? `${selectedDaySales.length} entri pada ${selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                : `${sales.length} total entri — menampilkan 10 terbaru`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {selectedDate && (
                            <button onClick={() => setSelectedDate(null)}
                                style={{ padding: '5px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
                                    fontSize: 12, cursor: 'pointer' }}>
                                ✕ Reset Filter
                            </button>
                        )}

                    </div>
                </div>

                {loading ? (
                    <div className={styles.loadingRow}>
                        <div className={styles.loadingSpinner} /> Memuat data penjualan...
                    </div>
                ) : displaySales.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{ fontSize: 16, marginBottom: 12 }}>Produk</div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 8 }}>
                            {selectedDate ? 'Tidak ada penjualan pada tanggal ini.' : 'Belum ada entri penjualan.'}
                        </div>

                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Produk</th>
                                    <th>Varietas / Grade</th>
                                    <th>Berat (kg)</th>
                                    <th>Harga / kg</th>
                                    <th>Total</th>
                                    <th>Pembeli</th>
                                    <th>Metode</th>
                                    <th>Status</th>
                                    <th>Waktu</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {displaySales.map(s => {
                                    const stColor = { paid: '#4CAF50', pending: '#FF9800', cancelled: '#888' }[s.status] || '#888';
                                    return (
                                        <tr key={s.id}>
                                            <td className={styles.txFarmer} style={{ fontWeight: 600 }}>{s.productName}</td>
                                            <td className={styles.txLocation} style={{ fontSize: 12 }}>
                                                {s.variety} · {s.grade}
                                            </td>
                                            <td style={{ fontVariantNumeric: 'tabular-nums' }}>{s.quantityKg} kg</td>
                                            <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                Rp {(s.pricePerKg || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className={styles.txAmount}>
                                                Rp {(s.totalPrice || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className={styles.txLocation}>{s.buyerName || '—'}</td>
                                            <td>
                                                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 100,
                                                    background: 'rgba(74,124,40,0.12)', color: '#7ED44A',
                                                    border: '1px solid rgba(74,124,40,0.3)', fontWeight: 600 }}>
                                                    {pmLabels[s.paymentMethod] || s.paymentMethod || '—'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={styles.badge}
                                                    style={{ background: stColor + '22', color: stColor, border: `1px solid ${stColor}44` }}>
                                                    {s.status === 'paid' ? 'LUNAS' : (s.status || '—').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className={styles.txTime}>
                                                {s.createdAt
                                                    ? new Date(s.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                    : '—'}
                                            </td>
                                            <td>
                                                <button onClick={() => handleDeleteSale(s.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                                                        color: 'var(--color-text-muted)', padding: '4px 6px',
                                                        borderRadius: 6, fontSize: 13 }}
                                                    title="Hapus entri">
                                                    Hapus
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Ringkasan bawah ───────────────────────────────────── */}
            <div className={styles.card} style={{ marginTop: 0 }}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>Ringkasan Akumulatif</h3>
                        <p className={styles.cardSubtitle}>
                            {paidSales.length} transaksi lunas &nbsp;·&nbsp;
                            {totalKg >= 1000 ? ` ${(totalKg / 1000).toFixed(1)} Ton` : ` ${totalKg.toFixed(1)} kg`} terjual &nbsp;·&nbsp;
                            Rp {totalRevenue.toLocaleString('id-ID')} revenue
                        </p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, padding: '4px 0' }}>
                    {[
                        { label: 'Total Lunas',    value: paidSales.length,   color: '#4CAF50', icon: '✓' },
                        { label: 'Total Kopi',     value: totalKg >= 1000 ? `${(totalKg/1000).toFixed(1)} Ton` : `${totalKg.toFixed(1)} kg`, color: '#F5A623', icon: '☕' },
                        { label: 'Total Revenue',  value: totalRevenue >= 1_000_000 ? `Rp ${(totalRevenue/1_000_000).toFixed(1)} Jt` : `Rp ${totalRevenue.toLocaleString('id-ID')}`, color: '#7ED44A', icon: 'Rp' },
                        { label: 'Hari Ini',       value: `${dayCountSeries[dayCountSeries.length - 1]} entri`, color: '#00D4FF', icon: '○' },
                    ].map((s, i) => (
                        <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: 12, padding: '14px 16px' }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Sale Modal */}
            {showModal && (
                <AddSaleModal
                    onClose={() => setShowModal(false)}
                    onSuccess={handleSaleAdded}
                />
            )}
        </div>
    );
}
