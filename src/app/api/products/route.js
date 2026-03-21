import { readDb, addItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
    try {
        const db = await readDb('products');
        return Response.json({ success: true, data: db.items });
    } catch {
        return Response.json({ success: false, message: 'Gagal memuat produk' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, origin, grade, variety, roast, weight, pricePerUnit, description, stock, image, tags, rating, sold } = body;
        if (!name || !origin || !weight || !pricePerUnit) {
            return Response.json({ success: false, message: 'Nama, asal, berat, dan harga wajib diisi' }, { status: 400 });
        }
        if (!Array.isArray(weight) || !Array.isArray(pricePerUnit) || weight.length !== pricePerUnit.length) {
            return Response.json({ success: false, message: 'Berat dan harga harus array dengan panjang sama' }, { status: 400 });
        }
        const newProduct = {
            id: `prod-${uuidv4().slice(0, 8)}`,
            name: name.trim(),
            origin: origin.trim(),
            grade: grade || 'A',
            variety: variety || 'Arabika',
            roast: roast || 'Medium Roast',
            weight,
            pricePerUnit,
            description: description?.trim() || '',
            image: image || '☕',
            tags: tags || [variety, grade],
            stock: Number(stock) || 50,
            rating: Number(rating) || 4.5,
            sold: Number(sold) || 0,
        };
        await addItem('products', newProduct);

        // Auto-buat notifikasi ke semua user
        try {
            const notifBody = {
                type: 'product_added',
                title: '🛍️ Produk Kopi Baru Tersedia',
                message: `${newProduct.name} dari ${newProduct.origin} — mulai Rp ${newProduct.pricePerUnit?.[0]?.toLocaleString('id-ID') || '-'}`,
                targetUserId: 'all',
                icon: newProduct.image || '☕',
                actorName: body.addedByName || 'Koperasi',
                actorRole: body.addedByRole || 'koperasi',
            };
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/api/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notifBody),
            }).catch(() => { });
        } catch { /* notif optional */ }

        return Response.json({ success: true, data: newProduct }, { status: 201 });

    } catch (err) {
        console.error(err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
