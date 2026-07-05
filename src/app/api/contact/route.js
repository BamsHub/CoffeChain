export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sbSelect, sbInsert, sbUpdate } from '@/lib/sdb';
import fs from 'fs';
import path from 'path';

const TABLE = 'contact_messages';
const LOCAL_FILE = path.join(process.cwd(), 'data', 'contact_messages.json');

function generateId() {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Local JSON Fallback Helpers ─────────────────────────────────
function getLocalMessages() {
    try {
        if (!fs.existsSync(LOCAL_FILE)) return [];
        const content = fs.readFileSync(LOCAL_FILE, 'utf-8');
        const json = JSON.parse(content);
        return json.items || [];
    } catch (e) {
        console.error('[Contact] Error reading local file:', e.message);
        return [];
    }
}

function saveLocalMessages(items) {
    try {
        const dir = path.dirname(LOCAL_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(LOCAL_FILE, JSON.stringify({ items }, null, 2), 'utf-8');
    } catch (e) {
        console.error('[Contact] Error saving local file:', e.message);
    }
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

        let data = await sbSelect(TABLE, filters);

        // If Supabase table is not configured or fails, fallback cleanly to local JSON
        if (data === null) {
            console.log('[Contact] Supabase table not accessible, loading from local JSON');
            data = getLocalMessages();
            if (status) data = data.filter(item => item.status === status);
            if (category) data = data.filter(item => item.category === category);
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

        let result = await sbInsert(TABLE, row);

        // Fallback to local JSON if Supabase fails
        if (!result) {
            console.log('[Contact] Supabase insert failed, saving to local JSON');
            const items = getLocalMessages();
            items.unshift(row);
            saveLocalMessages(items);
            result = row;
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

        let result = await sbUpdate(TABLE, id, updates);

        // Fallback to local JSON if Supabase fails
        if (!result) {
            console.log('[Contact] Supabase update failed, updating local JSON');
            const items = getLocalMessages();
            const idx = items.findIndex(item => item.id === id);
            if (idx !== -1) {
                items[idx] = { ...items[idx], ...updates };
                saveLocalMessages(items);
                result = items[idx];
            } else {
                return NextResponse.json({ success: false, message: 'Message not found in local storage' }, { status: 404 });
            }
        }

        console.log(`[Contact] Updated ${id}: status=${status}`);

        return NextResponse.json({ success: true, data: result });
    } catch (err) {
        console.error('[Contact] PATCH error:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
