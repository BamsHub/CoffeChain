import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { readDb } from '@/lib/db';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
    canReviewAllPipelines,
    isPipelineAccountRole,
    ownsPipelineBatch,
} from '@/lib/productionAccess';
import { getFarmerProductionEligibility } from '@/lib/farmerVerificationServer';

export const runtime = 'nodejs';

function getToken(req) {
    return req.headers.get('Authorization')?.replace('Bearer ', '');
}

async function requireSession(req) {
    const session = await verifyToken(getToken(req));
    return session && isPipelineAccountRole(session.role) ? session : null;
}

async function getActorName(session) {
    try {
        const users = await readDb('users');
        const actor = users.items.find(item => item.id === session.userId);
        return actor?.name || actor?.email || session.userId;
    } catch {
        return session.userId;
    }
}

function cleanText(value, maxLength) {
    return String(value || '').trim().slice(0, maxLength);
}

export async function GET(req) {
    try {
        const session = await requireSession(req);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const stage = searchParams.get('stage');
        const reviewScope = searchParams.get('scope') === 'review' && canReviewAllPipelines(session.role);
        const requestedOwner = searchParams.get('ownerId');
        const ownerId = reviewScope ? requestedOwner : session.userId;

        const supabase = getSupabaseAdmin();
        let query = supabase.from('production_batches').select('*').order('created_at', { ascending: false });
        if (stage) {
            const stageNumber = Number(stage);
            if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > 6) {
                return NextResponse.json({ success: false, message: 'Stage tidak valid' }, { status: 400 });
            }
            query = query.eq('current_stage', stageNumber);
        }
        if (ownerId) query = query.eq('farmer_id', ownerId);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        let rows = data || [];
        const productIds = rows.map(row => row.product_id).filter(Boolean);
        const productById = new Map();
        if (productIds.length) {
            const { data: products, error: productError } = await supabase
                .from('products')
                .select('id, status, rejected_reason, coffee_id, approved_by, approved_by_name, approved_at')
                .in('id', productIds);
            if (productError) throw new Error(productError.message);
            for (const product of products || []) productById.set(product.id, product);
            rows = rows.filter(row => !row.product_id || productById.has(row.product_id));
        }

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
            approvedBy: productById.get(row.product_id)?.approved_by || null,
            approvedByName: productById.get(row.product_id)?.approved_by_name || null,
            approvedAt: productById.get(row.product_id)?.approved_at || null,
            approvalStatus: productById.get(row.product_id)?.status === 'published'
                ? 'approved'
                : productById.get(row.product_id)?.status === 'rejected'
                    ? 'rejected'
                    : row.product_id
                        ? 'pending'
                        : 'draft',
            canEdit: ownsPipelineBatch(session, row),
            canReview: reviewScope && Boolean(row.product_id)
                && productById.get(row.product_id)?.status === 'pending_certification',
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        return NextResponse.json({ success: true, data: items });
    } catch (error) {
        console.error('[production-batches GET]', error.message);
        return NextResponse.json({ success: false, message: 'Gagal memuat pipeline stok' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await requireSession(req);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const eligibility = await getFarmerProductionEligibility(session);
        if (!eligibility.eligible) {
            return NextResponse.json({
                success: false,
                message: eligibility.message,
                verificationStatus: eligibility.status,
                checklist: eligibility.checklist,
            }, { status: 403 });
        }

        const body = await req.json();
        const name = cleanText(body.name, 120);
        const origin = cleanText(body.origin, 160);
        const variety = cleanText(body.variety, 80);
        const grade = cleanText(body.grade, 40);
        const notes = cleanText(body.notes, 1000);
        const weightKg = Number(body.weightKg);

        if (!name || !origin) {
            return NextResponse.json({ success: false, message: 'Nama dan asal batch wajib diisi' }, { status: 400 });
        }
        if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 100_000) {
            return NextResponse.json({ success: false, message: 'Berat batch tidak valid' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.from('production_batches').insert({
            id: uuidv4(),
            name,
            origin,
            variety: variety || null,
            grade: grade || null,
            weight_kg: weightKg,
            farmer_id: session.userId,
            farmer_name: await getActorName(session),
            current_stage: 1,
            notes: notes || null,
        }).select().single();
        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
        console.error('[production-batches POST]', error.message);
        return NextResponse.json({ success: false, message: 'Gagal membuat batch' }, { status: 500 });
    }
}

// Tahap, product ID, dan Coffee ID hanya diubah secara internal oleh route tahap
// produksi dan route registrasi Solana; klien tidak boleh melompati pipeline.
export async function PATCH(req) {
    const session = await requireSession(req);
    if (!session) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
        success: false,
        message: 'Pipeline hanya dapat dilanjutkan melalui penyelesaian Tahap 1-6.',
    }, { status: 409 });
}

export async function DELETE(req) {
    try {
        const session = await requireSession(req);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ success: false, message: 'id wajib' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: batch, error: findError } = await supabase
            .from('production_batches')
            .select('id, farmer_id, product_id, coffee_id')
            .eq('id', id)
            .maybeSingle();
        if (findError || !batch) {
            return NextResponse.json({ success: false, message: 'Batch tidak ditemukan' }, { status: 404 });
        }
        if (!ownsPipelineBatch(session, batch)) {
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
    } catch (error) {
        console.error('[production-batches DELETE]', error.message);
        return NextResponse.json({ success: false, message: 'Gagal menghapus batch' }, { status: 500 });
    }
}
