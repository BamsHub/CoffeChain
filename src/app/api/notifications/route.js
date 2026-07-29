export const runtime = 'edge';
import { readDb, writeDb, addItem, updateItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId') || session.userId;

        // Security check: users can only fetch their own notifications unless they are cooperative or developer
        if (userId !== session.userId && !['koperasi', 'developer', 'admin'].includes(session.role)) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const db = await readDb('notifications');
        let items = db.items || [];
        items = items.filter(n => n.targetUserId === userId || n.targetUserId === 'all');
        // Sort newest first
        items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30);
        return Response.json({ success: true, data: items });
    } catch {
        return Response.json({ success: false, message: 'Gagal memuat notifikasi' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { type, title, message, targetUserId = 'all', icon = 'info', actorName, actorRole } = body;
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
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const db = await readDb('notifications');
        if (body.markAllRead) {
            const targetUserId = body.userId || session.userId;

            // Security check: users can only mark their own notifications as read
            if (targetUserId !== session.userId && !['koperasi', 'developer', 'admin'].includes(session.role)) {
                return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }

            db.items = db.items.map(n =>
                (n.targetUserId === targetUserId || n.targetUserId === 'all') ? { ...n, read: true } : n
            );
            await writeDb('notifications', db);
        } else if (body.id) {
            // Check if notification belongs to the user
            const notif = db.items.find(n => n.id === body.id);
            if (notif && notif.targetUserId !== session.userId && notif.targetUserId !== 'all' && !['koperasi', 'developer', 'admin'].includes(session.role)) {
                return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }
            await updateItem('notifications', body.id, { read: true });
        }
        return Response.json({ success: true });
    } catch {
        return Response.json({ success: false }, { status: 500 });
    }
}
