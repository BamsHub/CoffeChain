import { readDb, updateItem } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return Response.json({ success: false, message: 'Email dan password diperlukan' }, { status: 400 });
        }

        // Cari user berdasarkan email
        const db = await readDb('users');
        const user = db.items.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            return Response.json({ success: false, message: 'Email atau password salah' }, { status: 401 });
        }

        // Cek verifikasi email (khusus akun yang didaftarkan melalui form register)
        if (user.emailVerified === false) {
            return Response.json({
                success: false,
                message: 'Email belum diverifikasi. Cek inbox Anda dan klik link verifikasi.',
                needsVerification: true,
                email: user.email,
            }, { status: 403 });
        }

        if (!user.active) {
            return Response.json({ success: false, message: 'Akun ini tidak aktif. Hubungi administrator.' }, { status: 403 });
        }

        // Cek password — untuk seed data, kita bandingkan langsung atau via hash
        const isValid = verifyPassword(password, user.password) ||
            // Fallback untuk seed data plaintext (petani123, kop123, admin123)
            (password === 'admin123' && user.role === 'developer') ||
            (password === 'kop123' && user.role === 'koperasi') ||
            (password === 'petani123' && user.role === 'farmer');

        if (!isValid) {
            return Response.json({ success: false, message: 'Email atau password salah' }, { status: 401 });
        }

        // Buat session token
        const token = await createSession(user.id, user.role);

        // Update lastLogin
        await updateItem('users', user.id, { lastLogin: new Date().toISOString() });

        // Return user tanpa password
        const { password: _, ...safeUser } = user;
        return Response.json({
            success: true,
            token,
            user: safeUser,
            message: `Selamat datang, ${user.name}!`,
        });
    } catch (err) {
        console.error('Login error:', err);
        return Response.json({ success: false, message: 'Server error. Coba lagi.' }, { status: 500 });
    }
}
