export const runtime = 'nodejs';
export const maxDuration = 60;

import { supabaseAdmin } from '@/lib/supabase';
import {
    describeMidtransStatus,
    getMidtransApiBaseUrl,
    getMidtransAuthHeader,
    getPaidAtForStatus,
    normalizeMidtransStatus,
} from '@/lib/midtrans';
import { ensureMidtransSolanaTrace } from '@/lib/midtransSolanaTrace';

async function deductPaidOrderStock(order) {
    if (!order?.product_id) return null;
    const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('id, stock')
        .eq('id', order.product_id)
        .maybeSingle();

    if (error || !product) {
        console.warn('[midtrans-status] Product not found for stock deduction:', order.product_id);
        return null;
    }

    const quantity = Number(order.quantity || 1);
    const stockLeft = Math.max(0, Number(product.stock || 0) - quantity);
    const { error: updateErr } = await supabaseAdmin
        .from('products')
        .update({ stock: stockLeft })
        .eq('id', product.id);

    if (updateErr) {
        console.warn('[midtrans-status] Stock deduction failed:', updateErr.message);
        return null;
    }
    return stockLeft;
}

async function getOrderId(request) {
    if (request.method === 'GET') {
        return new URL(request.url).searchParams.get('orderId');
    }

    const body = await request.json().catch(() => ({}));
    return body.orderId || body.order_id;
}

async function handleStatus(request) {
    try {
        const orderId = await getOrderId(request);
        if (!orderId) {
            return Response.json({ success: false, message: 'orderId wajib diisi' }, { status: 400 });
        }

        const statusRes = await fetch(`${getMidtransApiBaseUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Authorization: getMidtransAuthHeader(),
            },
            cache: 'no-store',
        });

        const midtransData = await statusRes.json().catch(() => ({}));

        const { data: localOrder } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('order_id', orderId)
            .maybeSingle();

        if (!statusRes.ok) {
            const isSnapNotSelected = statusRes.status === 404 && localOrder?.payment_method === 'midtrans';
            const statusMessage = isSnapNotSelected
                ? 'Metode pembayaran di Snap belum dipilih. Pilih GoPay/QRIS/VA dulu di popup Midtrans, lalu cek status kembali.'
                : midtransData.status_message || midtransData.error_messages?.join(', ') || 'Status Midtrans belum tersedia';
            return Response.json({
                success: true,
                data: {
                    orderId,
                    status: localOrder?.status || 'pending',
                    midtransStatus: isSnapNotSelected ? 'snap_not_selected' : 'not_available',
                    midtransStatusMessage: statusMessage,
                    displayStatus: isSnapNotSelected ? 'Belum pilih metode pembayaran' : 'Status belum tersedia',
                    paymentInstruction: statusMessage,
                    paymentType: null,
                    paymentLabel: 'Belum dipilih',
                    checkedAt: new Date().toISOString(),
                    raw: midtransData,
                },
            });
        }

        const transactionStatus = midtransData.transaction_status;
        const fraudStatus = midtransData.fraud_status;
        const normalizedStatus = normalizeMidtransStatus(transactionStatus, fraudStatus);
        const paidAt = getPaidAtForStatus(normalizedStatus, midtransData);
        const statusDetails = describeMidtransStatus(midtransData, localOrder);

        const updatePayload = {
            status: normalizedStatus,
        };
        if (paidAt) updatePayload.paid_at = paidAt;

        await supabaseAdmin
            .from('orders')
            .update(updatePayload)
            .eq('order_id', orderId);

        let stockLeft = null;
        if (normalizedStatus === 'paid' && localOrder?.status !== 'paid') {
            stockLeft = await deductPaidOrderStock(localOrder);
        }

        const solanaTrace = normalizedStatus === 'paid'
            ? await ensureMidtransSolanaTrace(orderId, midtransData)
            : null;

        return Response.json({
            success: true,
            data: {
                orderId,
                status: normalizedStatus,
                txSignature: solanaTrace?.txSignature || localOrder?.tx_signature || null,
                explorerUrl: solanaTrace?.explorerUrl || null,
                coffeeId: solanaTrace?.coffeeId || localOrder?.coffee_id || null,
                stockLeft,
                solanaTraceError: solanaTrace?.solanaTraceError || null,
                midtransStatus: transactionStatus || 'unknown',
                fraudStatus: fraudStatus || null,
                displayStatus: statusDetails.displayStatus,
                paymentInstruction: statusDetails.paymentInstruction,
                paymentType: statusDetails.paymentType,
                paymentLabel: statusDetails.paymentLabel,
                isQrPayment: statusDetails.isQrPayment,
                qrCodeUrl: statusDetails.qrCodeUrl,
                deeplinkUrl: statusDetails.deeplinkUrl,
                statusUrl: statusDetails.statusUrl,
                actions: statusDetails.actions,
                acquirer: statusDetails.acquirer,
                issuer: statusDetails.issuer,
                transactionType: statusDetails.transactionType,
                expiryTime: statusDetails.expiryTime,
                checkedAt: statusDetails.checkedAt,
                transactionId: midtransData.transaction_id || null,
                transactionTime: midtransData.transaction_time || null,
                settlementTime: midtransData.settlement_time || null,
                grossAmount: midtransData.gross_amount || null,
                midtransStatusCode: midtransData.status_code || null,
                midtransStatusMessage: midtransData.status_message || null,
                raw: midtransData,
            },
        });
    } catch (err) {
        console.error('[midtrans-status] Error:', err);
        return Response.json({ success: false, message: err.message || 'Gagal mengecek status Midtrans' }, { status: 500 });
    }
}

export async function GET(request) {
    return handleStatus(request);
}

export async function POST(request) {
    return handleStatus(request);
}
