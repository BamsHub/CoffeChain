export const runtime = 'nodejs';

import { readDb, updateItem } from '@/lib/db';
import { sbUpdate } from '@/lib/sdb';
import crypto from 'crypto';

/**
 * POST /api/midtrans/notification
 * Webhook handler dari Midtrans untuk update status pembayaran
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const {
            order_id,
            status_code,
            gross_amount,
            signature_key,
            transaction_status,
            fraud_status,
        } = body;

        // Verifikasi signature dari Midtrans
        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        const expectedSignature = crypto
            .createHash('sha512')
            .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
            .digest('hex');

        if (signature_key !== expectedSignature) {
            console.warn('[midtrans-notification] Invalid signature for order:', order_id);
            return Response.json({ success: false, message: 'Invalid signature' }, { status: 403 });
        }

        // Tentukan status order
        let newStatus = 'pending';
        let paidAt = null;

        if (
            transaction_status === 'settlement' ||
            (transaction_status === 'capture' && fraud_status === 'accept')
        ) {
            newStatus = 'paid';
            paidAt = new Date().toISOString();
        } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
            newStatus = 'expired';
        }

        // Update order di DB
        const db = await readDb('orders');
        const order = db.items.find(o => o.orderId === order_id);

        if (order) {
            const updateData = { status: newStatus };
            if (paidAt) updateData.paidAt = paidAt;

            // Coba update di Supabase dulu
            const sbResult = await sbUpdate('orders', order.id, {
                status: newStatus,
                ...(paidAt ? { paid_at: paidAt } : {}),
            }).catch(() => null);

            // Fallback ke JSON
            if (!sbResult) {
                await updateItem('orders', order.id, updateData);
            }

            console.log(`[midtrans-notification] Order ${order_id} updated to: ${newStatus}`);
        } else {
            console.warn('[midtrans-notification] Order not found:', order_id);
        }

        return Response.json({ success: true });

    } catch (err) {
        console.error('[midtrans-notification] Error:', err);
        return Response.json({ success: false, message: err.message }, { status: 500 });
    }
}
