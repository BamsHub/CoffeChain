import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase';
import { getExplorerTxUrl } from '@/lib/contractConfig';
import { sendServerMemoTx } from '@/lib/serverSolanaMemo';
import { buildMidtransPaymentProof } from '@/lib/midtrans';
import { getStoredOrderPricing } from '@/lib/paymentPricing';

const TRACE_WAIT_TIMEOUT_MS = 15_000;
const TRACE_LOCK_STALE_MS = 90_000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function buildPaymentMemo(order, product, midtransData = {}) {
    const proof = buildMidtransPaymentProof(order.order_id, midtransData);
    const pricing = getStoredOrderPricing(order);

    return JSON.stringify({
        v: 2,
        type: 'midtrans-payment-proof',
        order: order.order_id,
        pid: order.product_id || '',
        coffee: product?.coffee_id || '',
        product: (order.product_name || product?.name || '').slice(0, 36),
        subtotal: pricing.subtotalPrice,
        traceFee: pricing.solanaTraceFee,
        ppnRate: pricing.ppnRate,
        ppn: pricing.ppnAmount,
        gross: pricing.totalPrice,
        currency: 'IDR',
        status: midtransData.transaction_status || order.status || 'paid',
        method: midtransData.payment_type || 'midtrans',
        midtransTx: proof.transactionId,
        paymentHash: proof.paymentHash,
        sigHash: proof.signatureHash ? proof.signatureHash.slice(0, 24) : '',
        paidAt: midtransData.settlement_time || midtransData.transaction_time || '',
        ts: Math.floor(Date.now() / 1000),
    });
}

async function loadOrder(orderId) {
    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
}

async function loadProduct(productId) {
    if (!productId) return null;
    const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
}

function resultFromOrder(order, extra = {}) {
    const txSignature = order?.tx_signature || null;
    return {
        txSignature,
        explorerUrl: txSignature ? getExplorerTxUrl(txSignature) : null,
        coffeeId: order?.coffee_id || null,
        solanaNetworkFeeLamports: order?.solana_network_fee_lamports ?? null,
        solanaTraceStatus: order?.solana_trace_status || (txSignature ? 'confirmed' : 'pending'),
        solanaTraceError: order?.solana_trace_error || null,
        solanaTracePending: order?.solana_trace_status === 'processing',
        ...extra,
    };
}

async function claimTraceJob(order) {
    const currentStatus = order.solana_trace_status || null;
    const currentStartedAt = order.solana_trace_started_at
        ? new Date(order.solana_trace_started_at).getTime()
        : 0;
    const processingIsFresh = currentStatus === 'processing'
        && currentStartedAt > Date.now() - TRACE_LOCK_STALE_MS;

    if (processingIsFresh) return { claimed: false, order };

    const lockId = uuidv4();
    const startedAt = new Date().toISOString();
    let query = supabaseAdmin
        .from('orders')
        .update({
            solana_trace_status: 'processing',
            solana_trace_error: null,
            solana_trace_lock_id: lockId,
            solana_trace_started_at: startedAt,
        })
        .eq('order_id', order.order_id)
        .is('tx_signature', null);

    if (currentStatus === null) {
        query = query.is('solana_trace_status', null);
    } else {
        query = query.eq('solana_trace_status', currentStatus);
    }

    if (currentStatus === 'processing') {
        query = order.solana_trace_lock_id
            ? query.eq('solana_trace_lock_id', order.solana_trace_lock_id)
            : query.is('solana_trace_lock_id', null);
    }

    const { data, error } = await query.select('*').maybeSingle();
    if (error) throw new Error(`Gagal mengunci trace Solana: ${error.message}`);

    return {
        claimed: Boolean(data),
        order: data || order,
        lockId: data ? lockId : null,
    };
}

async function waitForExistingTrace(orderId) {
    const deadline = Date.now() + TRACE_WAIT_TIMEOUT_MS;
    let latest = null;

    while (Date.now() < deadline) {
        latest = await loadOrder(orderId);
        if (!latest) break;
        if (latest.tx_signature) return resultFromOrder(latest);
        if (latest.solana_trace_status === 'failed') return resultFromOrder(latest);
        await sleep(750);
    }

    return resultFromOrder(latest, {
        solanaTracePending: latest?.solana_trace_status === 'processing',
    });
}

async function persistConfirmedTrace(orderId, lockId, traceResult) {
    let lastError = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .update({
                tx_signature: traceResult.txSignature,
                solana_network_fee_lamports: traceResult.networkFeeLamports,
                solana_trace_status: 'confirmed',
                solana_trace_error: null,
                solana_trace_lock_id: null,
                solana_traced_at: new Date().toISOString(),
            })
            .eq('order_id', orderId)
            .eq('solana_trace_lock_id', lockId)
            .select('*')
            .maybeSingle();

        if (!error && data?.tx_signature === traceResult.txSignature) return data;
        lastError = error || new Error('Lock trace Solana berubah sebelum signature disimpan');

        const current = await loadOrder(orderId).catch(() => null);
        if (current?.tx_signature) return current;
        await sleep(500 * (attempt + 1));
    }

    throw new Error(
        `Transaksi Solana terkonfirmasi (${traceResult.txSignature}) tetapi gagal disimpan: `
        + `${lastError?.message || 'unknown database error'}`,
    );
}

async function markTraceFailed(orderId, lockId, error) {
    if (!lockId) return;
    await supabaseAdmin
        .from('orders')
        .update({
            solana_trace_status: 'failed',
            solana_trace_error: String(error?.message || error || 'Solana trace failed').slice(0, 500),
            solana_trace_lock_id: null,
        })
        .eq('order_id', orderId)
        .eq('solana_trace_lock_id', lockId);
}

export async function ensureMidtransSolanaTrace(orderId, midtransData = {}) {
    const order = await loadOrder(orderId);
    if (!order) {
        throw new Error(`Order ${orderId} tidak ada di Supabase; payment trace tidak boleh memakai fallback lokal`);
    }
    if (order.tx_signature) return resultFromOrder(order);
    if (order.status !== 'paid') {
        throw new Error(`Order ${orderId} belum berstatus paid`);
    }

    let lockId = null;
    try {
        const claim = await claimTraceJob(order);
        if (!claim.claimed) return waitForExistingTrace(orderId);

        lockId = claim.lockId;
        const lockedOrder = claim.order;
        const product = await loadProduct(lockedOrder.product_id);
        const memoData = buildPaymentMemo(lockedOrder, product, midtransData);
        const traceResult = await sendServerMemoTx(memoData);
        const persistedOrder = await persistConfirmedTrace(orderId, lockId, traceResult);

        return {
            txSignature: traceResult.txSignature,
            explorerUrl: traceResult.explorerUrl,
            coffeeId: persistedOrder.coffee_id || product?.coffee_id || null,
            solanaNetworkFeeLamports: traceResult.networkFeeLamports,
            solanaNetworkFeeSol: traceResult.networkFeeSol,
            solanaTraceStatus: 'confirmed',
            solanaTraceError: null,
            solanaTracePending: false,
        };
    } catch (error) {
        await markTraceFailed(orderId, lockId, error).catch(() => null);
        console.error('[midtrans-solana] memo tx failed:', error.message || error);
        return {
            txSignature: null,
            explorerUrl: null,
            coffeeId: order.coffee_id || null,
            solanaNetworkFeeLamports: null,
            solanaTraceStatus: 'failed',
            solanaTraceError: error.message || 'Solana trace failed',
            solanaTracePending: false,
        };
    }
}
