import { readDb, updateItem } from '@/lib/db';

export async function GET() {
    const db = await readDb('market');
    return Response.json({ success: true, data: db.items });
}

export async function PATCH(request) {
    const body = await request.json();
    const updated = await updateItem('market', body.id, { price: body.price, change: body.change, updatedAt: new Date().toISOString() });
    return Response.json({ success: true, data: updated });
}
