// Use nodejs runtime so supabaseAdmin (service-role) works reliably
export const runtime = 'nodejs';

import { supabaseAdmin } from '@/lib/supabase';

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

        // Query Supabase directly — published products OR products without a status (backward compat)
        let query = supabaseAdmin
            .from('products')
            .select('id,name,origin,grade,variety,roast,weight,price_per_unit,description,image,tags,stock,rating,sold,coffee_id,payment_wallet,status,submitted_by,submitted_by_name,submitted_by_role,created_at')
            .or('status.eq.published,status.is.null')
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

        const result = (data || []).map(p => {
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
                rating:         p.rating ?? 4.5,
                sold:           p.sold ?? 0,
                coffeeId:       p.coffee_id,
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

