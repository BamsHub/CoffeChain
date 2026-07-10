export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { readDb } from '@/lib/db';
import { sbSelect, sbInsert, sbUpdate } from '@/lib/sdb';

const TABLE = 'contact_messages';
const CATEGORIES = new Set(['quality', 'delivery', 'payment', 'blockchain', 'account', 'suggestion', 'other']);

function generateId() {
    return `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function getToken(req) {
    return req.headers.get('Authorization')?.replace('Bearer ', '');
}

export async function GET(req) {
    try {
        const session = await verifyToken(getToken(req));
        if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        if (!['admin', 'developer'].includes(session.role)) {
            return NextResponse.json({ success: false, message: 'Pesan Pengaduan hanya dapat diakses admin' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const filters = {};
        if (searchParams.get('status')) filters.status = searchParams.get('status');
        if (searchParams.get('category')) filters.category = searchParams.get('category');

        const data = await sbSelect(TABLE, filters);
        if (data === null) {
            return NextResponse.json({ success: false, message: 'Database tiket tidak tersedia' }, { status: 503 });
        }
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return NextResponse.json({ success: true, messages: data, total: data.length });
    } catch (error) {
        console.error('[contact] GET error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const session = await verifyToken(getToken(req));
        if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        if (session.role !== 'farmer') {
            return NextResponse.json({ success: false, message: 'Tiket bantuan hanya dapat dibuat oleh petani' }, { status: 403 });
        }

        const { phone, category, urgency, subject, message } = await req.json();
        const cleanMessage = String(message || '').trim();
        const cleanSubject = String(subject || '').trim();
        if (!CATEGORIES.has(category)) return NextResponse.json({ success: false, message: 'Kategori tiket tidak valid' }, { status: 400 });
        if (!cleanSubject || cleanSubject.length > 140) return NextResponse.json({ success: false, message: 'Subjek harus berisi 1 sampai 140 karakter' }, { status: 400 });
        if (cleanMessage.length < 10 || cleanMessage.length > 2000) {
            return NextResponse.json({ success: false, message: 'Pesan harus berisi 10 sampai 2000 karakter' }, { status: 400 });
        }

        const cleanPhone = String(phone || '').trim();
        if (cleanPhone && !/^[+0-9()\s-]{7,25}$/.test(cleanPhone)) {
            return NextResponse.json({ success: false, message: 'Nomor HP tidak valid' }, { status: 400 });
        }

        const users = await readDb('users');
        const sender = users.items.find(user => user.id === session.userId);
        const row = {
            id: generateId(),
            sender_id: session.userId,
            name: sender?.name || sender?.email || `Petani ${session.userId}`,
            phone: cleanPhone || sender?.phone || null,
            category,
            urgency: ['normal', 'high', 'urgent'].includes(urgency) ? urgency : 'normal',
            subject: cleanSubject,
            message: cleanMessage,
            status: 'new',
            created_at: new Date().toISOString(),
        };

        const result = await sbInsert(TABLE, row);
        if (!result) {
            return NextResponse.json({ success: false, message: 'Tiket gagal disimpan ke database' }, { status: 503 });
        }
        return NextResponse.json({
            success: true,
            message: 'Tiket berhasil dibuat dan masuk ke Pesan Pengaduan admin.',
            id: result.id || row.id,
        }, { status: 201 });
    } catch (error) {
        console.error('[contact] POST error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const session = await verifyToken(getToken(req));
        if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        if (!['admin', 'developer'].includes(session.role)) {
            return NextResponse.json({ success: false, message: 'Pesan Pengaduan hanya dapat dikelola admin' }, { status: 403 });
        }

        const { id, status, admin_notes } = await req.json();
        if (!id) return NextResponse.json({ success: false, message: 'ID tiket wajib diisi' }, { status: 400 });
        if (status && !['new', 'read', 'replied', 'closed'].includes(status)) {
            return NextResponse.json({ success: false, message: 'Status tiket tidak valid' }, { status: 400 });
        }

        const updates = {};
        if (status) updates.status = status;
        if (admin_notes !== undefined) {
            const cleanNotes = String(admin_notes).trim();
            if (cleanNotes.length > 4000) return NextResponse.json({ success: false, message: 'Catatan admin maksimal 4000 karakter' }, { status: 400 });
            updates.admin_notes = cleanNotes;
        }
        if (status === 'replied') {
            updates.replied_at = new Date().toISOString();
            updates.replied_by = session.userId;
        }

        const result = await sbUpdate(TABLE, id, updates);
        if (!result) {
            return NextResponse.json({ success: false, message: 'Tiket gagal diperbarui di database' }, { status: 503 });
        }
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error('[contact] PATCH error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
