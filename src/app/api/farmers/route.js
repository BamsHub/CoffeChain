export const runtime = 'nodejs';
import { readDb, addItem, updateItem } from '@/lib/db';
import { sbSelect, usersToCamel } from '@/lib/sdb';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import {
    FARMER_VERIFICATION_STATUS,
    buildFarmerVerificationChecklist,
    normalizeFarmerVerificationStatus,
} from '@/lib/farmerVerification';

function normalizeFarmer(row, source = 'farmers') {
    const active = row.active !== false && row.status !== 'Inactive';
    const verificationStatus = source === 'users'
        ? normalizeFarmerVerificationStatus(row)
        : String(row.verificationStatus || row.status || (active ? 'verified' : 'pending')).toLowerCase();
    const status = verificationStatus === FARMER_VERIFICATION_STATUS.VERIFIED
        ? 'Verified'
        : verificationStatus === FARMER_VERIFICATION_STATUS.REJECTED
            ? 'Rejected'
            : 'Pending';
    return {
        id: row.id,
        source,
        name: row.name || row.email?.split('@')[0] || 'Petani',
        email: row.email || '',
        emailVerified: row.emailVerified ?? row.email_verified ?? null,
        region: row.region || row.location || '-',
        type: row.type || (source === 'users' ? 'Individu' : 'Petani'),
        members: Number(row.members) || 1,
        volume: Number(row.volume ?? row.total_harvest) || 0,
        earnings: Number(row.earnings) || 0,
        status,
        verificationStatus,
        verificationNotes: row.farmerVerificationNotes || row.farmer_verification_notes || row.notes || '',
        verifiedBy: row.farmerVerifiedBy || row.farmer_verified_by || null,
        verifiedByName: row.farmerVerifiedByName || row.farmer_verified_by_name || null,
        verifiedAt: row.farmerVerifiedAt || row.farmer_verified_at || null,
        active,
        rating: row.rating ?? 0,
        joined: row.joined || row.join_date || row.createdAt?.slice(0, 10) || row.created_at?.slice(0, 10) || '',
        wallet: row.wallet || '',
        certifications: row.certifications || (row.certification ? [row.certification] : []),
        notes: row.notes || '',
        verificationChecklist: source === 'users' ? buildFarmerVerificationChecklist(row) : [],
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
        verificationStatus: item.verificationStatus,
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
        if (userRows) farmers.push(...userRows.map(row => normalizeFarmer(usersToCamel(row), 'users')));
        if (farmersRows) farmers.push(...farmersRows.map(row => normalizeFarmer(row, 'farmers')));

        if (!farmersRows && !userRows) {
            const farmersDb = await readDb('farmers');
            const usersDb = await readDb('users');
            farmers = [
                ...(farmersDb.items || []).map(row => normalizeFarmer(row, 'farmers')),
                ...(usersDb.items || []).filter(row => row.role === 'farmer').map(row => normalizeFarmer(row, 'users')),
            ];
        }

        farmers = uniqueById(farmers)
            .filter(item => includeInactive && canViewAll
                ? true
                : item.active && item.verificationStatus === FARMER_VERIFICATION_STATUS.VERIFIED)
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

export async function PATCH(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session || !['koperasi', 'developer', 'admin'].includes(session.role)) {
            return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
        }

        const { id, action, notes } = await request.json();
        if (!id || !['verify', 'reject', 'reset'].includes(action)) {
            return Response.json({ success: false, message: 'ID dan aksi verifikasi wajib valid' }, { status: 400 });
        }

        const users = await readDb('users');
        const farmer = users.items.find(item => item.id === id && item.role === 'farmer');
        if (!farmer) {
            return Response.json({ success: false, message: 'Akun petani tidak ditemukan' }, { status: 404 });
        }

        const actor = users.items.find(item => item.id === session.userId);
        const actorName = actor?.name || actor?.email || session.userId;
        const checklist = buildFarmerVerificationChecklist(farmer);
        const cleanNotes = String(notes || '').trim().slice(0, 1000);

        if (action === 'verify' && checklist.some(item => !item.passed)) {
            return Response.json({
                success: false,
                message: 'Petani belum memenuhi seluruh kriteria verifikasi.',
                checklist,
            }, { status: 409 });
        }
        if (action === 'reject' && !cleanNotes) {
            return Response.json({ success: false, message: 'Alasan penolakan wajib diisi' }, { status: 400 });
        }

        const status = action === 'verify'
            ? FARMER_VERIFICATION_STATUS.VERIFIED
            : action === 'reject'
                ? FARMER_VERIFICATION_STATUS.REJECTED
                : FARMER_VERIFICATION_STATUS.PENDING;
        const now = new Date().toISOString();
        const updated = await updateItem('users', id, {
            farmerVerificationStatus: status,
            farmerVerificationNotes: cleanNotes || null,
            farmerVerifiedBy: action === 'reset' ? null : session.userId,
            farmerVerifiedByName: action === 'reset' ? null : actorName,
            farmerVerifiedAt: action === 'reset' ? null : now,
        });

        return Response.json({
            success: true,
            data: normalizeFarmer(updated, 'users'),
            message: status === FARMER_VERIFICATION_STATUS.VERIFIED
                ? 'Petani berhasil diverifikasi.'
                : status === FARMER_VERIFICATION_STATUS.REJECTED
                    ? 'Verifikasi petani ditolak.'
                    : 'Status petani dikembalikan ke pending.',
        });
    } catch (error) {
        const missingMigration = /farmer_verification|schema cache|column/i.test(error.message || '');
        return Response.json({
            success: false,
            message: missingMigration
                ? 'Kolom verifikasi belum tersedia. Jalankan supabase_farmer_verification_migration.sql.'
                : error.message || 'Gagal memperbarui verifikasi petani',
        }, { status: missingMigration ? 503 : 500 });
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
