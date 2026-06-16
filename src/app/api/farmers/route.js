export const runtime = 'edge';
import { readDb, addItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const db = await readDb('farmers');
        return Response.json({ success: true, data: db.items });
    } catch (e) {
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const newFarmer = {
            id: uuidv4(),
            name: body.name,
            region: body.region,
            type: body.type || 'Individu',
            members: Number(body.members) || 1,
            volume: Number(body.volume) || 0,
            earnings: Number(body.earnings) || 0,
            status: 'Pending',
            rating: 0,
            joined: new Date().toISOString().split('T')[0],
            wallet: body.wallet || '',
            certifications: body.certifications || [],
            notes: body.notes || '',
        };
        await addItem('farmers', newFarmer);
        return Response.json({ success: true, data: newFarmer }, { status: 201 });
    } catch (e) {
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}
