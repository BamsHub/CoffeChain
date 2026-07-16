import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { readDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { PRODUCTION_STAGES } from '@/lib/productionAudit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STAGE_NAMES = Object.fromEntries(PRODUCTION_STAGES.map(stage => [stage.id, stage.name]));

function isValidCid(cid) {
    return typeof cid === 'string' && (
        /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)
        || /^b[a-z2-7]{20,}$/i.test(cid)
    );
}

function getToken(req) {
    return req.headers.get('Authorization')?.replace('Bearer ', '');
}

async function getSessionActor(session) {
    const dbUsers = await readDb('users');
    const actor = dbUsers.items.find(user => user.id === session.userId);
    return { id: session.userId, name: actor?.name || actor?.email || session.userId };
}

async function verifyStageAsset(supabase, { batch, batchId, stage, photoCid, photoUrl, ipfsUri }) {
    const { data: asset, error } = await supabase
        .from('ipfs_assets')
        .select('owner_id, ipfs_uri, gateway_url')
        .eq('batch_id', batchId)
        .eq('stage', Number(stage))
        .eq('cid', photoCid)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(asset
        && asset.owner_id === batch.farmer_id
        && asset.ipfs_uri === ipfsUri
        && asset.gateway_url === photoUrl);
}

function getEvidencePhotos(stageData, primary) {
    const source = Array.isArray(stageData?.evidencePhotos) && stageData.evidencePhotos.length
        ? stageData.evidencePhotos
        : [stageData?.evidencePhoto || primary];
    const photos = source.filter(Boolean).map(photo => ({
        cid: photo.cid,
        uri: photo.uri,
        gatewayUrl: photo.gatewayUrl,
    }));
    if (!photos.length || photos.some(photo => (
        !isValidCid(photo.cid)
        || photo.uri !== `ipfs://${photo.cid}`
        || !photo.gatewayUrl
    ))) return null;
    const first = photos[0];
    if (first.cid !== primary.cid || first.uri !== primary.uri || first.gatewayUrl !== primary.gatewayUrl) return null;
    return photos;
}

async function verifyStageAssets(supabase, context, photos) {
    const results = await Promise.all(photos.map(photo => verifyStageAsset(supabase, {
        ...context,
        photoCid: photo.cid,
        photoUrl: photo.gatewayUrl,
        ipfsUri: photo.uri,
    })));
    return results.every(Boolean);
}

// GET — list stage logs for a batch
export async function GET(req) {
    try {
        const token = getToken(req);
        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batchId');

        const supabase = getSupabaseAdmin();
        let query = supabase.from('production_stage_logs').select('*').order('created_at', { ascending: false });
        if (session.role === 'farmer') {
            const { data: ownedBatches, error: ownedError } = await supabase
                .from('production_batches')
                .select('id')
                .eq('farmer_id', session.userId);
            if (ownedError) throw new Error(ownedError.message);
            const ownedIds = (ownedBatches || []).map(batch => batch.id);
            if (batchId && !ownedIds.includes(batchId)) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }
            if (!ownedIds.length) return NextResponse.json({ success: true, data: [] });
            query = query.in('batch_id', batchId ? [batchId] : ownedIds);
        } else if (batchId) {
            query = query.eq('batch_id', batchId);
        }

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
        const token = getToken(req);
        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { batchId, stage, stageData, photoUrl, photoCid, ipfsUri, loggedBy, loggedByName } = body;

        if (!batchId || !stage) {
            return NextResponse.json({ success: false, message: 'batchId dan stage wajib' }, { status: 400 });
        }
        if (Number(stage) < 1 || Number(stage) > 6) {
            return NextResponse.json({ success: false, message: 'Stage tidak valid' }, { status: 400 });
        }
        if (!photoUrl || !isValidCid(photoCid) || ipfsUri !== `ipfs://${photoCid}`) {
            return NextResponse.json({
                success: false,
                message: 'Bukti foto yang sudah dipin ke IPFS wajib sebelum menyimpan tahap produksi',
            }, { status: 400 });
        }
        const evidencePhotos = getEvidencePhotos(stageData, { cid: photoCid, uri: ipfsUri, gatewayUrl: photoUrl });
        if (!evidencePhotos) {
            return NextResponse.json({ success: false, message: 'Metadata bukti foto IPFS tidak valid' }, { status: 400 });
        }
        const description = String(stageData?.description || stageData?.notes || '').trim();
        if (!description) {
            return NextResponse.json({ success: false, message: 'Deskripsi tahap wajib diisi' }, { status: 400 });
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

        if (!await verifyStageAssets(supabase, { batch, batchId, stage }, evidencePhotos)) {
            return NextResponse.json({ success: false, message: 'Bukti IPFS tidak terdaftar untuk pemilik, batch, dan tahap ini' }, { status: 403 });
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

        const actor = await getSessionActor(session);
        const targetLoggedBy = actor.id;
        const targetLoggedByName = actor.name;

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
                tags: [batch.variety, batch.grade, 'Produk Jadi', ...evidencePhotos.map(photo => `ipfs-image:${photo.cid}`)].filter(Boolean),
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
            if (productErr) {
                await supabase.from('production_stage_logs').delete().eq('id', logId);
                throw new Error(`Gagal membuat produk jadi: ${productErr.message}`);
            }
        }

        // Advance batch to next stage (or stay at 6 if already done)
        const nextStage = Math.min(stage + 1, 6);
        const batchUpdate = { current_stage: nextStage, updated_at: new Date().toISOString() };
        if (productId) batchUpdate.product_id = productId;
        const { error: updateError } = await supabase.from('production_batches')
            .update(batchUpdate)
            .eq('id', batchId);
        if (updateError) {
            await supabase.from('production_stage_logs').delete().eq('id', logId);
            if (Number(stage) === 6 && productId && !batch.product_id) {
                await supabase.from('products').delete().eq('id', productId);
            }
            throw new Error(`Gagal melanjutkan batch: ${updateError.message}`);
        }

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
                photoCid,
                ipfsUri,
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

// PATCH — edit the latest completed stage before the pipeline advances.
// Rejected products may reopen earlier stages, but an on-chain certificate is immutable.
export async function PATCH(req) {
    try {
        const token = getToken(req);
        const session = await verifyToken(token);
        if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { batchId, stage, stageData, photoUrl, photoCid, ipfsUri, loggedBy, loggedByName } = body;
        const stageNumber = Number(stage);
        if (!batchId || !Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > 6) {
            return NextResponse.json({ success: false, message: 'batchId dan stage tidak valid' }, { status: 400 });
        }
        if (!photoUrl || !isValidCid(photoCid) || ipfsUri !== `ipfs://${photoCid}`) {
            return NextResponse.json({ success: false, message: 'Bukti foto IPFS tahap wajib valid' }, { status: 400 });
        }
        const evidencePhotos = getEvidencePhotos(stageData, { cid: photoCid, uri: ipfsUri, gatewayUrl: photoUrl });
        if (!evidencePhotos) {
            return NextResponse.json({ success: false, message: 'Metadata bukti foto IPFS tidak valid' }, { status: 400 });
        }
        const description = String(stageData?.description || stageData?.notes || '').trim();
        if (!description) return NextResponse.json({ success: false, message: 'Deskripsi tahap wajib diisi' }, { status: 400 });

        const supabase = getSupabaseAdmin();
        const { data: batch, error: batchError } = await supabase
            .from('production_batches')
            .select('*')
            .eq('id', batchId)
            .maybeSingle();
        if (batchError || !batch) return NextResponse.json({ success: false, message: 'Batch tidak ditemukan' }, { status: 404 });
        if (session.role === 'farmer' && batch.farmer_id !== session.userId) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
        let product = null;
        if (batch.product_id) {
            const { data, error: productError } = await supabase
                .from('products')
                .select('id, status, coffee_id, tags')
                .eq('id', batch.product_id)
                .maybeSingle();
            if (productError || !data) return NextResponse.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
            product = data;
            if (product.coffee_id) {
                return NextResponse.json({ success: false, message: 'Pipeline sudah tersertifikasi on-chain dan tidak dapat diubah' }, { status: 409 });
            }
        }

        const { data: laterLogs, error: laterError } = await supabase
            .from('production_stage_logs')
            .select('id, stage')
            .eq('batch_id', batchId)
            .gt('stage', stageNumber)
            .limit(1);
        if (laterError) throw new Error(laterError.message);
        if ((laterLogs || []).length && product?.status !== 'rejected') {
            return NextResponse.json({ success: false, message: 'Tahap ini terkunci karena pipeline sudah dilanjutkan ke tahap berikutnya' }, { status: 409 });
        }

        if (!await verifyStageAssets(supabase, { batch, batchId, stage: stageNumber }, evidencePhotos)) {
            return NextResponse.json({ success: false, message: 'Bukti IPFS tidak terdaftar untuk pemilik, batch, dan tahap ini' }, { status: 403 });
        }

        const { data: existingLog, error: logError } = await supabase
            .from('production_stage_logs')
            .select('id')
            .eq('batch_id', batchId)
            .eq('stage', stageNumber)
            .maybeSingle();
        if (logError || !existingLog) {
            return NextResponse.json({ success: false, message: 'Log tahap belum ada dan tidak dapat diedit' }, { status: 404 });
        }

        const actor = await getSessionActor(session);
        const targetLoggedBy = actor.id;
        const targetLoggedByName = actor.name;

        const { data: updatedLog, error: updateError } = await supabase
            .from('production_stage_logs')
            .update({
                data: stageData,
                photo_url: photoUrl,
                logged_by: targetLoggedBy || null,
                logged_by_name: targetLoggedByName || null,
            })
            .eq('id', existingLog.id)
            .select()
            .single();
        if (updateError) throw new Error(updateError.message);

        if (stageNumber === 6 && product) {
            const tags = (Array.isArray(product.tags) ? product.tags : [])
                .filter(tag => !String(tag).startsWith('ipfs-image:'));
            tags.push(...evidencePhotos.map(photo => `ipfs-image:${photo.cid}`));
            const productUpdates = {
                name: stageData.productName || batch.name,
                roast: stageData.roast || stageData.levelRoast || 'Medium Roast',
                weight: Array.isArray(stageData.weights) ? stageData.weights : [250],
                price_per_unit: Array.isArray(stageData.pricePerUnit) ? stageData.pricePerUnit : [0],
                description,
                image: photoUrl,
                tags,
                stock: Number(stageData.stock) || 0,
            };
            const { error: productUpdateError } = await supabase.from('products').update(productUpdates).eq('id', product.id);
            if (productUpdateError) throw new Error(productUpdateError.message);
        }

        return NextResponse.json({
            success: true,
            edited: true,
            data: {
                id: updatedLog.id,
                batchId,
                stage: stageNumber,
                stageName: updatedLog.stage_name,
                stageData: updatedLog.data,
                photoUrl: updatedLog.photo_url,
                productId: product?.id || null,
            },
        });
    } catch (err) {
        console.error('[production-stages] PATCH error:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
