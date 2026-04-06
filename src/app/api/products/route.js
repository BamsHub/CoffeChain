export const runtime = 'edge';
import { readDb, addItem, deleteItem, updateItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status'); // 'pending', 'published', or null (all)
        const db = await readDb('products');
        let items = db.items;
        if (statusFilter) items = items.filter(p => p.status === statusFilter);
        return Response.json({ success: true, data: items });
    } catch {
        return Response.json({ success: false, message: 'Gagal memuat produk' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, origin, grade, variety, roast, weight, pricePerUnit, description, stock, image, rating, sold,
                submittedBy, submittedByName, submittedByRole } = body;
        if (!name || !origin || !weight || !pricePerUnit) {
            return Response.json({ success: false, message: 'Nama, asal, berat, dan harga wajib diisi' }, { status: 400 });
        }
        if (!Array.isArray(weight) || !Array.isArray(pricePerUnit) || weight.length !== pricePerUnit.length) {
            return Response.json({ success: false, message: 'Berat dan harga harus array dengan panjang sama' }, { status: 400 });
        }
        const isFarmer = submittedByRole === 'farmer';
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
            status: isFarmer ? 'pending' : 'published',
            submittedBy: submittedBy || null,
            submittedByName: submittedByName || null,
            submittedByRole: submittedByRole || null,
            submittedAt: new Date().toISOString(),
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

// PATCH — update produk (termasuk stok, nama, harga, dll, status approval)
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        if (!id) return Response.json({ success: false, message: 'ID wajib diisi' }, { status: 400 });

        // Sanitize updates — only allow known fields
        const allowed = ['name', 'origin', 'grade', 'variety', 'roast', 'description', 'stock', 'weight', 'pricePerUnit', 'image', 'rating', 'status', 'approvedBy', 'approvedByName', 'approvedAt', 'rejectedReason'];
        const safeUpdates = {};
        for (const key of allowed) {
            if (key in updates) safeUpdates[key] = updates[key];
        }
        // stock must be non-negative integer
        if ('stock' in safeUpdates) safeUpdates.stock = Math.max(0, parseInt(safeUpdates.stock) || 0);

        const result = await updateItem('products', id, safeUpdates);

        // When product is approved — log to transactions table
        if (safeUpdates.status === 'published') {
            const db = await readDb('products');
            const product = db.items.find(p => p.id === id) || {};
            const logEntry = {
                id: `appr-${Date.now().toString(36)}`,
                hash: `APPROVAL-${id.slice(0, 8)}`,
                type: 'product_approval',
                farmer: product.submittedByName || 'Petani',
                farmerId: product.submittedBy || null,
                productId: id,
                productName: product.name || updates.name || '?',
                approvedBy: safeUpdates.approvedByName || safeUpdates.approvedBy || 'Admin',
                amount: 0,
                status: 'Confirmed',
                note: `Produk "${product.name}" disetujui oleh ${safeUpdates.approvedByName || 'Admin'} — kini tampil di katalog.`,
                createdAt: new Date().toISOString(),
            };
            await addItem('transactions', logEntry);
        }

        return Response.json({ success: true, data: result });
    } catch (err) {
        console.error('[products PATCH]', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
