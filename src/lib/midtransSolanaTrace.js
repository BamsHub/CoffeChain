import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase';
import { MEMO_SIGNER_PUBLIC, getExplorerTxUrl } from '@/lib/contractConfig';
import { sendServerMemoTx } from '@/lib/serverSolanaMemo';
import { buildMidtransPaymentProof } from '@/lib/midtrans';

function generateCoffeeId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'CF-';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

function buildPaymentMemo(order, product, midtransData = {}) {
    const proof = buildMidtransPaymentProof(order.order_id, midtransData);
    return JSON.stringify({
        v: 1,
        type: 'midtrans-payment',
        order: order.order_id,
        pid: order.product_id || '',
        coffee: product?.coffee_id || '',
        product: (order.product_name || product?.name || '').slice(0, 36),
        amount: Number(order.total_price || midtransData.gross_amount || 0),
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

async function attachCoffeeTraceIfNeeded({ order, product, txSignature, explorerUrl }) {
    if (!product) return null;
    if (product.coffee_id) return product.coffee_id;

    let coffeeId = generateCoffeeId();
    for (let attempt = 0; attempt < 3; attempt++) {
        const { error: traceErr } = await supabaseAdmin.from('coffee_traces').insert({
            id: uuidv4(),
            coffee_id: coffeeId,
            name: product.name || order.product_name,
            origin: product.origin || null,
            variety: product.variety || null,
            grade: product.grade || null,
            weight_kg: order.weight || (Array.isArray(product.weight) ? product.weight[0] : null),
            farmer_name: product.submitted_by_name || null,
            farmer_id: product.submitted_by || null,
            harvest_date: null,
            process_method: 'Midtrans paid product certificate',
            roast_level: product.roast || null,
            certification: 'CoffeeChain Midtrans Paid On-Chain',
            description: product.description || null,
            tx_signature: txSignature,
            explorer_url: explorerUrl,
            status: 'verified',
            registered_by: order.user_id || 'midtrans',
            product_id: product.id,
            payment_wallet: product.payment_wallet || MEMO_SIGNER_PUBLIC,
            created_at: new Date().toISOString(),
        });

        if (!traceErr) break;
        if (!/duplicate|unique/i.test(traceErr.message || '') || attempt === 2) {
            console.warn('[midtrans-solana] coffee_traces insert failed:', traceErr.message);
            return null;
        }
        coffeeId = generateCoffeeId();
    }

    const { error: productErr } = await supabaseAdmin
        .from('products')
        .update({
            coffee_id: coffeeId,
            status: 'published',
            payment_wallet: product.payment_wallet || MEMO_SIGNER_PUBLIC,
        })
        .eq('id', product.id);

    if (productErr) {
        console.warn('[midtrans-solana] product coffee_id update failed:', productErr.message);
    }

    return coffeeId;
}

export async function ensureMidtransSolanaTrace(orderId, midtransData = {}) {
    const { data: order, error: orderErr } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

    if (orderErr) throw new Error(orderErr.message);
    if (!order) return null;

    const { data: product } = order.product_id
        ? await supabaseAdmin.from('products').select('*').eq('id', order.product_id).maybeSingle()
        : { data: null };

    let txSignature = order.tx_signature || null;
    let explorerUrl = txSignature ? getExplorerTxUrl(txSignature) : null;
    let solanaTraceError = null;

    if (!txSignature) {
        try {
            const memoData = buildPaymentMemo(order, product, midtransData);
            const traceResult = await sendServerMemoTx(memoData);
            txSignature = traceResult.txSignature;
            explorerUrl = traceResult.explorerUrl;
        } catch (error) {
            solanaTraceError = error.message || 'Solana trace failed';
            console.error('[midtrans-solana] memo tx failed:', solanaTraceError);
        }
    }

    const coffeeId = txSignature
        ? await attachCoffeeTraceIfNeeded({ order, product, txSignature, explorerUrl })
        : product?.coffee_id || order.coffee_id || null;

    const updatePayload = {};
    if (txSignature) updatePayload.tx_signature = txSignature;
    if (coffeeId) updatePayload.coffee_id = coffeeId;

    if (Object.keys(updatePayload).length) {
        const { error: updateErr } = await supabaseAdmin
            .from('orders')
            .update(updatePayload)
            .eq('order_id', orderId);
        if (updateErr) console.warn('[midtrans-solana] order trace update failed:', updateErr.message);
    }

    return {
        txSignature,
        explorerUrl,
        coffeeId,
        solanaTraceError,
    };
}
