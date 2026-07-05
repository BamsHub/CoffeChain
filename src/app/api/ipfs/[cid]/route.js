export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { isIPFSConfigured, getIPFSGatewayUrl } from '@/lib/ipfs';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'ipfs');

/** Content-type mapping by extension */
function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.json': 'application/json',
        '.pdf': 'application/pdf',
    };
    return types[ext] || 'application/octet-stream';
}

/** GET — Lookup content by CID (public, no auth) */
export async function GET(request, { params }) {
    try {
        const { cid } = await params;

        if (!cid || cid.length < 10) {
            return NextResponse.json({ success: false, message: 'Invalid CID' }, { status: 400 });
        }

        // --- 1. Check local cache ---
        try {
            const files = await fs.readdir(UPLOAD_DIR);
            const match = files.find(f => f.startsWith(cid));

            if (match) {
                const filePath = path.join(UPLOAD_DIR, match);
                const fileBuffer = await fs.readFile(filePath);
                const contentType = getContentType(match);

                console.log(`[IPFS] Serving from local cache: ${match}`);

                return new NextResponse(fileBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Content-Length': String(fileBuffer.length),
                        'Cache-Control': 'public, max-age=31536000, immutable',
                        'X-IPFS-Source': 'local-cache',
                    },
                });
            }
        } catch (dirErr) {
            // Upload dir doesn't exist yet — skip local lookup
            console.log('[IPFS] Local cache directory not found, skipping local lookup');
        }

        // --- 2. Redirect to IPFS gateway if configured ---
        if (isIPFSConfigured()) {
            const gatewayUrl = getIPFSGatewayUrl(cid);
            console.log(`[IPFS] Redirecting to gateway: ${gatewayUrl}`);

            return NextResponse.redirect(gatewayUrl, 302);
        }

        // --- 3. Not found ---
        return NextResponse.json({
            success: false,
            message: `Content with CID "${cid}" not found`,
            hint: isIPFSConfigured()
                ? 'Content may not be pinned on Pinata'
                : 'IPFS not configured — only locally cached files are available',
        }, { status: 404 });
    } catch (err) {
        console.error('[IPFS] CID lookup error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
