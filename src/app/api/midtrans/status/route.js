export const runtime = 'nodejs';
export const maxDuration = 60;

import { supabaseAdmin } from '@/lib/supabase';
import { getMidtransApiBaseUrl, getMidtransAuthHeader, normalizeMidtransStatus, getPaidAtForStatus } from '@/lib/midtrans';
import { ensureMidtransSolanaTrace } from '@/lib/midtransSolanaTrace';

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
            const statusMessage = midtransData.status_message || midtransData.error_messages?.join(', ') || 'Status Midtrans belum tersedia';
            return Response.json({
                success: true,
                data: {
                    orderId,
                    status: localOrder?.status || 'pending',
                    midtransStatus: 'not_available',
                    midtransStatusMessage: statusMessage,
                    raw: midtransData,
                },
            });
        }

        const transactionStatus = midtransData.transaction_status;
        const fraudStatus = midtransData.fraud_status;
        const normalizedStatus = normalizeMidtransStatus(transactionStatus, fraudStatus);
        const paidAt = getPaidAtForStatus(normalizedStatus);

        const updatePayload = {
            status: normalizedStatus,
        };
        if (paidAt) updatePayload.paid_at = paidAt;

        await supabaseAdmin
            .from('orders')
            .update(updatePayload)
            .eq('order_id', orderId);

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
                solanaTraceError: solanaTrace?.solanaTraceError || null,
                midtransStatus: transactionStatus || 'unknown',
                fraudStatus: fraudStatus || null,
                paymentType: midtransData.payment_type || null,
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
