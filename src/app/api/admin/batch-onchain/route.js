export const runtime = 'nodejs';
export const maxDuration = 60;

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import {
    getConfirmedSolanaSignatures,
    getServerMemoStatus,
    sendServerMemoTx,
} from '@/lib/serverSolanaMemo';

const ALLOWED_ROLES = new Set(['koperasi', 'developer', 'admin']);

function generateCoffeeId() {
    return `CF-${crypto.randomBytes(5).toString('hex').slice(0, 6).toUpperCase()}`;
}

function dataHash(value) {
    return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function referenceFor(source, row) {
    if (source === 'coffee_traces') return row.coffee_id || row.product_id || row.id;
    if (source === 'products') return row.coffee_id || row.id;
    if (source === 'orders') return row.order_id || row.id;
    return row.product_id || row.id;
}

function signatureFor(source, row) {
    if (source === 'transactions') return row.hash;
    return row.tx_signature;
}

async function requireAdmin(request) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const session = await verifyToken(token);
    return session && ALLOWED_ROLES.has(session.role) ? session : null;
}

async function loadAuditState() {
    const [traceResult, productResult, transactionResult, orderResult] = await Promise.all([
        supabaseAdmin.from('coffee_traces').select('*').order('created_at', { ascending: true }),
        supabaseAdmin.from('products').select('*').order('created_at', { ascending: true }),
        supabaseAdmin.from('transactions').select('*').order('created_at', { ascending: true }),
        supabaseAdmin.from('orders').select('*').eq('status', 'paid').order('created_at', { ascending: true }),
    ]);

    for (const result of [traceResult, productResult, transactionResult, orderResult]) {
        if (result.error) throw new Error(result.error.message);
    }

    const traces = traceResult.data || [];
    const products = productResult.data || [];
    const transactions = transactionResult.data || [];
    const orders = orderResult.data || [];
    const allSignatures = [
        ...traces.map(row => row.tx_signature),
        ...transactions.map(row => row.hash),
        ...orders.map(row => row.tx_signature),
    ];
    const confirmedSignatures = await getConfirmedSolanaSignatures(allSignatures);

    const candidates = [
        ...traces
            .filter(row => !row.tx_signature)
            .map(row => ({ source: 'coffee_traces', row })),
        ...transactions
            .filter(row => !row.hash)
            .map(row => ({ source: 'transactions', row })),
    ];

    const immutableUnconfirmed = {
        coffee_traces: traces.filter(row => row.tx_signature && !confirmedSignatures.has(row.tx_signature)).length,
        transactions: transactions.filter(row => row.hash && !confirmedSignatures.has(row.hash)).length,
        orders: orders.filter(row => row.tx_signature && !confirmedSignatures.has(row.tx_signature)).length,
    };

    const counts = candidates.reduce((summary, candidate) => {
        summary[candidate.source] = (summary[candidate.source] || 0) + 1;
        return summary;
    }, {});

    return {
        candidates,
        counts,
        immutableUnconfirmed,
        totals: {
            coffee_traces: traces.length,
            products: products.length,
            transactions: transactions.length,
            paid_orders: orders.length,
        },
    };
}

async function persistBackfill(candidate, chainTx) {
    const { source, row } = candidate;
    if (source === 'coffee_traces') {
        const { data, error } = await supabaseAdmin.from('coffee_traces').update({
            tx_signature: chainTx.txSignature,
            explorer_url: chainTx.explorerUrl,
            status: 'verified',
        }).eq('id', row.id).is('tx_signature', null).select('id').maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Signature sertifikat sudah terisi dan tidak boleh diganti');
        return { coffeeId: row.coffee_id };
    }

    if (source === 'products') {
        const coffeeId = row.coffee_id || generateCoffeeId();
        const now = new Date().toISOString();
        const { error: traceError } = await supabaseAdmin.from('coffee_traces').insert({
            id: crypto.randomUUID(),
            coffee_id: coffeeId,
            name: row.name,
            origin: row.origin || null,
            variety: row.variety || null,
            grade: row.grade || null,
            weight_kg: Array.isArray(row.weight) ? row.weight[0] : row.weight || null,
            farmer_name: row.submitted_by_name || null,
            farmer_id: row.submitted_by || null,
            roast_level: row.roast || null,
            certification: Array.isArray(row.tags) ? row.tags.join(', ') : null,
            description: row.description || null,
            tx_signature: chainTx.txSignature,
            explorer_url: chainTx.explorerUrl,
            status: 'verified',
            registered_by: 'server-backfill',
            product_id: row.id,
            payment_wallet: chainTx.signer,
            created_at: now,
        });
        if (traceError) throw traceError;

        const { error: productError } = await supabaseAdmin.from('products').update({
            coffee_id: coffeeId,
            status: 'published',
            payment_wallet: row.payment_wallet || chainTx.signer,
        }).eq('id', row.id);
        if (productError) throw productError;
        return { coffeeId };
    }

    if (source === 'transactions') {
        const { data, error } = await supabaseAdmin.from('transactions').update({
            hash: chainTx.txSignature,
            block: String(chainTx.slot),
            wallet_from: chainTx.signer,
        }).eq('id', row.id).is('hash', null).select('id').maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Hash transaksi sudah terisi dan tidak boleh diganti');
        return {};
    }

    const { data, error } = await supabaseAdmin.from('orders').update({
        tx_signature: chainTx.txSignature,
    }).eq('id', row.id).is('tx_signature', null).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Signature order sudah terisi dan tidak boleh diganti');
    return { coffeeId: row.coffee_id || null };
}

async function backfillCandidate(candidate) {
    const { source, row } = candidate;
    if (source === 'products' || source === 'orders') {
        throw new Error(source === 'products'
            ? 'Produk wajib disertifikasi melalui Register Coffee dengan audit Pipeline Tahap 1-6'
            : 'Pembayaran Midtrans wajib ditrace melalui Reconcile Payment');
    }
    const reference = String(referenceFor(source, row));
    const memo = {
        v: 2,
        type: 'coffeechain-audit',
        source,
        id: String(row.id),
        ref: reference,
        status: row.status || 'recorded',
        dataHash: dataHash(row),
        migratedAt: new Date().toISOString(),
    };
    const chainTx = await sendServerMemoTx(memo);
    const persisted = await persistBackfill(candidate, chainTx);
    return {
        id: row.id,
        name: row.name || row.product_name || row.order_id || reference,
        source,
        status: 'success',
        txSignature: chainTx.txSignature,
        explorerUrl: chainTx.explorerUrl,
        slot: chainTx.slot,
        ...persisted,
    };
}

export async function GET(request) {
    try {
        const session = await requireAdmin(request);
        if (!session) return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });

        const [audit, wallet] = await Promise.all([loadAuditState(), getServerMemoStatus()]);
        return Response.json({
            success: true,
            remaining: audit.candidates.length,
            counts: audit.counts,
            immutableUnconfirmed: audit.immutableUnconfirmed,
            totals: audit.totals,
            wallet,
            cluster: 'testnet',
        });
    } catch (error) {
        console.error('[batch-onchain GET]', error);
        return Response.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await requireAdmin(request);
        if (!session) return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });

        const body = await request.json().catch(() => ({}));
        const limit = Math.min(Math.max(Number(body.limit) || 3, 1), 5);
        const wallet = await getServerMemoStatus();
        if (!wallet.ready) {
            return Response.json({
                success: false,
                message: `Saldo wallet server ${wallet.signer} tidak cukup (${wallet.balanceSol} SOL Testnet)`,
                wallet,
            }, { status: 409 });
        }

        const audit = await loadAuditState();
        const selected = audit.candidates.slice(0, limit);
        const results = [];
        for (const candidate of selected) {
            try {
                results.push(await backfillCandidate(candidate));
            } catch (error) {
                results.push({
                    id: candidate.row.id,
                    name: candidate.row.name || candidate.row.product_name || candidate.row.order_id || candidate.row.id,
                    source: candidate.source,
                    status: 'failed',
                    error: error.message,
                });
            }
        }

        const succeeded = results.filter(result => result.status === 'success').length;
        const failed = results.length - succeeded;
        const remaining = Math.max(audit.candidates.length - succeeded, 0);
        return Response.json({
            success: failed === 0,
            message: `${succeeded} data berhasil ditulis ke Solana Testnet, ${failed} gagal. Sisa ${remaining} data.`,
            processed: results.length,
            succeeded,
            failed,
            remaining,
            counts: audit.counts,
            results,
            wallet,
        }, { status: failed === 0 ? 200 : 207 });
    } catch (error) {
        console.error('[batch-onchain POST]', error);
        return Response.json({ success: false, message: error.message }, { status: 500 });
    }
}
