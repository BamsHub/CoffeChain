import { readDb, addItem, deleteItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    const db = await readDb('transactions');
    return Response.json({ success: true, data: db.items });
}

export async function POST(request) {
    const body = await request.json();
    const now = new Date().toISOString();
    const blockNum = (18293040 + Math.floor(Math.random() * 1000)).toString();
    const hashHex = Math.random().toString(16).substr(2, 4) + '...' + Math.random().toString(16).substr(2, 4);

    const newTx = {
        id: uuidv4(),
        hash: `0x${hashHex}`,
        farmer: body.farmer,
        location: body.location,
        weight: Number(body.weight),
        variety: body.variety || 'Arabika',
        grade: body.grade || 'A',
        amount: Number(body.amount),
        status: 'Pending',
        timestamp: now,
        block: blockNum,
        walletFrom: body.walletFrom || '—',
        walletTo: body.walletTo || '—',
        note: body.note || '',
    };

    await addItem('transactions', newTx);
    return Response.json({ success: true, data: newTx }, { status: 201 });
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ success: false, message: 'ID required' }, { status: 400 });
    await deleteItem('transactions', id);
    return Response.json({ success: true });
}
