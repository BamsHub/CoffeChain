// Node.js runtime — supabaseAdmin requires Node.js crypto modules
export const runtime = 'nodejs';

import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { readDb } from '@/lib/db';

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
        const statusFilter      = searchParams.get('status');
        const submittedByFilter = searchParams.get('submittedBy');

        let query = supabaseAdmin.from('products').select('*').order('created_at', { ascending: false });
        if (statusFilter)      query = query.eq('status', statusFilter);
        if (submittedByFilter) query = query.eq('submitted_by', submittedByFilter);

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
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name, origin, grade, variety, roast,
            weight, pricePerUnit, description, stock,
            image, rating, sold, coffeeId,
            submittedBy, submittedByName, submittedByRole, source,
        } = body;

        if (source !== 'production_pipeline') {
            return Response.json({
                success: false,
                message: 'Produk baru wajib dibuat lewat Kelola Stok agar melewati upload bukti dan audit tahap produksi.',
            }, { status: 409 });
        }

        if (!name || !origin || !weight || !pricePerUnit) {
            return Response.json({ success: false, message: 'Nama, asal, berat, dan harga wajib diisi' }, { status: 400 });
        }
        if (!Array.isArray(weight) || !Array.isArray(pricePerUnit) || weight.length !== pricePerUnit.length) {
            return Response.json({ success: false, message: 'Berat dan harga harus array dengan panjang sama' }, { status: 400 });
        }

        let targetSubmittedBy = submittedBy;
        let targetSubmittedByName = submittedByName;
        let targetSubmittedByRole = submittedByRole;
        if (session.role === 'farmer') {
            targetSubmittedBy = session.userId;
            targetSubmittedByRole = 'farmer';
            const dbUsers = await readDb('users');
            const user = dbUsers.items.find(u => u.id === session.userId);
            if (user) {
                targetSubmittedByName = user.name;
            }
        }

        const isFarmer = targetSubmittedByRole === 'farmer';
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
            submitted_by: targetSubmittedBy || null,
            submitted_by_name: targetSubmittedByName || null,
            submitted_by_role: targetSubmittedByRole || null,
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
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();
        if (!id) return Response.json({ success: false, message: 'ID wajib diisi' }, { status: 400 });
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

        const { data: product, error: findErr } = await supabaseAdmin
            .from('products')
            .select('id, coffee_id, submitted_by')
            .eq('id', id)
            .maybeSingle();

        if (findErr || !product) {
            return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        }

        // Security check: if role is farmer, verify ownership of product
        if (session.role === 'farmer' && product.submitted_by !== session.userId) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
        if (error) throw error;

        if (isUuid) {
            const { error: batchErr } = await supabaseAdmin
                .from('production_batches')
                .delete()
                .eq('product_id', id);
            if (batchErr && !batchErr.message?.includes('does not exist')) {
                console.warn('[products DELETE] production batch cleanup failed:', batchErr.message);
            }
        }

        const { error: traceProductErr } = await supabaseAdmin
            .from('coffee_traces')
            .delete()
            .eq('product_id', id);
        if (traceProductErr && !traceProductErr.message?.includes('does not exist')) {
            console.warn('[products DELETE] trace cleanup by product failed:', traceProductErr.message);
        }

        if (product?.coffee_id) {
            const { error: traceCoffeeErr } = await supabaseAdmin
                .from('coffee_traces')
                .delete()
                .eq('coffee_id', product.coffee_id);
            if (traceCoffeeErr && !traceCoffeeErr.message?.includes('does not exist')) {
                console.warn('[products DELETE] trace cleanup by coffee ID failed:', traceCoffeeErr.message);
            }
        }

        return Response.json({ success: true });
    } catch (err) {
        console.error('[products DELETE]', err.message);
        return Response.json({ success: false, message: err.message }, { status: 500 });
    }
}

// ── PATCH /api/products ──────────────────────────────────────────
export async function PATCH(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;
        if (!id) return Response.json({ success: false, message: 'ID wajib diisi' }, { status: 400 });

        // Get existing product to verify ownership/status update permission
        const { data: product, error: findErr } = await supabaseAdmin
            .from('products')
            .select('submitted_by, status')
            .eq('id', id)
            .maybeSingle();

        if (findErr || !product) {
            return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        }

        // Security check: only koperasi or developer can approve/reject products
        if ('status' in updates && updates.status !== product.status) {
            if (!['koperasi', 'developer'].includes(session.role)) {
                return Response.json({ success: false, message: 'Forbidden: Hanya koperasi atau developer yang dapat menyetujui produk' }, { status: 403 });
            }
        }

        // Security check: if role is farmer, verify ownership of product for edits
        if (session.role === 'farmer') {
            if (product.submitted_by !== session.userId) {
                return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }
            // Prevent farmer from modifying approval-related status fields
            const forbiddenFields = ['approved_by', 'approved_by_name', 'approved_at', 'rejected_reason'];
            for (const f of forbiddenFields) {
                if (f in updates) {
                    return Response.json({ success: false, message: `Forbidden: Petani tidak dapat mengubah field ${f}` }, { status: 403 });
                }
            }
        }

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
