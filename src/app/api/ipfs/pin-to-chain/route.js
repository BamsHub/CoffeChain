export const runtime = 'nodejs';

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sendServerMemoTx } from '@/lib/serverSolanaMemo';

/** POST - Store only an IPFS CID hash proof on Solana. */
export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session || !['koperasi', 'developer'].includes(session.role)) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const { cid } = await request.json();
        if (!cid) return NextResponse.json({ success: false, message: 'CID is required' }, { status: 400 });

        const memo = {
            v: 2,
            type: 'ipfs-proof',
            cid,
            sha256: createHash('sha256').update(cid).digest('hex'),
        };
        const result = await sendServerMemoTx(JSON.stringify(memo));

        return NextResponse.json({
            success: true,
            txSignature: result.txSignature,
            explorerUrl: result.explorerUrl,
            memo,
        });
    } catch (error) {
        console.error('[IPFS-to-Chain]', error);
        return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
    }
}
