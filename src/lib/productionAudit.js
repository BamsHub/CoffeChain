import { supabaseAdmin } from '@/lib/supabase';
import {
    FARMER_VERIFICATION_STATUS,
    buildFarmerVerificationChecklist,
    normalizeFarmerVerificationStatus,
} from '@/lib/farmerVerification';
import { getFarmerAuthUser, mergeFarmerIdentity } from '@/lib/farmerIdentityStore';

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

function getEvidencePhotos(log) {
    if (!log) return [];
    const source = Array.isArray(log.data?.evidencePhotos) && log.data.evidencePhotos.length
        ? log.data.evidencePhotos
        : [log.data?.evidencePhoto || {}];
    return source.filter(Boolean);
}

function validStageEvidence(log) {
    const photos = getEvidencePhotos(log);
    return Boolean(log?.photo_url)
        && photos.length > 0
        && photos.every(photo => (
            isValidCid(photo.cid)
            && photo.uri === `ipfs://${photo.cid}`
            && Boolean(photo.gatewayUrl)
        ));
}

function criterion(id, label, passed, detail) {
    return { id, label, passed: Boolean(passed), detail };
}

function toPipeline(logs = []) {
    return PRODUCTION_STAGES.map(stage => {
        const log = logs.find(item => Number(item.stage) === stage.id);
        if (!log) return null;
        const evidencePhotos = getEvidencePhotos(log);
        const evidence = evidencePhotos[0] || {};
        return {
            stage: stage.id,
            stageName: stage.name,
            description: String(log.data?.description || log.data?.notes || '').trim(),
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
}

export async function getProductionCertificationAudit(productId) {
    const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();
    if (productError) throw new Error(productError.message);
    if (!product) throw new Error('Produk tidak ditemukan');

    const { data: batch, error: batchError } = await supabaseAdmin
        .from('production_batches')
        .select('*')
        .eq('product_id', productId)
        .maybeSingle();
    if (batchError) throw new Error(batchError.message);

    let logs = [];
    if (batch) {
        const { data, error } = await supabaseAdmin
            .from('production_stage_logs')
            .select('*')
            .eq('batch_id', batch.id)
            .order('stage', { ascending: true });
        if (error) throw new Error(error.message);
        logs = data || [];
    }

    const ownerId = product.submitted_by || batch?.farmer_id || null;
    let owner = null;
    if (ownerId) {
        const [{ data }, authUser] = await Promise.all([
            supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', ownerId)
                .maybeSingle(),
            getFarmerAuthUser(ownerId),
        ]);
        owner = data ? mergeFarmerIdentity(data, authUser) : null;
    }

    const stageNumbers = logs.map(log => Number(log.stage));
    const expectedStages = PRODUCTION_STAGES.map(stage => stage.id);
    const completeSequence = stageNumbers.length === expectedStages.length
        && expectedStages.every(stage => stageNumbers.filter(value => value === stage).length === 1);
    const descriptionsComplete = completeSequence && logs.every(log => (
        String(log.data?.description || log.data?.notes || '').trim().length > 0
    ));
    const evidenceComplete = completeSequence && logs.every(validStageEvidence);
    const productMetadataComplete = [
        product.name,
        product.origin,
        product.variety,
        product.grade,
        product.description,
    ].every(value => String(value || '').trim().length > 0);
    const variantsComplete = Array.isArray(product.weight)
        && product.weight.length > 0
        && Array.isArray(product.price_per_unit)
        && product.price_per_unit.length === product.weight.length
        && (!Array.isArray(product.stock_per_unit) || product.stock_per_unit.length === product.weight.length);

    const ownerIsFarmer = owner?.role === 'farmer' || product.submitted_by_role === 'farmer';
    const ownerStatus = owner ? normalizeFarmerVerificationStatus(owner) : null;
    const ownerChecklist = owner ? buildFarmerVerificationChecklist(owner) : [];
    const ownerVerified = !ownerIsFarmer || (
        ownerStatus === FARMER_VERIFICATION_STATUS.VERIFIED
        && ownerChecklist.length > 0
        && ownerChecklist.every(item => item.passed)
    );

    const criteria = [
        criterion(
            'farmer',
            'Petani terverifikasi',
            ownerVerified,
            !ownerIsFarmer
                ? 'Pipeline dicatat oleh akun operasional non-petani.'
                : ownerVerified
                    ? `${owner?.name || product.submitted_by_name} telah lolos verifikasi akun.`
                    : 'Email, identitas, kategori/komunitas, wilayah, dan wallet petani harus lolos review.',
        ),
        criterion(
            'batch',
            'Produk terhubung ke batch',
            Boolean(batch),
            batch ? `Batch ${batch.name} ditemukan.` : 'Produk belum terhubung ke pipeline produksi.',
        ),
        criterion(
            'sequence',
            'Enam tahap berurutan dan unik',
            completeSequence,
            completeSequence
                ? 'Tahap 1 sampai 6 tersedia tepat satu kali.'
                : `Tahap tersedia: ${stageNumbers.length ? stageNumbers.join(', ') : 'belum ada'}.`,
        ),
        criterion(
            'descriptions',
            'Deskripsi setiap tahap lengkap',
            descriptionsComplete,
            descriptionsComplete
                ? 'Seluruh tahap memiliki uraian proses.'
                : 'Satu atau lebih tahap belum memiliki deskripsi.',
        ),
        criterion(
            'ipfs',
            'Bukti foto IPFS valid',
            evidenceComplete,
            evidenceComplete
                ? 'CID, URI ipfs://, dan gateway tersedia pada seluruh tahap.'
                : 'Satu atau lebih bukti foto belum memiliki CID/URI/gateway yang valid.',
        ),
        criterion(
            'metadata',
            'Metadata produk lengkap',
            productMetadataComplete && variantsComplete,
            productMetadataComplete && variantsComplete
                ? 'Nama, asal, varietas, grade, deskripsi, varian, harga, dan stok konsisten.'
                : 'Metadata atau jumlah varian produk belum lengkap/konsisten.',
        ),
        criterion(
            'status',
            'Status siap sertifikasi',
            product.status === 'pending_certification' && !product.coffee_id,
            product.status === 'pending_certification' && !product.coffee_id
                ? 'Produk menunggu keputusan reviewer dan belum memiliki Coffee ID.'
                : `Status saat ini: ${product.status || '-'}; Coffee ID: ${product.coffee_id || 'belum ada'}.`,
        ),
    ];

    const pipeline = toPipeline(logs);
    return {
        eligible: criteria.every(item => item.passed),
        criteria,
        product,
        batch,
        logs,
        pipeline,
        owner: owner ? {
            id: owner.id,
            name: owner.name,
            role: owner.role,
            verificationStatus: ownerStatus,
        } : null,
    };
}

export async function getCompleteProductionAudit(productId) {
    const audit = await getProductionCertificationAudit(productId);
    const failed = audit.criteria.find(item => !item.passed);
    if (failed) throw new Error(`${failed.label}: ${failed.detail}`);

    return {
        batch: audit.batch,
        pipeline: audit.pipeline,
        criteria: audit.criteria,
        owner: audit.owner,
    };
}
