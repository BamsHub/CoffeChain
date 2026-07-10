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
    };
}

/** Gabungkan transaksi blockchain + pembelian lunas, urut terbaru dulu */
export function buildUnifiedFeed(transactions, orders) {
    const paidOrders = (orders || []).filter(o => o.status === 'paid');
    const orderItems = paidOrders.map(orderToFeedItem);
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

export async function getTransactionFeed({ includeOrders = false } = {}) {
    const transactions = await getBlockchainTransactions();
    if (!includeOrders) return transactions;

    const orders = await getOrders();
    return buildUnifiedFeed(transactions, orders);
}
