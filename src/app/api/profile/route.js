import { readDb, updateItem } from '@/lib/db';
import { sbSelect, sbUpdate, usersToSnake, usersToCamel } from '@/lib/sdb';

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
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return Response.json({ success: false, message: 'userId required' }, { status: 400 });
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
        const body = await request.json();
        const { userId, name, bio, location, phone, language, avatar, photoBase64, wallet } = body;
        if (!userId) return Response.json({ success: false, message: 'userId required' }, { status: 400 });

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
        const sbResult = await sbUpdate('users', userId, snakeUpdates);
        if (!sbResult) {
            // Fallback JSON
            await updateItem('users', userId, camelUpdates);
        }
        return Response.json({ success: true, message: 'Profil diperbarui' });
    } catch (e) {
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}
