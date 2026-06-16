import { readDb, addItem } from '@/lib/db';
import { sbSelect, sbInsert, sbUpdate, ordersToSnake } from '@/lib/sdb';
import { getOrders } from '@/lib/orders';
import { v4 as uuidv4 } from 'uuid';

export { getOrders };

// GET — riwayat order
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const orders = await getOrders(userId);
        return Response.json({ success: true, data: orders });
    } catch (e) {
        console.error('/api/orders GET:', e);
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}

// POST — buat order baru
export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, userName, productId, productName, weight, quantity, totalPrice, paymentMethod } = body;

        if (!productId || !totalPrice || !paymentMethod) {
            return Response.json({ success: false, message: 'Data order tidak lengkap' }, { status: 400 });
        }

        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        const virtualAccount = `88800${Math.floor(Math.random() * 9000000000 + 1000000000)}`;

        const order = {
            id: uuidv4(),
            orderId,
            userId: userId || 'guest',
            userName: userName || 'Guest',
            productId,
            productName,
            weight,
            quantity: quantity || 1,
            totalPrice,
            paymentMethod,
            virtualAccount: paymentMethod === 'transfer' ? virtualAccount : null,
            txSignature: null,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            paidAt: null,
        };

        const sbResult = await sbInsert('orders', ordersToSnake(order));
        if (!sbResult) {
            await addItem('orders', order);
        }
        return Response.json({ success: true, data: order }, { status: 201 });
    } catch (err) {
        console.error('/api/orders POST:', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

// PATCH — update status order (paid/expired)
export async function PATCH(request) {
    try {
        const { orderId, status, txSignature } = await request.json();
        const updates = { status };
        if (status === 'paid') updates.paidAt = new Date().toISOString();
        if (txSignature) updates.txSignature = txSignature;

        let updated = null;

        const sbOrders = await sbSelect('orders', {});
        if (sbOrders !== null) {
            const target = sbOrders.find(o => o.order_id === orderId || o.id === orderId);
            if (target) {
                const sbUpdates = { status };
                if (status === 'paid') sbUpdates.paid_at = new Date().toISOString();
                if (txSignature) sbUpdates.tx_signature = txSignature;
                const sbRow = await sbUpdate('orders', target.id, sbUpdates);
                if (sbRow) updated = { ...ordersToCamel(target), ...updates };
            }
        }

        const db = await readDb('orders');
        const idx = db.items.findIndex(o => o.orderId === orderId || o.id === orderId);
        if (idx >= 0) {
            Object.assign(db.items[idx], updates);
            const { writeDb } = await import('@/lib/db');
            await writeDb('orders', db);
            updated = db.items[idx];
        } else if (!updated) {
            return Response.json({ success: false, message: 'Order tidak ditemukan' }, { status: 404 });
        }

        return Response.json({ success: true, data: updated });
    } catch (e) {
        console.error('/api/orders PATCH:', e);
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}
