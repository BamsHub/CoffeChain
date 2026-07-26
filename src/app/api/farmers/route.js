export const runtime = 'edge';
import { readDb, addItem } from '@/lib/db';
import { sbSelect, usersToCamel } from '@/lib/sdb';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

function normalizeFarmer(row, source = 'farmers') {
    const active = row.active !== false && row.status !== 'Inactive';
    const status = row.status || (active ? 'Verified' : 'Pending');
    return {
        id: row.id,
        name: row.name || row.email?.split('@')[0] || 'Petani',
        region: row.region || row.location || '-',
        type: row.type || (source === 'users' ? 'Individu' : 'Petani'),
        members: Number(row.members) || 1,
        volume: Number(row.volume ?? row.total_harvest) || 0,
        earnings: Number(row.earnings) || 0,
        status,
        active,
        rating: row.rating ?? 0,
        joined: row.joined || row.join_date || row.createdAt?.slice(0, 10) || row.created_at?.slice(0, 10) || '',
        wallet: row.wallet || '',
        certifications: row.certifications || (row.certification ? [row.certification] : []),
        notes: row.notes || '',
    };
}

function uniqueById(items) {
    const seen = new Set();
    return items.filter(item => {
        if (!item?.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
}

function publicFarmer(item) {
    return {
        id: item.id,
        name: item.name,
        region: item.region,
        type: item.type,
        volume: item.volume,
        status: item.status,
        active: item.active,
        rating: item.rating,
        joined: item.joined,
        certifications: item.certifications,
    };
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || searchParams.get('token');
        const session = await verifyToken(token);
        const canViewAll = session && ['koperasi', 'developer', 'admin'].includes(session.role);

        const [farmersRows, userRows] = await Promise.all([
            sbSelect('farmers', {}),
            sbSelect('users', { role: 'farmer' }),
        ]);

        let farmers = [];
        if (farmersRows) farmers.push(...farmersRows.map(row => normalizeFarmer(row, 'farmers')));
        if (userRows) farmers.push(...userRows.map(row => normalizeFarmer(usersToCamel(row), 'users')));

        if (!farmersRows && !userRows) {
            const farmersDb = await readDb('farmers');
            const usersDb = await readDb('users');
            farmers = [
                ...(farmersDb.items || []).map(row => normalizeFarmer(row, 'farmers')),
                ...(usersDb.items || []).filter(row => row.role === 'farmer').map(row => normalizeFarmer(row, 'users')),
            ];
        }

        farmers = uniqueById(farmers)
            .filter(item => includeInactive && canViewAll ? true : item.active)
            .sort((a, b) => a.name.localeCompare(b.name, 'id'));

        return Response.json({
            success: true,
            data: canViewAll ? farmers : farmers.map(publicFarmer),
            count: farmers.length,
        });
    } catch (e) {
        return Response.json({ success: false, message: e.message }, { status: 500 });
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
        const newFarmer = {
            id: uuidv4(),
            name: body.name,
            region: body.region,
            type: body.type || 'Individu',
            members: Number(body.members) || 1,
            volume: Number(body.volume) || 0,
            earnings: Number(body.earnings) || 0,
            status: 'Pending',
            rating: 0,
            joined: new Date().toISOString().split('T')[0],
            wallet: body.wallet || '',
            certifications: body.certifications || [],
            notes: body.notes || '',
        };
        await addItem('farmers', newFarmer);
        return Response.json({ success: true, data: newFarmer }, { status: 201 });
    } catch (e) {
        return Response.json({ success: false, message: e.message }, { status: 500 });
    }
}
