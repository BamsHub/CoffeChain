import { verifyToken } from '@/lib/auth';
import { getOrders } from '@/lib/orders';
import { canMakePayment } from '@/lib/paymentAccess';

export { getOrders };

async function requirePaymentSession(request) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const session = await verifyToken(token);
    return session && canMakePayment(session.role) ? session : null;
}

export async function GET(request) {
    try {
        const session = await requirePaymentSession(request);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        // Pemilik riwayat selalu berasal dari JWT, bukan parameter browser.
        const orders = await getOrders(session.userId);
        return Response.json({ success: true, data: orders });
    } catch (error) {
        console.error('/api/orders GET:', error);
        return Response.json({ success: false, message: 'Gagal memuat order' }, { status: 500 });
    }
}

// Pembuatan order harus memakai route authoritative yang menghitung harga,
// PPN, trace fee, stok, dan kepemilikan produk di server.
export async function POST(request) {
    const session = await requirePaymentSession(request);
    if (!session) {
        return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({
        success: false,
        message: 'Gunakan checkout CoffeeChain untuk membuat order.',
    }, { status: 409 });
}

// Status paid hanya dapat ditulis oleh verifikasi Solana, webhook Midtrans,
// atau pengecekan status Midtrans yang telah memverifikasi pemilik order.
export async function PATCH(request) {
    const session = await requirePaymentSession(request);
    if (!session) {
        return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return Response.json({
        success: false,
        message: 'Status pembayaran tidak dapat diubah secara manual.',
    }, { status: 409 });
}
