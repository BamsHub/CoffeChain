export const runtime = 'edge';
import { readDb } from '@/lib/db';

/**
 * PUBLIC API — Katalog Produk Kopi CoffeeChain
 * GET /api/public/products
 * Tidak memerlukan autentikasi. Bebas diakses oleh aplikasi eksternal.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const search = searchParams.get('search') || '';
        const grade = searchParams.get('grade') || '';

        const db = await readDb('products');
        // Only show published products on landing page (exclude pending/rejected farmer submissions)
        let products = db.items.filter(p => !p.status || p.status === 'published');

        if (search) {
            const q = search.toLowerCase();
            products = products.filter(p =>
                p.name?.toLowerCase().includes(q) ||
                p.origin?.toLowerCase().includes(q) ||
                p.variety?.toLowerCase().includes(q)
            );
        }
        if (grade) {
            products = products.filter(p => p.grade === grade);
        }

        const result = products.slice(0, limit).map(p => ({
            id: p.id,
            name: p.name,
            origin: p.origin,
            grade: p.grade,
            variety: p.variety,
            roast: p.roast,
            weight: p.weight,
            pricePerUnit: p.pricePerUnit,
            description: p.description,
            image: p.image,
            tags: p.tags,
            stock: p.stock,
            rating: p.rating,
            sold: p.sold,
            coffeeId: p.coffeeId,
            paymentWallet: p.paymentWallet || p.payment_wallet || null,
        }));

        return Response.json({
            success: true,
            total: result.length,
            data: result,
            _source: 'CoffeeChain Public API v1',
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Cache-Control': 'public, max-age=60',
            }
        });
    } catch (err) {
        return Response.json({ success: false, message: 'Gagal memuat produk' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
        }
    });
}
