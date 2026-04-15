// Node.js runtime — supabaseAdmin requires Node.js crypto modules
export const runtime = 'nodejs';

import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// ── Key converters ───────────────────────────────────────────────
function toSnake(str) {
    return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}
function toCamel(str) {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function convertKeys(obj, converter) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const result = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[converter(key)] = obj[key];
        }
    }
    return result;
}

// ── GET /api/products ────────────────────────────────────────────
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status');

        let query = supabaseAdmin.from('products').select('*');
        if (statusFilter) query = query.eq('status', statusFilter);

        const { data, error } = await query;
        if (error) throw error;

        const items = (data || []).map(row => convertKeys(row, toCamel));
        return Response.json({ success: true, data: items });
    } catch (err) {
        console.error('[products GET]', err.message);
        return Response.json({ success: false, message: err.message }, { status: 500 });
    }
}

// ── POST /api/products ───────────────────────────────────────────
export async function POST(request) {
    try {
        const body = await request.json();
        const {
            name, origin, grade, variety, roast,
            weight, pricePerUnit, description, stock,
            image, rating, sold, coffeeId,
            submittedBy, submittedByName, submittedByRole,
        } = body;

        if (!name || !origin || !weight || !pricePerUnit) {
            return Response.json({ success: false, message: 'Nama, asal, berat, dan harga wajib diisi' }, { status: 400 });
        }
        if (!Array.isArray(weight) || !Array.isArray(pricePerUnit) || weight.length !== pricePerUnit.length) {
            return Response.json({ success: false, message: 'Berat dan harga harus array dengan panjang sama' }, { status: 400 });
        }

        const isFarmer = submittedByRole === 'farmer';
        const now = new Date().toISOString();
        const prodId = `prod-${uuidv4().slice(0, 8)}`;

        // Build insert payload in snake_case directly to avoid conversion issues
        const insertPayload = {
            id: prodId,
            name: name.trim(),
            origin: origin.trim(),
            grade: grade || 'A',
            variety: variety || 'Arabika',
            roast: roast || 'Medium Roast',
            weight,
            price_per_unit: pricePerUnit,
            description: description?.trim() || '',
            image: image || null,
            tags: [variety, grade].filter(Boolean),
            stock: Number(stock) || 50,
            rating: Number(rating) || 4.5,
            sold: Number(sold) || 0,
        };

        // Add optional columns (only if they exist in schema — try full then fallback)
        const optionalFields = {
            status: isFarmer ? 'pending' : 'published',
            coffee_id: coffeeId || null,
            submitted_by: submittedBy || null,
            submitted_by_name: submittedByName || null,
            submitted_by_role: submittedByRole || null,
            submitted_at: now,
        };

        // Try full insert first
        let { data, error } = await supabaseAdmin
            .from('products')
            .insert({ ...insertPayload, ...optionalFields })
            .select()
            .single();

        if (error && error.message.includes('column')) {
            // Fallback: insert only guaranteed base columns
            console.warn('[products POST] Falling back to base columns due to:', error.message);
            ({ data, error } = await supabaseAdmin
                .from('products')
                .insert(insertPayload)
                .select()
                .single());
        }

        if (error) {
            console.error('[products POST] Insert error:', error.message, error.details);
            return Response.json({ success: false, message: error.message }, { status: 500 });
        }

        return Response.json({ success: true, data: convertKeys(data, toCamel) }, { status: 201 });
    } catch (err) {
        console.error('[products POST] Exception:', err.message);
        return Response.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
    }
}

// ── DELETE /api/products ─────────────────────────────────────────
export async function DELETE(request) {
    try {
        const { id } = await request.json();
        if (!id) return Response.json({ success: false, message: 'ID wajib diisi' }, { status: 400 });

        const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
        if (error) throw error;

        return Response.json({ success: true });
    } catch (err) {
        console.error('[products DELETE]', err.message);
        return Response.json({ success: false, message: err.message }, { status: 500 });
    }
}

// ── PATCH /api/products ──────────────────────────────────────────
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;
        if (!id) return Response.json({ success: false, message: 'ID wajib diisi' }, { status: 400 });

        // Build snake_case update object with allowed fields only
        const fieldMap = {
            name: 'name', origin: 'origin', grade: 'grade', variety: 'variety',
            roast: 'roast', description: 'description', stock: 'stock',
            weight: 'weight', pricePerUnit: 'price_per_unit', image: 'image', rating: 'rating',
            status: 'status', coffeeId: 'coffee_id', paymentWallet: 'payment_wallet',
            approvedBy: 'approved_by', approvedByName: 'approved_by_name',
            approvedAt: 'approved_at', rejectedReason: 'rejected_reason',
        };

        const patchPayload = {};
        for (const [camel, snake] of Object.entries(fieldMap)) {
            if (camel in updates) {
                patchPayload[snake] = updates[camel];
            }
        }
        if ('stock' in patchPayload) patchPayload.stock = Math.max(0, parseInt(patchPayload.stock) || 0);

        const { data, error } = await supabaseAdmin
            .from('products')
            .update(patchPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[products PATCH] Update error:', error.message, error.details);
            return Response.json({ success: false, message: error.message }, { status: 500 });
        }

        const result = convertKeys(data, toCamel);

        // Log approval to transactions
        if (updates.status === 'published') {
            const logEntry = {
                id: `appr-${Date.now().toString(36)}`,
                hash: `APPROVAL-${id.slice(0, 8)}`,
                farmer: updates.submittedByName || 'Petani',
                amount: 0,
                status: 'Confirmed',
                note: `Produk "${updates.name || id}" disetujui.`,
            };
            // Try with extra columns, ignore failure if columns missing
            const extendedLog = {
                ...logEntry,
                type: 'product_approval',
                product_id: id,
                product_name: updates.name || id,
                approved_by: updates.approvedByName || updates.approvedBy || 'Admin',
            };
            const { error: txErr } = await supabaseAdmin.from('transactions').insert(extendedLog);
            if (txErr) {
                // Retry with base fields only
                await supabaseAdmin.from('transactions').insert(logEntry).catch(() => {});
            }
        }

        return Response.json({ success: true, data: result });
    } catch (err) {
        console.error('[products PATCH] Exception:', err.message);
        return Response.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
    }
}
