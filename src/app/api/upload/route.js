import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getIPFSUrl, pinFileToIPFS } from '@/lib/ipfs';

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

export async function POST(req) {
    try {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '')
            || new URL(req.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, message: 'File foto wajib dipilih' }, { status: 400 });
        }
        if (!ALLOWED_TYPES.has(file.type)) {
            return NextResponse.json({ success: false, message: 'Format harus JPG, PNG, WEBP, atau GIF' }, { status: 400 });
        }
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ success: false, message: 'Ukuran file maksimal 5MB' }, { status: 400 });
        }

        const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const fileName = `production-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await pinFileToIPFS(buffer, fileName, {
            app: 'CoffeeChain',
            type: 'production-stage-photo',
            uploadedBy: String(session.userId || 'unknown'),
        });
        const cid = result.IpfsHash;

        if (!isValidCid(cid)) {
            throw new Error('Pinata tidak mengembalikan CID IPFS yang valid');
        }

        return NextResponse.json({
            success: true,
            storage: 'ipfs',
            cid,
            ipfsUri: getIPFSUrl(cid),
            gatewayUrl: result.gatewayUrl,
            url: result.gatewayUrl,
            size: result.PinSize ?? file.size,
            pinnedAt: result.Timestamp ?? new Date().toISOString(),
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
