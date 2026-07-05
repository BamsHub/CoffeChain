import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { readDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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
        const token = req.headers.get('Authorization')?.replace('Bearer ', '') || new URL(req.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { batchId, stage, stageData, photoUrl, loggedBy, loggedByName } = body;

        if (!batchId || !stage) {
            return NextResponse.json({ success: false, message: 'batchId dan stage wajib' }, { status: 400 });
        }
        if (Number(stage) < 1 || Number(stage) > 6) {
            return NextResponse.json({ success: false, message: 'Stage tidak valid' }, { status: 400 });
        }
        if (!photoUrl) {
            return NextResponse.json({ success: false, message: 'Bukti foto wajib diupload sebelum menyimpan tahap produksi' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Get batch info
        const { data: batch, error: batchErr } = await supabase
            .from('production_batches').select('*').eq('id', batchId).single();
        if (batchErr || !batch) throw new Error('Batch tidak ditemukan');

        // Security check: if role is farmer, verify ownership of the batch
        if (session.role === 'farmer' && batch.farmer_id !== session.userId) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        if (Number(batch.current_stage) !== Number(stage)) {
            return NextResponse.json({
                success: false,
                message: `Batch masih berada di tahap ${batch.current_stage}. Selesaikan tahap aktif secara berurutan.`,
            }, { status: 409 });
        }

        const { data: existingLogs, error: existingErr } = await supabase
            .from('production_stage_logs')
            .select('stage')
            .eq('batch_id', batchId);
        if (existingErr) throw new Error(existingErr.message);

        const loggedStages = new Set((existingLogs || []).map(item => Number(item.stage)));
        if (loggedStages.has(Number(stage))) {
            return NextResponse.json({ success: false, message: 'Tahap ini sudah pernah disimpan' }, { status: 409 });
        }
        for (let requiredStage = 1; requiredStage < Number(stage); requiredStage++) {
            if (!loggedStages.has(requiredStage)) {
                return NextResponse.json({
                    success: false,
                    message: `Tahap ${requiredStage} harus diselesaikan dulu sebelum tahap ${stage}`,
                }, { status: 409 });
            }
        }

        let targetLoggedBy = loggedBy;
        let targetLoggedByName = loggedByName;
        if (session.role === 'farmer') {
            targetLoggedBy = session.userId;
            const dbUsers = await readDb('users');
            const user = dbUsers.items.find(u => u.id === session.userId);
            if (user) {
                targetLoggedByName = user.name;
            }
        }

        let productId = batch.product_id || null;
        const stageName = STAGE_NAMES[stage] || `Stage ${stage}`;

        // Save stage log
        const logId = uuidv4();
        const { data: log, error: logErr } = await supabase.from('production_stage_logs').insert({
            id: logId,
            batch_id: batchId,
            stage,
            stage_name: stageName,
            data: stageData || {},
            photo_url: photoUrl || null,
            tx_signature: null,
            explorer_url: null,
            logged_by: targetLoggedBy || null,
            logged_by_name: targetLoggedByName || null,
        }).select().single();

        if (logErr) throw new Error(logErr.message);

        if (Number(stage) === 6 && !productId) {
            productId = uuidv4();
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
                status: 'pending_certification',
                coffee_id: null,
                submitted_by: targetLoggedBy || batch.farmer_id || null,
                submitted_by_name: targetLoggedByName || batch.farmer_name || null,
                submitted_by_role: session.role || 'farmer',
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
        await supabase.from('production_batches')
            .update(batchUpdate)
            .eq('id', batchId);

        return NextResponse.json({
            success: true,
            verified: false,
            nextStage,
            txSignature: null,
            explorerUrl: null,
            txError: null,
            data: {
                id: log.id,
                batchId,
                stage,
                stageName,
                stageData,
                photoUrl,
                txSignature: null,
                explorerUrl: null,
                productId,
                coffeeId: null,
                createdAt: log.created_at,
            },
        });
    } catch (err) {
        console.error('[production-stages] POST error:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
