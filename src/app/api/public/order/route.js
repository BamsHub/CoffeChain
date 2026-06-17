export const runtime = 'nodejs';
import { readDb, addItem, updateItem } from '@/lib/db';
import { sbInsert, sbSelect, ordersToSnake } from '@/lib/sdb';
import { v4 as uuidv4 } from 'uuid';
import { Connection } from '@solana/web3.js';
import { getExplorerTxUrl, SOLANA_NETWORK, STORE_WALLET } from '@/lib/contractConfig';

function generateCoffeeId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'CF-';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

async function verifySolanaPayment({ txSignature, expectedSol, receiverWallet }) {
    const ordersDb = await readDb('orders');
    const reused = (ordersDb.items || []).find(o => o.txSignature === txSignature && o.status === 'paid');
    if (reused) {
        return { ok: false, message: 'Tx signature sudah pernah digunakan untuk order lain' };
    }

    const connection = new Connection(SOLANA_NETWORK, 'confirmed');
    const tx = await connection.getParsedTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
    });

    if (!tx) return { ok: false, message: 'Transaksi tidak ditemukan di Solana Network atau belum confirmed' };
    if (tx.meta?.err) return { ok: false, message: 'Transaksi Solana gagal / dibatalkan' };

    const accountKeys = tx.transaction.message.accountKeys.map(k => {
        if (typeof k === 'string') return k;
        if (k?.pubkey) return typeof k.pubkey === 'string' ? k.pubkey : k.pubkey.toBase58();
        return '';
    });

    const validReceivers = [receiverWallet, STORE_WALLET].filter(Boolean);
    const receiverIndex = accountKeys.findIndex(key => validReceivers.includes(key));
    if (receiverIndex === -1) {
        return { ok: false, message: 'Transaksi tidak mengirim SOL ke dompet CoffeeChain' };
    }

    const balanceChange = ((tx.meta.postBalances[receiverIndex] || 0) - (tx.meta.preBalances[receiverIndex] || 0)) / 1e9;
    if (balanceChange <= 0) {
        return { ok: false, message: 'Transaksi tidak mentransfer SOL ke dompet CoffeeChain' };
    }

    const tolerance = Math.max(0.001, expectedSol * 0.01);
    if (Math.abs(balanceChange - expectedSol) > tolerance) {
        return {
            ok: false,
            message: `Jumlah SOL yang ditransfer (${balanceChange.toFixed(4)} SOL) tidak sesuai tagihan (${expectedSol.toFixed(4)} SOL)`,
        };
    }

    return { ok: true, balanceChange };
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

        // Cek stok tersedia
        const currentStock = product.stock ?? 0;
        if (currentStock <= 0) {
            return Response.json({ success: false, message: 'Stok produk habis' }, { status: 400 });
        }
        if (currentStock < quantity) {
            return Response.json({
                success: false,
                message: `Stok tidak cukup. Tersedia: ${currentStock} unit`,
            }, { status: 400 });
        }

        // Tentukan harga berdasarkan berat yang dipilih
        const weightIdx = product.weight ? product.weight.indexOf(weight) : -1;
        const pricePerUnit = weightIdx >= 0 ? product.pricePerUnit[weightIdx] : product.pricePerUnit?.[0] ?? 0;
        const totalPrice = pricePerUnit * quantity;

        // Hitung SOL equivalent (1 SOL = Rp 2.000.000 testnet demo)
        const solAmount = parseFloat((totalPrice / 2_000_000).toFixed(9));

        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

        // Virtual Account untuk pembayaran Rupiah
        const isIdrPayment = paymentMethod === 'transfer-idr' || paymentMethod === 'qr-idr';
        const virtualAccount = isIdrPayment
            ? `8880${Date.now().toString().slice(-10)}`
            : null;

        let verifiedSolPayment = null;
        if (paymentMethod === 'transfer' && txSignature) {
            verifiedSolPayment = await verifySolanaPayment({
                txSignature,
                expectedSol: solAmount,
                receiverWallet: product.paymentWallet || STORE_WALLET,
            });
            if (!verifiedSolPayment.ok) {
                return Response.json({ success: false, message: verifiedSolPayment.message }, { status: 400 });
            }
        }

        const isPaid = paymentMethod === 'transfer' && !!verifiedSolPayment?.ok;
        const orderStatus = isPaid ? 'paid' : 'pending';

        const order = {
            id: uuidv4(),
            orderId,
            userId: walletAddress ? `wallet-${walletAddress}` : `buyer-${buyerEmail}`,
            userName: buyerName,
            buyerEmail,
            buyerPhone: buyerPhone || null,
            productId,
            productName: product.name,
            weight: weight || product.weight?.[0],
            quantity,
            totalPrice,
            solAmount: isIdrPayment ? null : solAmount,
            paymentMethod,
            paymentCurrency: isIdrPayment ? 'IDR' : 'SOL',
            walletAddress: walletAddress || null,
            txSignature: txSignature || null,
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

        let certifiedCoffeeId = product.coffeeId || null;
        let certifiedExplorerUrl = txSignature ? getExplorerTxUrl(txSignature) : null;

        if (isPaid && txSignature && !product.coffeeId) {
            certifiedCoffeeId = generateCoffeeId();
            try {
                await addItem('coffee_traces', {
                    id: uuidv4(),
                    coffeeId: certifiedCoffeeId,
                    name: product.name,
                    origin: product.origin || null,
                    variety: product.variety || null,
                    grade: product.grade || null,
                    weightKg: weight || product.weight?.[0] || null,
                    farmerName: product.submittedByName || null,
                    harvestDate: null,
                    processMethod: 'Paid on-chain product certificate',
                    roastLevel: product.roast || null,
                    certification: 'CoffeeChain Paid On-Chain',
                    description: product.description || null,
                    txSignature,
                    explorerUrl: certifiedExplorerUrl,
                    status: 'verified',
                    registeredBy: walletAddress || null,
                    productId: product.id,
                    paymentWallet: walletAddress || null,
                    createdAt: new Date().toISOString(),
                });
            } catch (traceErr) {
                console.warn('[order] Certificate trace insert failed:', traceErr?.message);
            }
        }

        let stockLeft = currentStock;
        if (isPaid) {
            stockLeft = currentStock - quantity;
            try {
                await updateItem('products', product.id, {
                    stock: stockLeft,
                    ...(certifiedCoffeeId && !product.coffeeId ? { coffeeId: certifiedCoffeeId, status: 'published', paymentWallet: walletAddress || null } : {}),
                });
            } catch (stockErr) {
                console.error('[order] Stock update failed:', stockErr?.message);
            }
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
                totalPrice: order.totalPrice,
                solAmount: order.solAmount,
                paymentMethod: order.paymentMethod,
                paymentCurrency: order.paymentCurrency,
                walletAddress: order.walletAddress,
                txSignature: order.txSignature,
                coffeeId: certifiedCoffeeId,
                explorerUrl: certifiedExplorerUrl,
                virtualAccount: order.virtualAccount,
                status: order.status,
                expiresAt: order.expiresAt,
                stockLeft,
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
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}
