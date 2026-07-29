export const runtime = 'edge';
import { readDb } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/users
 * Query params:
 *   ?role=farmer  — filter by role
 *   ?count=true   — return only the count (no passwords)
 */
export async function GET(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session || !['koperasi', 'developer', 'admin'].includes(session.role)) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const roleFilter = searchParams.get('role');

        const db = await readDb('users');
        let users = db.items || [];

        if (roleFilter) {
            users = users.filter(u => u.role === roleFilter);
        }

        // Strip sensitive fields before returning
        const safe = users.map(({ password, ...rest }) => rest);

        return Response.json({ success: true, data: safe, count: safe.length });
    } catch (err) {
        return Response.json({ success: false, message: 'Server error', count: 0 }, { status: 500 });
    }
}
