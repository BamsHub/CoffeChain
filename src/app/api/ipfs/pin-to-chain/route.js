export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { sendServerMemoTx } from '@/lib/serverSolanaMemo';
import { getExplorerTxUrl } from '@/lib/contractConfig';
import { getIPFSGatewayUrl } from '@/lib/ipfs';

/** POST — Pin IPFS CID reference on Solana blockchain (public, no auth) */
export async function POST(req) {
    try {

        const body = await req.json();
        const { cid, filename, fileType, fileSize } = body;

        if (!cid) {
            return NextResponse.json({ success: false, message: 'CID is required' }, { status: 400 });
        }

        // Build memo payload
        const memo = {
            v: 1,
            type: 'ipfs-pin',
            cid,
            filename: filename || 'unknown',
            fileType: fileType || 'unknown',
            size: fileSize || 0,
            gateway: getIPFSGatewayUrl(cid),
            ts: Math.floor(Date.now() / 1000),
        };

        const memoString = JSON.stringify(memo);
        console.log(`[IPFS→Chain] Writing memo: ${memoString}`);

        // Send to Solana
        try {
            const result = await sendServerMemoTx(memoString);

            console.log(`[IPFS→Chain] TX confirmed: ${result.txSignature}`);

            return NextResponse.json({
                success: true,
                txSignature: result.txSignature,
                explorerUrl: result.explorerUrl,
                memo,
            });
        } catch (solanaErr) {
            console.error('[IPFS→Chain] Solana TX failed:', solanaErr.message);

            // Don't block the user — return success with warning
            return NextResponse.json({
                success: true,
                warning: `Blockchain write failed: ${solanaErr.message}. CID is still valid on IPFS.`,
                txSignature: null,
                explorerUrl: null,
                memo,
            });
        }
    } catch (err) {
        console.error('[IPFS→Chain] Error:', err);
        return NextResponse.json({ success: false, message: `Server error: ${err.message}` }, { status: 500 });
    }
}
