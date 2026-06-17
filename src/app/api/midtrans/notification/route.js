export const runtime = 'nodejs';
export const maxDuration = 60;

import { supabaseAdmin } from '@/lib/supabase';
import { normalizeMidtransStatus, getPaidAtForStatus } from '@/lib/midtrans';
import { ensureMidtransSolanaTrace } from '@/lib/midtransSolanaTrace';
import crypto from 'crypto';

async function deductPaidOrderStock(order) {
    if (!order?.product_id) return null;
    const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('id, stock')
        .eq('id', order.product_id)
        .maybeSingle();

    if (error || !product) {
        console.warn('[midtrans-notification] Product not found for stock deduction:', order.product_id);
        return null;
    }

    const quantity = Number(order.quantity || 1);
    const stockLeft = Math.max(0, Number(product.stock || 0) - quantity);
    const { error: updateErr } = await supabaseAdmin
        .from('products')
        .update({ stock: stockLeft })
        .eq('id', product.id);

    if (updateErr) {
        console.warn('[midtrans-notification] Stock deduction failed:', updateErr.message);
        return null;
    }
    return stockLeft;
}

/**
 * POST /api/midtrans/notification
 * Webhook handler dari Midtrans untuk update status pembayaran
 */
export async function POST(request) {
    try {
        const body = await request.json();

        // Midtrans sends non-payment pings (scheduled tasks, test events) without order_id.
        // Always return 200 for these so Midtrans stops retrying.
        const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;
        if (!order_id) {
            console.log('[midtrans-notification] Non-payment ping received, returning 200');
            return Response.json({ success: true, message: 'ping acknowledged' });
        }

        // Verifikasi signature dari Midtrans
        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        if (!serverKey) {
            console.error('[midtrans-notification] MIDTRANS_SERVER_KEY is not configured');
            return Response.json({ success: false, message: 'Payment webhook is not configured' }, { status: 500 });
        }
        const expectedSignature = crypto
            .createHash('sha512')
            .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
            .digest('hex');

        const provided = Buffer.from(String(signature_key || ''), 'hex');
        const expected = Buffer.from(expectedSignature, 'hex');
        if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
            console.warn('[midtrans-notification] Invalid signature for order:', order_id);
            // Return 200 anyway to stop Midtrans retry loops; log for debugging
            return Response.json({ success: false, message: 'Invalid signature' });
        }

        // Tentukan status order
        const newStatus = normalizeMidtransStatus(transaction_status, fraud_status);
        const paidAt = getPaidAtForStatus(newStatus, body);

        // Update order di Supabase (primary DB on Vercel)
        const { data: orders } = await supabaseAdmin
            .from('orders')
            .select('id, status, product_id, quantity')
            .eq('order_id', order_id)
            .limit(1);

        if (orders && orders.length > 0) {
            const updatePayload = { status: newStatus };
            if (paidAt) updatePayload.paid_at = paidAt;

            await supabaseAdmin
                .from('orders')
                .update(updatePayload)
                .eq('order_id', order_id);

            if (newStatus === 'paid' && orders[0].status !== 'paid') {
                await deductPaidOrderStock(orders[0]);
                await ensureMidtransSolanaTrace(order_id, body);
            }

            console.log(`[midtrans-notification] Order ${order_id} updated to: ${newStatus}`);
        } else {
            console.warn('[midtrans-notification] Order not found in Supabase:', order_id);
        }

        return Response.json({ success: true });

    } catch (err) {
        console.error('[midtrans-notification] Error:', err);
        return Response.json({ success: false, message: err.message }, { status: 500 });
    }
}
