import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getExplorerTxUrl } from '@/lib/contractConfig';
import { v4 as uuidv4 } from 'uuid';
import {
    Connection, Keypair, PublicKey, LAMPORTS_PER_SOL,
    Transaction, TransactionInstruction, ComputeBudgetProgram,
} from '@solana/web3.js';
import { SOLANA_NETWORK, MEMO_PROGRAM_ID } from '@/lib/contractConfig';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STAGE_NAMES = {
    1: 'Pembersihan & Pencampuran',
    2: 'Pemanggangan',
    3: 'Pendinginan',
    4: 'Penggilingan',
    5: 'Pelepasan Gas',
    6: 'Produk Jadi',
};

function getConnection() {
    return new Connection(SOLANA_NETWORK, { commitment: 'confirmed', confirmTransactionInitialTimeout: 60000 });
}

function getSigner() {
    const secretKeyEnv = process.env.MEMO_SIGNER_SECRET_KEY;
    if (!secretKeyEnv) throw new Error('MEMO_SIGNER_SECRET_KEY not configured');
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretKeyEnv)));
}

async function ensureBalance(connection, publicKey) {
    const balance = await connection.getBalance(publicKey);
    if (balance < 0.005 * LAMPORTS_PER_SOL) {
        try {
            const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig, 'confirmed');
        } catch (e) {
            if (balance === 0) throw new Error('Wallet 0 SOL, airdrop gagal');
        }
    }
}

async function sendMemoTx(memoText) {
    const signer = getSigner();
    const connection = getConnection();
    await ensureBalance(connection, signer.publicKey);

    const memoEncoded = Buffer.from(memoText.slice(0, 560), 'utf8');
    const memoInstruction = new TransactionInstruction({
        keys: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }],
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: memoEncoded,
    });

    const tx = new Transaction();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = signer.publicKey;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        memoInstruction,
    );
    tx.sign(signer);

    const txSignature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 5 });

    await Promise.race([
        connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, 'confirmed'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 20s')), 20000)),
    ]);

    return { txSignature, explorerUrl: getExplorerTxUrl(txSignature) };
}

// GET — list stage logs for a batch
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batchId');

        const supabase = getSupabaseAdmin();
        let query = supabase.from('production_stage_logs').select('*').order('created_at', { ascending: false });
        if (batchId) query = query.eq('batch_id', batchId);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        const items = (data || []).map(row => ({
            id: row.id,
            batchId: row.batch_id,
            stage: row.stage,
            stageName: row.stage_name,
            data: row.data,
            photoUrl: row.photo_url,
            txSignature: row.tx_signature,
            explorerUrl: row.explorer_url,
            loggedBy: row.logged_by,
            loggedByName: row.logged_by_name,
            createdAt: row.created_at,
        }));

        return NextResponse.json({ success: true, data: items });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// POST — log a stage and advance batch to next stage
export async function POST(req) {
    try {
        const body = await req.json();
        const { batchId, stage, stageData, photoUrl, loggedBy, loggedByName } = body;

        if (!batchId || !stage) {
            return NextResponse.json({ success: false, message: 'batchId dan stage wajib' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Get batch info
        const { data: batch, error: batchErr } = await supabase
            .from('production_batches').select('*').eq('id', batchId).single();
        if (batchErr || !batch) throw new Error('Batch tidak ditemukan');

        // Build memo for blockchain. Keep it compact so it fits into a Memo tx.
        const stageName = STAGE_NAMES[stage] || `Stage ${stage}`;
        const memoPayload = JSON.stringify({
            v: 1,
            type: 'coffee-production',
            category: stageName,
            stage,
            stageName,
            batchId: batchId.slice(0, 8),
            batchName: (batch.name || '').slice(0, 24),
            origin: (batch.origin || '').slice(0, 16),
            grade: batch.grade || '',
            weightKg: stageData?.weightIn || batch.weight_kg || 0,
            ts: Math.floor(Date.now() / 1000),
            ...(stage === 2 ? { suhu: stageData?.suhu || 0, levelRoast: (stageData?.levelRoast || '').slice(0, 12) } : {}),
            ...(stage === 4 ? { ukuranGiling: (stageData?.ukuranGiling || '').slice(0, 12) } : {}),
            ...(stage === 6 ? { productName: (stageData?.productName || batch.name || '').slice(0, 24), stock: stageData?.stock || 0 } : {}),
        });

        // Try blockchain TX
        let txSignature = null;
        let explorerUrl = null;
        let txError = null;
        try {
            const result = await sendMemoTx(memoPayload);
            txSignature = result.txSignature;
            explorerUrl = result.explorerUrl;
        } catch (err) {
            txError = err.message;
            console.error('[production-stages] Blockchain TX failed:', txError);
        }

        // Save stage log
        const logId = uuidv4();
        const { data: log, error: logErr } = await supabase.from('production_stage_logs').insert({
            id: logId,
            batch_id: batchId,
            stage,
            stage_name: stageName,
            data: stageData || {},
            photo_url: photoUrl || null,
            tx_signature: txSignature,
            explorer_url: explorerUrl,
            logged_by: loggedBy || null,
            logged_by_name: loggedByName || null,
        }).select().single();

        if (logErr) throw new Error(logErr.message);

        let productId = batch.product_id || null;
        let coffeeId = batch.coffee_id || null;

        if (Number(stage) === 6 && !productId) {
            productId = uuidv4();
            coffeeId = `PROD-${batchId.slice(0, 8)}-${Date.now().toString(36).slice(-5)}`;
            const weights = Array.isArray(stageData?.weights) && stageData.weights.length ? stageData.weights : [250];
            const prices = Array.isArray(stageData?.pricePerUnit) && stageData.pricePerUnit.length === weights.length
                ? stageData.pricePerUnit
                : weights.map(() => 0);

            const baseProduct = {
                id: productId,
                name: stageData?.productName || batch.name,
                origin: batch.origin || stageData?.origin || 'Tidak diketahui',
                grade: batch.grade || stageData?.grade || 'A',
                variety: batch.variety || stageData?.variety || 'Arabika',
                roast: stageData?.roast || stageData?.levelRoast || 'Medium Roast',
                weight: weights,
                price_per_unit: prices,
                description: stageData?.description || `Produk jadi dari batch ${batch.name}`,
                image: photoUrl || stageData?.image || null,
                tags: [batch.variety, batch.grade, 'Produk Jadi'].filter(Boolean),
                stock: Number(stageData?.stock) || 0,
                rating: 4.5,
                sold: 0,
                status: 'published',
                coffee_id: coffeeId,
                submitted_by: loggedBy || batch.farmer_id || null,
                submitted_by_name: loggedByName || batch.farmer_name || null,
                submitted_by_role: 'koperasi',
                submitted_at: new Date().toISOString(),
            };

            let { error: productErr } = await supabase.from('products').insert(baseProduct);
            if (productErr && productErr.message?.includes('column')) {
                const { status, coffee_id, submitted_by, submitted_by_name, submitted_by_role, submitted_at, ...fallbackProduct } = baseProduct;
                ({ error: productErr } = await supabase.from('products').insert(fallbackProduct));
            }
            if (productErr) throw new Error(`Gagal membuat produk jadi: ${productErr.message}`);
        }

        // Advance batch to next stage (or stay at 6 if already done)
        const nextStage = Math.min(stage + 1, 6);
        const batchUpdate = { current_stage: nextStage, updated_at: new Date().toISOString() };
        if (productId) batchUpdate.product_id = productId;
        if (coffeeId) batchUpdate.coffee_id = coffeeId;
        await supabase.from('production_batches')
            .update(batchUpdate)
            .eq('id', batchId);

        return NextResponse.json({
            success: true,
            verified: !!txSignature,
            nextStage,
            txSignature,
            explorerUrl,
            txError,
            data: {
                id: log.id,
                batchId,
                stage,
                stageName,
                stageData,
                photoUrl,
                txSignature,
                explorerUrl,
                productId,
                coffeeId,
                createdAt: log.created_at,
            },
        });
    } catch (err) {
        console.error('[production-stages] POST error:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
