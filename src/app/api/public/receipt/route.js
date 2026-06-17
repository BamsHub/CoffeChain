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
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentCurrency: order.paymentCurrency,
        status: order.status,
        txSignature,
        coffeeId,
        explorerUrl: txSignature ? getExplorerTxUrl(txSignature) : null,
        receiptUrl: order.orderId ? `/receipt?orderId=${encodeURIComponent(order.orderId)}` : null,
        traceUrl: coffeeId ? `/trace?id=${encodeURIComponent(coffeeId)}` : null,
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

async function findTrace(order) {
    if (!order?.coffeeId && !order?.productId && !order?.txSignature) return null;

    let query = supabaseAdmin.from('coffee_traces').select('*').limit(1);
    if (order.coffeeId) query = query.eq('coffee_id', order.coffeeId);
    else if (order.productId) query = query.eq('product_id', order.productId);
    else query = query.eq('tx_signature', order.txSignature);

    const { data } = await query;
    const row = data?.[0];
    if (row) {
        return {
            coffeeId: row.coffee_id,
            productName: row.name,
            origin: row.origin,
            variety: row.variety,
            grade: row.grade,
            certification: row.certification,
            txSignature: row.tx_signature,
            explorerUrl: row.tx_signature ? getExplorerTxUrl(row.tx_signature) : row.explorer_url || null,
            traceUrl: row.coffee_id ? `/trace?id=${encodeURIComponent(row.coffee_id)}` : null,
        };
    }

    const db = await readDb('coffee_traces');
    const trace = (db.items || []).find(item =>
        item.coffeeId === order.coffeeId ||
        item.productId === order.productId ||
        item.txSignature === order.txSignature
    );

    if (!trace) return null;
    return {
        coffeeId: trace.coffeeId,
        productName: trace.name,
        origin: trace.origin,
        variety: trace.variety,
        grade: trace.grade,
        certification: trace.certification,
        txSignature: trace.txSignature,
        explorerUrl: trace.txSignature ? getExplorerTxUrl(trace.txSignature) : trace.explorerUrl || null,
        traceUrl: trace.coffeeId ? `/trace?id=${encodeURIComponent(trace.coffeeId)}` : null,
    };
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

        const trace = await findTrace(order);
        return Response.json({
            success: true,
            data: {
                order: safeOrder(order),
                trace,
            },
        });
    } catch (error) {
        console.error('[public receipt] error:', error);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
