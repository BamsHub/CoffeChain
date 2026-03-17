import { readDb, writeDb, addItem, updateItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const db = await readDb('markets');
        if (id) {
            const item = db.items.find(m => m.id === id);
            if (!item) return Response.json({ success: false, message: 'Market tidak ditemukan' }, { status: 404 });
            return Response.json({ success: true, data: item });
        }
        // Enrich with farmer details
        const farmersDb = await readDb('farmers');
        const ordersDb = await readDb('orders');
        const enriched = db.items.map(mkt => {
            const farmers = farmersDb.items.filter(f => (mkt.farmerIds || []).includes(f.id));
            const paidOrders = ordersDb.items.filter(o => o.status === 'paid' && o.marketId === mkt.id);
            return {
                ...mkt,
                farmerCount: farmers.length,
                farmers: farmers.map(f => ({ id: f.id, name: f.name, region: f.region, type: f.type, rating: f.rating, status: f.status })),
                orderCount: paidOrders.length,
                totalRevenue: paidOrders.reduce((s, o) => s + (o.totalPrice || 0), 0),
            };
        });
        return Response.json({ success: true, data: enriched });
    } catch (err) {
        console.error(err);
        return Response.json({ success: false, message: 'Gagal memuat market' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, region, description, icon, type, farmerIds, coverColor, createdBy } = body;
        if (!name || !region) return Response.json({ success: false, message: 'Nama dan region wajib diisi' }, { status: 400 });
        const farmersDb = await readDb('farmers');
        const validFarmerIds = (farmerIds || []).filter(id => farmersDb.items.find(f => f.id === id));
        const newMarket = {
            id: `mkt-${uuidv4().slice(0, 6)}`,
            name: name.trim(),
            slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
            region: region.trim(),
            description: (description || '').trim(),
            icon: icon || '☕',
            coverColor: coverColor || '#2D5016',
            type: type || 'Arabika',
            status: 'active',
            farmerIds: validFarmerIds,
            farmerCount: validFarmerIds.length,
            totalVolume: 0,
            avgRating: 0,
            totalRevenue: 0,
            orderCount: 0,
            createdAt: new Date().toISOString(),
            createdBy: createdBy || 'developer',
        };
        await addItem('markets', newMarket);
        return Response.json({ success: true, data: newMarket }, { status: 201 });
    } catch (err) {
        console.error(err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        if (!id) return Response.json({ success: false, message: 'ID wajib diisi' }, { status: 400 });
        if (updates.farmerIds) {
            const farmersDb = await readDb('farmers');
            updates.farmerIds = updates.farmerIds.filter(fid => farmersDb.items.find(f => f.id === fid));
            updates.farmerCount = updates.farmerIds.length;
        }
        await updateItem('markets', id, updates);
        return Response.json({ success: true });
    } catch {
        return Response.json({ success: false }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return Response.json({ success: false }, { status: 400 });
        const db = await readDb('markets');
        db.items = db.items.filter(m => m.id !== id);
        await writeDb('markets', db);
        return Response.json({ success: true });
    } catch {
        return Response.json({ success: false }, { status: 500 });
    }
}
