import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { readDb } from '@/lib/db';

/**
 * GET /api/farmer/stats
 *
 * Mengembalikan 3 angka untuk kartu statistik Dashboard Petani:
 *   - totalProducts     : jumlah produk yang diajukan petani ini
 *   - totalStock        : akumulasi stok dari produk-produknya
 *   - totalTxThisMonth  : jumlah entri penjualan bulan berjalan
 *
 * Semua query di-filter ketat oleh user_id / submitted_by dari token —
 * petani TIDAK bisa melihat data milik petani lain.
 */
export async function GET(request) {
    try {
        // ── 1. Identifikasi user dari token ─────────────────────────
        const token =
            request.headers.get('Authorization')?.replace('Bearer ', '') ||
            new URL(request.url).searchParams.get('token');

        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const db   = await readDb('users');
        const user = db.items.find(u => u.id === session.userId);
        if (!user) {
            return NextResponse.json({ success: false, error: 'User tidak ditemukan' }, { status: 404 });
        }

        const userId = user.id;

        // ── 2. Total Produk milik petani ini ─────────────────────────
        // Filter: submitted_by = userId (kolom yang baru ditambahkan)
        const { data: productRows, error: prodErr } = await supabaseAdmin
            .from('products')
            .select('id, stock')
            .eq('submitted_by', userId);

        let totalProducts = 0;
        let totalStock    = 0;

        if (!prodErr && productRows) {
            totalProducts = productRows.length;
            totalStock    = productRows.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
        } else {
            // Fallback: baca dari file JSON jika Supabase belum punya kolom
            const allProducts = (await readDb('products')).items || [];
            const myProducts  = allProducts.filter(p => p.submittedBy === userId);
            totalProducts     = myProducts.length;
            totalStock        = myProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
        }

        // ── 3. Total Transaksi / Penjualan bulan ini ─────────────────
        // Pakai tabel `sales` (milik petani) yang sudah ada di sistem.
        // Filter: user_id = userId AND created_at >= awal bulan ini
        const now          = new Date();
        const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd     = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { count: txCount, error: txErr } = await supabaseAdmin
            .from('sales')
            .select('id', { count: 'exact', head: true })  // head:true = hanya count, tanpa ambil rows
            .eq('user_id', userId)
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd);

        const totalTxThisMonth = txErr ? 0 : (txCount || 0);

        // ── 4. Bonus: revenue bulan ini ──────────────────────────────
        const { data: monthSales, error: revErr } = await supabaseAdmin
            .from('sales')
            .select('total_price, status')
            .eq('user_id', userId)
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd);

        const revenueThisMonth = (!revErr && monthSales)
            ? monthSales
                .filter(s => s.status === 'paid')
                .reduce((sum, s) => sum + (Number(s.total_price) || 0), 0)
            : 0;

        return NextResponse.json({
            success: true,
            data: {
                totalProducts,
                totalStock,
                totalTxThisMonth,
                revenueThisMonth,
                month: now.toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
            },
        });
    } catch (err) {
        console.error('[GET /api/farmer/stats]', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
