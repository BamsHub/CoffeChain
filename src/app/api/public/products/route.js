// Use nodejs runtime so supabaseAdmin (service-role) works reliably
export const runtime = 'nodejs';

import { supabaseAdmin } from '@/lib/supabase';
import { getExplorerTxUrl, normalizeExplorerUrl } from '@/lib/contractConfig';
import { getTaggedVariantStocks } from '@/lib/productVariants';

/**
 * PUBLIC API — Katalog Produk Kopi CoffeeChain
 * GET /api/public/products
 * Tidak memerlukan autentikasi. Menampilkan semua produk published dari Supabase.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit  = parseInt(searchParams.get('limit')  || '200');
        const search = searchParams.get('search') || '';
        const grade  = searchParams.get('grade')  || '';

        // Query Supabase — tampilkan semua produk (kolom 'status' belum ada di DB)
        // Gunakan * agar tidak crash jika ada kolom opsional yang belum di-migrate
        let query = supabaseAdmin
            .from('products')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (search) {
            query = query.or(`name.ilike.%${search}%,origin.ilike.%${search}%,variety.ilike.%${search}%`);
        }
        if (grade) {
            query = query.eq('grade', grade);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Count actual paid orders per product from the orders table (matches dashboard data)
        const { data: paidOrders } = await supabaseAdmin
            .from('orders')
            .select('product_id')
            .eq('status', 'paid');

        const orderCountMap = {};
        (paidOrders || []).forEach(o => {
            if (o.product_id) {
                orderCountMap[o.product_id] = (orderCountMap[o.product_id] || 0) + 1;
            }
        });

        const publishedProducts = (data || []).filter(p =>
            p.status === 'published' &&
            !!p.coffee_id
        );
        const coffeeIds = [...new Set(publishedProducts.map(p => p.coffee_id).filter(Boolean))];
        const traceMap = {};
        if (coffeeIds.length) {
            const { data: traces, error: traceErr } = await supabaseAdmin
                .from('coffee_traces')
                .select('coffee_id, tx_signature, explorer_url, status, created_at')
                .in('coffee_id', coffeeIds)
                .order('created_at', { ascending: false });

            if (!traceErr) {
                (traces || []).forEach(trace => {
                    if (!traceMap[trace.coffee_id]) traceMap[trace.coffee_id] = trace;
                });
            } else {
                console.warn('[public/products] trace lookup failed:', traceErr.message);
            }
        }

        const result = publishedProducts.map(p => {
            const trace = traceMap[p.coffee_id] || {};
            // Normalize price_per_unit: can be JSONB array, number, or null
            const rawPrice = p.price_per_unit;
            const priceArr = Array.isArray(rawPrice)
                ? rawPrice
                : (rawPrice !== null && rawPrice !== undefined ? [Number(rawPrice)] : []);
            // Normalize weight: can be JSONB array, number, or null
            const rawWeight = p.weight;
            const weightArr = Array.isArray(rawWeight)
                ? rawWeight
                : (rawWeight !== null && rawWeight !== undefined ? [Number(rawWeight)] : []);
            const rawStockPerUnit = p.stock_per_unit ?? getTaggedVariantStocks(p.tags);
            const stockPerUnit = Array.isArray(rawStockPerUnit)
                && rawStockPerUnit.length === weightArr.length
                ? rawStockPerUnit.map(Number)
                : [];
            return {
                id:             p.id,
                name:           p.name,
                origin:         p.origin,
                grade:          p.grade,
                variety:        p.variety,
                roast:          p.roast,
                weight:         weightArr,
                pricePerUnit:   priceArr,
                description:    p.description,
                image:          p.image,
                tags:           p.tags,
                stock:          p.stock ?? 0,
                stockPerUnit,
                rating:         p.rating ?? 4.5,
                // Real paid order count from orders table (matches dashboard penjualan)
                // Falls back to seeded static value if no orders exist yet
                sold:           orderCountMap[p.id] ?? p.sold ?? 0,
                coffeeId:       p.coffee_id,
                txSignature:    trace.tx_signature || null,
                explorerUrl:    trace.tx_signature ? getExplorerTxUrl(trace.tx_signature) : (normalizeExplorerUrl(trace.explorer_url) || null),
                traceStatus:    trace.status || null,
                paymentWallet:  p.payment_wallet,
                submittedByName: p.submitted_by_name,
                createdAt:      p.created_at,
            };
        });

        return Response.json({
            success: true,
            total:   result.length,
            data:    result,
            _source: 'CoffeeChain Public API v2 — Supabase Direct',
        }, {
            headers: {
                'Access-Control-Allow-Origin':  '*',
                'Access-Control-Allow-Methods': 'GET',
                'Cache-Control':                'no-store, max-age=0',
            }
        });
    } catch (err) {
        console.error('[public/products]', err.message);
        return Response.json({ success: false, message: 'Gagal memuat produk' }, { status: 500 });
    }
}
