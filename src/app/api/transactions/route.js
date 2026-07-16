export const runtime = 'nodejs';
export const maxDuration = 60;

import { addItem, deleteItem } from '@/lib/db';
import { sbDelete } from '@/lib/sdb';
import { getTransactionFeed, transactionsToSnake } from '@/lib/transactionFeed';
import { sendServerMemoTx } from '@/lib/serverSolanaMemo';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const includeOrders = searchParams.get('includeOrders') === 'true';
    const includeTraces = searchParams.get('includeTraces') === 'true';

    const data = await getTransactionFeed({ includeOrders, includeTraces });
    return Response.json({ success: true, data });
}

export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const weight = Number(body.weight);
        const amount = Number(body.amount);
        if (!body.farmer || !body.location || !Number.isFinite(weight) || weight <= 0) {
            return Response.json({ success: false, message: 'Petani, lokasi, dan berat yang valid wajib diisi' }, { status: 400 });
        }
        if (!Number.isFinite(amount) || amount < 0) {
            return Response.json({ success: false, message: 'Nilai transaksi tidak valid' }, { status: 400 });
        }

        const id = uuidv4();
        const now = new Date().toISOString();
        const memo = JSON.stringify({
            v: 1,
            type: 'coffee-transaction',
            id,
            farmer: String(body.farmer).slice(0, 64),
            location: String(body.location).slice(0, 64),
            weightKg: weight,
            variety: String(body.variety || 'Arabika').slice(0, 32),
            grade: String(body.grade || 'A').slice(0, 16),
            amountIdr: amount,
            createdBy: session.userId,
            ts: Math.floor(Date.now() / 1000),
        });
        const chainTx = await sendServerMemoTx(memo);

        const newTx = {
            id,
            hash: chainTx.txSignature,
            farmer: body.farmer,
            location: body.location,
            weight,
            variety: body.variety || 'Arabika',
            grade: body.grade || 'A',
            amount,
            status: 'Confirmed',
            timestamp: now,
            block: String(chainTx.slot),
            walletFrom: chainTx.signer,
            walletTo: body.walletTo || '—',
            note: body.note || '',
            type: body.type || 'transfer',
            productId: body.productId,
            productName: body.productName,
            txSignature: chainTx.txSignature,
            explorerUrl: chainTx.explorerUrl,
        };

        // Insert sekali saja. Implementasi lama menulis ID yang sama dua kali ke Supabase.
        await addItem('transactions', transactionsToSnake(newTx));
        return Response.json({ success: true, data: newTx }, { status: 201 });
    } catch (error) {
        console.error('[transactions POST]', error);
        return Response.json({
            success: false,
            message: error.message || 'Gagal mencatat transaksi ke Solana',
        }, { status: 502 });
    }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ success: false, message: 'ID required' }, { status: 400 });

    await sbDelete('transactions', id);
    await deleteItem('transactions', id);
    return Response.json({ success: true });
}
