export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { isIPFSConfigured, pinFileToIPFS, pinJSONToIPFS, getIPFSGatewayUrl, getIPFSUrl } from '@/lib/ipfs';
import Sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'ipfs');

async function ensureDir(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

/** GET — Public API usage docs */
export async function GET() {
    return NextResponse.json({
        success: true,
        api: 'CoffeeChain IPFS Service',
        version: '1.0',
        endpoints: {
            'POST /api/ipfs': {
                description: 'Upload file or JSON to IPFS',
                auth: 'None (public)',
                modes: {
                    file: {
                        contentType: 'multipart/form-data',
                        fields: {
                            file: 'Image file (JPEG, PNG, WebP, GIF)',
                            metadata: 'Optional JSON string with key-value metadata',
                        },
                    },
                    json: {
                        contentType: 'application/json',
                        body: '{ "json": { ... }, "name": "metadata-name" }',
                    },
                },
            },
            'GET /api/ipfs/[cid]': {
                description: 'Lookup content by CID (local cache or IPFS gateway)',
                auth: 'None (public)',
            },
            'POST /api/ipfs/pin-to-chain': {
                description: 'Pin CID reference on Solana blockchain',
                auth: 'None (public)',
                body: '{ "cid", "filename", "fileType", "fileSize" }',
            },
        },
        ipfsConfigured: isIPFSConfigured(),
    });
}

/** POST — Upload file (image) or JSON to IPFS + local storage (public, no auth) */
export async function POST(req) {
    try {

        await ensureDir(UPLOAD_DIR);

        const contentType = req.headers.get('content-type') || '';

        // =============================================
        // MODE 1: JSON body  { json: {...}, name: '' }
        // =============================================
        if (contentType.includes('application/json')) {
            const body = await req.json();
            const { json: jsonData, name = 'metadata' } = body;

            if (!jsonData || typeof jsonData !== 'object') {
                return NextResponse.json({ success: false, message: 'Field "json" harus berupa object' }, { status: 400 });
            }

            // Save locally
            const localFilename = `${name}-${Date.now()}.json`;
            const localPath = path.join(UPLOAD_DIR, localFilename);
            await fs.writeFile(localPath, JSON.stringify(jsonData, null, 2), 'utf-8');

            // Pin to IPFS if configured
            if (!isIPFSConfigured()) {
                console.log('[IPFS] Pinata not configured — saving JSON locally only');
                return NextResponse.json({
                    success: true,
                    storage: 'local-only',
                    warning: 'Pinata API keys not configured. File saved locally only.',
                    localUrl: `/uploads/ipfs/${localFilename}`,
                    file: { name: localFilename, size: Buffer.byteLength(JSON.stringify(jsonData)), format: 'json' },
                });
            }

            const result = await pinJSONToIPFS(jsonData, name);
            const cid = result.IpfsHash;

            // Rename local file to include CID
            const cidFilename = `${cid}-${name}.json`;
            const cidPath = path.join(UPLOAD_DIR, cidFilename);
            await fs.rename(localPath, cidPath);

            return NextResponse.json({
                success: true,
                cid,
                ipfsUrl: getIPFSUrl(cid),
                gatewayUrl: result.gatewayUrl,
                localUrl: `/uploads/ipfs/${cidFilename}`,
                file: { name: cidFilename, size: result.PinSize, format: 'json' },
            });
        }

        // =============================================
        // MODE 2: FormData (multipart/form-data)
        // =============================================
        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file');

            if (!file || typeof file === 'string') {
                return NextResponse.json({ success: false, message: 'File tidak ditemukan' }, { status: 400 });
            }

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                return NextResponse.json({ success: false, message: 'Format harus JPG, PNG, WEBP, atau GIF' }, { status: 400 });
            }

            const MAX_SIZE = 10 * 1024 * 1024; // 10MB
            if (file.size > MAX_SIZE) {
                return NextResponse.json({ success: false, message: 'Ukuran file maksimal 10MB' }, { status: 400 });
            }

            // Read file buffer
            const arrayBuffer = await file.arrayBuffer();
            const originalBuffer = Buffer.from(arrayBuffer);
            const originalSize = originalBuffer.length;

            // Compress with Sharp — resize max 1920px, convert to WebP
            console.log(`[IPFS] Compressing image: ${file.name} (${originalSize} bytes)`);
            const processedBuffer = await Sharp(originalBuffer)
                .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
            const processedSize = processedBuffer.length;
            const compressionRatio = ((1 - processedSize / originalSize) * 100).toFixed(1);

            console.log(`[IPFS] Compressed: ${originalSize} → ${processedSize} bytes (${compressionRatio}% reduction)`);

            // Parse optional metadata
            let metadata = {};
            try {
                const metadataRaw = formData.get('metadata');
                if (metadataRaw) metadata = JSON.parse(metadataRaw);
            } catch { /* ignore invalid metadata */ }

            // Save locally only if IPFS not configured
            if (!isIPFSConfigured()) {
                console.log('[IPFS] Pinata not configured — saving file locally only');
                const localFilename = `local-${Date.now()}-${file.name.replace(/\.[^.]+$/, '')}.webp`;
                const localPath = path.join(UPLOAD_DIR, localFilename);
                await fs.writeFile(localPath, processedBuffer);

                return NextResponse.json({
                    success: true,
                    storage: 'local-only',
                    warning: 'Pinata API keys not configured. File saved locally only.',
                    localUrl: `/uploads/ipfs/${localFilename}`,
                    file: { name: localFilename, size: processedSize, format: 'webp' },
                    compression: { original: originalSize, processed: processedSize, ratio: `${compressionRatio}%` },
                });
            }

            // Pin to IPFS
            const compressedFilename = file.name.replace(/\.[^.]+$/, '') + '.webp';
            const result = await pinFileToIPFS(processedBuffer, compressedFilename, metadata);
            const cid = result.IpfsHash;

            // Save locally with CID prefix
            const cidFilename = `${cid}-${compressedFilename}`;
            const cidPath = path.join(UPLOAD_DIR, cidFilename);
            await fs.writeFile(cidPath, processedBuffer);

            return NextResponse.json({
                success: true,
                cid,
                ipfsUrl: getIPFSUrl(cid),
                gatewayUrl: result.gatewayUrl,
                localUrl: `/uploads/ipfs/${cidFilename}`,
                file: { name: cidFilename, size: processedSize, format: 'webp' },
                compression: { original: originalSize, processed: processedSize, ratio: `${compressionRatio}%` },
            });
        }

        return NextResponse.json({ success: false, message: 'Content-Type harus multipart/form-data atau application/json' }, { status: 400 });
    } catch (err) {
        console.error('[IPFS] Upload error:', err);
        return NextResponse.json({ success: false, message: `Server error: ${err.message}` }, { status: 500 });
    }
}
