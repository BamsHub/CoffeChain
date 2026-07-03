export const runtime = 'nodejs';
import { readDb } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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

        const alreadyVerified = user.emailVerified === true || (user.emailVerified === undefined && user.active === true);
        if (alreadyVerified) {
            return Response.json({ success: false, message: 'Email sudah diverifikasi sebelumnya. Silakan login.' }, { status: 400 });
        }

        // Rate limiting sederhana: cek apakah token sudah dikirim dalam 5 menit terakhir
        const normalizedEmail = email.toLowerCase().trim();
        const { data: existingToken, error: tokenLookupErr } = await supabaseAdmin
            .from('verification_tokens')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (tokenLookupErr) {
            throw new Error(`Gagal membaca token verifikasi: ${tokenLookupErr.message}`);
        }

        if (existingToken) {
            const timeSinceCreated = Date.now() - new Date(existingToken.created_at).getTime();
            if (timeSinceCreated < 5 * 60 * 1000) { // 5 menit
                const waitSeconds = Math.ceil((5 * 60 * 1000 - timeSinceCreated) / 1000);
                return Response.json({
                    success: false,
                    message: `Tunggu ${waitSeconds} detik sebelum meminta link verifikasi baru.`,
                }, { status: 429 });
            }
        }

        // Buat token baru menggunakan Web Crypto API
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const verifyToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

        await supabaseAdmin.from('verification_tokens').delete().eq('email', normalizedEmail);
        const { error: insertTokenErr } = await supabaseAdmin.from('verification_tokens').insert({
            id: uuidv4(),
            token: verifyToken,
            user_id: user.id,
            email: normalizedEmail,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

        if (insertTokenErr) {
            throw new Error(`Gagal menyimpan token verifikasi: ${insertTokenErr.message}`);
        }

        const host = request.headers.get('host') || 'coffe-chain.vercel.app';
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const dynamicAppUrl = `${proto}://${host}`;

        try {
            await sendVerificationEmail(normalizedEmail, user.name, verifyToken, dynamicAppUrl);
        } catch (emailErr) {
            console.error('Email send error:', emailErr);
            const verificationLink = `${dynamicAppUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;
            return Response.json({
                success: true,
                emailSent: false,
                message: 'Pengiriman email gagal karena kendala SMTP server. Silakan verifikasi akun secara langsung menggunakan link di bawah.',
                verificationLink: verificationLink,
            });
        }

        return Response.json({ success: true, emailSent: true, message: 'Link verifikasi baru telah dikirim ke email Anda.' });
    } catch (err) {
        console.error('Resend verification error:', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
