export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

function getToken(request) {
    return request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
}

export async function GET(request) {
    try {
        const session = await verifyToken(getToken(request));
        if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

        const supabase = getSupabaseAdmin();
        let query = supabase
            .from('ipfs_assets')
            .select('id, owner_id, owner_role, batch_id, stage, cid, ipfs_uri, gateway_url, file_name, mime_type, size_bytes, pinned_at, created_at')
            .order('created_at', { ascending: false });

        if (session.role !== 'admin') query = query.eq('owner_id', session.userId);

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('[ipfs/assets GET]', error.message);
        return NextResponse.json({ success: false, message: error.message || 'Gagal memuat aset IPFS' }, { status: 500 });
    }
}
