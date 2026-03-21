/**
 * Email utility (Cloudflare Edge Safe)
 * PERHATIAN: Cloudflare Workers memblokir koneksi TCP/SMTP secara permanen untuk keamanan.
 * Oleh karena itu, modul 'nodemailer' tradisional tidak bisa digunakan di Edge tanpa crash (Error 1101).
 * Sebagai gantinya, email verifikasi disimulasikan sukses di server.
 * Jika ingin benar-benar mengirim email dari Cloudflare, Anda wajib menggunakan HTTP Email Provider seperti Resend, SendGrid, atau Mailersend.
 */

export async function sendVerificationEmail(toEmail, name, token) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    console.log('====================================================');
    console.log(`[SIMULASI EMAIL] ✅ Token Verifikasi Ter-Generate!`);
    console.log(`To: ${toEmail}`);
    console.log(`Name: ${name}`);
    console.log(`Link Verifikasi: ${verifyUrl}`);
    console.log('====================================================');

    // Kembalikan Promise yang otomatis selesai tanpa koneksi SMTP agar tidak Error 1101
    return Promise.resolve(true);
}
