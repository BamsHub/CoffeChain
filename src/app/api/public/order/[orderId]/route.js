export const runtime = 'edge';
import { readDb, updateItem } from '@/lib/db';

/**
 * PUBLIC API — Cek Status Pesanan
 * GET /api/public/order/[orderId]
 */
export async function GET(request, { params }) {
    try {
        const { orderId } = await params;
        const db = await readDb('orders');
        const order = db.items.find(o => o.orderId === orderId || o.id === orderId);

        if (!order) {
            return Response.json({ success: false, message: 'Order tidak ditemukan' }, {
                status: 404,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        return Response.json({
            success: true,
            data: {
                orderId: order.orderId,
                productName: order.productName,
                status: order.status,
                totalPrice: order.totalPrice,
                paymentMethod: order.paymentMethod,
                virtualAccount: order.virtualAccount,
                createdAt: order.createdAt,
                expiresAt: order.expiresAt,
                paidAt: order.paidAt,
            }
        }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch {
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const { orderId } = await params;
        const body = await request.json();
        const { txSignature } = body;

        if (!txSignature) {
            return Response.json({ success: false, message: 'txSignature is required' }, { status: 400 });
        }

        const db = await readDb('orders');
        const order = db.items.find(o => o.orderId === orderId || o.id === orderId);

        if (!order) {
            return Response.json({ success: false, message: 'Order tidak ditemukan' }, {
                status: 404,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        order.txSignature = txSignature;
        order.status = 'paid';
        order.paidAt = new Date().toISOString();

        // Di edge runtime, updateItem meng-override seluru DB file/item via Cloudflare KV. Helper updateItem kita butuh (tableName, item)
        await updateItem('orders', order);

        return Response.json({
            success: true,
            message: 'Pembayaran berhasil dikonfirmasi',
            data: { status: order.status, txSignature: order.txSignature }
        }, { headers: { 'Access-Control-Allow-Origin': '*' } });

    } catch (err) {
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS' }
    });
}
