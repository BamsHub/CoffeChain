export const runtime = 'nodejs';

import { readDb, addItem, updateItem } from '@/lib/db';
import { sbInsert, ordersToSnake } from '@/lib/sdb';
import { getMidtransSnapBaseUrl } from '@/lib/midtrans';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/midtrans/create-transaction
 * Membuat transaksi Midtrans Snap dan menyimpan order ke DB
 */
export async function POST(request) {
    try {
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

        // Cari produk
        const db = await readDb('products');
        const product = db.items.find(p => p.id === productId);
        if (!product) {
            return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        }

        const currentStock = product.stock ?? 0;
        if (currentStock < quantity) {
            return Response.json({
                success: false,
                message: `Stok tidak cukup. Tersedia: ${currentStock} unit`,
            }, { status: 400 });
        }

        // Hitung harga
        const weightIdx = product.weight ? product.weight.indexOf(weight) : -1;
        const pricePerUnit = weightIdx >= 0 ? product.pricePerUnit[weightIdx] : product.pricePerUnit?.[0] ?? 0;
        const totalPrice = pricePerUnit * quantity;

        const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

        // Buat transaksi Midtrans Snap
        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        const authString = Buffer.from(`${serverKey}:`).toString('base64');

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://coffe-blockchain.vercel.app';

        const midtransPayload = {
            transaction_details: {
                order_id: orderId,
                gross_amount: totalPrice,
            },
            customer_details: {
                first_name: buyerName.split(' ')[0] || buyerName,
                last_name: buyerName.split(' ').slice(1).join(' ') || undefined,
                email: buyerEmail,
                phone: buyerPhone || undefined,
            },
            item_details: [{
                id: productId,
                price: pricePerUnit,
                quantity: Number(quantity),
                name: `${product.name} ${weight || ''}g`.trim().slice(0, 50),
            }],
            callbacks: {
                finish: `${appUrl}/`,
            },
            // Hardcode notification URL so Midtrans always hits the correct Vercel endpoint
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

        const midtransRes = await fetch(`${getMidtransSnapBaseUrl()}/snap/v1/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`,
            },
            body: JSON.stringify(midtransPayload),
        });

        const midtransData = await midtransRes.json();

        if (!midtransRes.ok || !midtransData.token) {
            console.error('[midtrans] Create transaction failed:', midtransData);
            return Response.json({
                success: false,
                message: 'Gagal membuat transaksi Midtrans: ' + (midtransData.error_messages?.join(', ') || 'Unknown error'),
            }, { status: 500 });
        }

        // Simpan order ke DB
        const order = {
            id: uuidv4(),
            orderId,
            userId: `buyer-${buyerEmail}`,
            userName: buyerName,
            buyerEmail,
            buyerPhone: buyerPhone || null,
            productId,
            productName: product.name,
            weight: weight || product.weight?.[0],
            quantity,
            totalPrice,
            solAmount: null,
            paymentMethod: 'midtrans',
            paymentCurrency: 'IDR',
            walletAddress: null,
            txSignature: null,
            coffeeId: product.coffeeId || null,
            virtualAccount: null,
            status: 'pending',
            source: 'midtrans_payment',
            recipientName: recipientName || buyerName,
            shippingAddress: shippingAddress || null,
            shippingCity: shippingCity || null,
            shippingProvince: shippingProvince || null,
            shippingPostal: shippingPostal || null,
            shippingPhone: shippingPhone || buyerPhone || null,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            paidAt: null,
        };

        const sbResult = await sbInsert('orders', ordersToSnake(order)).catch(() => null);
        if (!sbResult) {
            await addItem('orders', order);
        }

        // Kurangi stok
        try {
            await updateItem('products', product.id, { stock: currentStock - quantity });
        } catch (stockErr) {
            console.error('[midtrans] Stock update failed:', stockErr?.message);
        }

        return Response.json({
            success: true,
            snapToken: midtransData.token,
            redirectUrl: midtransData.redirect_url,
            data: {
                orderId: order.orderId,
                productName: order.productName,
                weight: order.weight,
                quantity: order.quantity,
                totalPrice: order.totalPrice,
                paymentMethod: 'midtrans',
                status: 'pending',
                coffeeId: order.coffeeId,
                stockLeft: currentStock - quantity,
            },
        }, { status: 201 });

    } catch (err) {
        console.error('[midtrans] Error:', err);
        return Response.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
    }
}
