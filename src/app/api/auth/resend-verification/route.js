import { readDb, writeDb } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

export async function POST(request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return Response.json({ success: false, message: 'Email wajib diisi' }, { status: 400 });
        }

        // Cari user berdasarkan email
        const userDb = await readDb('users');
        const user = userDb.items.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            // Jangan beritahu apakah email terdaftar atau tidak (security)
            return Response.json({ success: true, message: 'Jika email terdaftar, link verifikasi baru telah dikirim.' });
        }

        if (user.emailVerified) {
            return Response.json({ success: false, message: 'Email sudah diverifikasi sebelumnya. Silakan login.' }, { status: 400 });
        }

        // Rate limiting sederhana: cek apakah token sudah dikirim dalam 5 menit terakhir
        const tokenDb = await readDb('verification_tokens');
        const existingToken = tokenDb.items.find(t => t.email === email.toLowerCase());
        if (existingToken) {
            const timeSinceCreated = Date.now() - new Date(existingToken.createdAt).getTime();
            if (timeSinceCreated < 5 * 60 * 1000) { // 5 menit
                const waitSeconds = Math.ceil((5 * 60 * 1000 - timeSinceCreated) / 1000);
                return Response.json({
                    success: false,
                    message: `Tunggu ${waitSeconds} detik sebelum meminta link verifikasi baru.`,
                }, { status: 429 });
            }
        }

        // Buat token baru
        const verifyToken = randomBytes(32).toString('hex');
        tokenDb.items = tokenDb.items.filter(t => t.email !== email.toLowerCase());
        tokenDb.items.push({
            id: uuidv4(),
            token: verifyToken,
            userId: user.id,
            email: email.toLowerCase(),
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        await writeDb('verification_tokens', tokenDb);

        await sendVerificationEmail(email, user.name, verifyToken);

        return Response.json({ success: true, message: 'Link verifikasi baru telah dikirim ke email Anda.' });
    } catch (err) {
        console.error('Resend verification error:', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
