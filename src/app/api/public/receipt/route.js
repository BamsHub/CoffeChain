export const runtime = 'nodejs';

import { readDb } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { ordersToCamel } from '@/lib/sdb';
import { getExplorerTxUrl } from '@/lib/contractConfig';

function safeOrder(order) {
    if (!order) return null;
    const txSignature = order.txSignature || null;
    const coffeeId = order.coffeeId || null;

    return {
        orderId: order.orderId,
        productId: order.productId,
        productName: order.productName,
        weight: order.weight,
        quantity: order.quantity,
        subtotalPrice: order.subtotalPrice ?? order.totalPrice,
        ppnRate: order.ppnRate ?? 0,
        ppnAmount: order.ppnAmount ?? 0,
        solanaTraceFee: order.solanaTraceFee ?? 0,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentCurrency: order.paymentCurrency,
        status: order.status,
        txSignature,
        solanaNetworkFeeLamports: order.solanaNetworkFeeLamports ?? null,
        solanaTraceStatus: order.solanaTraceStatus || (txSignature ? 'confirmed' : 'pending'),
        solanaTraceError: order.solanaTraceError || null,
        solanaTracedAt: order.solanaTracedAt || null,
        coffeeId,
        explorerUrl: txSignature ? getExplorerTxUrl(txSignature) : null,
        receiptUrl: order.orderId ? `/receipt?orderId=${encodeURIComponent(order.orderId)}` : null,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        expiresAt: order.expiresAt,
    };
}

async function findOrder(orderId) {
    const { data: sbOrder } = await supabaseAdmin
        .from('orders')
        .select('*')
        .or(`order_id.eq.${orderId},id.eq.${orderId}`)
        .maybeSingle();

    if (sbOrder) return ordersToCamel(sbOrder);

    const db = await readDb('orders');
    return (db.items || []).find(item => item.orderId === orderId || item.id === orderId) || null;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');
        if (!orderId) {
            return Response.json({ success: false, message: 'orderId wajib diisi' }, { status: 400 });
        }

        const order = await findOrder(orderId);
        if (!order) {
            return Response.json({ success: false, message: 'Receipt tidak ditemukan' }, { status: 404 });
        }

        if (order.status !== 'paid') {
            return Response.json({ success: false, message: 'Belum dibayar. Receipt akan tersedia setelah pembayaran dikonfirmasi.' }, { status: 402 });
        }

        return Response.json({
            success: true,
            data: {
                order: safeOrder(order),
            },
        });
    } catch (error) {
        console.error('[public receipt] error:', error);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
