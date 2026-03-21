import { readDb, writeDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function PATCH(request) {
    try {
        const { userId, oldPassword, newPassword } = await request.json();
        if (!userId || !oldPassword || !newPassword) {
            return Response.json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return Response.json({ success: false, message: 'Password baru minimal 6 karakter' }, { status: 400 });
        }

        const db = await readDb('users');
        const idx = db.items.findIndex(u => u.id === userId);
        if (idx === -1) return Response.json({ success: false, message: 'User tidak ditemukan' }, { status: 404 });

        const user = db.items[idx];
        const oldHash = hashPassword(oldPassword);
        if (user.password !== oldHash) {
            return Response.json({ success: false, message: 'Password lama salah' }, { status: 400 });
        }

        db.items[idx].password = hashPassword(newPassword);
        await writeDb('users', db);

        return Response.json({ success: true, message: 'Password berhasil diubah' });
    } catch (e) {
        return Response.json({ success: false, message: 'Server error: ' + e.message }, { status: 500 });
    }
}
