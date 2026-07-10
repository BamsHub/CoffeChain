export const runtime = 'nodejs';
export const maxDuration = 300;

import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import {
    getMidtransApiBaseUrl,
    getMidtransAuthHeader,
    getPaidAtForStatus,
    normalizeMidtransStatus,
} from '@/lib/midtrans';
import { ensureMidtransSolanaTrace } from '@/lib/midtransSolanaTrace';

const RECONCILE_LIMIT = 25;

async function requireAdmin(request) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const session = await verifyToken(token);
    if (!session || !['koperasi', 'developer'].includes(session.role)) return null;
    return session;
}

function needsReconcile(order) {
    if (order.payment_method !== 'midtrans') return false;
    if (order.status === 'pending') return true;
    return order.status === 'paid' && (!order.tx_signature || !order.coffee_id);
}

async function fetchMidtransStatus(orderId) {
    const res = await fetch(`${getMidtransApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: getMidtransAuthHeader(),
        },
        cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.status_message || data.error_messages?.join(', ') || 'Status Midtrans belum tersedia');
    }
    return data;
}

async function deductPaidOrderStock(order) {
    if (!order?.product_id) return null;
    const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('id, stock')
        .eq('id', order.product_id)
        .maybeSingle();

    if (error || !product) return null;
    const quantity = Number(order.quantity || 1);
    const stockLeft = Math.max(0, Number(product.stock || 0) - quantity);
    const { error: updateErr } = await supabaseAdmin
        .from('products')
        .update({ stock: stockLeft })
        .eq('id', product.id);

    return updateErr ? null : stockLeft;
}

async function getCandidates() {
    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_id, status, payment_method, tx_signature, coffee_id, paid_at, product_id, quantity, created_at')
        .eq('payment_method', 'midtrans')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw error;
    return (data || []).filter(needsReconcile).slice(0, RECONCILE_LIMIT);
}

export async function GET(request) {
    try {
        const session = await requireAdmin(request);
        if (!session) return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });

        const candidates = await getCandidates();
        return Response.json({
            success: true,
            count: candidates.length,
            candidates: candidates.map(order => ({
                orderId: order.order_id,
                status: order.status,
                hasSolanaTx: Boolean(order.tx_signature),
                hasCoffeeId: Boolean(order.coffee_id),
                createdAt: order.created_at,
            })),
        });
    } catch (error) {
        console.error('[reconcile-payments GET]', error);
        return Response.json({ success: false, message: error.message || 'Gagal membaca kandidat reconcile' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await requireAdmin(request);
        if (!session) return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });

        const candidates = await getCandidates();
        const results = [];

        for (const order of candidates) {
            try {
                const midtransData = await fetchMidtransStatus(order.order_id);
                const normalizedStatus = normalizeMidtransStatus(midtransData.transaction_status, midtransData.fraud_status);
                const paidAt = getPaidAtForStatus(normalizedStatus, midtransData);

                const updatePayload = { status: normalizedStatus };
                if (paidAt) updatePayload.paid_at = paidAt;

                await supabaseAdmin
                    .from('orders')
                    .update(updatePayload)
                    .eq('order_id', order.order_id);

                let stockLeft = null;
                let trace = null;
                if (normalizedStatus === 'paid') {
                    if (order.status !== 'paid') {
                        stockLeft = await deductPaidOrderStock(order);
                    }
                    trace = await ensureMidtransSolanaTrace(order.order_id, midtransData);
                }

                results.push({
                    orderId: order.order_id,
                    status: normalizedStatus,
                    txSignature: trace?.txSignature || order.tx_signature || null,
                    coffeeId: trace?.coffeeId || order.coffee_id || null,
                    stockLeft,
                    solanaTraceError: trace?.solanaTraceError || null,
                });
            } catch (error) {
                results.push({
                    orderId: order.order_id,
                    status: 'failed',
                    error: error.message || 'Reconcile gagal',
                });
            }
        }

        const succeeded = results.filter(row => row.status === 'paid' && row.txSignature).length;
        const failed = results.filter(row => row.status === 'failed' || row.solanaTraceError).length;
        const pending = results.filter(row => row.status === 'pending').length;

        return Response.json({
            success: true,
            message: `Reconcile selesai: ${succeeded} paid+on-chain, ${pending} masih pending, ${failed} gagal.`,
            total: candidates.length,
            succeeded,
            pending,
            failed,
            results,
        });
    } catch (error) {
        console.error('[reconcile-payments POST]', error);
        return Response.json({ success: false, message: error.message || 'Reconcile gagal' }, { status: 500 });
    }
}
