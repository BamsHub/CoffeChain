import { readDb } from '@/lib/db';
import { sbSelect, ordersToCamel } from '@/lib/sdb';

function isCoffeeOrder(row) {
    return row && (row.order_id != null || row.product_name != null);
}

function mergeByKey(items, keyFn) {
    const map = new Map();
    for (const item of items) {
        const key = keyFn(item);
        if (key) map.set(key, item);
    }
    return Array.from(map.values());
}

/** Ambil orders dari Supabase + JSON, digabung dan deduplikasi by id/orderId */
export async function getOrders(userId) {
    const db = await readDb('orders');
    const jsonOrders = userId
        ? db.items.filter(o => o.userId === userId)
        : db.items;

    const sbData = await sbSelect('orders', userId ? { user_id: userId } : {});
    if (sbData === null) return jsonOrders;

    const sbOrders = sbData.filter(isCoffeeOrder).map(ordersToCamel).filter(Boolean);
    if (sbOrders.length === 0) return jsonOrders;

    const merged = mergeByKey(
        [...jsonOrders, ...sbOrders],
        o => o.id || o.orderId,
    );

    return merged.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
}
