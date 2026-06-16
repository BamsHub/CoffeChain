'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const farmerGuides = [
    {
        title: '1. Mulai dari Dashboard Petani',
        items: [
            'Pantau ringkasan statistik (Total Produk, Total Stok, Transaksi Bulan Ini, dan Revenue Bulan Ini) dari menu Dashboard.',
            'Gunakan Area Chart untuk melihat tren penjualan harian Anda selama 7 hari terakhir.',
            'Gunakan Widget Kalender untuk memfilter penjualan pada tanggal tertentu secara instan.',
        ],
    },
    {
        title: '2. Kelola Produk & Stok (Alur Pipeline)',
        items: [
            'Buka menu Kelola Produk, lalu pilih tab Kelola Stok untuk memulai pencatatan batch kopi baru.',
            'Klik tombol "+ Buat Batch Baru" untuk mencatat detail panen (Nama, Asal Daerah, Varietas, Grade, Berat awal kg, dan Catatan).',
            'Alur produksi terdiri dari 6 Tahap Wajib: Pembersihan -> Pemanggangan -> Pendinginan -> Penggilingan -> Pelepasan Gas -> Produk Jadi.',
            'Klik "Catat Tahap" di setiap tahapan, isi parameter (operator, durasi, suhu, berat masuk/keluar), dan wajib unggah foto bukti.',
            'Saat tahap 6 (Produk Jadi) diselesaikan, sistem otomatis mendaftarkan produk baru di menu Kelola Produk dengan status "Pending".',
        ],
    },
    {
        title: '3. Memantau Transaksi & Pendapatan',
        items: [
            'Setiap transaksi penjualan dicatat secara terpisah di database lokal melalui Supabase Realtime.',
            'Buka menu Transaksi untuk melihat riwayat order dari pembeli di landing page yang sudah lunas (Paid) atau masih pending.',
            'Buka menu Dompet untuk melihat saldo SOL, IDR equivalent, dan riwayat transaksi Phantom Wallet Anda.',
        ],
    },
];

const developerGuides = [
    {
        title: '1. Kontrol Administrator & Koperasi',
        items: [
            'Review Produk: Menampilkan semua produk pending yang diajukan petani. Admin dapat menekan "✓ Setujui" (mengubah status jadi published ke landing page) atau "✕ Tolak" dengan memasukkan alasan.',
            'Pencatatan Transaksi Off-Chain/On-Chain: Di menu Transaksi, admin dapat menekan tombol "+ Tambah Transaksi DB" untuk mencatat perdagangan kopi fisik.',
            'Registrasi Blockchain Massal: Di menu Register Kopi, admin/koperasi memiliki tombol "On-chain semua via Server Wallet" untuk mendaftarkan semua produk published ke Solana sekaligus.',
        ],
    },
    {
        title: '2. Alur Integrasi Midtrans Payment Gateway',
        items: [
            'Pemicu Snap: Ketika pembeli mengklik "Beli Sekarang" di landing page dan memilih metode IDR Bank Transfer/QRIS, backend memicu request Snap ke Midtrans.',
            'Endpoint Webhook: Endpoint `/api/midtrans/notification` menerima callback realtime dari Midtrans untuk mengupdate status pembayaran (settlement/pending/expired).',
            'Status Check: Tombol "Cek Status Midtrans" memanggil `/api/midtrans/status` untuk mencocokkan status order.',
            'Auto Blockchain Write: Ketika pembayaran berstatus "Paid", backend otomatis mengirimkan memo transaksi ke Solana Testnet dan menyimpan `tx_signature` pada order database.',
        ],
    },
    {
        title: '3. Integrasi & Deployment Solana Testnet',
        items: [
            'Konfigurasi Jaringan: Terpusat di `src/lib/contractConfig.js` dengan RPC endpoint Testnet Solana.',
            'Program Memo: Menggunakan alamat program memo Solana standard untuk mencatat hash audit produk secara permanen.',
            'Verifikasi Publik: Siapa saja dapat memindai QR Code di sertifikat/kemasan kopi untuk diarahkan ke `/trace?id=CF-XXXXX` guna memverifikasi keabsahan data produksi langsung dari Solana Explorer.',
        ],
    },
];

const buttonRegistry = [
    {
        section: 'Landing Page & Pembelian',
        buttons: [
            { name: 'Beli Sekarang', desc: 'Membuka modal pembelian kopi untuk memilih berat, mengisi data pembeli, dan metode pembayaran.', type: 'Public / Pembeli' },
            { name: 'Lihat Detail (Katalog)', desc: 'Membuka modal detail produk yang berisi deskripsi, sertifikat kualitas, data blockchain, dan status kelulusan uji lab.', type: 'Public / Pembeli' },
            { name: 'Hubungkan Phantom Wallet', desc: 'Menghubungkan ekstensi Phantom Wallet di browser ke aplikasi untuk memproses pembayaran SOL.', type: 'Public / Pembeli' },
            { name: 'Bayar Sekarang (Order)', desc: 'Mengirim data pembelian ke database dan memicu popup Midtrans Snap atau transaksi Phantom SOL.', type: 'Public / Pembeli' },
        ]
    },
    {
        section: 'Autentikasi & Akun',
        buttons: [
            { name: 'Daftar & Kirim Verifikasi Email', desc: 'Memvalidasi data register, mendaftarkan akun ke DB dengan status pending, dan mengirim token verifikasi via email.', type: 'Form Register' },
            { name: 'Kirim Ulang Email Verifikasi', desc: 'Mengirim kembali link aktivasi jika email belum terverifikasi atau token kedaluwarsa.', type: 'Form Login' },
            { name: 'Masuk ke Dashboard', desc: 'Memvalidasi kredensial login dan mengarahkan user sesuai role masing-masing.', type: 'Form Login' },
        ]
    },
    {
        section: 'Kelola Produk & Stok Kopi',
        buttons: [
            { name: '+ Buat Batch Baru', desc: 'Membuka form pembuatan batch baru untuk memulai pencatatan alur produksi kopi.', type: 'Petani' },
            { name: 'Catat Tahap', desc: 'Membuka modal input data parameter per tahap produksi (operator, suhu, durasi, dll.) serta upload foto.', type: 'Petani' },
            { name: 'Simpan Tahap', desc: 'Menyimpan data tahap produksi ke database dan memajukan progress batch.', type: 'Petani' },
            { name: '✓ Setujui (Approval)', desc: 'Menyetujui produk pending milik petani agar dipublikasikan ke halaman katalog landing page.', type: 'Developer / Koperasi' },
            { name: '✕ Tolak (Approval)', desc: 'Menolak produk pending petani dengan memberikan alasan penolakan tertulis.', type: 'Developer / Koperasi' },
        ]
    },
    {
        section: 'Registrasi Blockchain (On-Chain)',
        buttons: [
            { name: 'Daftarkan ke Blockchain', desc: 'Menandatangani payload metadata kopi menggunakan Phantom Wallet milik user untuk dicatat ke Solana.', type: 'Developer / Koperasi' },
            { name: 'On-chain semua via Server Wallet', desc: 'Otomatis mendaftarkan seluruh produk published yang belum ter-chain secara massal menggunakan wallet server.', type: 'Developer / Koperasi' },
            { name: 'Lihat di Solana Explorer', desc: 'Membuka tautan transaksi on-chain di Solana Explorer (cluster Testnet) untuk pembuktian hash.', type: 'Semua User / Publik' },
        ]
    }
];

export default function DocumentationPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('guides'); // guides | buttons | testing
    
    const role = user?.role || 'farmer';
    const isDeveloper = role === 'developer' || role === 'koperasi';
    const guides = isDeveloper ? developerGuides : farmerGuides;
    const roleLabel = isDeveloper ? 'Developer / Koperasi' : 'Petani';

    const cardStyle = {
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 4px 20px var(--color-shadow)',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
    };

    const tabBtnStyle = (tabId) => ({
        padding: '10px 20px',
        borderRadius: 8,
        border: 'none',
        background: activeTab === tabId ? 'linear-gradient(135deg, var(--color-primary-light), var(--color-success))' : 'var(--color-bg-card2)',
        color: activeTab === tabId ? '#ffffff' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontWeight: 800,
        fontSize: 13,
        transition: 'var(--transition)',
        boxShadow: activeTab === tabId ? '0 4px 12px rgba(126, 212, 74, 0.2)' : 'none',
    });

    return (
        <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
                <div>
                    <div style={{ color: 'var(--color-primary-light)', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        DOKUMENTASI SISTEM & PENGUJIAN
                    </div>
                    <h1 style={{ color: 'var(--color-text)', fontSize: 'clamp(26px,4vw,36px)', margin: '6px 0', fontWeight: 900, letterSpacing: '-0.5px' }}>
                        Panduan Teknis CoffeeChain
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14, maxWidth: 720, lineHeight: 1.7 }}>
                        Portal informasi fungsionalitas tombol, alur proses bisnis kopi berbasis blockchain, serta laporan hasil pengujian fungsionalitas (Black Box) & struktural (White Box).
                    </p>
                </div>
                <div style={{ ...cardStyle, padding: '14px 20px', minWidth: 240, background: 'var(--color-bg-card2)' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Akun Aktif</div>
                    <div style={{ color: 'var(--color-text)', fontWeight: 900, marginTop: 4, fontSize: 16 }}>{user?.name || 'User'}</div>
                    <div style={{ color: 'var(--color-primary-light)', fontSize: 13, fontWeight: 800, marginTop: 3 }}>Role: {roleLabel}</div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap', borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
                <button style={tabBtnStyle('guides')} onClick={() => setActiveTab('guides')}>
                    📖 Panduan Alur Kerja ({roleLabel})
                </button>
                <button style={tabBtnStyle('buttons')} onClick={() => setActiveTab('buttons')}>
                    🔘 Detail Fungsional Tombol
                </button>
                <button style={tabBtnStyle('testing')} onClick={() => setActiveTab('testing')}>
                    🧪 Hasil Pengujian (White Box & Black Box)
                </button>
            </div>

            {/* Tab 1: Guides */}
            {activeTab === 'guides' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
                        {guides.map((section, idx) => (
                            <section key={idx} style={cardStyle}>
                                <h3 style={{ color: 'var(--color-text)', fontSize: 17, fontWeight: 900, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10 }}>
                                    {section.title}
                                </h3>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {section.items.map((item, i) => (
                                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10, alignItems: 'start' }}>
                                            <span style={{ 
                                                width: 20, 
                                                height: 20, 
                                                borderRadius: '50%', 
                                                background: 'rgba(126,212,74,0.12)', 
                                                border: '1px solid rgba(126,212,74,0.3)', 
                                                color: 'var(--color-logo-sub)', 
                                                display: 'grid', 
                                                placeItems: 'center', 
                                                fontSize: 11, 
                                                fontWeight: 900 
                                            }}>✓</span>
                                            <span style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 2: Buttons */}
            {activeTab === 'buttons' && (
                <div style={{ display: 'grid', gap: 24 }}>
                    {buttonRegistry.map((reg, idx) => (
                        <div key={idx} style={cardStyle}>
                            <h3 style={{ color: 'var(--color-logo-sub)', fontSize: 18, fontWeight: 900, marginBottom: 16 }}>
                                {reg.section}
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text)' }}>
                                            <th style={{ padding: '10px 14px', fontSize: 13, fontWeight: 900 }}>Nama Tombol</th>
                                            <th style={{ padding: '10px 14px', fontSize: 13, fontWeight: 900 }}>Pengguna/Akses</th>
                                            <th style={{ padding: '10px 14px', fontSize: 13, fontWeight: 900 }}>Deskripsi Fungsi & Reaksi Sistem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reg.buttons.map((btn, bidx) => (
                                            <tr key={bidx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)' }}>
                                                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
                                                    <span style={{ background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 6 }}>
                                                        {btn.name}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px', fontSize: 12 }}>
                                                    <span style={{ 
                                                        background: btn.type.includes('Public') ? 'rgba(0,212,255,0.1)' : 'rgba(126,212,74,0.1)', 
                                                        color: btn.type.includes('Public') ? 'var(--color-crypto)' : 'var(--color-logo-sub)', 
                                                        padding: '3px 8px', 
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        fontWeight: 800
                                                    }}>
                                                        {btn.type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>{btn.desc}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab 3: Testing */}
            {activeTab === 'testing' && (
                <div style={{ display: 'grid', gap: 28 }}>
                    {/* Intro Card */}
                    <div style={cardStyle}>
                        <h3 style={{ color: 'var(--color-text)', fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
                            Metodologi Verifikasi & Pengujian Kode
                        </h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                            Guna menjamin integritas data rantai pasok kopi fisik dan sinkronisasi on-chain ke jaringan Solana, CoffeeChain menerapkan strategi pengujian ganda:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                            <div style={{ background: 'var(--color-bg-card2)', padding: 16, borderRadius: 8, borderLeft: '4px solid var(--color-primary-light)' }}>
                                <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>◼ Black Box Testing (Fungsional)</strong>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                                    Menguji input-output antarmuka aplikasi. Memastikan tombol, form pengisian, verifikasi email, drag & drop upload foto, snap payment, dan pencarian ID Kopi bekerja normal sesuai ekspektasi user.
                                </span>
                            </div>
                            <div style={{ background: 'var(--color-bg-card2)', padding: 16, borderRadius: 8, borderLeft: '4px solid var(--color-crypto)' }}>
                                <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>◽ White Box Testing (Struktural)</strong>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                                    Menguji jalur internal kode pemrograman, logika API routes, enkripsi token verifikasi, validasi middleware (JWT), pembacaan block hash, serta integrasi RPC Solana Smart Contract.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Conceptual Diagrams */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
                        <div style={cardStyle}>
                            <h4 style={{ color: 'var(--color-text)', fontSize: 15, fontWeight: 900, marginBottom: 12, textAlign: 'center' }}>
                                Alur Black Box Testing (Perspektif User)
                            </h4>
                            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#050705' }}>
                                <img src="/docs/blackbox-testing.png" alt="Black Box Testing Flow" style={{ width: '100%', height: 'auto', display: 'block' }} />
                            </div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                                Skema input data form, interaksi tombol UI, dan validasi output visual bagi pengguna.
                            </p>
                        </div>
                        <div style={cardStyle}>
                            <h4 style={{ color: 'var(--color-text)', fontSize: 15, fontWeight: 900, marginBottom: 12, textAlign: 'center' }}>
                                Alur White Box Testing (Logika Kode Internal)
                            </h4>
                            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#050705' }}>
                                <img src="/docs/whitebox-testing.png" alt="White Box Testing Flow" style={{ width: '100%', height: 'auto', display: 'block' }} />
                            </div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                                Aliran data internal, pemanggilan API, verifikasi cryptographic signature, dan execution path.
                            </p>
                        </div>
                    </div>

                    {/* Feature-specific Testing Reports */}
                    <h3 style={{ color: 'var(--color-text)', fontSize: 18, fontWeight: 900, borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginTop: 12 }}>
                        Laporan Pengujian per Fitur Utama
                    </h3>

                    {/* Fitur 1: Auth & Verifikasi */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px', minWidth: 280 }}>
                                <span style={{ background: 'var(--color-primary-light)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 4 }}>Fitur 01</span>
                                <h4 style={{ color: 'var(--color-text)', fontSize: 16, fontWeight: 900, margin: '8px 0 12px' }}>
                                    Autentikasi & Verifikasi Email (Tanpa Localhost)
                                </h4>
                                
                                <div style={{ marginBottom: 14 }}>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>🔍 Pengujian Black Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Mendaftar dengan email baru → Form memunculkan password strength meter (Lemah/Cukup/Kuat).</li>
                                        <li>Login dengan akun belum terverifikasi → Tombol "Kirim Ulang Email Verifikasi" muncul dan dapat ditekan.</li>
                                        <li>Membuka link dari inbox email → Pengguna diarahkan ke domain produksi Vercel (bukan localhost) dan otomatis terverifikasi.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>⚙️ Pengujian White Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Fungsi hashing SHA-256 memverifikasi kecocokan password internal.</li>
                                        <li>API `/api/auth/verify-email?token=xxx` memproses query parameter token dari database Supabase secara real-time.</li>
                                        <li>Setting `NEXT_PUBLIC_APP_URL` dikonfigurasi ke domain Vercel untuk menghindari fallback tautan localhost.</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div style={{ flex: '1 1 400px', minWidth: 320 }}>
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#050705' }}>
                                    <img src="/docs/testing-login-register.png" alt="Auth Testing Screenshots" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                                    Bukti UI Testing: Form Pendaftaran Akun, Meteran Keamanan Sandi, dan Halaman Verifikasi Email di Vercel.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fitur 2: Pipeline Produksi */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px', minWidth: 280 }}>
                                <span style={{ background: 'var(--color-primary-light)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 4 }}>Fitur 02</span>
                                <h4 style={{ color: 'var(--color-text)', fontSize: 16, fontWeight: 900, margin: '8px 0 12px' }}>
                                    Kelola Stok & Pipeline Produksi Kopi (6 Tahap)
                                </h4>
                                
                                <div style={{ marginBottom: 14 }}>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>🔍 Pengujian Black Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Membuat batch baru → Status awal dimulai pada Tahap 1 (Pembersihan).</li>
                                        <li>Tombol "Catat Tahap" dinonaktifkan jika input form tidak lengkap atau foto bukti kosong.</li>
                                        <li>Setiap tahap diselesaikan, persentase progress bar meningkat 16.6% hingga mencapai 100% pada Tahap 6 (Produk Jadi).</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>⚙️ Pengujian White Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Fungsi backend `/api/production-stages` memvalidasi sequence log agar tahapan tidak dilewati secara acak.</li>
                                        <li>Handler storage menyimpan gambar bukti ke Supabase Storage, dengan fallback base64 string jika koneksi storage terganggu.</li>
                                        <li>Pemicu event Tahap 6 otomatis mengeksekusi function penulisan entri produk baru dengan status draft/pending.</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div style={{ flex: '1 1 400px', minWidth: 320 }}>
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#050705' }}>
                                    <img src="/docs/testing-product-pipeline.png" alt="Pipeline Testing Screenshots" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                                    Bukti UI Testing: Dashboard Rantai Pasok, Input Suhu & Berat, serta Upload Foto Bukti Tiap Tahapan.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fitur 3: Midtrans & SOL Pay */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px', minWidth: 280 }}>
                                <span style={{ background: 'var(--color-primary-light)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 4 }}>Fitur 03</span>
                                <h4 style={{ color: 'var(--color-text)', fontSize: 16, fontWeight: 900, margin: '8px 0 12px' }}>
                                    Integrasi Pembayaran (Midtrans Snap & Solana SOL)
                                </h4>
                                
                                <div style={{ marginBottom: 14 }}>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>🔍 Pengujian Black Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Memilih Midtrans IDR → Menampilkan modal Snap berisi instruksi transfer Virtual Account atau barcode QRIS.</li>
                                        <li>Memilih SOL Transfer → Tombol meminta koneksi ke Phantom Wallet, menampilkan saldo SOL pengguna, dan mengisi otomatis alamat target store.</li>
                                        <li>Klik tombol "Cek Status Midtrans" → Status order diperbarui dari "Pending" ke "Lunas" setelah pembayaran diproses.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>⚙️ Pengujian White Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>API endpoint `/api/midtrans` memformat request payload sesuai format resmi API Midtrans.</li>
                                        <li>Middleware webhook memverifikasi signature hash key dari server Midtrans untuk mencegah manipulasi data status bayar.</li>
                                        <li>Sistem pooling database mengaktifkan scheduler otomatis untuk memeriksa transaksi pending setiap 8 detik selama modal pembayaran aktif.</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div style={{ flex: '1 1 400px', minWidth: 320 }}>
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#050705' }}>
                                    <img src="/docs/testing-blockchain-payment.png" alt="Payment Testing Screenshots" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                                    Bukti UI Testing: Pembayaran Midtrans Snap, Verifikasi Virtual Account Bank, Koneksi Dompet Phantom, dan Riwayat Order.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fitur 4: Registrasi Blockchain */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px', minWidth: 280 }}>
                                <span style={{ background: 'var(--color-primary-light)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 4 }}>Fitur 04</span>
                                <h4 style={{ color: 'var(--color-text)', fontSize: 16, fontWeight: 900, margin: '8px 0 12px' }}>
                                    Registrasi Blockchain Kopi & Trace QR Code
                                </h4>
                                
                                <div style={{ marginBottom: 14 }}>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>🔍 Pengujian Black Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Klik mendaftarkan kopi published ke rantai blok → Phantom wallet memunculkan prompt tanda tangan digital (signature request).</li>
                                        <li>Setelah ditandatangani, sistem menampilkan Coffee ID (misal: CF-001) beserta link Solana Explorer.</li>
                                        <li>Memindai QR Code di sertifikat kopi → Mengarahkan browser ponsel ke halaman `/trace?id=CF-001` dengan visual timeline produksi.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>⚙️ Pengujian White Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Handler frontend memanfaatkan library `@solana/web3.js` untuk membuat payload instruksi Memo.</li>
                                        <li>Validasi on-chain memastikan transaction slot telah terkonfirmasi (confirmed status) di kluster Testnet sebelum ID Kopi disimpan ke database lokal.</li>
                                        <li>QR Code dihasilkan menggunakan dynamic canvas generator dengan input URL validasi trace terenkripsi SHA-256.</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div style={{ flex: '1 1 400px', minWidth: 320 }}>
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#050705' }}>
                                    <img src="/docs/testing-trace-qr.png" alt="Blockchain Testing Screenshots" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                                    Bukti UI Testing: Sertifikasi On-Chain, Prompt Transaksi Solana Memo Program, Tautan Explorer, dan Layout Pelacakan Kopi Publik.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Access Footer */}
            <div style={{ 
                ...cardStyle, 
                marginTop: 24, 
                display: 'flex', 
                gap: 16, 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'var(--color-bg-card2)'
            }}>
                <div>
                    <div style={{ color: 'var(--color-text)', fontWeight: 900, fontSize: 15 }}>Navigasi Cepat</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>Akses cepat ke halaman utama sistem Anda.</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <DocLink href="/products/stock" label="Kelola Stok" />
                    <DocLink href="/products" label="Kelola Produk" />
                    {isDeveloper && <DocLink href="/coffee-register" label="Register Kopi" />}
                    <DocLink href="/transactions" label="Transaksi" />
                    <DocLink href="/trace" label="Trace Publik" />
                </div>
            </div>
        </div>
    );
}

function DocLink({ href, label }) {
    return (
        <Link href={href} style={{
            color: 'var(--color-primary-light)',
            textDecoration: 'none',
            border: '1px solid rgba(126,212,74,0.3)',
            background: 'rgba(126,212,74,0.06)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 900,
            transition: 'var(--transition)',
        }}>
            {label}
        </Link>
    );
}
