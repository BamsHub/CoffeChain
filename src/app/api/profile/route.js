export const runtime = 'edge';
import { readDb, updateItem } from '@/lib/db';
import { sbSelect, sbUpdate, usersToSnake, usersToCamel } from '@/lib/sdb';
import { verifyToken } from '@/lib/auth';

async function findUser(userId) {
    // Coba Supabase
    const sbUsers = await sbSelect('users', { id: userId });
    if (sbUsers !== null && sbUsers.length > 0) return usersToCamel(sbUsers[0]);
    // Fallback JSON
    const db = await readDb('users');
    return db.items.find(u => u.id === userId) || null;
}

export async function GET(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId') || session.userId;

        // Security check: users can only fetch their own profile unless they are cooperative or developer
        if (userId !== session.userId && !['koperasi', 'developer', 'admin'].includes(session.role)) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const user = await findUser(userId);
        if (!user) return Response.json({ success: false, message: 'User not found' }, { status: 404 });
        const { password, ...safeUser } = user;
        return Response.json({ success: true, data: safeUser });
    } catch (e) {
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userId, name, bio, location, phone, language, avatar, photoBase64, wallet } = body;
        const targetUserId = userId || session.userId;

        // Security check: users can only update their own profile unless they are a developer
        if (targetUserId !== session.userId && !['developer', 'admin'].includes(session.role)) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const camelUpdates = {};
        if (name !== undefined) camelUpdates.name = name;
        if (bio !== undefined) camelUpdates.bio = bio;
        if (location !== undefined) camelUpdates.location = location;
        if (phone !== undefined) camelUpdates.phone = phone;
        if (language !== undefined) camelUpdates.language = language;
        if (avatar !== undefined) camelUpdates.avatar = avatar;
        if (photoBase64 !== undefined) camelUpdates.photoBase64 = photoBase64;
        if (wallet !== undefined) camelUpdates.wallet = wallet;

        // Coba Supabase
        const snakeUpdates = usersToSnake(camelUpdates);
        const sbResult = await sbUpdate('users', targetUserId, snakeUpdates);
        if (!sbResult) {
            // Fallback JSON
            await updateItem('users', targetUserId, camelUpdates);
        }
        return Response.json({ success: true, message: 'Profil diperbarui' });
    } catch (e) {
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}
