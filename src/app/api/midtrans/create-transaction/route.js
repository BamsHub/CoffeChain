import { readDb } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { ordersToSnake } from '@/lib/sdb';
import { getMidtransAuthHeader, getMidtransSnapBaseUrl } from '@/lib/midtrans';
import { calculatePaymentPricing } from '@/lib/paymentPricing';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { canMakePayment } from '@/lib/paymentAccess';
import { getAvailableVariantStock } from '@/lib/productVariants';

/**
 * POST /api/midtrans/create-transaction
 * Membuat order authoritative di Supabase sebelum membuka Midtrans Snap.
 * Webhook tidak pernah bergantung pada fallback JSON lokal.
 */
export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({
                success: false,
                message: 'Silakan login sebelum melakukan pembayaran',
            }, { status: 401 });
        }
        if (!canMakePayment(session.role)) {
            return Response.json({
                success: false,
                message: 'Akun ini tidak memiliki izin pembayaran',
            }, { status: 403 });
        }

        const body = await request.json();
        const {
            productId, weight, quantity = 1,
            buyerName, buyerEmail, buyerPhone,
            recipientName, shippingAddress, shippingCity,
            shippingProvince, shippingPostal, shippingPhone,
        } = body;

        if (!productId || !buyerName || !buyerEmail) {
            return Response.json({
                success: false,
                message: 'productId, buyerName, dan buyerEmail wajib diisi',
            }, { status: 400 });
        }

        const normalizedQuantity = Math.floor(Number(quantity));
        if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1 || normalizedQuantity > 1_000) {
            return Response.json({ success: false, message: 'Jumlah pembelian tidak valid' }, { status: 400 });
        }
        const db = await readDb('products');
        const product = db.items.find(item => item.id === productId);
        if (!product) {
            return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        }
        if (product.status !== 'published' || !product.coffeeId) {
            return Response.json({
                success: false,
                message: 'Produk belum memiliki sertifikat Solana dan belum dapat dibayar',
            }, { status: 409 });
        }

        // Fail sebelum membuat order bila konfigurasi Midtrans belum lengkap.
        const midtransAuthorization = getMidtransAuthHeader();
        const weightOptions = Array.isArray(product.weight) ? product.weight.map(Number) : [];
        const selectedWeight = Number(weight);
        const weightIdx = weightOptions.indexOf(selectedWeight);
        if (weightIdx < 0) {
            return Response.json({ success: false, message: 'Pilihan berat produk tidak valid' }, { status: 400 });
        }
        const currentStock = product.stock ?? 0;
        const availableVariantStock = getAvailableVariantStock(product, weightIdx);
        if (availableVariantStock < normalizedQuantity) {
            return Response.json({
                success: false,
                message: `Stok kemasan ${selectedWeight}g tidak cukup. Tersedia: ${availableVariantStock} unit`,
            }, { status: 400 });
        }
        const pricePerUnit = Number(product.pricePerUnit?.[weightIdx]);
        if (!Number.isInteger(pricePerUnit) || pricePerUnit < 1_000) {
            return Response.json({ success: false, message: 'Harga produk tidak valid' }, { status: 409 });
        }
        const pricing = calculatePaymentPricing({
            unitPrice: pricePerUnit,
            quantity: normalizedQuantity,
        });

        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        const host = request.headers.get('host') || 'coffe-chain.vercel.app';
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const appUrl = `${proto}://${host}`;
        const receiptUrl = `${appUrl}/receipt?orderId=${encodeURIComponent(orderId)}`;
        const now = new Date();

        const order = {
            id: uuidv4(),
            orderId,
            userId: session.userId,
            userName: buyerName,
            buyerEmail,
            buyerPhone: buyerPhone || null,
            productId,
            productName: product.name,
            weight: selectedWeight,
            quantity: normalizedQuantity,
            totalPrice: pricing.totalPrice,
            subtotalPrice: pricing.subtotalPrice,
            ppnRate: pricing.ppnRate,
            ppnAmount: pricing.ppnAmount,
            solanaTraceFee: pricing.solanaTraceFee,
            solAmount: null,
            paymentMethod: 'midtrans',
            paymentCurrency: 'IDR',
            walletAddress: null,
            txSignature: null,
            coffeeId: product.coffeeId || null,
            virtualAccount: null,
            status: 'pending',
            solanaTraceStatus: 'pending',
            solanaTraceError: null,
            source: 'midtrans_payment',
            recipientName: recipientName || buyerName,
            shippingAddress: shippingAddress || null,
            shippingCity: shippingCity || null,
            shippingProvince: shippingProvince || null,
            shippingPostal: shippingPostal || null,
            shippingPhone: shippingPhone || buyerPhone || null,
            createdAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            paidAt: null,
        };

        const { error: orderInsertError } = await supabaseAdmin
            .from('orders')
            .insert(ordersToSnake(order));

        if (orderInsertError) {
            const migrationHint = /column|schema cache|PGRST204/i.test(orderInsertError.message || '')
                ? ' Jalankan supabase_migration.sql terlebih dahulu.'
                : '';
            throw new Error(`Order gagal disimpan ke Supabase.${migrationHint} ${orderInsertError.message}`);
        }

        const itemDetails = [{
            id: productId,
            price: pricing.unitPrice,
            quantity: pricing.quantity,
            name: `${product.name} ${selectedWeight}g`.trim().slice(0, 50),
        }];
        if (pricing.solanaTraceFee > 0) {
            itemDetails.push({
                id: 'solana-trace',
                price: pricing.solanaTraceFee,
                quantity: 1,
                name: 'Biaya trace Solana',
            });
        }
        if (pricing.ppnAmount > 0) {
            itemDetails.push({
                id: 'ppn-indonesia',
                price: pricing.ppnAmount,
                quantity: 1,
                name: `PPN Indonesia ${pricing.ppnPercent}%`,
            });
        }

        const midtransPayload = {
            transaction_details: {
                order_id: orderId,
                gross_amount: pricing.totalPrice,
            },
            customer_details: {
                first_name: buyerName.split(' ')[0] || buyerName,
                last_name: buyerName.split(' ').slice(1).join(' ') || undefined,
                email: buyerEmail,
                phone: buyerPhone || undefined,
            },
            item_details: itemDetails,
            callbacks: {
                finish: receiptUrl,
            },
            notification_url: `${appUrl}/api/midtrans/notification`,
        };

        if (shippingAddress) {
            midtransPayload.customer_details.shipping_address = {
                first_name: (recipientName || buyerName).split(' ')[0],
                last_name: (recipientName || buyerName).split(' ').slice(1).join(' ') || undefined,
                email: buyerEmail,
                phone: shippingPhone || buyerPhone || undefined,
                address: shippingAddress,
                city: shippingCity || undefined,
                postal_code: shippingPostal || undefined,
                country_code: 'IDN',
            };
        }

        let midtransRes;
        let midtransData;
        try {
            midtransRes = await fetch(`${getMidtransSnapBaseUrl()}/snap/v1/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: midtransAuthorization,
                },
                body: JSON.stringify(midtransPayload),
            });
            midtransData = await midtransRes.json();
        } catch (error) {
            await supabaseAdmin
                .from('orders')
                .update({ status: 'expired' })
                .eq('order_id', orderId);
            throw error;
        }

        if (!midtransRes.ok || !midtransData.token) {
            await supabaseAdmin
                .from('orders')
                .update({ status: 'expired' })
                .eq('order_id', orderId);
            console.error('[midtrans] Create transaction failed:', midtransData);
            return Response.json({
                success: false,
                message: 'Gagal membuat transaksi Midtrans: '
                    + (midtransData.error_messages?.join(', ') || 'Unknown error'),
            }, { status: 502 });
        }

        return Response.json({
            success: true,
            snapToken: midtransData.token,
            redirectUrl: midtransData.redirect_url,
            receiptUrl,
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
                paymentMethod: 'midtrans',
                status: 'pending',
                solanaTraceStatus: 'pending',
                receiptUrl,
                coffeeId: order.coffeeId,
                stockLeft: currentStock,
                variantStockLeft: availableVariantStock,
            },
        }, { status: 201 });
    } catch (err) {
        console.error('[midtrans] Error:', err);
        const configurationError = /MIDTRANS_SERVER_KEY/.test(err.message || '');
        return Response.json({
            success: false,
            message: err.message || 'Server error',
        }, { status: configurationError ? 503 : 500 });
    }
}

export const runtime = 'nodejs';
