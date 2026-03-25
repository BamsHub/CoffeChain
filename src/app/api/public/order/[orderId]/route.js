export const runtime = 'edge';
import { readDb } from '@/lib/db';

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

export async function OPTIONS() {
    return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' }
    });
}
