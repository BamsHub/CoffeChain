'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const farmerGuides = [
    {
        title: 'Mulai dari Dashboard',
        items: [
            'Pantau ringkasan transaksi, aktivitas terbaru, dan status penjualan dari menu Dashboard.',
            'Gunakan menu Transaksi untuk melihat pembayaran yang sudah masuk atau masih pending.',
            'Buka Dompet untuk menghubungkan Phantom Testnet dan melihat alamat wallet.',
        ],
    },
    {
        title: 'Kelola Produk dan Stok',
        items: [
            'Produk baru harus dibuat melalui Kelola Produk > Kelola Stok agar melewati pipeline produksi.',
            'Buat batch panen, lalu selesaikan tahap 1 sampai 6 secara berurutan.',
            'Setiap tahap wajib upload foto bukti sebelum bisa disimpan.',
            'Tahap Produk Jadi akan membuat produk internal yang siap diregister ke blockchain.',
        ],
    },
    {
        title: 'Register Kopi',
        items: [
            'Setelah produk jadi muncul, buka Register Kopi untuk melihat detail produk dan pipeline foto 1 sampai 6.',
            'Hubungkan Phantom Wallet Testnet sebelum menandatangani register on-chain.',
            'Setelah berhasil, sistem membuat Coffee ID dan QR trace publik.',
        ],
    },
    {
        title: 'Pembayaran',
        items: [
            'Pembeli dapat membayar lewat Midtrans, transfer SOL, atau Solana Pay QR sesuai opsi yang tersedia.',
            'Pembayaran Midtrans yang sudah paid otomatis membuat trace pembayaran ke Solana.',
            'Status QR GoPay/QRIS bisa dicek dari tombol Cek Status Midtrans dan juga dipantau otomatis.',
        ],
    },
];

const developerGuides = [
    {
        title: 'Kontrol Admin',
        items: [
            'Kelola Produk menampilkan semua produk dari petani dan produk hasil pipeline.',
            'Kelola Stok memproses batch panen dari tahap pembersihan sampai produk jadi dengan bukti foto.',
            'Register Kopi menampilkan semua kandidat produk, pipeline lengkap, batch audit, dan tombol register on-chain.',
            'Transaksi menampilkan order Midtrans/Solana beserta status pembayaran dan hash blockchain.',
        ],
    },
    {
        title: 'Integrasi Midtrans',
        items: [
            'Create transaction memakai Snap URL dari MIDTRANS_SNAP_BASE_URL dan server key dari MIDTRANS_SERVER_KEY.',
            'Webhook /api/midtrans/notification mengubah order menjadi paid/pending/expired.',
            'Endpoint /api/midtrans/status mengecek status langsung ke /v2/{orderId}/status dan mengembalikan detail GoPay/QRIS.',
            'Saat paid, sistem mengirim memo payment ke Solana Testnet dan menyimpan tx_signature pada order.',
        ],
    },
    {
        title: 'Integrasi Solana Testnet',
        items: [
            'Network pusat ada di src/lib/contractConfig.js melalui SOLANA_NETWORK dan DEPLOY_NETWORK.',
            'Semua link explorer UI memakai helper getExplorerTxUrl/getExplorerAddressUrl agar selalu cluster testnet.',
            'Server memo memakai MEMO_SIGNER_SECRET_KEY, sedangkan register manual memakai Phantom Wallet user.',
            'Trace publik tersedia di /trace?id={CoffeeID} dan menampilkan sertifikat, QR, TX, serta pipeline produksi.',
        ],
    },
    {
        title: 'Operasional dan Debug',
        items: [
            'Pastikan env Vercel berisi Supabase service role, Midtrans server/client key, app URL, dan Solana signer.',
            'Jika upload Storage gagal, API upload memakai fallback inline agar pipeline tetap bisa disimpan.',
            'Gunakan halaman Dokumentasi ini sebagai checklist QA sebelum deploy.',
            'Setelah push ke GitHub, Vercel akan redeploy branch yang terhubung.',
        ],
    },
];

const featureMap = [
    ['Dashboard', 'Ringkasan role, aktivitas, statistik, dan akses cepat.'],
    ['Kelola Stok', 'Pipeline produksi 1-6 dengan upload foto wajib per tahap.'],
    ['Kelola Produk', 'Daftar produk, status approval, stok, foto, dan QR sertifikasi.'],
    ['Register Kopi', 'On-chain registration, Coffee ID, audit pipeline, dan QR trace.'],
    ['Pembayaran', 'Midtrans Snap/GoPay/QRIS, Solana Pay, transfer SOL, dan status order.'],
    ['Trace Publik', 'Validasi Coffee ID, Solana Explorer, QR, dan riwayat produksi.'],
    ['Dompet', 'Koneksi Phantom Wallet dan link address ke Solana Testnet Explorer.'],
    ['Transaksi', 'Riwayat order, status pembayaran, dan tx signature.'],
];

export default function DocumentationPage() {
    const { user } = useAuth();
    const role = user?.role || 'farmer';
    const isDeveloper = role === 'developer' || role === 'koperasi';
    const guides = isDeveloper ? developerGuides : farmerGuides;
    const roleLabel = isDeveloper ? 'Developer / Koperasi' : 'Petani';

    const card = {
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 18,
    };

    return (
        <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1180, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <div>
                    <div style={{ color: 'var(--color-primary-light)', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>
                        Dokumentasi {roleLabel}
                    </div>
                    <h1 style={{ color: 'var(--color-text)', fontSize: 'clamp(24px,4vw,34px)', margin: '6px 0', fontWeight: 900 }}>
                        Panduan CoffeeChain
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14, maxWidth: 680, lineHeight: 1.7 }}>
                        Panduan ini mengikuti role akun yang sedang login, sehingga langkah kerja, fitur, dan checklist yang tampil sesuai kebutuhan pengguna.
                    </p>
                </div>
                <div style={{ ...card, minWidth: 220 }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Akun Aktif</div>
                    <div style={{ color: 'var(--color-text)', fontWeight: 900, marginTop: 4 }}>{user?.name || 'User'}</div>
                    <div style={{ color: 'var(--color-primary-light)', fontSize: 13, fontWeight: 800, marginTop: 3 }}>{roleLabel}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, marginBottom: 22 }}>
                {featureMap.map(([name, desc]) => (
                    <div key={name} style={{ ...card, padding: 14 }}>
                        <div style={{ color: 'var(--color-text)', fontSize: 14, fontWeight: 900 }}>{name}</div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 12, lineHeight: 1.55, marginTop: 5 }}>{desc}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
                {guides.map(section => (
                    <section key={section.title} style={card}>
                        <h2 style={{ color: 'var(--color-text)', fontSize: 18, margin: 0, fontWeight: 900 }}>{section.title}</h2>
                        <div style={{ display: 'grid', gap: 9, marginTop: 14 }}>
                            {section.items.map(item => (
                                <div key={item} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 9, alignItems: 'start' }}>
                                    <span style={{ width: 22, height: 22, borderRadius: 999, background: 'rgba(126,212,74,0.12)', border: '1px solid rgba(126,212,74,0.25)', color: '#7ED44A', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 }}>✓</span>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.65 }}>{item}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <div style={{ ...card, marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ color: 'var(--color-text)', fontWeight: 900, fontSize: 15 }}>Akses cepat</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>Buka halaman utama sesuai alur kerja.</div>
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
            border: '1px solid rgba(126,212,74,0.28)',
            background: 'rgba(126,212,74,0.08)',
            borderRadius: 9,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 900,
        }}>
            {label}
        </Link>
    );
}
