export const runtime = 'edge';
import { readDb, updateItem } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET() {
    const db = await readDb('market');
    return Response.json({ success: true, data: db.items });
}

export async function PATCH(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session || !['koperasi', 'developer', 'admin'].includes(session.role)) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const updated = await updateItem('market', body.id, { price: body.price, change: body.change, updatedAt: new Date().toISOString() });
        return Response.json({ success: true, data: updated });
    } catch (e) {
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}
