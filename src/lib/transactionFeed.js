import { readDb } from '@/lib/db';
import { sbSelect } from '@/lib/sdb';
import { getOrders } from '@/lib/orders';

export function transactionsToCamel(row) {
    if (!row) return null;
    const type = row.type || 'transfer';
    const isAuditTx = ['product_approval', 'blockchain_verify', 'coffee_trace'].includes(type);
    return {
        id: row.id,
        hash: row.hash,
        txSignature: row.tx_signature || (typeof row.hash === 'string' && row.hash.length >= 80 ? row.hash : null),
        farmer: row.farmer,
        location: row.location || row.product_name || row.note,
        weight: isAuditTx ? null : row.weight,
        variety: row.variety || row.product_name || type,
        grade: row.grade,
        amount: isAuditTx && Number(row.amount || 0) <= 0 ? null : row.amount,
        status: row.status,
        timestamp: row.timestamp || row.created_at,
        block: row.block || 'â€”',
        walletFrom: row.wallet_from,
        walletTo: row.wallet_to,
        note: row.note,
        type,
        farmerId: row.farmer_id || null,
        createdBy: row.created_by || row.farmer_id || null,
        approvedBy: row.approved_by || null,
        productId: row.product_id,
        productName: row.product_name,
        source: 'transaction',
        weightUnit: 'kg',
    };
}

export function transactionsToSnake(t) {
    return {
        id: t.id,
        hash: t.hash,
        farmer: t.farmer,
        location: t.location,
        weight: t.weight,
        variety: t.variety,
        grade: t.grade,
        amount: t.amount,
        status: t.status,
        timestamp: t.timestamp,
        block: t.block,
        wallet_from: t.walletFrom,
        wallet_to: t.walletTo,
        note: t.note,
        type: t.type,
        farmer_id: t.farmerId || t.createdBy || null,
        product_id: t.productId,
        product_name: t.productName,
    };
}

function isCoffeeTransaction(row) {
    return row && (row.farmer != null || row.hash != null);
}

export async function getBlockchainTransactions() {
    const db = await readDb('transactions');
    const jsonTx = db.items;

    const sbData = await sbSelect('transactions');
    if (sbData === null) return jsonTx;

    const sbTx = sbData.filter(isCoffeeTransaction).map(transactionsToCamel).filter(Boolean);
    if (sbTx.length === 0) return jsonTx;

    const map = new Map();
    for (const t of jsonTx) map.set(t.id, t);
    for (const t of sbTx) map.set(t.id, { ...map.get(t.id), ...t, source: 'transaction', weightUnit: 'kg' });

    return Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
    );
}

export function orderToFeedItem(order) {
    return {
        id: order.id,
        orderId: order.orderId,
        hash: order.txSignature || order.orderId,
        txSignature: order.txSignature,
        farmer: order.userName || 'Pelanggan',
        location: order.productName || '—',
        weight: order.weight || 0,
        weightUnit: 'g',
        variety: order.productName || '—',
        amount: order.totalPrice || 0,
        status: order.status === 'paid' ? 'Confirmed' : order.status,
        timestamp: order.paidAt || order.createdAt,
        block: '—',
        source: 'order',
        paymentMethod: order.paymentMethod,
        ownerId: order.userId,
    };
}

export function traceToFeedItem(trace) {
    return {
        id: `trace-${trace.id}`,
        hash: trace.txSignature || trace.id,
        txSignature: trace.txSignature || null,
        farmer: trace.farmerName || 'CoffeeChain',
        location: trace.origin || trace.name || '—',
        weight: trace.weightKg || 0,
        weightUnit: 'kg',
        variety: trace.name || trace.variety || 'Sertifikat Kopi',
        grade: trace.grade,
        amount: null,
        status: trace.txSignature ? 'Confirmed' : (trace.status || 'Pending'),
        timestamp: trace.createdAt,
        block: '—',
        source: 'trace',
        type: 'inventory_certificate',
        productId: trace.productId,
        productName: trace.name,
        coffeeId: trace.coffeeId,
        explorerUrl: trace.explorerUrl,
        ownerId: trace.farmerId || trace.registeredBy || null,
    };
}

/** Gabungkan transaksi blockchain + seluruh status pembelian, urut terbaru dulu */
export function buildUnifiedFeed(transactions, orders) {
    const orderItems = (orders || []).map(orderToFeedItem);
    const txItems = (transactions || []).map(t => ({
        ...t,
        source: t.source || 'transaction',
        weightUnit: t.weightUnit || 'kg',
        txSignature: t.txSignature || null,
    }));

    const txIds = new Set(txItems.map(t => t.id));
    const merged = [
        ...orderItems.filter(o => !txIds.has(o.id)),
        ...txItems,
    ];

    return merged.sort(
        (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
    );
}

export async function getTransactionFeed({ includeOrders = false, includeTraces = false, userId = null } = {}) {
    const allTransactions = await getBlockchainTransactions();
    let ownedProductIds = new Set();
    if (userId) {
        const productsDb = await readDb('products');
        ownedProductIds = new Set((productsDb.items || [])
            .filter(product => product.submittedBy === userId)
            .map(product => product.id)
            .filter(Boolean));
    }

    const transactions = userId
        ? allTransactions.filter(item => (
            item.farmerId === userId
            || item.createdBy === userId
            || ownedProductIds.has(item.productId)
        ))
        : allTransactions;
    if (!includeOrders && !includeTraces) return transactions;

    const orders = includeOrders ? await getOrders(userId) : [];
    const feed = buildUnifiedFeed(transactions, orders);
    if (!includeTraces) return feed;

    const tracesDb = await readDb('coffee_traces');
    const visibleTraces = userId
        ? (tracesDb.items || []).filter(trace => (
            trace.farmerId === userId
            || trace.registeredBy === userId
            || ownedProductIds.has(trace.productId)
        ))
        : (tracesDb.items || []);
    const traceItems = visibleTraces.map(traceToFeedItem);
    return [...feed, ...traceItems].sort(
        (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
    );
}
