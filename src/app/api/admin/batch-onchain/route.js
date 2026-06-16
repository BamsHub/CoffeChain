export const runtime = 'nodejs';
export const maxDuration = 300; // 5 menit untuk batch

import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/admin/batch-onchain
 * On-chain semua produk yang:
 *  (a) belum punya coffeeId, ATAU
 *  (b) punya coffeeId tapi trace-nya belum verified (txSignature NULL)
 * Menggunakan server wallet (MEMO_SIGNER_SECRET_KEY).
 */
export async function POST(request) {
    try {
        // 1. Ambil semua produk
        const { data: products, error: fetchErr } = await supabaseAdmin
            .from('products')
            .select('id, name, origin, variety, grade, roast, weight, description, tags, coffee_id')
            .order('created_at', { ascending: true });

        if (fetchErr) throw fetchErr;

        // 2. Ambil semua trace yang sudah verified
        const { data: verifiedTraces } = await supabaseAdmin
            .from('coffee_traces')
            .select('coffee_id, tx_signature')
            .not('tx_signature', 'is', null);

        const verifiedIds = new Set((verifiedTraces || []).map(t => t.coffee_id));

        // 3. Filter produk yang perlu di-on-chain:
        //    - belum punya coffee_id, ATAU
        //    - punya coffee_id tapi belum ada verified trace
        const toProcess = products.filter(p =>
            !p.coffee_id || !verifiedIds.has(p.coffee_id)
        );

        if (!toProcess.length) {
            return Response.json({
                success: true,
                message: 'Semua produk sudah on-chain dan terverifikasi! Tidak ada yang perlu diproses.',
                total: 0, results: [],
            });
        }

        const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://coffe-blockchain.vercel.app';
        const results = [];

        for (const p of toProcess) {
            try {
                const payload = {
                    productId:     p.id,
                    name:          p.name,
                    origin:        p.origin || 'Indonesia',
                    variety:       p.variety || 'Arabika',
                    grade:         p.grade || 'A',
                    weightKg:      Array.isArray(p.weight) ? p.weight[0] : (p.weight || 0),
                    farmerName:    'Koperasi CoffeeChain',
                    harvestDate:   new Date().toISOString().slice(0, 10),
                    processMethod: 'Washed',
                    roastLevel:    (p.roast || 'Medium').replace(/ Roast$/, ''),
                    certification: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || 'N/A'),
                    description:   p.description || '',
                    registeredBy:  'server-batch',
                };

                const res = await fetch(`${baseUrl}/api/coffee-trace`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();

                if (data.success && data.verified) {
                    results.push({
                        id: p.id,
                        name: p.name,
                        status: 'success',
                        coffeeId:    data.data?.coffeeId,
                        txSignature: data.data?.txSignature,
                        explorerUrl: data.data?.explorerUrl,
                    });
                } else if (data.success && !data.verified) {
                    results.push({ id: p.id, name: p.name, status: 'pending', error: 'TX gagal ke Solana, tersimpan sebagai pending' });
                } else {
                    results.push({ id: p.id, name: p.name, status: 'failed', error: data.message });
                }

                // 2.5 detik jeda antar TX supaya tidak rate-limited Solana devnet
                await new Promise(r => setTimeout(r, 2500));
            } catch (err) {
                results.push({ id: p.id, name: p.name, status: 'error', error: err.message });
            }
        }

        const succeeded = results.filter(r => r.status === 'success').length;
        const failed    = results.filter(r => r.status !== 'success').length;

        return Response.json({
            success: true,
            message: `Selesai! ${succeeded} berhasil on-chain, ${failed} gagal dari ${toProcess.length} produk.`,
            total: toProcess.length,
            succeeded,
            failed,
            results,
        });
    } catch (err) {
        console.error('[batch-onchain]', err.message);
        return Response.json({ success: false, message: err.message }, { status: 500 });
    }
}

/** GET — cek berapa produk yang belum terverifikasi on-chain */
export async function GET() {
    try {
        const { data: products, error } = await supabaseAdmin
            .from('products')
            .select('id, name, origin, coffee_id');

        if (error) throw error;

        const { data: verifiedTraces } = await supabaseAdmin
            .from('coffee_traces')
            .select('coffee_id')
            .not('tx_signature', 'is', null);

        const verifiedIds = new Set((verifiedTraces || []).map(t => t.coffee_id));

        const unverified = (products || []).filter(p => !p.coffee_id || !verifiedIds.has(p.coffee_id));

        return Response.json({
            success: true,
            count: unverified.length,
            products: unverified.map(p => ({ id: p.id, name: p.name, origin: p.origin, coffeeId: p.coffee_id || null })),
        });
    } catch (err) {
        return Response.json({ success: false, message: err.message }, { status: 500 });
    }
}
