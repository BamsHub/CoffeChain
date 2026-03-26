export const runtime = 'edge';
import { readDb, addItem, deleteItem } from '@/lib/db';
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
        const { name, origin, grade, variety, roast, weight, pricePerUnit, description, stock, image, rating, sold } = body;
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
            image: image || null,
            tags: [variety, grade].filter(Boolean),
            stock: Number(stock) || 50,
            rating: Number(rating) || 4.5,
            sold: Number(sold) || 0,
        };
        await addItem('products', newProduct);
        return Response.json({ success: true, data: newProduct }, { status: 201 });
    } catch (err) {
        console.error(err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { id } = await request.json();
        if (!id) return Response.json({ success: false, message: 'ID wajib diisi' }, { status: 400 });
        await deleteItem('products', id);
        return Response.json({ success: true });
    } catch {
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
