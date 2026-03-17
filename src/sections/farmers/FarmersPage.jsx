'use client';

import styles from './FarmersPage.module.css';

const farmers = [
    { id: 'F001', name: 'Koperasi Gayo Murni', region: 'Gayo, Aceh', type: 'Koperasi', members: 124, volume: '24.5 Ton', earnings: 'Rp 1.68 M', status: 'Verified', rating: 4.9, joined: '2022-03-15', wallet: '0x3f8a...c9d1' },
    { id: 'F002', name: 'Pak Slamet Riyadi', region: 'Gayo, Aceh', type: 'Individu', members: 1, volume: '18.2 Ton', earnings: 'Rp 1.25 M', status: 'Verified', rating: 4.8, joined: '2022-05-20', wallet: '0x7b2c...e4f9' },
    { id: 'F003', name: 'Toraja Coffee Estate', region: 'Toraja, Sulsel', type: 'Koperasi', members: 87, volume: '15.7 Ton', earnings: 'Rp 1.07 M', status: 'Verified', rating: 4.7, joined: '2023-01-10', wallet: '0xd1e3...8a2b' },
    { id: 'F004', name: 'CV Flores Arabika', region: 'Flores, NTT', type: 'Perusahaan', members: 35, volume: '12.3 Ton', earnings: 'Rp 843 Jt', status: 'Verified', rating: 4.8, joined: '2023-06-05', wallet: '0x5c9f...1e7a' },
    { id: 'F005', name: 'Pak Bambang Santoso', region: 'Bandung, Jabar', type: 'Individu', members: 1, volume: '9.8 Ton', earnings: 'Rp 671 Jt', status: 'Verified', rating: 4.6, joined: '2023-08-22', wallet: '0x2a8b...f3d5' },
    { id: 'F006', name: 'Bu Ratna Dewi', region: 'Toraja, Sulsel', type: 'Individu', members: 1, volume: '7.2 Ton', earnings: 'Rp 493 Jt', status: 'Pending', rating: 4.5, joined: '2024-01-14', wallet: '0x9c1d...7b4e' },
    { id: 'F007', name: 'Koperasi Mandheling Jaya', region: 'Mandheling, Sumut', type: 'Koperasi', members: 92, volume: '6.9 Ton', earnings: 'Rp 472 Jt', status: 'Verified', rating: 4.7, joined: '2023-11-03', wallet: '0xef22...3a9c' },
    { id: 'F008', name: 'Pak Yunus Wamena', region: 'Wamena, Papua', type: 'Individu', members: 1, volume: '5.4 Ton', earnings: 'Rp 370 Jt', status: 'Verified', rating: 4.9, joined: '2024-02-18', wallet: '0x4d6e...2f01' },
];

const stats = [
    { label: 'Total Petani', val: '3,921', icon: '👩‍🌾', color: '#4A7C28' },
    { label: 'Koperasi Aktif', val: '284', icon: '🏘️', color: '#F5A623' },
    { label: 'Terverifikasi', val: '3,647', icon: '✅', color: '#4CAF50' },
    { label: 'Baru Bulan Ini', val: '+241', icon: '🆕', color: '#00D4FF' },
];

export default function FarmersPage() {
    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Data Petani & Koperasi</h1>
                    <p className={styles.pageSubtitle}>Semua petani dan koperasi yang terdaftar di blockchain CoffeeChain</p>
                </div>
                <button className={styles.btnPrimary}>+ Daftar Petani Baru</button>
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
                {farmers.map((f) => (
                    <div key={f.id} className={styles.farmerCard}>
                        <div className={styles.cardTop}>
                            <div className={styles.avatar}>
                                {f.name.substr(0, 2).toUpperCase()}
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
                            <span className={styles.walletAddr}>{f.wallet}</span>
                        </div>

                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <div className={styles.statItemVal}>{f.volume}</div>
                                <div className={styles.statItemLabel}>Volume</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statItemVal} style={{ color: '#4A7C28' }}>{f.earnings}</div>
                                <div className={styles.statItemLabel}>Pendapatan</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statItemVal}>{f.rating} ⭐</div>
                                <div className={styles.statItemLabel}>Rating</div>
                            </div>
                        </div>

                        <div className={styles.cardFooter}>
                            <span className={styles.joinDate}>Bergabung: {f.joined}</span>
                            <button className={styles.detailBtn}>Lihat Detail →</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
