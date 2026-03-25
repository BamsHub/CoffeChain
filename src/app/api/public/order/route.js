export const runtime = 'edge';
import { readDb, addItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * PUBLIC API — Buat Pesanan dari Aplikasi Eksternal
 * POST /api/public/order
 * Body: { productId, weight, quantity, paymentMethod, buyerName, buyerEmail, buyerPhone? }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { productId, weight, quantity = 1, paymentMethod = 'transfer', buyerName, buyerEmail, buyerPhone } = body;

        if (!productId || !buyerName || !buyerEmail) {
            return Response.json({
                success: false,
                message: 'productId, buyerName, dan buyerEmail wajib diisi',
            }, { status: 400 });
        }

        // Cari produk
        const db = await readDb('products');
        const product = db.items.find(p => p.id === productId);
        if (!product) {
            return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        }

        // Tentukan harga berdasarkan berat yang dipilih
        const weightIdx = product.weight ? product.weight.indexOf(weight) : -1;
        const pricePerUnit = weightIdx >= 0 ? product.pricePerUnit[weightIdx] : product.pricePerUnit?.[0] ?? 0;
        const totalPrice = pricePerUnit * quantity;

        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        const virtualAccount = paymentMethod === 'transfer'
            ? `88800${Math.floor(Math.random() * 9000000000 + 1000000000)}`
            : null;

        const order = {
            id: uuidv4(),
            orderId,
            userId: `ext-${buyerEmail}`,
            userName: buyerName,
            buyerEmail,
            buyerPhone: buyerPhone || null,
            productId,
            productName: product.name,
            weight: weight || product.weight?.[0],
            quantity,
            totalPrice,
            paymentMethod,
            virtualAccount,
            txSignature: null,
            status: 'pending',
            source: 'external_api',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            paidAt: null,
        };

        await addItem('orders', order);

        return Response.json({
            success: true,
            message: 'Pesanan berhasil dibuat',
            data: {
                orderId: order.orderId,
                productName: order.productName,
                weight: order.weight,
                quantity: order.quantity,
                totalPrice: order.totalPrice,
                paymentMethod: order.paymentMethod,
                virtualAccount: order.virtualAccount,
                status: order.status,
                expiresAt: order.expiresAt,
            },
        }, {
            status: 201,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    } catch (err) {
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}
