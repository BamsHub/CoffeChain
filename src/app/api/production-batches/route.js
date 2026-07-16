import { NextResponse } from 'next/server';
import { readDb, addItem, updateItem } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';

// GET — list all batches (or filter by stage / farmerId)
export async function GET(req) {
    try {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '') || new URL(req.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const stage = searchParams.get('stage');
        const farmerId = searchParams.get('farmerId');

        let targetFarmerId = farmerId;
        if (session.role === 'farmer') {
            targetFarmerId = session.userId;
        }

        const supabase = getSupabaseAdmin();
        let query = supabase.from('production_batches').select('*').order('created_at', { ascending: false });

        if (stage) query = query.eq('current_stage', Number(stage));
        if (targetFarmerId) query = query.eq('farmer_id', targetFarmerId);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        let rows = data || [];
        const productIds = rows.map(row => row.product_id).filter(Boolean);
        const productById = new Map();
        if (productIds.length) {
            const { data: existingProducts, error: productErr } = await supabase
                .from('products')
                .select('id, status, rejected_reason, coffee_id')
                .in('id', productIds);
            if (!productErr) {
                for (const product of existingProducts || []) productById.set(product.id, product);
                const existingProductIds = new Set((existingProducts || []).map(product => product.id));
                rows = rows.filter(row => !row.product_id || existingProductIds.has(row.product_id));
            }
        }

        // camelCase keys
        const items = rows.map(row => ({
            id: row.id,
            name: row.name,
            origin: row.origin,
            variety: row.variety,
            grade: row.grade,
            weightKg: row.weight_kg,
            farmerId: row.farmer_id,
            farmerName: row.farmer_name,
            currentStage: row.current_stage,
            coffeeId: row.coffee_id || productById.get(row.product_id)?.coffee_id || null,
            productId: row.product_id,
            productStatus: productById.get(row.product_id)?.status || null,
            rejectedReason: productById.get(row.product_id)?.rejected_reason || null,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        return NextResponse.json({ success: true, data: items });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// POST — create new batch (starts at stage 1)
export async function POST(req) {
    try {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '') || new URL(req.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, origin, variety, grade, weightKg, farmerId, farmerName, notes } = body;

        if (!name) return NextResponse.json({ success: false, message: 'Nama batch wajib diisi' }, { status: 400 });

        let targetFarmerId = farmerId;
        let targetFarmerName = farmerName;
        if (session.role === 'farmer') {
            targetFarmerId = session.userId;
            const dbUsers = await readDb('users');
            const user = dbUsers.items.find(u => u.id === session.userId);
            if (user) {
                targetFarmerName = user.name;
            }
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from('production_batches').insert({
            id: uuidv4(),
            name,
            origin: origin || null,
            variety: variety || null,
            grade: grade || null,
            weight_kg: weightKg || null,
            farmer_id: targetFarmerId || null,
            farmer_name: targetFarmerName || null,
            current_stage: 1,
            notes: notes || null,
        }).select().single();

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// PATCH — update batch (advance stage, attach coffeeId, etc.)
export async function PATCH(req) {
    try {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '') || new URL(req.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, currentStage, coffeeId, productId, ...rest } = body;

        if (!id) return NextResponse.json({ success: false, message: 'id wajib' }, { status: 400 });

        const supabase = getSupabaseAdmin();

        // Security check: if role is farmer, verify ownership
        if (session.role === 'farmer') {
            const { data: batch, error: checkErr } = await supabase.from('production_batches').select('farmer_id').eq('id', id).single();
            if (checkErr || !batch) {
                return NextResponse.json({ success: false, message: 'Batch tidak ditemukan' }, { status: 404 });
            }
            if (batch.farmer_id !== session.userId) {
                return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }
        }

        const updates = { updated_at: new Date().toISOString() };
        if (currentStage !== undefined) updates.current_stage = currentStage;
        if (coffeeId !== undefined) updates.coffee_id = coffeeId;
        if (productId !== undefined) updates.product_id = productId;

        const { data, error } = await supabase.from('production_batches')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// DELETE
export async function DELETE(req) {
    try {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '') || new URL(req.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id } = body;
        if (!id) return NextResponse.json({ success: false, message: 'id wajib' }, { status: 400 });

        const supabase = getSupabaseAdmin();

        const { data: batch, error: checkErr } = await supabase
            .from('production_batches')
            .select('id, name, farmer_id, product_id, coffee_id')
            .eq('id', id)
            .single();
        if (checkErr || !batch) {
            return NextResponse.json({ success: false, message: 'Batch tidak ditemukan' }, { status: 404 });
        }

        if (session.role === 'farmer' && batch.farmer_id !== session.userId) {
            return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        if (batch.product_id || batch.coffee_id) {
            return NextResponse.json({
                success: false,
                message: 'Pipeline yang sudah menjadi produk atau memiliki sertifikat tidak dapat dibatalkan',
            }, { status: 409 });
        }

        const { error } = await supabase.from('production_batches').delete().eq('id', id);
        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
