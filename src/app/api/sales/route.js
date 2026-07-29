export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { readDb } from '@/lib/db';

// ──────────────────────────────────────────────────────────────────
// Helper: verifikasi token → ambil objek user lengkap
// ──────────────────────────────────────────────────────────────────
async function getUserFromRequest(request) {
    const token =
        request.headers.get('Authorization')?.replace('Bearer ', '') ||
        new URL(request.url).searchParams.get('token');

    const session = await verifyToken(token);
    if (!session) return null;

    const db = await readDb('users');
    const user = db.items.find(u => u.id === session.userId);
    return user || null;
}

// ──────────────────────────────────────────────────────────────────
// GET /api/sales
// Mengembalikan semua data penjualan milik petani yang sedang login.
// Filter dilakukan di sisi server (user_id = user.id) sehingga
// satu petani tidak pernah bisa melihat data petani lain.
// ──────────────────────────────────────────────────────────────────
export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');   // opsional: filter status

        let query = supabaseAdmin
            .from('sales')
            .select('*')
            .eq('user_id', user.id)         // ← RLS di sisi API: hanya milik petani ini
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;

        // Konversi snake_case → camelCase supaya konsisten dengan frontend
        const rows = (data || []).map(r => ({
            id:            r.id,
            userId:        r.user_id,
            productName:   r.product_name,
            variety:       r.variety,
            grade:         r.grade,
            quantityKg:    Number(r.quantity_kg) || 0,
            pricePerKg:    Number(r.price_per_kg) || 0,
            totalPrice:    Number(r.total_price) || 0,
            buyerName:     r.buyer_name,
            paymentMethod: r.payment_method,
            status:        r.status,
            notes:         r.notes,
            createdAt:     r.created_at,
        }));

        return NextResponse.json({ success: true, data: rows, count: rows.length });
    } catch (err) {
        console.error('[GET /api/sales]', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────────────────────
// POST /api/sales
// Petani menambahkan entri penjualan baru.
// user_id diambil dari token — tidak bisa di-override oleh body.
// ──────────────────────────────────────────────────────────────────
export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (!['farmer', 'koperasi', 'developer', 'admin'].includes(user.role)) {
            return NextResponse.json({ success: false, error: 'Hanya petani yang bisa mencatat penjualan' }, { status: 403 });
        }

        const body = await request.json();
        const { productName, variety, grade, quantityKg, pricePerKg, buyerName, paymentMethod, notes } = body;

        if (!productName || !quantityKg || !pricePerKg) {
            return NextResponse.json({ success: false, error: 'productName, quantityKg, dan pricePerKg wajib diisi' }, { status: 400 });
        }

        const totalPrice = Math.round(Number(quantityKg) * Number(pricePerKg));

        const { data, error } = await supabaseAdmin
            .from('sales')
            .insert([{
                user_id:        user.id,   // selalu dari token, bukan dari body
                product_name:   productName,
                variety:        variety   || 'Arabika',
                grade:          grade     || 'Grade 1',
                quantity_kg:    Number(quantityKg),
                price_per_kg:   Number(pricePerKg),
                total_price:    totalPrice,
                buyer_name:     buyerName     || null,
                payment_method: paymentMethod || 'transfer',
                notes:          notes         || null,
                status:         'paid',       // default langsung lunas saat dicatat petani
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data: {
                id:            data.id,
                userId:        data.user_id,
                productName:   data.product_name,
                variety:       data.variety,
                grade:         data.grade,
                quantityKg:    Number(data.quantity_kg),
                pricePerKg:    Number(data.price_per_kg),
                totalPrice:    Number(data.total_price),
                buyerName:     data.buyer_name,
                paymentMethod: data.payment_method,
                status:        data.status,
                notes:         data.notes,
                createdAt:     data.created_at,
            },
        }, { status: 201 });
    } catch (err) {
        console.error('[POST /api/sales]', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// ──────────────────────────────────────────────────────────────────
// DELETE /api/sales?id=xxx
// Petani menghapus entri miliknya sendiri.
// Filter user_id memastikan petani lain tidak bisa menghapus.
// ──────────────────────────────────────────────────────────────────
export async function DELETE(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, error: 'id diperlukan' }, { status: 400 });

        // Filter ganda: id + user_id — petani lain tidak bisa menghapus baris ini
        const { error } = await supabaseAdmin
            .from('sales')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[DELETE /api/sales]', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
