'use client';

import { useState, useEffect } from 'react';
import styles from './FarmersPage.module.css';

function fmtVolume(kg) {
    if (!kg && kg !== 0) return '—';
    return kg >= 1000 ? `${(kg / 1000).toFixed(1)} Ton` : `${kg} kg`;
}
function fmtEarnings(rp) {
    if (!rp && rp !== 0) return '—';
    if (rp >= 1_000_000_000) return `Rp ${(rp / 1_000_000_000).toFixed(2)} M`;
    if (rp >= 1_000_000)     return `Rp ${Math.round(rp / 1_000_000)} Jt`;
    if (rp >= 1_000)         return `Rp ${Math.round(rp / 1_000)} rb`;
    return `Rp ${rp}`;
}
function fmtWallet(w) {
    if (!w) return '—';
    return w.length > 14 ? `${w.slice(0, 6)}...${w.slice(-4)}` : w;
}

export default function FarmersPage() {
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('cc_token');
        fetch('/api/farmers', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then(r => r.json())
            .then(d => setFarmers(d.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Hitung 4 kartu stats dari data nyata
    const thisMonth     = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const totalPetani   = farmers.length;
    const koperasiAktif = farmers.filter(f => f.type === 'Koperasi' && f.status === 'Verified').length;
    const terverifikasi = farmers.filter(f => f.status === 'Verified').length;
    const baruBulanIni  = farmers.filter(f => (f.joined || '').startsWith(thisMonth)).length;

    const stats = [
        { label: 'Total Petani',   val: loading ? '…' : totalPetani.toLocaleString('id-ID'),   icon: 'CC', color: '#4A7C28' },
        { label: 'Koperasi Aktif', val: loading ? '…' : koperasiAktif.toLocaleString('id-ID'), icon: 'CC', color: '#F5A623' },
        { label: 'Terverifikasi',  val: loading ? '…' : terverifikasi.toLocaleString('id-ID'),  icon: '✅', color: '#4CAF50' },
        { label: 'Baru Bulan Ini', val: loading ? '…' : (baruBulanIni > 0 ? `+${baruBulanIni}` : '0'), icon: '🆕', color: '#00D4FF' },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Data Petani & Koperasi</h1>
                    <p className={styles.pageSubtitle}>Petani aktif yang terdaftar di CoffeeChain</p>
                </div>
            </div>

            {/* Stats */}
            <div className={styles.statsRow}>
                {stats.map((s, i) => (
                    <div key={i} className={styles.statCard}>
                        <div className={styles.statIcon}>{s.icon}</div>
                        <div className={styles.statVal} style={{ color: s.color }}>{s.val}</div>
                        <div className={styles.statLabel}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Farmer Cards Grid */}
            <div className={styles.grid}>
                {!loading && farmers.length === 0 && (
                    <div className={styles.emptyState}>
                        Belum ada petani aktif yang terdaftar.
                    </div>
                )}
                {farmers.map((f) => (
                    <div key={f.id} className={styles.farmerCard}>
                        <div className={styles.cardTop}>
                            <div className={styles.avatar}>
                                {(f.name || '??').substr(0, 2).toUpperCase()}
                            </div>
                            <div className={styles.cardTopInfo}>
                                <div className={styles.farmerName}>{f.name}</div>
                                <div className={styles.farmerType}>{f.type} • {f.region}</div>
                            </div>
                            <span className={`${styles.statusBadge} ${f.status === 'Verified' ? styles.verified : styles.pending}`}>
                                {f.status === 'Verified' ? '✓ Verified' : '⏳ Pending'}
                            </span>
                        </div>

                        <div className={styles.walletRow}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2" /></svg>
                            <span className={styles.walletAddr}>{fmtWallet(f.wallet)}</span>
                        </div>

                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <div className={styles.statItemVal}>{fmtVolume(f.volume)}</div>
                                <div className={styles.statItemLabel}>Volume</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statItemVal} style={{ color: '#4A7C28' }}>{fmtEarnings(f.earnings)}</div>
                                <div className={styles.statItemLabel}>Pendapatan</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statItemVal}>{f.rating ?? '—'} ⭐</div>
                                <div className={styles.statItemLabel}>Rating</div>
                            </div>
                        </div>

                        <div className={styles.cardFooter}>
                            <span className={styles.joinDate}>Bergabung: {f.joined || '—'}</span>
                            <button className={styles.detailBtn}>Lihat Detail →</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
