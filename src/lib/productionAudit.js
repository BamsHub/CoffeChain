import { supabaseAdmin } from '@/lib/supabase';

export const PRODUCTION_STAGES = [
    { id: 1, name: 'Panen & Sortasi' },
    { id: 2, name: 'Pencucian & Fermentasi' },
    { id: 3, name: 'Pengeringan' },
    { id: 4, name: 'Pengupasan & Penggilingan' },
    { id: 5, name: 'Pemanggangan' },
    { id: 6, name: 'Produk Jadi & Pengemasan' },
];

function isValidCid(cid) {
    return typeof cid === 'string' && (
        /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)
        || /^b[a-z2-7]{20,}$/i.test(cid)
    );
}

export async function getCompleteProductionAudit(productId) {
    const { data: batch, error: batchError } = await supabaseAdmin
        .from('production_batches')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();
    if (batchError) throw new Error(batchError.message);
    if (!batch) throw new Error('Produk belum terhubung ke batch pipeline produksi');

    const { data: logs, error: logsError } = await supabaseAdmin
        .from('production_stage_logs')
        .select('*')
        .eq('batch_id', batch.id)
        .order('stage', { ascending: true });
    if (logsError) throw new Error(logsError.message);

    const pipeline = PRODUCTION_STAGES.map(stage => {
        const log = (logs || []).find(item => Number(item.stage) === stage.id);
        if (!log) throw new Error(`Tahap ${stage.id} (${stage.name}) belum diisi`);
        const description = String(log.data?.description || log.data?.notes || '').trim();
        const evidencePhotos = Array.isArray(log.data?.evidencePhotos) && log.data.evidencePhotos.length
            ? log.data.evidencePhotos
            : [log.data?.evidencePhoto || {}];
        const evidence = evidencePhotos[0] || {};
        if (!description) throw new Error(`Deskripsi Tahap ${stage.id} (${stage.name}) belum diisi`);
        if (!log.photo_url || evidencePhotos.some(photo => (
            !isValidCid(photo.cid)
            || photo.uri !== `ipfs://${photo.cid}`
            || !photo.gatewayUrl
        ))) {
            throw new Error(`Foto IPFS Tahap ${stage.id} (${stage.name}) belum valid`);
        }
        return {
            stage: stage.id,
            stageName: stage.name,
            description,
            operator: log.data?.operator || log.logged_by_name || null,
            recordedAt: log.created_at,
            measurements: Object.fromEntries(Object.entries(log.data || {}).filter(([key, value]) => (
                !['description', 'notes', 'evidencePhoto', 'evidencePhotos', 'image'].includes(key)
                && value !== null
                && value !== undefined
                && value !== ''
            ))),
            photo: {
                cid: evidence.cid,
                uri: evidence.uri,
                gatewayUrl: log.photo_url,
            },
            photos: evidencePhotos.map(photo => ({
                cid: photo.cid,
                uri: photo.uri,
                gatewayUrl: photo.gatewayUrl,
            })),
        };
    });

    return { batch, pipeline };
}
