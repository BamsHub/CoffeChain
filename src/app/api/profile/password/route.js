export const runtime = 'edge';
import { readDb, writeDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { verifyToken } from '@/lib/auth';

export async function PATCH(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { userId, oldPassword, newPassword } = await request.json();
        const targetUserId = userId || session.userId;

        // Security check: users can only change their own password
        if (targetUserId !== session.userId) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        if (!targetUserId || !oldPassword || !newPassword) {
            return Response.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return Response.json({ success: false, message: 'Password baru minimal 6 karakter' }, { status: 400 });
        }

        const db = await readDb('users');
        const idx = db.items.findIndex(u => u.id === targetUserId);
        if (idx === -1) return Response.json({ success: false, message: 'User tidak ditemukan' }, { status: 404 });

        const user = db.items[idx];
        const oldHash = await hashPassword(oldPassword);
        if (user.password !== oldHash) {
            return Response.json({ success: false, message: 'Password lama salah' }, { status: 400 });
        }

        db.items[idx].password = await hashPassword(newPassword);
        await writeDb('users', db);

        return Response.json({ success: true, message: 'Password berhasil diubah' });
    } catch (e) {
        return Response.json({ success: false, message: 'Server error: ' + e.message }, { status: 500 });
    }
}
