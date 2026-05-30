import { NextResponse } from 'next/server';
import { readDb, addItem, updateItem } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

// GET — list all batches (or filter by stage / farmerId)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const stage = searchParams.get('stage');
        const farmerId = searchParams.get('farmerId');

        const supabase = getSupabaseAdmin();
        let query = supabase.from('production_batches').select('*').order('created_at', { ascending: false });

        if (stage) query = query.eq('current_stage', Number(stage));
        if (farmerId) query = query.eq('farmer_id', farmerId);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        // camelCase keys
        const items = (data || []).map(row => ({
            id: row.id,
            name: row.name,
            origin: row.origin,
            variety: row.variety,
            grade: row.grade,
            weightKg: row.weight_kg,
            farmerId: row.farmer_id,
            farmerName: row.farmer_name,
            currentStage: row.current_stage,
            coffeeId: row.coffee_id,
            productId: row.product_id,
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
        const body = await req.json();
        const { name, origin, variety, grade, weightKg, farmerId, farmerName, notes } = body;

        if (!name) return NextResponse.json({ success: false, message: 'Nama batch wajib diisi' }, { status: 400 });

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from('production_batches').insert({
            id: uuidv4(),
            name,
            origin: origin || null,
            variety: variety || null,
            grade: grade || null,
            weight_kg: weightKg || null,
            farmer_id: farmerId || null,
            farmer_name: farmerName || null,
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
        const body = await req.json();
        const { id, currentStage, coffeeId, productId, ...rest } = body;

        if (!id) return NextResponse.json({ success: false, message: 'id wajib' }, { status: 400 });

        const supabase = getSupabaseAdmin();
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
        const body = await req.json();
        const { id } = body;
        if (!id) return NextResponse.json({ success: false, message: 'id wajib' }, { status: 400 });

        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('production_batches').delete().eq('id', id);
        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
