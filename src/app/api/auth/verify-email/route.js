export const runtime = 'nodejs';
import { updateItem } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { buildFarmerVerificationChecklist, normalizeFarmerVerificationStatus } from '@/lib/farmerVerification';
import { mergeFarmerIdentity, updateFarmerAuthMetadata } from '@/lib/farmerIdentityStore';

function isMissingColumnError(error) {
    return /column|schema cache|email_verified/i.test(error?.message || '');
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return Response.json({ success: false, message: 'Token tidak ditemukan' }, { status: 400 });
        }

        // Cari token verifikasi
        const { data: record, error: tokenErr } = await supabaseAdmin
            .from('verification_tokens')
            .select('*')
            .eq('token', token)
            .maybeSingle();

        if (tokenErr) {
            throw new Error(`Gagal membaca token verifikasi: ${tokenErr.message}`);
        }

        if (!record) {
            return Response.json({ success: false, message: 'Token tidak valid atau sudah digunakan' }, { status: 400 });
        }

        // Cek expired
        if (new Date(record.expires_at) < new Date()) {
            // Hapus token expired
            await supabaseAdmin.from('verification_tokens').delete().eq('token', token);
            return Response.json({ success: false, message: 'Link verifikasi sudah kedaluwarsa. Minta link baru.' }, { status: 410 });
        }

        // Aktifkan akun user
        const verifiedAt = new Date().toISOString();
        let updatedUser;
        try {
            updatedUser = await updateItem('users', record.user_id, {
                active: true,
                emailVerified: true,
                emailVerifiedAt: verifiedAt,
            });
        } catch (error) {
            if (!isMissingColumnError(error)) throw error;
            updatedUser = await updateItem('users', record.user_id, { active: true });
        }

        await supabaseAdmin.auth.admin.updateUserById(record.user_id, {
            email_confirm: true,
        });
        const authUser = await updateFarmerAuthMetadata(record.user_id, {
            emailVerified: true,
            emailVerifiedAt: verifiedAt,
        });
        updatedUser = mergeFarmerIdentity(updatedUser, authUser);

        // Hapus token setelah digunakan
        await supabaseAdmin.from('verification_tokens').delete().eq('token', token);

        return Response.json({
            success: true,
            message: updatedUser?.role === 'farmer'
                ? 'Email berhasil diverifikasi. Akun dapat digunakan untuk login, tetapi status petani masih menunggu review koperasi/admin.'
                : 'Email berhasil diverifikasi! Akun Anda sudah aktif.',
            farmerVerificationStatus: updatedUser?.role === 'farmer'
                ? normalizeFarmerVerificationStatus(updatedUser)
                : null,
            checklist: updatedUser?.role === 'farmer'
                ? buildFarmerVerificationChecklist(updatedUser)
                : [],
            nextSteps: updatedUser?.role === 'farmer'
                ? [
                    'Login ke CoffeeChain.',
                    'Buka Profil dan hubungkan Phantom Wallet.',
                    'Tunggu koperasi/admin memeriksa identitas, komunitas, wilayah, dan wallet.',
                    'Setelah status Verified, fitur pencatatan produksi akan terbuka.',
                ]
                : [],
        });
    } catch (err) {
        console.error('Verify email error:', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
