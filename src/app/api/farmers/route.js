import { readDb, addItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    const db = await readDb('farmers');
    return Response.json({ success: true, data: db.items });
}

export async function POST(request) {
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
}
