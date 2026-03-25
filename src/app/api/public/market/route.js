export const runtime = 'edge';
import { readDb } from '@/lib/db';

/**
 * PUBLIC API — Harga Pasar Kopi Real-time
 * GET /api/public/market
 */
export async function GET() {
    try {
        const db = await readDb('market');
        return Response.json({
            success: true,
            updatedAt: new Date().toISOString(),
            data: db.items,
            _source: 'CoffeeChain Public API v1',
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=30',
            }
        });
    } catch {
        return Response.json({ success: false, message: 'Gagal memuat data pasar' }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' }
    });
}
