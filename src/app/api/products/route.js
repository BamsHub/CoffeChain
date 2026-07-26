export const runtime = 'nodejs';

import { verifyToken } from '@/lib/auth';
import { readDb } from '@/lib/db';
import { getCompleteProductionAudit } from '@/lib/productionAudit';
import { supabaseAdmin } from '@/lib/supabase';

const ACCOUNT_ROLES = new Set(['farmer', 'koperasi', 'developer', 'admin']);
const REVIEW_ROLES = new Set(['koperasi', 'developer', 'admin']);

function toCamel(str) {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function convertKeys(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [toCamel(key), value]));
}

function withOffchainReferences(product) {
    const tags = Array.isArray(product.tags) ? product.tags.map(String) : [];
    const valueAfter = prefix => tags.find(tag => tag.startsWith(prefix))?.slice(prefix.length) || null;
    return {
        ...product,
        offchain: {
            imageCid: valueAfter('ipfs-image:'),
            metadataCid: valueAfter('ipfs-metadata:'),
            proofTxSignature: valueAfter('offchain-proof:'),
        },
    };
}

async function requireSession(request) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const session = await verifyToken(token);
    return session && ACCOUNT_ROLES.has(session.role) ? session : null;
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

export async function GET(request) {
    try {
        const session = await requireSession(request);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status');
        const submittedByFilter = searchParams.get('submittedBy');
        const mineOnly = searchParams.get('scope') === 'mine';
        const canReviewAll = REVIEW_ROLES.has(session.role);

        let query = supabaseAdmin.from('products').select('*').order('created_at', { ascending: false });
        if (statusFilter) query = query.eq('status', statusFilter);
        if (!canReviewAll || mineOnly) {
            query = query.eq('submitted_by', session.userId);
        } else if (submittedByFilter) {
            query = query.eq('submitted_by', submittedByFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        const items = (data || []).map(row => withOffchainReferences(convertKeys(row)));
        return Response.json({ success: true, data: items });
    } catch (error) {
        console.error('[products GET]', error.message);
        return Response.json({ success: false, message: 'Gagal memuat produk' }, { status: 500 });
    }
}

// Produk baru hanya boleh dibuat oleh production-stages setelah tahap 1-6 selesai.
export async function POST(request) {
    const session = await requireSession(request);
    if (!session) {
        return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    return Response.json({
        success: false,
        message: 'Produk baru hanya dibuat otomatis setelah Pipeline Tahap 1-6 selesai di Kelola Stok.',
    }, { status: 409 });
}

// Soft-delete katalog off-chain. Coffee ID, signature, bukti, dan pipeline tidak dihapus.
export async function DELETE(request) {
    try {
        const session = await requireSession(request);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();
        if (!id) {
            return Response.json({ success: false, message: 'ID wajib diisi' }, { status: 400 });
        }

        const { data: product, error: findError } = await supabaseAdmin
            .from('products')
            .select('id, coffee_id, submitted_by, status')
            .eq('id', id)
            .maybeSingle();
        if (findError || !product) {
            return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        }

        const isOwner = product.submitted_by === session.userId;
        if (!isOwner && !REVIEW_ROLES.has(session.role)) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const { data, error } = await supabaseAdmin
            .from('products')
            .update({ status: 'archived' })
            .eq('id', id)
            .select('id, name, status, coffee_id')
            .single();
        if (error) throw error;

        return Response.json({
            success: true,
            archived: true,
            onchainPreserved: Boolean(product.coffee_id),
            data: convertKeys(data),
            message: product.coffee_id
                ? 'Produk diarsipkan dari katalog. Coffee ID dan sertifikat Solana tetap tersimpan.'
                : 'Produk diarsipkan dari katalog.',
        });
    } catch (error) {
        console.error('[products DELETE]', error.message);
        return Response.json({ success: false, message: 'Gagal mengarsipkan produk' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const session = await requireSession(request);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, action, status, rejectedReason } = body;
        if (!id) {
            return Response.json({ success: false, message: 'ID wajib diisi' }, { status: 400 });
        }

        const { data: product, error: findError } = await supabaseAdmin
            .from('products')
            .select('id, name, submitted_by, status, coffee_id')
            .eq('id', id)
            .maybeSingle();
        if (findError || !product) {
            return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        }

        const isOwner = product.submitted_by === session.userId;
        const isReviewer = REVIEW_ROLES.has(session.role);

        if (action === 'resubmit') {
            if (!isOwner) {
                return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }
            if (product.status !== 'rejected' || product.coffee_id) {
                return Response.json({
                    success: false,
                    message: 'Hanya produk ditolak yang belum tersertifikasi dapat diajukan ulang',
                }, { status: 409 });
            }

            await getCompleteProductionAudit(id);
            const { data, error } = await supabaseAdmin
                .from('products')
                .update({
                    status: 'pending_certification',
                    rejected_reason: null,
                    approved_by: null,
                    approved_by_name: null,
                    approved_at: null,
                    submitted_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return Response.json({ success: true, resubmitted: true, data: convertKeys(data) });
        }

        if (action === 'restore') {
            if (!isOwner && !isReviewer) {
                return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }
            if (!product.coffee_id) {
                return Response.json({
                    success: false,
                    message: 'Produk belum memiliki sertifikat Solana dan tidak dapat dipublikasikan.',
                }, { status: 409 });
            }

            const { data, error } = await supabaseAdmin
                .from('products')
                .update({ status: 'published' })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return Response.json({ success: true, restored: true, data: convertKeys(data) });
        }

        if (status === 'published') {
            return Response.json({
                success: false,
                message: 'Persetujuan produk wajib melalui Register Coffee dan transaksi Solana server yang terkonfirmasi.',
            }, { status: 409 });
        }

        if (status === 'rejected') {
            if (!isReviewer) {
                return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }
            if (product.coffee_id) {
                return Response.json({
                    success: false,
                    message: 'Produk yang sudah tersertifikasi Solana tidak dapat ditolak atau diubah.',
                }, { status: 409 });
            }

            const actorName = await getActorName(session);
            const reason = String(rejectedReason || 'Tidak memenuhi standar').trim().slice(0, 500);
            const { data, error } = await supabaseAdmin
                .from('products')
                .update({
                    status: 'rejected',
                    rejected_reason: reason,
                    approved_by: session.userId,
                    approved_by_name: actorName,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return Response.json({ success: true, data: convertKeys(data) });
        }

        if (!isOwner) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        // Metadata produk berasal dari audit tahap produksi. Setelah itu penjual hanya
        // boleh mengatur stok; metadata tersertifikasi dan signature tetap immutable.
        const allowedKeys = new Set(['id', 'stock']);
        const attemptedMetadataChange = Object.keys(body).some(key => !allowedKeys.has(key));
        if (attemptedMetadataChange) {
            return Response.json({
                success: false,
                message: 'Ubah data produk melalui Pipeline Kelola Stok. Setelah tersertifikasi, hanya stok yang dapat diubah.',
            }, { status: 409 });
        }

        const stock = Number(body.stock);
        if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
            return Response.json({ success: false, message: 'Stok tidak valid' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('products')
            .update({ stock })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;

        return Response.json({ success: true, data: convertKeys(data) });
    } catch (error) {
        console.error('[products PATCH]', error.message);
        return Response.json({ success: false, message: error.message || 'Gagal memperbarui produk' }, { status: 500 });
    }
}
