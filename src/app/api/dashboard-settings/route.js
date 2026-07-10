export const runtime = 'nodejs';

import { supabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

const DEFAULT_DAILY_TARGET = 10;

async function getSession(request) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    return verifyToken(token);
}

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('dashboard_settings')
            .select('daily_transaction_target')
            .eq('id', 'default')
            .maybeSingle();

        if (error && !error.message?.includes('does not exist')) throw error;
        return Response.json({
            success: true,
            dailyTransactionTarget: Number(data?.daily_transaction_target) || DEFAULT_DAILY_TARGET,
        });
    } catch (error) {
        console.error('[dashboard-settings GET]', error.message);
        return Response.json({ success: true, dailyTransactionTarget: DEFAULT_DAILY_TARGET });
    }
}

export async function PATCH(request) {
    try {
        const session = await getSession(request);
        if (!session || !['developer', 'koperasi'].includes(session.role)) {
            return Response.json({ success: false, message: 'Hanya developer atau koperasi yang dapat mengubah target.' }, { status: 403 });
        }

        const body = await request.json();
        const target = Number(body.dailyTransactionTarget);
        if (!Number.isInteger(target) || target < 0 || target > 100000) {
            return Response.json({ success: false, message: 'Target harus bilangan bulat antara 0 dan 100.000.' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('dashboard_settings')
            .upsert({ id: 'default', daily_transaction_target: target, updated_by: session.userId, updated_at: new Date().toISOString() })
            .select('daily_transaction_target')
            .single();

        if (error) throw error;
        return Response.json({ success: true, dailyTransactionTarget: Number(data.daily_transaction_target) });
    } catch (error) {
        console.error('[dashboard-settings PATCH]', error.message);
        return Response.json({ success: false, message: error.message || 'Gagal menyimpan target harian.' }, { status: 500 });
    }
}
