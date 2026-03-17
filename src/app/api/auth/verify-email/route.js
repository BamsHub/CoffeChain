import { readDb, writeDb, updateItem } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return Response.json({ success: false, message: 'Token tidak ditemukan' }, { status: 400 });
        }

        // Cari token verifikasi
        const tokenDb = await readDb('verification_tokens');
        const record = tokenDb.items.find(t => t.token === token);

        if (!record) {
            return Response.json({ success: false, message: 'Token tidak valid atau sudah digunakan' }, { status: 400 });
        }

        // Cek expired
        if (new Date(record.expiresAt) < new Date()) {
            // Hapus token expired
            tokenDb.items = tokenDb.items.filter(t => t.token !== token);
            await writeDb('verification_tokens', tokenDb);
            return Response.json({ success: false, message: 'Link verifikasi sudah kedaluwarsa. Minta link baru.' }, { status: 410 });
        }

        // Aktifkan akun user
        await updateItem('users', record.userId, {
            active: true,
            emailVerified: true,
            emailVerifiedAt: new Date().toISOString(),
        });

        // Hapus token setelah digunakan
        tokenDb.items = tokenDb.items.filter(t => t.token !== token);
        await writeDb('verification_tokens', tokenDb);

        return Response.json({
            success: true,
            message: 'Email berhasil diverifikasi! Akun Anda sudah aktif.',
        });
    } catch (err) {
        console.error('Verify email error:', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
