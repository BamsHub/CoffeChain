export const runtime = 'nodejs';
import { readDb, updateItem } from '@/lib/db';
import { getExplorerTxUrl, STORE_WALLET } from '@/lib/contractConfig';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { verifyToken } from '@/lib/auth';
import { canMakePayment } from '@/lib/paymentAccess';
import { verifySolanaPaymentTransaction } from '@/lib/solanaPayment';

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
                subtotalPrice: order.subtotalPrice,
                ppnRate: order.ppnRate,
                ppnAmount: order.ppnAmount,
                solanaTraceFee: order.solanaTraceFee,
                totalPrice: order.totalPrice,
                paymentMethod: order.paymentMethod,
                walletAddress: order.walletAddress,
                txSignature: order.txSignature,
                explorerUrl: order.txSignature ? getExplorerTxUrl(order.txSignature) : null,
                coffeeId: order.coffeeId,
                virtualAccount: order.virtualAccount,
                createdAt: order.createdAt,
                expiresAt: order.expiresAt,
                paidAt: order.paidAt,
                solanaNetworkFeeLamports: order.solanaNetworkFeeLamports,
                solanaTraceStatus: order.solanaTraceStatus,
            }
        }, { headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch {
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({
                success: false,
                message: 'Silakan login sebelum mengonfirmasi pembayaran',
            }, { status: 401 });
        }
        if (!canMakePayment(session.role)) {
            return Response.json({
                success: false,
                message: 'Akun ini tidak memiliki izin pembayaran',
            }, { status: 403 });
        }

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
        if (order.userId !== session.userId) {
            return Response.json({
                success: false,
                message: 'Order ini bukan milik akun yang sedang login',
            }, { status: 403 });
        }
        if (order.txSignature) {
            if (order.txSignature !== txSignature) {
                return Response.json({
                    success: false,
                    message: 'Signature pembayaran sudah tersimpan permanen dan tidak boleh diganti',
                }, { status: 409 });
            }
            return Response.json({
                success: true,
                message: 'Pembayaran sebelumnya sudah dikonfirmasi',
                data: {
                    orderId: order.orderId,
                    status: order.status,
                    txSignature: order.txSignature,
                    explorerUrl: getExplorerTxUrl(order.txSignature),
                    solanaNetworkFeeLamports: order.solanaNetworkFeeLamports,
                    solanaTraceStatus: order.solanaTraceStatus,
                    coffeeId: order.coffeeId || null,
                },
            });
        }

        const reused = db.items.find(item => (
            item.id !== order.id
            && item.txSignature === txSignature
            && item.status === 'paid'
        ));
        if (reused) {
            return Response.json({
                success: false,
                message: 'Tx signature sudah pernah digunakan untuk order lain',
            }, { status: 409 });
        }

        const expectedSol = Number(order.solAmount)
            || parseFloat((Number(order.totalPrice || 0) / 2_000_000).toFixed(9));
        const verifiedPayment = await verifySolanaPaymentTransaction({
            txSignature,
            expectedLamports: Math.round(expectedSol * LAMPORTS_PER_SOL),
            expectedSigner: order.walletAddress,
            receiverWallet: STORE_WALLET,
        });
        if (!verifiedPayment.ok) {
            return Response.json({
                success: false,
                message: verifiedPayment.message,
            }, { status: 400 });
        }

        order.txSignature = txSignature;
        order.status = 'paid';
        order.paidAt = new Date().toISOString();
        order.solanaNetworkFeeLamports = verifiedPayment.networkFeeLamports;
        order.solanaTraceStatus = 'confirmed';
        order.solanaTracedAt = new Date().toISOString();

        await updateItem('orders', order.id, {
            txSignature,
            status: 'paid',
            paidAt: order.paidAt,
            solanaNetworkFeeLamports: order.solanaNetworkFeeLamports,
            solanaTraceStatus: order.solanaTraceStatus,
            solanaTraceError: null,
            solanaTracedAt: order.solanaTracedAt,
        });

        let coffeeId = order.coffeeId || null;
        if (order.productId) {
            const productsDb = await readDb('products');
            const product = productsDb.items.find(p => p.id === order.productId);
            coffeeId = coffeeId || product?.coffeeId || null;
        }

        return Response.json({
            success: true,
            message: 'Pembayaran berhasil dikonfirmasi',
            data: {
                orderId: order.orderId,
                status: order.status,
                txSignature: order.txSignature,
                explorerUrl: getExplorerTxUrl(order.txSignature),
                solanaNetworkFeeLamports: order.solanaNetworkFeeLamports,
                solanaTraceStatus: order.solanaTraceStatus,
                coffeeId,
            }
        }, { headers: { 'Access-Control-Allow-Origin': '*' } });

    } catch (err) {
        console.error('[order PATCH error]', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
}
