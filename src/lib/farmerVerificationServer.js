import { getSupabaseAdmin } from '@/lib/supabase';
import {
    FARMER_VERIFICATION_STATUS,
    buildFarmerVerificationChecklist,
    normalizeFarmerVerificationStatus,
} from '@/lib/farmerVerification';

export async function getFarmerProductionEligibility(session) {
    if (!session || session.role !== 'farmer') {
        return {
            eligible: true,
            status: 'not_required',
            checklist: [],
            message: null,
        };
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.userId)
        .maybeSingle();

    if (error || !user) {
        return {
            eligible: false,
            status: FARMER_VERIFICATION_STATUS.PENDING,
            checklist: [],
            message: 'Data petani tidak ditemukan untuk verifikasi.',
        };
    }

    const status = normalizeFarmerVerificationStatus(user);
    const checklist = buildFarmerVerificationChecklist(user);
    const eligible = status === FARMER_VERIFICATION_STATUS.VERIFIED
        && checklist.every(item => item.passed);

    return {
        eligible,
        status,
        checklist,
        message: eligible
            ? null
            : status === FARMER_VERIFICATION_STATUS.REJECTED
                ? `Verifikasi petani ditolak: ${user.farmer_verification_notes || 'hubungi koperasi.'}`
                : 'Akun petani harus lolos verifikasi email, identitas, wilayah, dan wallet sebelum mencatat produksi.',
    };
}
