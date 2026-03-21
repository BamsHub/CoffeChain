import { readDb, addItem, writeDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, email, password, region } = body;

        if (!name || !email || !password) {
            return Response.json({ success: false, message: 'Nama, email, dan password wajib diisi' }, { status: 400 });
        }

        if (password.length < 8) {
            return Response.json({ success: false, message: 'Password minimal 8 karakter' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return Response.json({ success: false, message: 'Format email tidak valid' }, { status: 400 });
        }

        // Cek email sudah ada
        const db = await readDb('users');
        if (db.items.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            return Response.json({ success: false, message: 'Email sudah terdaftar' }, { status: 409 });
        }

        const userId = uuidv4();
        const newUser = {
            id: userId,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashPassword(password),
            role: 'farmer',
            region: region?.trim() || '',
            wallet: '',
            avatar: name.substring(0, 2).toUpperCase(),
            createdAt: new Date().toISOString(),
            lastLogin: null,
            active: false,        // Aktif setelah verifikasi email
            emailVerified: false,
        };

        await addItem('users', newUser);

        // Buat token verifikasi (berlaku 24 jam)
        const verifyToken = randomBytes(32).toString('hex');
        const tokenDb = await readDb('verification_tokens');
        // Hapus token lama untuk email yang sama
        tokenDb.items = tokenDb.items.filter(t => t.email !== email.toLowerCase());
        tokenDb.items.push({
            id: uuidv4(),
            token: verifyToken,
            userId,
            email: email.toLowerCase(),
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        await writeDb('verification_tokens', tokenDb);

        // Kirim email verifikasi
        try {
            await sendVerificationEmail(email, name.trim(), verifyToken);
        } catch (emailErr) {
            console.error('Email send error:', emailErr);
            // Tetap berhasil daftar, tapi beri tahu email gagal
            const { password: _, ...safeUser } = newUser;
            return Response.json({
                success: true,
                emailSent: false,
                message: 'Akun dibuat, tapi email verifikasi gagal dikirim. Hubungi admin.',
                user: safeUser,
            }, { status: 201 });
        }

        const { password: _, ...safeUser } = newUser;
        return Response.json({
            success: true,
            emailSent: true,
            message: `Akun berhasil dibuat! Email verifikasi dikirim ke ${email}`,
            user: safeUser,
        }, { status: 201 });

    } catch (err) {
        console.error('Register error:', err);
        return Response.json({ success: false, message: 'Server error. Coba lagi.' }, { status: 500 });
    }
}
