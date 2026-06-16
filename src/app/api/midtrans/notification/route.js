export const runtime = 'nodejs';
export const maxDuration = 60;

import { supabaseAdmin } from '@/lib/supabase';
import { normalizeMidtransStatus, getPaidAtForStatus } from '@/lib/midtrans';
import { ensureMidtransSolanaTrace } from '@/lib/midtransSolanaTrace';
import crypto from 'crypto';

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
        const expectedSignature = crypto
            .createHash('sha512')
            .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
            .digest('hex');

        if (signature_key !== expectedSignature) {
            console.warn('[midtrans-notification] Invalid signature for order:', order_id);
            // Return 200 anyway to stop Midtrans retry loops; log for debugging
            return Response.json({ success: false, message: 'Invalid signature' });
        }

        // Tentukan status order
        const newStatus = normalizeMidtransStatus(transaction_status, fraud_status);
        const paidAt = getPaidAtForStatus(newStatus);

        // Update order di Supabase (primary DB on Vercel)
        const { data: orders } = await supabaseAdmin
            .from('orders')
            .select('id')
            .eq('order_id', order_id)
            .limit(1);

        if (orders && orders.length > 0) {
            const updatePayload = { status: newStatus };
            if (paidAt) updatePayload.paid_at = paidAt;

            await supabaseAdmin
                .from('orders')
                .update(updatePayload)
                .eq('order_id', order_id);

            if (newStatus === 'paid') {
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
