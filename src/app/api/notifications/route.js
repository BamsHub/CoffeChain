import { readDb, writeDb, addItem, updateItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const db = await readDb('notifications');
        let items = db.items || [];
        if (userId) items = items.filter(n => n.targetUserId === userId || n.targetUserId === 'all');
        // Sort newest first
        items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);
        return Response.json({ success: true, data: items });
    } catch {
        return Response.json({ success: false, message: 'Gagal memuat notifikasi' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { type, title, message, targetUserId = 'all', icon = '🔔', actorName, actorRole } = body;
        const notif = {
            id: uuidv4(),
            type: type || 'info',      // 'product_added' | 'info' | 'warning' | 'success'
            title: title || 'Notifikasi Baru',
            message: message || '',
            icon,
            actorName: actorName || 'Sistem',
            actorRole: actorRole || 'system',
            targetUserId,
            read: false,
            createdAt: new Date().toISOString(),
        };
        await addItem('notifications', notif);
        return Response.json({ success: true, data: notif }, { status: 201 });
    } catch {
        return Response.json({ success: false, message: 'Gagal membuat notifikasi' }, { status: 500 });
    }
}

// Mark as read: PATCH { id } or PATCH { markAllRead: true, userId }
export async function PATCH(request) {
    try {
        const body = await request.json();
        const db = await readDb('notifications');
        if (body.markAllRead) {
            db.items = db.items.map(n =>
                (n.targetUserId === body.userId || n.targetUserId === 'all') ? { ...n, read: true } : n
            );
            await writeDb('notifications', db);
        } else if (body.id) {
            await updateItem('notifications', body.id, { read: true });
        }
        return Response.json({ success: true });
    } catch {
        return Response.json({ success: false }, { status: 500 });
    }
}
