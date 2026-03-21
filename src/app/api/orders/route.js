import { readDb, addItem } from '@/lib/db';
import { sbSelect, sbInsert, sbUpdate, ordersToSnake, ordersToCamel } from '@/lib/sdb';
import { v4 as uuidv4 } from 'uuid';

// Helper: ambil orders dari Supabase dengan fallback JSON
async function getOrders(userId) {
    const sbData = await sbSelect('orders', userId ? { user_id: userId } : {});
    if (sbData !== null) {
        return sbData.map(ordersToCamel);
    }
    // Fallback JSON
    const db = await readDb('orders');
    return userId ? db.items.filter(o => o.userId === userId) : db.items;
}

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

        // Coba Supabase dulu
        const sbResult = await sbInsert('orders', ordersToSnake(order));
        if (!sbResult) {
            // Fallback JSON
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

        // Coba Supabase — cari by order_id
        const sbOrders = await sbSelect('orders', {});
        if (sbOrders !== null) {
            const target = sbOrders.find(o => o.order_id === orderId || o.id === orderId);
            if (target) {
                const sbUpdates = { status };
                if (status === 'paid') sbUpdates.paid_at = new Date().toISOString();
                if (txSignature) sbUpdates.tx_signature = txSignature;
                await sbUpdate('orders', target.id, sbUpdates);
                return Response.json({ success: true, data: { ...ordersToCamel(target), ...updates } });
            }
        }

        // Fallback JSON
        const db = await readDb('orders');
        const idx = db.items.findIndex(o => o.orderId === orderId || o.id === orderId);
        if (idx < 0) return Response.json({ success: false, message: 'Order tidak ditemukan' }, { status: 404 });
        Object.assign(db.items[idx], updates);
        const { writeDb } = await import('@/lib/db');
        await writeDb('orders', db);
        return Response.json({ success: true, data: db.items[idx] });
    } catch (e) {
        console.error('/api/orders PATCH:', e);
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}
