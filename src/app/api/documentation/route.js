export const runtime = 'nodejs';

import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

const defaultFarmerGuides = [
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
            'Alur produksi terdiri dari 6 Tahap Wajib: Panen & Sortasi -> Pencucian & Fermentasi -> Pengeringan -> Pengupasan & Penggilingan -> Pemanggangan -> Produk Jadi & Pengemasan.',
            'Klik "Catat Tahap" di setiap tahapan, isi parameter (operator, durasi, suhu, berat masuk/keluar), dan wajib unggah foto bukti.',
            'Tahap 6 (Produk Jadi) diselesaikan, sistem otomatis mendaftarkan produk baru di menu Kelola Produk dengan status "Pending" agar koperasi dapat meninjau.',
        ],
    },
    {
        title: '3. Memantau Transaksi & Pendapatan',
        items: [
            'Setiap transaksi penjualan dicatat secara terpisah di database lokal melalui sinkronisasi Supabase Realtime.',
            'Buka menu Transaksi untuk melihat riwayat order dari pembeli di landing page yang sudah lunas (Paid) atau masih pending.',
            'Buka menu Dompet untuk melihat saldo SOL, IDR equivalent, dan riwayat transaksi Phantom Wallet Anda.',
        ],
    },
];

const defaultDeveloperGuides = [
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
            'Pemicu Snap: Ketika pembeli mengklik "Beli" di landing page dan memilih metode IDR Bank Transfer/QRIS, backend memicu request Snap ke Midtrans.',
            'Endpoint Webhook: Endpoint `/api/midtrans/notification` menerima callback realtime dari Midtrans untuk mengupdate status pembayaran (settlement/pending/expired).',
            'Status Check: Akun pemilik order yang sudah login dapat memanggil `/api/midtrans/status` untuk mencocokkan status order; JWT dan kepemilikan order selalu diverifikasi.',
            'Auto Blockchain Write: Ketika pembayaran berstatus "Paid", backend otomatis mengirimkan memo transaksi ke Solana Testnet dan menyimpan `tx_signature` pada order database.',
        ],
    },
    {
        title: '3. Integrasi & Deployment Solana Testnet',
        items: [
            'Konfigurasi Jaringan: Terpusat di konfigurasi kontrak dengan RPC endpoint Testnet Solana.',
            'Program Memo: Menggunakan alamat program memo Solana standard untuk mencatat hash audit produk secara permanen.',
            'Verifikasi Publik: Siapa saja dapat memindai QR Code di sertifikat/kemasan kopi untuk diarahkan ke `/trace?id=CF-XXXXX` guna memverifikasi keabsahan data produksi langsung dari Solana Explorer.',
        ],
    },
];

async function ensureTableExists() {
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS documentation_guides (
            id TEXT PRIMARY KEY,
            content JSONB,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE documentation_guides ENABLE ROW LEVEL SECURITY;
        DO $$ BEGIN
            DROP POLICY IF EXISTS "Allow all select documentation_guides" ON documentation_guides;
            DROP POLICY IF EXISTS "Allow all write documentation_guides" ON documentation_guides;
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
        CREATE POLICY "Allow all select documentation_guides" ON documentation_guides FOR SELECT USING (true);
        CREATE POLICY "Allow all write documentation_guides" ON documentation_guides FOR ALL USING (true) WITH CHECK (true);
    `;
    try {
        await supabaseAdmin.rpc('exec_sql', { query: createTableSql });
    } catch (err) {
        console.error('[documentation API] ensureTableExists error:', err.message);
    }
}

export async function GET(request) {
    try {
        let { data, error } = await supabaseAdmin
            .from('documentation_guides')
            .select('*');

        if (error && (error.code === 'P0001' || error.message?.includes('does not exist'))) {
            await ensureTableExists();
            // Try query again
            const retry = await supabaseAdmin.from('documentation_guides').select('*');
            data = retry.data || [];
        } else if (error) {
            throw error;
        }

        const guidesMap = {};
        (data || []).forEach(row => {
            guidesMap[row.id] = row.content;
        });

        return Response.json({
            success: true,
            farmerGuides: guidesMap['farmer_guides'] || defaultFarmerGuides,
            developerGuides: guidesMap['developer_guides'] || defaultDeveloperGuides,
        });
    } catch (err) {
        console.error('[documentation GET]', err.message);
        // Fallback to default
        return Response.json({
            success: true,
            farmerGuides: defaultFarmerGuides,
            developerGuides: defaultDeveloperGuides,
            fallback: true,
        });
    }
}

export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);

        if (!session || (session.role !== 'developer' && session.role !== 'koperasi')) {
            return Response.json({ success: false, message: 'Unauthorized: Hanya admin/koperasi yang dapat merubah dokumentasi' }, { status: 403 });
        }

        const body = await request.json();
        const { id, content } = body; // id = 'farmer_guides' atau 'developer_guides'

        if (!id || !content) {
            return Response.json({ success: false, message: 'Parameter id dan content wajib diisi' }, { status: 400 });
        }

        let { error } = await supabaseAdmin
            .from('documentation_guides')
            .upsert({ id, content, updated_at: new Date().toISOString() });

        if (error && (error.code === 'P0001' || error.message?.includes('does not exist'))) {
            await ensureTableExists();
            const retry = await supabaseAdmin
                .from('documentation_guides')
                .upsert({ id, content, updated_at: new Date().toISOString() });
            if (retry.error) throw retry.error;
        } else if (error) {
            throw error;
        }

        return Response.json({ success: true, message: 'Dokumentasi berhasil diperbarui' });
    } catch (err) {
        console.error('[documentation POST]', err.message);
        return Response.json({ success: false, message: err.message }, { status: 500 });
    }
}
