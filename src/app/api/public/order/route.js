export const runtime = 'nodejs';
import { readDb, addItem, updateItem } from '@/lib/db';
import { sbInsert, sbSelect, ordersToSnake } from '@/lib/sdb';
import { v4 as uuidv4 } from 'uuid';
import { Connection } from '@solana/web3.js';
import { SOLANA_NETWORK, STORE_WALLET, getExplorerTxUrl } from '@/lib/contractConfig';
import { calculatePaymentPricing } from '@/lib/paymentPricing';
import { verifyToken } from '@/lib/auth';
import { canMakePayment } from '@/lib/paymentAccess';

async function verifySolanaPayment({
    txSignature,
    expectedSol,
    receiverWallet,
    expectedSigner,
}) {
    const [ordersDb, supabaseOrders] = await Promise.all([
        readDb('orders'),
        sbSelect('orders'),
    ]);
    const reused = [
        ...(ordersDb.items || []),
        ...((supabaseOrders || []).map(row => ({ txSignature: row.tx_signature, status: row.status }))),
    ].find(order => order.txSignature === txSignature && order.status === 'paid');
    if (reused) {
        return { ok: false, message: 'Tx signature sudah pernah digunakan untuk order lain' };
    }

    const connection = new Connection(process.env.SOLANA_RPC_URL || SOLANA_NETWORK, 'confirmed');
    const tx = await connection.getParsedTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
    });

    if (!tx) return { ok: false, message: 'Transaksi tidak ditemukan di Solana atau belum confirmed' };
    if (tx.meta?.err) return { ok: false, message: 'Transaksi Solana gagal / dibatalkan' };

    const parsedKeys = tx.transaction.message.accountKeys || [];
    const accountKeys = parsedKeys.map(key => {
        if (typeof key === 'string') return key;
        if (key?.pubkey) return typeof key.pubkey === 'string' ? key.pubkey : key.pubkey.toBase58();
        return '';
    });
    const signerAddresses = parsedKeys
        .filter(key => key?.signer)
        .map(key => (typeof key.pubkey === 'string' ? key.pubkey : key.pubkey.toBase58()));
    if (expectedSigner && !signerAddresses.includes(expectedSigner)) {
        return { ok: false, message: 'Wallet pembeli bukan signer transaksi Solana tersebut' };
    }

    const validReceivers = [receiverWallet, STORE_WALLET].filter(Boolean);
    const receiverIndex = accountKeys.findIndex(key => validReceivers.includes(key));
    if (receiverIndex === -1) {
        return { ok: false, message: 'Transaksi tidak mengirim SOL ke dompet CoffeeChain' };
    }

    const balanceChange = (
        (tx.meta.postBalances[receiverIndex] || 0) - (tx.meta.preBalances[receiverIndex] || 0)
    ) / 1e9;
    const tolerance = Math.max(0.001, expectedSol * 0.01);
    if (balanceChange <= 0 || Math.abs(balanceChange - expectedSol) > tolerance) {
        return {
            ok: false,
            message: `Jumlah SOL diterima (${balanceChange.toFixed(6)} SOL) tidak sesuai tagihan `
                + `(${expectedSol.toFixed(6)} SOL)`,
        };
    }

    return {
        ok: true,
        balanceChange,
        networkFeeLamports: tx.meta.fee ?? null,
    };
}

/**
 * PUBLIC API — Buat Pesanan Kopi (Rupiah & Solana)
 * POST /api/public/order
 * Body: { productId, weight, quantity, paymentMethod, buyerName, buyerEmail, buyerPhone?,
 *         walletAddress?, txSignature? }
 * paymentMethod: 'transfer'     – SOL transfer via Phantom (kirim txSignature)
 *              | 'qr'           – Solana Pay QR (pending sampai dikonfirmasi)
 *              | 'transfer-idr' – Transfer Bank / Virtual Account Rupiah
 *              | 'qr-idr'       – QR Code Rupiah
 */
export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({
                success: false,
                message: 'Silakan login dengan akun petani atau admin sebelum melakukan pembayaran',
            }, { status: 401 });
        }
        if (!canMakePayment(session.role)) {
            return Response.json({
                success: false,
                message: 'Pembayaran hanya dapat dilakukan oleh akun petani atau admin',
            }, { status: 403 });
        }

        const body = await request.json();
        const {
            productId, weight, quantity = 1,
            paymentMethod = 'transfer-idr',
            buyerName, buyerEmail, buyerPhone,
            walletAddress, txSignature,
            bankName, accountNumber, ewalletApp, ewalletPhone,
            recipientName, shippingAddress, shippingCity, shippingProvince, shippingPostal, shippingPhone,
        } = body;

        if (!productId || !buyerName || !buyerEmail) {
            return Response.json({
                success: false,
                message: 'productId, buyerName, dan buyerEmail wajib diisi',
            }, { status: 400 });
        }

        // Phantom wallet hanya wajib untuk pembayaran SOL
        const isSolPayment = paymentMethod === 'transfer' || paymentMethod === 'qr';
        if (isSolPayment && !walletAddress) {
            return Response.json({
                success: false,
                message: 'Phantom Wallet harus terhubung untuk pembayaran Solana',
            }, { status: 400 });
        }

        // Cari produk
        const db = await readDb('products');
        const product = db.items.find(p => p.id === productId);
        if (!product) {
            return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        }
        if (!product.coffeeId) {
            return Response.json({
                success: false,
                message: 'Produk belum memiliki sertifikat Solana dan belum dapat dibayar',
            }, { status: 409 });
        }

        // Cek stok tersedia
        const currentStock = product.stock ?? 0;
        if (currentStock <= 0) {
            return Response.json({ success: false, message: 'Stok produk habis' }, { status: 400 });
        }
        const normalizedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
        if (currentStock < normalizedQuantity) {
            return Response.json({
                success: false,
                message: `Stok tidak cukup. Tersedia: ${currentStock} unit`,
            }, { status: 400 });
        }

        // Tentukan harga berdasarkan berat yang dipilih
        const weightIdx = product.weight ? product.weight.indexOf(weight) : -1;
        const pricePerUnit = weightIdx >= 0 ? product.pricePerUnit[weightIdx] : product.pricePerUnit?.[0] ?? 0;
        const pricing = calculatePaymentPricing({
            unitPrice: pricePerUnit,
            quantity: normalizedQuantity,
        });
        const totalPrice = pricing.totalPrice;

        // Hitung SOL equivalent (1 SOL = Rp 2.000.000 testnet demo)
        const solAmount = parseFloat((totalPrice / 2_000_000).toFixed(9));

        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

        // Virtual Account untuk pembayaran Rupiah
        const isIdrPayment = paymentMethod === 'transfer-idr' || paymentMethod === 'qr-idr';
        const virtualAccount = isIdrPayment
            ? `8880${Date.now().toString().slice(-10)}`
            : null;

        // Tentukan status order
        // transfer SOL + txSignature → paid
        // semua lainnya → pending
        let verifiedSolPayment = null;
        if (paymentMethod === 'transfer' && txSignature) {
            verifiedSolPayment = await verifySolanaPayment({
                txSignature,
                expectedSol: solAmount,
                receiverWallet: product.paymentWallet || STORE_WALLET,
                expectedSigner: walletAddress,
            });
            if (!verifiedSolPayment.ok) {
                return Response.json({ success: false, message: verifiedSolPayment.message }, { status: 400 });
            }
        }

        const isPaid = paymentMethod === 'transfer' && Boolean(verifiedSolPayment?.ok);
        const orderStatus = isPaid ? 'paid' : 'pending';

        const order = {
            id: uuidv4(),
            orderId,
            userId: session.userId,
            userName: buyerName,
            buyerEmail,
            buyerPhone: buyerPhone || null,
            productId,
            productName: product.name,
            weight: weight || product.weight?.[0],
            quantity: normalizedQuantity,
            totalPrice,
            subtotalPrice: pricing.subtotalPrice,
            ppnRate: pricing.ppnRate,
            ppnAmount: pricing.ppnAmount,
            solanaTraceFee: pricing.solanaTraceFee,
            solAmount: isIdrPayment ? null : solAmount,
            paymentMethod,
            paymentCurrency: isIdrPayment ? 'IDR' : 'SOL',
            walletAddress: walletAddress || null,
            txSignature: isPaid ? txSignature : null,
            solanaNetworkFeeLamports: verifiedSolPayment?.networkFeeLamports ?? null,
            solanaTraceStatus: isPaid ? 'confirmed' : 'pending',
            solanaTraceError: null,
            solanaTracedAt: isPaid ? new Date().toISOString() : null,
            virtualAccount,
            status: orderStatus,
            source: isIdrPayment ? 'rupiah_payment' : 'phantom_wallet',
            bankName: bankName || null,
            accountNumber: accountNumber || null,
            ewalletApp: ewalletApp || null,
            ewalletPhone: ewalletPhone || null,
            recipientName: recipientName || buyerName,
            shippingAddress: shippingAddress || null,
            shippingCity: shippingCity || null,
            shippingProvince: shippingProvince || null,
            shippingPostal: shippingPostal || null,
            shippingPhone: shippingPhone || buyerPhone || null,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            paidAt: isPaid ? new Date().toISOString() : null,
        };

        // Try to save to Supabase first, then JSON fallback
        const sbResult = await sbInsert('orders', ordersToSnake(order)).catch(() => null);
        if (!sbResult) {
            await addItem('orders', order);
        }

        // Kurangi stok setelah order berhasil dibuat
        try {
            await updateItem('products', product.id, {
                stock: currentStock - normalizedQuantity,
            });
        } catch (stockErr) {
            // Log but don't fail the order
            console.error('[order] Stock update failed:', stockErr?.message);
        }

        return Response.json({
            success: true,
            message: isPaid
                ? 'Pembayaran SOL berhasil dikonfirmasi!'
                : isIdrPayment
                    ? 'Pesanan berhasil! Lakukan transfer ke nomor Virtual Account.'
                    : 'Pesanan berhasil dibuat. Scan QR untuk bayar.',
            data: {
                orderId: order.orderId,
                productName: order.productName,
                weight: order.weight,
                quantity: order.quantity,
                subtotalPrice: order.subtotalPrice,
                ppnRate: order.ppnRate,
                ppnAmount: order.ppnAmount,
                solanaTraceFee: order.solanaTraceFee,
                totalPrice: order.totalPrice,
                solAmount: order.solAmount,
                paymentMethod: order.paymentMethod,
                paymentCurrency: order.paymentCurrency,
                walletAddress: order.walletAddress,
                txSignature: order.txSignature,
                solanaNetworkFeeLamports: order.solanaNetworkFeeLamports,
                solanaTraceStatus: order.solanaTraceStatus,
                coffeeId: product.coffeeId || null,
                explorerUrl: order.txSignature ? getExplorerTxUrl(order.txSignature) : null,
                virtualAccount: order.virtualAccount,
                status: order.status,
                expiresAt: order.expiresAt,
                stockLeft: currentStock - normalizedQuantity,
            },
        }, {
            status: 201,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    } catch (err) {
        console.error('[order] Error:', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
}
