/**
 * Email utility menggunakan Nodemailer + Gmail SMTP
 * Untuk kirim email verifikasi akun baru
 */
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

/**
 * Kirim email verifikasi ke user baru
 * @param {string} toEmail - Alamat email tujuan
 * @param {string} name - Nama user
 * @param {string} token - Token verifikasi unik
 */
export async function sendVerificationEmail(toEmail, name, token) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifikasi Email — CoffeeChain</title>
</head>
<body style="margin:0;padding:0;background:#030d06;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030d06;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#081410;border:1px solid rgba(74,124,40,0.4);border-radius:16px;overflow:hidden;max-width:500px;width:100%;">
          
          <!-- Header gradient bar -->
          <tr>
            <td height="4" style="background:linear-gradient(90deg,#7ED44A,#F5A623);"></td>
          </tr>

          <!-- Logo area -->
          <tr>
            <td align="center" style="padding:32px 32px 20px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,rgba(74,124,40,0.3),rgba(126,212,74,0.1));border:1px solid rgba(74,124,40,0.4);border-radius:12px;padding:12px 16px;">
                    <span style="font-size:22px;font-weight:800;background:linear-gradient(135deg,#7ED44A,#F5A623);-webkit-background-clip:text;color:#7ED44A;">&#9749; CoffeeChain</span>
                  </td>
                </tr>
              </table>
              <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:8px 0 0;">Blockchain Industri Kopi Indonesia</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:0 32px 32px;">
              <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 12px;">Halo, ${name}! 👋</h2>
              <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 24px;">
                Terima kasih telah mendaftar di <strong style="color:#7ED44A;">CoffeeChain</strong>. 
                Klik tombol di bawah untuk memverifikasi alamat email Anda dan mengaktifkan akun.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${verifyUrl}" 
                       style="display:inline-block;background:linear-gradient(135deg,#4A7C28,#7ED44A);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">
                      ✅ Verifikasi Email Saya
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <div style="background:rgba(74,124,40,0.08);border:1px solid rgba(74,124,40,0.2);border-radius:10px;padding:16px;">
                <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 6px;">⏱️ <strong style="color:rgba(255,255,255,0.7);">Link berlaku 24 jam</strong> sejak email ini dikirim.</p>
                <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">Jika Anda tidak mendaftar, abaikan email ini. Tidak ada tindakan yang diperlukan.</p>
              </div>

              <!-- Fallback URL -->
              <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:20px 0 0;word-break:break-all;">
                Atau salin link ini ke browser:<br/>
                <a href="${verifyUrl}" style="color:#7ED44A;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(0,0,0,0.3);padding:16px 32px;border-top:1px solid rgba(74,124,40,0.15);">
              <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;text-align:center;">
                🔒 Terenkripsi &nbsp;⛓️ Solana Blockchain &nbsp;🌿 CoffeeChain v1.0
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    await transporter.sendMail({
        from: `"CoffeeChain" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: '✅ Verifikasi Email Akun CoffeeChain Anda',
        html,
        text: `Halo ${name},\n\nVerifikasi email Anda di: ${verifyUrl}\n\nLink berlaku 24 jam.\n\nCoffeeChain`,
    });
}
