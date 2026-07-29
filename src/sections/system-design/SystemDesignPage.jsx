'use client';

import performanceReport from '@/data/blockchainNonFunctionalReport.json';
import styles from './SystemDesignPage.module.css';

const contextActors = [
    ['Petani', 'Data identitas, batch, enam tahap produksi, bukti foto'],
    ['Koperasi / Admin', 'Review petani, review data kopi, keputusan sertifikasi'],
    ['Pembeli / Konsumen', 'Order, pembayaran, Coffee ID, QR trace'],
    ['Layanan Eksternal', 'Supabase, IPFS, Solana Testnet, Midtrans'],
];

const levelOne = [
    ['P1', 'Autentikasi & Verifikasi Petani', 'Users, Verification Tokens'],
    ['P2', 'Pipeline Produksi 1-6', 'Production Batches, Stage Logs, IPFS Assets'],
    ['P3', 'Audit & Sertifikasi Kopi', 'Products, Coffee Traces, Solana'],
    ['P4', 'Order & Pembayaran', 'Orders, Transactions, Midtrans/SOL'],
    ['P5', 'Trace Publik & QR', 'Coffee Trace, IPFS Evidence, Explorer URL'],
];

const levelTwo = [
    'Validasi status petani',
    'Periksa enam tahap berurutan',
    'Periksa metadata dan bukti IPFS',
    'Buat manifest dan hash bukti',
    'Kirim Memo ke Solana Testnet',
    'Tunggu confirmed/finalized',
    'Simpan Coffee ID, signature, dan Explorer URL',
    'Publikasikan produk dan QR trace',
];

const dataDictionary = [
    ['users', 'Identitas dan hak akses pengguna', 'id, role, farmer_category, farmer_community_name, province, regency, district, email_verified, farmer_verification_status, wallet'],
    ['production_batches', 'Header satu batch kopi', 'id, farmer_id, origin, variety, grade, current_stage'],
    ['production_stage_logs', 'Catatan enam tahap produksi', 'batch_id, stage, data, photo_url, logged_by, created_at'],
    ['ipfs_assets', 'Bukti foto terikat pemilik, batch, dan tahap', 'cid, ipfs_uri, gateway_url, owner_id, batch_id, stage'],
    ['products', 'Produk akhir yang menunggu atau sudah disertifikasi', 'status, weight, price_per_unit, stock_per_unit, coffee_id'],
    ['coffee_traces', 'Identitas trace dan bukti on-chain', 'coffee_id, product_id, tx_signature, explorer_url, status'],
    ['orders', 'Pemesanan dan pembayaran', 'order_id, product_id, total_price, payment_method, tx_signature'],
    ['transactions', 'Audit transaksi aplikasi/blockchain', 'hash, type, product_id, status, timestamp'],
];

function Flow({ items, numbered = false }) {
    return (
        <div className={styles.flow}>
            {items.map((item, index) => (
                <div className={styles.flowItem} key={typeof item === 'string' ? item : item[0]}>
                    <div className={styles.flowNode}>
                        {numbered && <span className={styles.stepNumber}>{index + 1}</span>}
                        {Array.isArray(item) ? (
                            <>
                                <strong>{item[0]}</strong>
                                <span>{item[1]}</span>
                            </>
                        ) : <strong>{item}</strong>}
                    </div>
                    {index < items.length - 1 && <span className={styles.arrow}>→</span>}
                </div>
            ))}
        </div>
    );
}

function StatusPath({ children }) {
    return <div className={styles.stateNode}>{children}</div>;
}

export default function SystemDesignPage() {
    const readLoad = performanceReport.readRpcLoadTest;
    const writeSample = performanceReport.writeConfirmationSample;
    const fee = performanceReport.feeAudit;
    const dependencyAudit = performanceReport.dependencyAudit;
    const passedSecurity = performanceReport.securityChecks.filter(item => item.passed).length;

    return (
        <div className={styles.page}>
            <header className={styles.hero}>
                <div>
                    <span className={styles.eyebrow}>Revision evidence center</span>
                    <h1>Desain, Verifikasi, dan Bukti Pengujian</h1>
                    <p>
                        Satu halaman untuk merunut paradigma implementasi, aliran data, state,
                        sertifikasi, transaksi Solana, pengujian non-fungsional, dan biaya jaringan.
                    </p>
                </div>
                <div className={styles.paradigmCard}>
                    <span>Paradigma implementasi</span>
                    <strong>Functional-Modular</strong>
                    <small>React function components, Route Handlers, helper functions, dan service modules.</small>
                </div>
            </header>

            <section className={styles.card}>
                <div className={styles.sectionHeading}>
                    <span>01</span>
                    <div>
                        <h2>Blok Arsitektur Sistem</h2>
                        <p>Frontend tidak mengakses database, IPFS, atau blockchain secara langsung.</p>
                    </div>
                </div>
                <Flow items={[
                    ['React / Next.js UI', 'Form, dashboard, QR, wallet'],
                    ['Next.js Route Handlers', 'JWT, RBAC, validasi input'],
                    ['Domain Services', 'Audit produksi, payment, trace'],
                    ['External Gateways', 'Supabase, IPFS, Solana, Midtrans'],
                    ['Evidence', 'CID, signature, Explorer URL, audit log'],
                ]} />
            </section>

            <div className={styles.twoColumns}>
                <section className={styles.card}>
                    <div className={styles.sectionHeading}>
                        <span>02</span>
                        <div>
                            <h2>Context Diagram</h2>
                            <p>CoffeeChain sebagai satu proses utama.</p>
                        </div>
                    </div>
                    <div className={styles.contextGrid}>
                        {contextActors.map(([actor, data]) => (
                            <div className={styles.actor} key={actor}>
                                <strong>{actor}</strong>
                                <span>{data}</span>
                            </div>
                        ))}
                        <div className={styles.systemCore}>CoffeeChain System</div>
                    </div>
                </section>

                <section className={styles.card}>
                    <div className={styles.sectionHeading}>
                        <span>03</span>
                        <div>
                            <h2>DFD Level 1</h2>
                            <p>Lima proses utama dan penyimpanan datanya.</p>
                        </div>
                    </div>
                    <div className={styles.processList}>
                        {levelOne.map(([id, process, store]) => (
                            <div className={styles.processRow} key={id}>
                                <b>{id}</b>
                                <div><strong>{process}</strong><span>{store}</span></div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <section className={styles.card}>
                <div className={styles.sectionHeading}>
                    <span>04</span>
                    <div>
                        <h2>DFD Level 2 - Sertifikasi Kopi</h2>
                        <p>Detail proses P3, dari data kandidat sampai produk terverifikasi.</p>
                    </div>
                </div>
                <Flow items={levelTwo} numbered />
            </section>

            <div className={styles.twoColumns}>
                <section className={styles.card}>
                    <div className={styles.sectionHeading}>
                        <span>05</span>
                        <div>
                            <h2>State Petani</h2>
                            <p>Status akun tidak sama dengan sekadar berhasil login.</p>
                        </div>
                    </div>
                    <div className={styles.stateFlow}>
                        <StatusPath>Registered</StatusPath><span>→</span>
                        <StatusPath>Email Pending</StatusPath><span>→</span>
                        <StatusPath>Review Pending</StatusPath><span>→</span>
                        <div className={styles.stateBranch}>
                            <StatusPath>Verified</StatusPath>
                            <StatusPath>Rejected → Update → Pending</StatusPath>
                        </div>
                    </div>
                </section>

                <section className={styles.card}>
                    <div className={styles.sectionHeading}>
                        <span>06</span>
                        <div>
                            <h2>State Data Kopi</h2>
                            <p>Hanya status verified yang boleh dipublikasikan sebagai bukti blockchain.</p>
                        </div>
                    </div>
                    <div className={styles.stateFlow}>
                        <StatusPath>Draft Batch</StatusPath><span>→</span>
                        <StatusPath>Stage 1-6</StatusPath><span>→</span>
                        <StatusPath>Pending Certification</StatusPath><span>→</span>
                        <div className={styles.stateBranch}>
                            <StatusPath>Rejected → Correction</StatusPath>
                            <StatusPath>IPFS Proof → Solana Confirmed → Published</StatusPath>
                        </div>
                    </div>
                </section>
            </div>

            <section className={styles.card}>
                <div className={styles.sectionHeading}>
                    <span>07</span>
                    <div>
                        <h2>Alur Smart Contract / Solana yang Disederhanakan</h2>
                        <p>Alur sertifikasi aplikasi saat ini menggunakan transaksi Memo yang ditandatangani server.</p>
                    </div>
                </div>
                <Flow items={[
                    ['Reviewer', 'Klik setujui sertifikasi'],
                    ['Certification Audit', 'Seluruh checklist harus lulus'],
                    ['IPFS', 'Foto + manifest; hasilkan CID dan hash'],
                    ['Solana Memo Program', 'Server signer mengirim hash bukti'],
                    ['RPC Confirmation', 'Preflight dan confirmed/finalized'],
                    ['Coffee Trace', 'Simpan Coffee ID, signature, Explorer URL'],
                    ['QR Consumer', 'Tampilkan data off-chain dan bukti on-chain'],
                ]} />
                <div className={styles.truthNote}>
                    Supabase dan IPFS menyimpan data/bukti off-chain. Suatu sertifikat baru disebut on-chain
                    setelah transaction signature benar-benar terkonfirmasi dan Explorer URL disimpan.
                </div>
            </section>

            <section className={styles.card}>
                <div className={styles.sectionHeading}>
                    <span>08</span>
                    <div>
                        <h2>Kamus Data Utama</h2>
                        <p>Definisi ringkas data store untuk melengkapi DFD.</p>
                    </div>
                </div>
                <div className={styles.tableWrap}>
                    <table>
                        <thead><tr><th>Data Store</th><th>Fungsi</th><th>Elemen Utama</th></tr></thead>
                        <tbody>
                            {dataDictionary.map(row => (
                                <tr key={row[0]}>{row.map(cell => <td key={cell}>{cell}</td>)}</tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className={styles.card}>
                <div className={styles.sectionHeading}>
                    <span>09</span>
                    <div>
                        <h2>Pengujian Blockchain & Smart Contract</h2>
                        <p>Dihasilkan {new Date(performanceReport.generatedAt).toLocaleString('id-ID')} pada Solana Testnet.</p>
                    </div>
                </div>
                <div className={styles.metricGrid}>
                    <div><span>Security controls</span><strong>{passedSecurity}/{performanceReport.securityChecks.length}</strong><small>Static evidence passed</small></div>
                    <div><span>Historical writes</span><strong>{writeSample.successes}/{writeSample.transactions}</strong><small>{writeSample.latencySeconds.average}s confirmation average</small></div>
                    <div><span>Read RPC load</span><strong>{readLoad.successes}/{readLoad.requests}</strong><small>{readLoad.throughputRequestsPerSecond} request/s</small></div>
                    <div><span>RPC latency</span><strong>{readLoad.latencyMs.average} ms</strong><small>p95 {readLoad.latencyMs.p95} ms</small></div>
                    <div><span>Error rate</span><strong>{readLoad.errorRatePercent}%</strong><small>Concurrency {readLoad.concurrency}</small></div>
                    <div><span>Historical network fee</span><strong>{fee.averageTotalFeeLamports} lamports</strong><small>{fee.averageTotalFeeSol} SOL/transaction</small></div>
                </div>
                {dependencyAudit?.completed && (
                    <div className={styles.auditAlert}>
                        <strong>Dependency advisory scan:</strong>
                        <span>
                            {dependencyAudit.counts?.critical || 0} critical, {dependencyAudit.counts?.high || 0} high,
                            {' '}{dependencyAudit.counts?.moderate || 0} moderate pada dependency produksi.
                            Ini bukan penetration test dan tidak boleh disimpulkan sebagai keamanan menyeluruh.
                        </span>
                    </div>
                )}
                <div className={styles.evidenceColumns}>
                    <div>
                        <h3>Kontrol keamanan</h3>
                        {performanceReport.securityChecks.map(item => (
                            <div className={styles.evidenceRow} key={item.control}>
                                <b>{item.passed ? 'PASS' : 'FAIL'}</b>
                                <span><strong>{item.control}</strong><small>{item.evidence}</small></span>
                            </div>
                        ))}
                    </div>
                    <div>
                        <h3>Bottleneck yang ditemukan</h3>
                        <ul>{performanceReport.bottleneckFindings.map(item => <li key={item}>{item}</li>)}</ul>
                        <h3>Batas interpretasi</h3>
                        <ul>{performanceReport.limitations.map(item => <li key={item}>{item}</li>)}</ul>
                    </div>
                </div>
            </section>

            <section className={styles.card}>
                <div className={styles.sectionHeading}>
                    <span>10</span>
                    <div>
                        <h2>Perhitungan Network Fee yang Diperbaiki</h2>
                        <p>Nilai akhir diambil dari confirmed transaction meta.fee, bukan perkiraan harga SOL dalam dolar.</p>
                    </div>
                </div>
                <div className={styles.formula}>
                    <code>Priority fee = ceil(CU limit × CU price / 1,000,000)</code>
                    <code>Total fee = base fee + priority fee</code>
                </div>
                <div className={styles.feeGrid}>
                    <div><span>Base fee</span><strong>5,000 lamports</strong><small>1 signature</small></div>
                    <div><span>Historical priority fee</span><strong>200 lamports</strong><small>200,000 CU × 1,000 micro-lamports/CU</small></div>
                    <div><span>Historical total</span><strong>5,200 lamports</strong><small>0.0000052 SOL</small></div>
                    <div><span>New implementation</span><strong>Simulation + 10%</strong><small>CU limit disesuaikan sebelum pengiriman</small></div>
                </div>
                <p className={styles.footnote}>
                    Fee 5,200 lamports adalah hasil konfigurasi historis tiga transaksi, bukan harga tetap.
                    Implementasi baru mengembalikan rincian fee aktual dari transaksi terkonfirmasi.
                </p>
            </section>
        </div>
    );
}
