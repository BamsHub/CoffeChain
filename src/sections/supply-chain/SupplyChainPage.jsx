'use client';

import styles from './SupplyChainPage.module.css';

const batches = [
    {
        id: 'BATCH-001',
        variety: 'Arabika Grade A',
        farmer: 'Koperasi Gayo Murni',
        weight: '500 kg',
        origin: 'Gayo, Aceh',
        destination: 'Jakarta',
        stage: 4,
        stages: [
            { label: 'Panen', time: '10 Feb 2026', status: 'done', by: 'Petani Gayo' },
            { label: 'Pengolahan', time: '12 Feb 2026', status: 'done', by: 'Fasilitas Wet-Mill' },
            { label: 'Pengeringan', time: '15 Feb 2026', status: 'done', by: 'Gudang Gayo' },
            { label: 'Pengiriman', time: '20 Feb 2026', status: 'done', by: 'Ekspedisi ABC' },
            { label: 'Diterima Pembeli', time: '25 Feb 2026', status: 'active', by: 'PT Kopi Jaya Jakarta' },
            { label: 'Pembayaran', time: '-', status: 'waiting', by: '-' },
        ],
    },
    {
        id: 'BATCH-002',
        variety: 'Arabika Toraja',
        farmer: 'Toraja Coffee Estate',
        weight: '300 kg',
        origin: 'Toraja, Sulsel',
        destination: 'Surabaya',
        stage: 3,
        stages: [
            { label: 'Panen', time: '14 Feb 2026', status: 'done', by: 'Petani Toraja' },
            { label: 'Pengolahan', time: '16 Feb 2026', status: 'done', by: 'Fasilitas Honey-Process' },
            { label: 'Pengeringan', time: '19 Feb 2026', status: 'done', by: 'Gudang Toraja' },
            { label: 'Pengiriman', time: '26 Feb 2026', status: 'active', by: 'Ekspedisi XYZ' },
            { label: 'Diterima Pembeli', time: '-', status: 'waiting', by: 'UD Kopi Emas' },
            { label: 'Pembayaran', time: '-', status: 'waiting', by: '-' },
        ],
    },
];

export default function SupplyChainPage() {
    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Supply Chain Tracker</h1>
                    <p className={styles.pageSubtitle}>Lacak perjalanan kopi dari kebun hingga tangan pembeli secara transparan di blockchain</p>
                </div>
                <button className={styles.btnPrimary}>+ Buat Batch Baru</button>
            </div>

            {/* Stats */}
            <div className={styles.statsRow}>
                {[
                    { label: 'Batch Aktif', val: '84', icon: '📦', color: '#4A7C28' },
                    { label: 'Dalam Pengiriman', val: '23', icon: '🚚', color: '#F5A623' },
                    { label: 'Selesai Bulan Ini', val: '156', icon: '✓', color: '#4CAF50' },
                    { label: 'Rata-rata Waktu', val: '14 Hari', icon: '⏱', color: '#00D4FF' },
                ].map((s, i) => (
                    <div key={i} className={styles.statCard}>
                        <span className={styles.statIcon}>{s.icon}</span>
                        <span className={styles.statVal} style={{ color: s.color }}>{s.val}</span>
                        <span className={styles.statLabel}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Batch Timeline Cards */}
            {batches.map((batch) => (
                <div key={batch.id} className={styles.batchCard}>
                    <div className={styles.batchHeader}>
                        <div>
                            <div className={styles.batchId}>{batch.id}</div>
                            <div className={styles.batchName}>{batch.variety} — {batch.weight}</div>
                            <div className={styles.batchMeta}>
                                <span>🌱 {batch.farmer}</span>
                                <span>📍 {batch.origin} → {batch.destination}</span>
                            </div>
                        </div>
                        <div className={styles.progressBox}>
                            <div className={styles.progressLabel}>{batch.stage}/{batch.stages.length} Tahap</div>
                            <div className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ width: `${(batch.stage / batch.stages.length) * 100}%` }} />
                            </div>
                            <div className={styles.progressPct}>{Math.round((batch.stage / batch.stages.length) * 100)}%</div>
                        </div>
                    </div>

                    <div className={styles.timeline}>
                        {batch.stages.map((s, i) => (
                            <div key={i} className={styles.timelineItem}>
                                <div className={styles.timelineLeft}>
                                    <div className={`${styles.dot} ${styles['dot' + s.status]}`}>
                                        {s.status === 'done' && <svg width="10" height="10" fill="none" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                        {s.status === 'active' && <div className={styles.dotPulse} />}
                                    </div>
                                    {i < batch.stages.length - 1 && <div className={`${styles.line} ${s.status === 'done' ? styles.lineDone : styles.lineWaiting}`} />}
                                </div>
                                <div className={styles.timelineContent}>
                                    <div className={styles.stageLabel}>{s.label}</div>
                                    <div className={styles.stageMeta}>{s.by} {s.time !== '-' && `• ${s.time}`}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
