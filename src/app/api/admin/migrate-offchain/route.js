export const runtime = 'nodejs';
export const maxDuration = 60;

import { createHash, timingSafeEqual } from 'node:crypto';
import { verifyToken } from '@/lib/auth';
import { getExplorerTxUrl } from '@/lib/contractConfig';
import { createProductOffchainProof, mergeOffchainTags } from '@/lib/offchainProduct';
import { sendServerMemoTx } from '@/lib/serverSolanaMemo';
import { supabaseAdmin } from '@/lib/supabase';

function hasMetadataCid(tags) {
    return (Array.isArray(tags) ? tags : []).some(tag => String(tag).startsWith('ipfs-metadata:'));
}

function hasOneTimeMigrationKey(request) {
    const sourceSecret = process.env.PINATA_JWT;
    const supplied = request.headers.get('x-migration-key');
    if (!sourceSecret || !supplied) return false;
    const expected = createHash('sha256').update(`${sourceSecret}:coffeechain-offchain-migration-v1`).digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        const oneTimeAuthorized = hasOneTimeMigrationKey(request);
        if ((!session || !['koperasi', 'developer'].includes(session.role)) && !oneTimeAuthorized) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const { productId = null } = await request.json().catch(() => ({}));
        let query = supabaseAdmin
            .from('products')
            .select('*')
            .not('coffee_id', 'is', null)
            .order('created_at', { ascending: true });
        if (productId) query = query.eq('id', productId);
        const { data: products, error } = await query;
        if (error) throw error;

        const product = (products || []).find(item => !hasMetadataCid(item.tags));
        if (!product) {
            return Response.json({ success: true, done: true, message: 'Semua produk terverifikasi sudah menggunakan IPFS.' });
        }

        const { data: traces } = await supabaseAdmin
            .from('coffee_traces')
            .select('*')
            .eq('coffee_id', product.coffee_id)
            .order('created_at', { ascending: false })
            .limit(1);
        const trace = traces?.[0] || {};
        const proof = await createProductOffchainProof({
            coffeeId: product.coffee_id,
            productId: product.id,
            product,
            traceData: {
                name: product.name,
                origin: product.origin,
                variety: product.variety,
                grade: product.grade,
                roastLevel: product.roast,
                weightKg: product.weight?.[0] || null,
                description: product.description,
                farmerName: trace.farmer_name,
                farmerId: trace.farmer_id,
                harvestDate: trace.harvest_date,
                processMethod: trace.process_method,
                certification: trace.certification,
                registeredBy: session?.userId || 'offchain-migration',
            },
        });
        const chain = await sendServerMemoTx(proof.memo);
        const tags = mergeOffchainTags(product.tags, proof, chain.txSignature);
        const { error: updateError } = await supabaseAdmin
            .from('products')
            .update({ image: proof.image.gatewayUrl, tags })
            .eq('id', product.id);
        if (updateError) throw updateError;

        const { error: transactionError } = await supabaseAdmin.from('transactions').insert({
            id: `off-${Date.now().toString(36)}-${String(product.id).slice(-5)}`,
            hash: chain.txSignature,
            type: 'offchain_migration',
            farmer: product.submitted_by_name || 'CoffeeChain',
            amount: 0,
            status: 'Confirmed',
            timestamp: new Date().toISOString(),
            note: `Metadata IPFS ${proof.metadataCid}; SHA-256 ${proof.contentHash}`,
            product_id: product.id,
            product_name: product.name,
        });
        if (transactionError) console.warn('[migrate-offchain] transaction log:', transactionError.message);

        const remaining = (products || []).filter(item => item.id !== product.id && !hasMetadataCid(item.tags)).length;
        return Response.json({
            success: true,
            done: remaining === 0,
            remaining,
            product: { id: product.id, name: product.name, coffeeId: product.coffee_id },
            proof: {
                imageCid: proof.image.cid,
                metadataCid: proof.metadataCid,
                contentHash: proof.contentHash,
                txSignature: chain.txSignature,
                explorerUrl: getExplorerTxUrl(chain.txSignature),
            },
        });
    } catch (error) {
        console.error('[migrate-offchain]', error);
        return Response.json({ success: false, message: error.message || 'Migrasi gagal' }, { status: 500 });
    }
}
