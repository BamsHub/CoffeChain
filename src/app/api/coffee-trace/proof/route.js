export const runtime = 'nodejs';
export const maxDuration = 60;

import { verifyToken } from '@/lib/auth';
import { createProductOffchainProof } from '@/lib/offchainProduct';
import { getCompleteProductionAudit } from '@/lib/productionAudit';
import { supabaseAdmin } from '@/lib/supabase';

function generateCoffeeId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'CF-';
    for (let index = 0; index < 6; index += 1) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        if (!['koperasi', 'developer', 'admin'].includes(session.role)) {
            return Response.json({ success: false, message: 'Hanya admin yang dapat menyetujui register Solana' }, { status: 403 });
        }

        const body = await request.json();
        if (!body.productId) return Response.json({ success: false, message: 'productId wajib diisi' }, { status: 400 });

        const { data: product, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('id', body.productId)
            .maybeSingle();
        if (error || !product) return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        if (session.role === 'farmer' && product.submitted_by !== session.userId) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const coffeeId = product.coffee_id || generateCoffeeId();
        const audit = await getCompleteProductionAudit(product.id);
        const proof = await createProductOffchainProof({
            coffeeId,
            productId: product.id,
            product,
            traceData: body,
            pipeline: audit.pipeline,
        });

        return Response.json({ success: true, proof });
    } catch (error) {
        console.error('[coffee-trace/proof]', error);
        return Response.json({ success: false, message: error.message || 'Gagal membuat bukti off-chain' }, { status: 500 });
    }
}
