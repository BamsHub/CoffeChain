import { readDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token') || request.headers.get('Authorization')?.replace('Bearer ', '');

        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Session tidak valid atau sudah kadaluarsa' }, { status: 401 });
        }

        const db = await readDb('users');
        const user = db.items.find(u => u.id === session.userId);
        if (!user) {
            return Response.json({ success: false, message: 'User tidak ditemukan' }, { status: 404 });
        }

        const { password: _, ...safeUser } = user;
        return Response.json({ success: true, user: safeUser, session });
    } catch (err) {
        return Response.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
    }
}
