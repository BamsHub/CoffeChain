export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sbSelect, sbInsert, sbUpdate } from '@/lib/sdb';

const TABLE = 'contact_messages';

function generateId() {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** GET — Fetch contact messages (admin only) */
export async function GET(req) {
    try {
        // Auth required for viewing messages
        const token = req.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session || !['admin', 'developer'].includes(session.role)) {
            return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const category = searchParams.get('category');

        const filters = {};
        if (status) filters.status = status;
        if (category) filters.category = category;

        const data = await sbSelect(TABLE, filters);

        if (data === null) {
            return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 503 });
        }

        // Sort by created_at DESC
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return NextResponse.json({
            success: true,
            messages: data,
            total: data.length,
        });
    } catch (err) {
        console.error('[Contact] GET error:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

/** POST — Submit a new contact message (public, no auth) */
export async function POST(req) {
    try {
        const body = await req.json();
        const { name, phone, category, urgency, subject, message } = body;

        if (!category) {
            return NextResponse.json({ success: false, message: 'Kategori wajib diisi' }, { status: 400 });
        }
        if (!message || !message.trim()) {
            return NextResponse.json({ success: false, message: 'Pesan wajib diisi' }, { status: 400 });
        }

        const row = {
            id: generateId(),
            name: name || null,
            phone: phone || null,
            category,
            urgency: urgency || 'normal',
            subject: subject || null,
            message: message.trim(),
            status: 'new',
            created_at: new Date().toISOString(),
        };

        const result = await sbInsert(TABLE, row);

        if (!result) {
            return NextResponse.json({ success: false, message: 'Database belum dikonfigurasi. Silakan gunakan WhatsApp.' }, { status: 503 });
        }

        console.log(`[Contact] New message: ${row.id} — ${category}`);

        return NextResponse.json({
            success: true,
            message: 'Pengaduan berhasil dikirim! Tim kami akan segera merespons.',
            id: row.id,
        });
    } catch (err) {
        console.error('[Contact] POST error:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

/** PATCH — Update message status/notes (admin only) */
export async function PATCH(req) {
    try {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session || !['admin', 'developer'].includes(session.role)) {
            return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
        }

        const body = await req.json();
        const { id, status, admin_notes } = body;

        if (!id) {
            return NextResponse.json({ success: false, message: 'Message ID required' }, { status: 400 });
        }

        const updates = {};
        if (status) updates.status = status;
        if (admin_notes !== undefined) updates.admin_notes = admin_notes;
        if (status === 'replied') {
            updates.replied_at = new Date().toISOString();
            updates.replied_by = session.userId;
        }

        const result = await sbUpdate(TABLE, id, updates);

        if (!result) {
            return NextResponse.json({ success: false, message: 'Update failed' }, { status: 500 });
        }

        console.log(`[Contact] Updated ${id}: status=${status}`);

        return NextResponse.json({ success: true, data: result });
    } catch (err) {
        console.error('[Contact] PATCH error:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
