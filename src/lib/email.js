import nodemailer from 'nodemailer';

function getAppUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL || 'https://coffe-blockchain.vercel.app').replace(/\/$/, '');
}

function getFromAddress() {
    return process.env.EMAIL_FROM || process.env.GMAIL_USER || 'CoffeeChain <noreply@coffeechain.local>';
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildVerificationMessage(toEmail, name, token) {
    const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    const safeName = name || 'Pengguna CoffeeChain';
    const safeHtmlName = escapeHtml(safeName);

    return {
        to: toEmail,
        from: getFromAddress(),
        subject: 'Verifikasi Email CoffeeChain',
        text: [
            `Halo ${safeName},`,
            '',
            'Terima kasih sudah mendaftar di CoffeeChain.',
            'Klik link berikut untuk mengaktifkan akun Anda:',
            verifyUrl,
            '',
            'Link ini berlaku 24 jam. Jika Anda tidak merasa mendaftar, abaikan email ini.',
        ].join('\n'),
        html: `
            <div style="font-family:Arial,sans-serif;background:#071107;padding:24px;color:#E8F5E0">
                <div style="max-width:520px;margin:0 auto;background:#0e1a0e;border:1px solid rgba(126,212,74,.28);border-radius:14px;padding:24px">
                    <h1 style="font-size:22px;margin:0 0 10px;color:#7ED44A">Verifikasi Email CoffeeChain</h1>
                    <p style="line-height:1.6;color:#CFE6C8">Halo <strong>${safeHtmlName}</strong>, terima kasih sudah mendaftar di CoffeeChain.</p>
                    <p style="line-height:1.6;color:#CFE6C8">Klik tombol di bawah untuk mengaktifkan akun Anda.</p>
                    <a href="${verifyUrl}" style="display:inline-block;margin:12px 0 18px;background:#4A7C28;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">Verifikasi Email</a>
                    <p style="font-size:12px;line-height:1.6;color:#9DB89A">Jika tombol tidak bisa dibuka, salin link ini:</p>
                    <p style="font-size:12px;line-height:1.6;color:#7ED44A;word-break:break-all">${verifyUrl}</p>
                    <p style="font-size:12px;line-height:1.6;color:#9DB89A">Link berlaku 24 jam.</p>
                </div>
            </div>
        `,
        verifyUrl,
    };
}

async function sendWithResend(message) {
    if (!process.env.RESEND_API_KEY) return null;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: message.from,
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
        }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Resend gagal mengirim email');
    }
    return { provider: 'resend', id: data.id || null };
}

async function sendWithGmailSmtp(message) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) return null;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });

    const info = await transporter.sendMail(message);
    return { provider: 'gmail-smtp', id: info.messageId || null };
}

export async function sendVerificationEmail(toEmail, name, token) {
    const message = buildVerificationMessage(toEmail, name, token);

    const resendResult = await sendWithResend(message);
    if (resendResult) return { ...resendResult, to: toEmail };

    const gmailResult = await sendWithGmailSmtp(message);
    if (gmailResult) return { ...gmailResult, to: toEmail };

    throw new Error('Konfigurasi email belum tersedia. Isi GMAIL_USER + GMAIL_APP_PASSWORD atau RESEND_API_KEY.');
}

export async function verifyEmailTransport() {
    if (process.env.RESEND_API_KEY) return { ok: true, provider: 'resend' };

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) return { ok: false, provider: null, message: 'GMAIL_USER/GMAIL_APP_PASSWORD belum diisi' };

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
    });
    await transporter.verify();
    return { ok: true, provider: 'gmail-smtp' };
}
