import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getIPFSUrl, pinFileToIPFS } from '@/lib/ipfs';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const MAX_SIZE = 5 * 1024 * 1024;

function isValidCid(cid) {
    return typeof cid === 'string' && (
        /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)
        || /^b[a-z2-7]{20,}$/i.test(cid)
    );
}

function hasExpectedFileSignature(buffer, type) {
    if (type === 'image/jpeg' || type === 'image/jpg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (type === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (type === 'image/gif') return buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a';
    if (type === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return false;
}

export async function POST(req) {
    try {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        const batchId = String(formData.get('batchId') || '');
        const stage = Number(formData.get('stage'));
        if (!batchId || !Number.isInteger(stage) || stage < 1 || stage > 6) {
            return NextResponse.json({ success: false, message: 'Upload hanya tersedia dari card Pipeline Stok Tahap 1-6' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: batch, error: batchError } = await supabase
            .from('production_batches')
            .select('id, farmer_id, current_stage, product_id')
            .eq('id', batchId)
            .maybeSingle();
        if (batchError || !batch) {
            return NextResponse.json({ success: false, message: 'Batch pipeline tidak ditemukan' }, { status: 404 });
        }
        if (session.role === 'farmer' && batch.farmer_id !== session.userId) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }
        let rejectedProduct = false;
        if (batch.product_id) {
            const { data: product, error: productError } = await supabase
                .from('products')
                .select('status')
                .eq('id', batch.product_id)
                .maybeSingle();
            if (productError || !product) {
                return NextResponse.json({ success: false, message: 'Produk pipeline tidak ditemukan' }, { status: 404 });
            }
            rejectedProduct = product.status === 'rejected';
        }
        if ((batch.product_id && !rejectedProduct) || (!batch.product_id && Number(batch.current_stage) !== stage)) {
            return NextResponse.json({ success: false, message: 'Tahap pipeline ini tidak lagi aktif' }, { status: 409 });
        }
        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, message: 'File foto wajib dipilih' }, { status: 400 });
        }
        if (!ALLOWED_TYPES.has(file.type)) {
            return NextResponse.json({ success: false, message: 'Format harus JPG, PNG, WEBP, atau GIF' }, { status: 400 });
        }
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ success: false, message: 'Ukuran file maksimal 5MB' }, { status: 400 });
        }

        const ownerId = batch.farmer_id || session.userId;
        const ownerRole = batch.farmer_id ? 'farmer' : session.role;
        const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const fileName = `farmer-${ownerId}-production-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        if (!hasExpectedFileSignature(buffer, file.type)) {
            return NextResponse.json({ success: false, message: 'Isi file tidak cocok dengan format gambar yang dipilih' }, { status: 400 });
        }
        const result = await pinFileToIPFS(buffer, fileName, {
            app: 'CoffeeChain',
            type: 'production-stage-photo',
            ownerId: String(ownerId),
            ownerRole,
            uploadedBy: String(session.userId || 'unknown'),
            batchId,
            stage: String(stage),
        });
        const cid = result.IpfsHash;

        if (!isValidCid(cid)) {
            throw new Error('Pinata tidak mengembalikan CID IPFS yang valid');
        }

        const { error: assetError } = await supabase.from('ipfs_assets').upsert({
            owner_id: ownerId,
            owner_role: ownerRole,
            uploaded_by: session.userId,
            batch_id: batchId,
            stage,
            cid,
            ipfs_uri: getIPFSUrl(cid),
            gateway_url: result.gatewayUrl,
            file_name: fileName,
            mime_type: file.type,
            size_bytes: result.PinSize ?? file.size,
            pinned_at: result.Timestamp ?? new Date().toISOString(),
        }, { onConflict: 'owner_id,cid' });
        if (assetError) throw new Error(`Bukti kepemilikan IPFS gagal disimpan: ${assetError.message}`);

        return NextResponse.json({
            success: true,
            storage: 'ipfs',
            cid,
            ipfsUri: getIPFSUrl(cid),
            gatewayUrl: result.gatewayUrl,
            url: result.gatewayUrl,
            size: result.PinSize ?? file.size,
            pinnedAt: result.Timestamp ?? new Date().toISOString(),
            ownerId,
        });
    } catch (err) {
        console.error('[upload] IPFS upload error:', err);
        const notConfigured = /PINATA_/i.test(err.message || '');
        return NextResponse.json({
            success: false,
            message: notConfigured
                ? 'IPFS belum dikonfigurasi pada server'
                : `Upload ke IPFS gagal: ${err.message || 'unknown error'}`,
        }, { status: notConfigured ? 503 : 502 });
    }
}
