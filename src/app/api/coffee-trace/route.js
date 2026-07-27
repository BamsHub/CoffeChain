export const runtime = 'nodejs';
export const maxDuration = 60;

import { readDb, addItem, updateItem } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getExplorerTxUrl, PINNED_MEMO_SIGNER_PUBLIC, STORE_WALLET } from '@/lib/contractConfig';
import { sendServerMemoTx, verifySolanaTransaction } from '@/lib/serverSolanaMemo';
import {
    createProductOffchainProof,
    mergeOffchainTags,
    stableStringify,
    verifyProductOffchainProof,
} from '@/lib/offchainProduct';
import { getCompleteProductionAudit } from '@/lib/productionAudit';
import { canReviewAllPipelines } from '@/lib/productionAccess';

function generateCoffeeId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'CF-';
    for (let index = 0; index < 6; index += 1) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

async function getActorName(session) {
    try {
        const users = await readDb('users');
        const actor = users.items.find(item => item.id === session.userId);
        return actor?.name || actor?.email || session.userId;
    } catch {
        return session.userId;
    }
}

async function recordOffchainTransaction({ product, proof, txSignature, session, actorName }) {
    const base = {
        id: `off-${Date.now().toString(36)}-${String(product.id).slice(-5)}`,
        hash: txSignature,
        farmer: product.submitted_by_name || 'CoffeeChain',
        amount: 0,
        status: 'Confirmed',
        note: `Metadata IPFS ${proof.metadataCid}; SHA-256 ${proof.contentHash}`,
    };
    const extended = {
        ...base,
        type: 'offchain_proof',
        product_id: product.id,
        product_name: product.name,
        farmer_id: product.submitted_by || null,
        approved_by: session.userId,
        approved_by_name: actorName,
        timestamp: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin.from('transactions').insert(extended);
    if (error) await supabaseAdmin.from('transactions').insert(base);
}

export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        if (!canReviewAllPipelines(session.role)) {
            return Response.json({
                success: false,
                message: 'Produk akhir wajib disetujui oleh developer/koperasi sebelum register Solana.',
            }, { status: 403 });
        }

        const body = await request.json();
        const {
            productId, name, origin, variety, grade, weightKg,
            farmerName, farmerId, harvestDate, processMethod, roastLevel,
            certification, description, registeredBy,
            phantomTxSignature, offchainProof,
        } = body;

        if (!productId) {
            return Response.json({ success: false, message: 'Produk wajib berasal dari pipeline produksi' }, { status: 400 });
        }
        if (!name || !origin) {
            return Response.json({ success: false, message: 'Nama dan asal kopi wajib diisi' }, { status: 400 });
        }
        if (phantomTxSignature) {
            return Response.json({
                success: false,
                message: 'Sertifikasi produk wajib ditandatangani oleh wallet server CoffeeChain.',
            }, { status: 409 });
        }

        const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('id', productId)
            .maybeSingle();
        if (productError || !product) {
            return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        }
        if (product.status !== 'pending_certification') {
            return Response.json({ success: false, message: 'Hanya produk yang menunggu sertifikasi dapat didaftarkan ke Solana' }, { status: 409 });
        }
        const audit = await getCompleteProductionAudit(product.id);
        const trustedTraceData = {
            ...body,
            name: product.name,
            origin: product.origin,
            variety: product.variety,
            grade: product.grade,
            weightKg: product.weight?.[0] || body.weightKg || null,
            farmerName: product.submitted_by_name || audit.batch.farmer_name || null,
            farmerId: product.submitted_by || audit.batch.farmer_id || null,
            description: product.description || null,
            registeredBy: session.userId,
            paymentWallet: STORE_WALLET,
        };

        let proof = offchainProof;
        if (proof) {
            const { manifest } = await verifyProductOffchainProof(proof);
            if (proof.productId !== product.id) throw new Error('Bukti off-chain bukan milik produk ini');
            if (stableStringify(manifest.pipeline || []) !== stableStringify(audit.pipeline)) {
                throw new Error('Data pipeline berubah. Buat ulang bukti IPFS sebelum register Solana');
            }
            proof = { ...proof, image: manifest.image };
        } else {
            proof = await createProductOffchainProof({
                coffeeId: product.coffee_id || generateCoffeeId(),
                productId: product.id,
                product,
                traceData: trustedTraceData,
                pipeline: audit.pipeline,
            });
        }

        const coffeeId = proof.coffeeId;
        let txSignature = null;
        let explorerUrl = null;
        let txError = null;

        const immutableSignature = (Array.isArray(product.tags) ? product.tags : [])
            .map(String)
            .find(tag => tag.startsWith('offchain-proof:'))
            ?.slice('offchain-proof:'.length);

        if (immutableSignature) {
            await verifySolanaTransaction(immutableSignature, PINNED_MEMO_SIGNER_PUBLIC, proof.memo);
            txSignature = immutableSignature;
            explorerUrl = getExplorerTxUrl(immutableSignature);
        } else {
            try {
                const result = await sendServerMemoTx(proof.memo);
                txSignature = result.txSignature;
                explorerUrl = result.explorerUrl;
            } catch (error) {
                txError = error?.message || 'Unknown Solana error';
                console.error('[coffee-trace] Solana proof TX failed:', txError);
            }
        }

        const isVerified = Boolean(txSignature);
        const trace = {
            id: uuidv4(),
            coffeeId,
            name: trustedTraceData.name,
            origin: trustedTraceData.origin || null,
            variety: trustedTraceData.variety || null,
            grade: trustedTraceData.grade || null,
            weightKg: trustedTraceData.weightKg || null,
            farmerName: trustedTraceData.farmerName || null,
            farmerId: trustedTraceData.farmerId || null,
            harvestDate: harvestDate || null,
            processMethod: processMethod || null,
            roastLevel: roastLevel || null,
            certification: certification || null,
            description: trustedTraceData.description || null,
            txSignature,
            explorerUrl,
            status: isVerified ? 'verified' : 'registered',
            registeredBy: session.userId,
            productId: product.id,
            paymentWallet: STORE_WALLET,
            createdAt: new Date().toISOString(),
        };

        try {
            await addItem('coffee_traces', trace);
        } catch (insertError) {
            if (insertError.message?.includes('column') || insertError.message?.includes('schema')) {
                const { productId: _productId, paymentWallet: _paymentWallet, ...baseTrace } = trace;
                await addItem('coffee_traces', baseTrace).catch(error => console.warn('[coffee-trace] Trace fallback failed:', error.message));
            } else {
                console.warn('[coffee-trace] Could not save coffee trace:', insertError.message);
            }
        }

        if (isVerified) {
            const actorName = await getActorName(session);
            const tags = mergeOffchainTags(product.tags, proof, txSignature);
            await updateItem('products', product.id, {
                coffeeId,
                status: 'published',
                image: proof.image.gatewayUrl,
                tags,
                approvedBy: session.userId,
                approvedByName: actorName,
                approvedAt: new Date().toISOString(),
                paymentWallet: STORE_WALLET,
            });
            await recordOffchainTransaction({ product, proof, txSignature, session, actorName }).catch(error => {
                console.warn('[coffee-trace] Failed to record off-chain transaction:', error.message);
            });
        }

        return Response.json({
            success: isVerified,
            verified: isVerified,
            message: isVerified
                ? `Kopi ${coffeeId} terverifikasi: foto dan metadata di IPFS, hanya hash di Solana.`
                : `Kopi ${coffeeId} tersimpan di IPFS tetapi bukti Solana gagal: ${txError}`,
            data: { ...trace, offchainProof: proof },
        }, { status: isVerified ? 201 : 502 });
    } catch (error) {
        console.error('[coffee-trace] Error:', error);
        return Response.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const coffeeId = searchParams.get('coffeeId');
        const db = await readDb('coffee_traces');
        let items = db.items || [];
        if (coffeeId) items = items.filter(trace => trace.coffeeId === coffeeId || trace.id === coffeeId);
        return Response.json({ success: true, data: items, total: items.length });
    } catch (error) {
        console.error('[coffee-trace] GET error:', error);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
