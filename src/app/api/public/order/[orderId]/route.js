export const runtime = 'nodejs';
import { readDb, updateItem } from '@/lib/db';
import { getExplorerTxUrl, SOLANA_NETWORK, STORE_WALLET } from '@/lib/contractConfig';
import { Connection } from '@solana/web3.js';
import { verifyToken } from '@/lib/auth';
import { canMakePayment } from '@/lib/paymentAccess';

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
                message: 'Silakan login dengan akun petani atau admin sebelum mengonfirmasi pembayaran',
            }, { status: 401 });
        }
        if (!canMakePayment(session.role)) {
            return Response.json({
                success: false,
                message: 'Pembayaran hanya dapat dilakukan oleh akun petani atau admin',
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

        // ── Verify Solana Transaction Signature on-chain ──
        const connection = new Connection(SOLANA_NETWORK, 'confirmed');
        let tx = null;
        try {
            tx = await connection.getParsedTransaction(txSignature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });
        } catch (txErr) {
            console.error('[SOLANA-VERIFY] Error fetching transaction:', txErr.message);
        }

        if (!tx) {
            return Response.json({
                success: false,
                message: 'Transaksi tidak ditemukan di Solana Network atau statusnya belum confirmed'
            }, {
                status: 400,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (tx.meta?.err) {
            return Response.json({
                success: false,
                message: 'Transaksi Solana gagal / dibatalkan'
            }, {
                status: 400,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Extract account public keys from transaction
        const accountKeys = tx.transaction.message.accountKeys.map(k => {
            if (typeof k === 'string') return k;
            if (k && k.pubkey) return typeof k.pubkey === 'string' ? k.pubkey : k.pubkey.toBase58();
            return '';
        });

        // Verify receiver address is STORE_WALLET
        const storeWalletIndex = accountKeys.indexOf(STORE_WALLET);
        if (storeWalletIndex === -1) {
            return Response.json({
                success: false,
                message: 'Transaksi tidak mengirim SOL ke dompet CoffeeChain'
            }, {
                status: 400,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Verify amount
        const preBalance = tx.meta.preBalances[storeWalletIndex];
        const postBalance = tx.meta.postBalances[storeWalletIndex];
        const balanceChange = (postBalance - preBalance) / 1e9; // convert to SOL

        let expectedSol = order.solAmount;
        if (!expectedSol && order.totalPrice) {
            expectedSol = parseFloat((order.totalPrice / 2_000_000).toFixed(9));
        }

        if (balanceChange <= 0) {
            return Response.json({
                success: false,
                message: 'Transaksi tidak mentransfer SOL ke dompet CoffeeChain'
            }, {
                status: 400,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        const tolerance = Math.max(0.001, (expectedSol || 0) * 0.01);
        if (expectedSol && Math.abs(balanceChange - expectedSol) > tolerance) {
            return Response.json({
                success: false,
                message: `Jumlah SOL yang ditransfer (${balanceChange.toFixed(4)} SOL) tidak sesuai dengan jumlah tagihan (${expectedSol.toFixed(4)} SOL)`
            }, {
                status: 400,
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        order.txSignature = txSignature;
        order.status = 'paid';
        order.paidAt = new Date().toISOString();
        order.solanaNetworkFeeLamports = tx.meta.fee ?? null;
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
