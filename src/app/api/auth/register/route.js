export const runtime = 'nodejs';
import { readDb, addItem } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { getPublicAppUrl } from '@/lib/publicAppUrl';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

function isDuplicateAuthError(error) {
    return /already|registered|exists|duplicate/i.test(error?.message || '');
}

function isMissingColumnError(error) {
    return /column|schema cache|email_verified/i.test(error?.message || '');
}

const FARMER_CATEGORIES = new Set(['individual', 'farmer_group', 'cooperative_member']);

function cleanText(value, maxLength = 120) {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

async function findAuthUserByEmail(email) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return null;
    return (data?.users || []).find(user => user.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function insertAppUser(user) {
    try {
        return await addItem('users', user);
    } catch (error) {
        if (!isMissingColumnError(error)) throw error;

        const fallbackUser = { ...user };
        for (const key of [
            'farmerCategory',
            'farmerCommunityName',
            'province',
            'regency',
            'district',
            'village',
            'farmerDeclarationAt',
            'emailVerified',
            'emailVerifiedAt',
            'farmerVerificationStatus',
            'farmerVerificationNotes',
            'farmerVerifiedBy',
            'farmerVerifiedByName',
            'farmerVerifiedAt',
        ]) delete fallbackUser[key];
        return addItem('users', fallbackUser);
    }
}

async function saveVerificationToken(tokenRecord) {
    const { error: deleteErr } = await supabaseAdmin
        .from('verification_tokens')
        .delete()
        .eq('email', tokenRecord.email);

    if (deleteErr) {
        throw new Error(`Tabel verification_tokens belum siap: ${deleteErr.message}`);
    }

    const { error: insertErr } = await supabaseAdmin
        .from('verification_tokens')
        .insert(tokenRecord);

    if (insertErr) {
        throw new Error(`Gagal menyimpan token verifikasi: ${insertErr.message}`);
    }
}

export async function POST(request) {
    let createdAuthUserId = null;
    try {
        const body = await request.json();
        const {
            name,
            email,
            password,
            farmerCategory,
            communityName,
            province,
            regency,
            district,
            village,
            farmerDeclaration,
        } = body;

        if (!name || !email || !password || !farmerCategory || !province || !regency || !district) {
            return Response.json({
                success: false,
                message: 'Nama, email, kategori petani, provinsi, kabupaten/kota, kecamatan, dan password wajib diisi.',
            }, { status: 400 });
        }

        if (password.length < 8) {
            return Response.json({ success: false, message: 'Password minimal 8 karakter' }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return Response.json({ success: false, message: 'Format email tidak valid' }, { status: 400 });
        }

        if (!FARMER_CATEGORIES.has(farmerCategory)) {
            return Response.json({ success: false, message: 'Kategori petani tidak valid.' }, { status: 400 });
        }
        if (farmerDeclaration !== true) {
            return Response.json({
                success: false,
                message: 'Pendaftaran ini khusus petani atau anggota organisasi petani kopi. Konfirmasi pernyataan petani wajib dicentang.',
            }, { status: 400 });
        }

        const cleanCommunityName = cleanText(communityName);
        if (farmerCategory !== 'individual' && cleanCommunityName.length < 3) {
            return Response.json({
                success: false,
                message: 'Nama kelompok tani, komunitas, atau koperasi wajib diisi.',
            }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const cleanName = cleanText(name);
        const cleanProvince = cleanText(province);
        const cleanRegency = cleanText(regency);
        const cleanDistrict = cleanText(district);
        const cleanVillage = cleanText(village);
        const cleanRegion = [cleanVillage, cleanDistrict, cleanRegency, cleanProvince]
            .filter(Boolean)
            .join(', ');
        const declarationAt = new Date().toISOString();

        // Cek email sudah ada di tabel aplikasi
        const db = await readDb('users');
        if (db.items.find(u => u.email.toLowerCase() === normalizedEmail)) {
            return Response.json({ success: false, message: 'Email sudah terdaftar' }, { status: 409 });
        }

        let authUser = null;
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: false,
            user_metadata: {
                name: cleanName,
                role: 'farmer',
                region: cleanRegion,
                farmerCategory,
                farmerCommunityName: cleanCommunityName || null,
                province: cleanProvince,
                regency: cleanRegency,
                district: cleanDistrict,
                village: cleanVillage || null,
                farmerDeclarationAt: declarationAt,
                emailVerified: false,
                farmerVerificationStatus: 'pending',
            },
        });

        if (authError) {
            if (!isDuplicateAuthError(authError)) {
                return Response.json({ success: false, message: `Gagal membuat user Supabase Auth: ${authError.message}` }, { status: 500 });
            }
            authUser = await findAuthUserByEmail(normalizedEmail);
            if (!authUser) {
                return Response.json({ success: false, message: 'Email sudah terdaftar di Supabase Auth' }, { status: 409 });
            }
        } else {
            authUser = authData?.user || null;
            createdAuthUserId = authUser?.id || null;
        }

        const userId = authUser?.id || uuidv4();
        const newUser = {
            id: userId,
            name: cleanName,
            email: normalizedEmail,
            password: await hashPassword(password),
            role: 'farmer',
            region: cleanRegion,
            farmerCategory,
            farmerCommunityName: cleanCommunityName || null,
            province: cleanProvince,
            regency: cleanRegency,
            district: cleanDistrict,
            village: cleanVillage || null,
            farmerDeclarationAt: declarationAt,
            wallet: '',
            avatar: cleanName.substring(0, 2).toUpperCase(),
            createdAt: new Date().toISOString(),
            lastLogin: null,
            active: false,        // Aktif setelah verifikasi email
            emailVerified: false,
            emailVerifiedAt: null,
            farmerVerificationStatus: 'pending',
            farmerVerificationNotes: null,
            farmerVerifiedBy: null,
            farmerVerifiedByName: null,
            farmerVerifiedAt: null,
        };

        await insertAppUser(newUser);

        // Buat token verifikasi (berlaku 24 jam)
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const verifyToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        await saveVerificationToken({
            id: uuidv4(),
            token: verifyToken,
            user_id: userId,
            email: normalizedEmail,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

        // Kirim email verifikasi
        const publicAppUrl = getPublicAppUrl(request);

        try {
            await sendVerificationEmail(normalizedEmail, cleanName, verifyToken, publicAppUrl);
        } catch (emailErr) {
            console.error('Email send error:', emailErr);
            // Tetap berhasil daftar, tetapi sertakan link verifikasi langsung agar tidak stuck
            const verificationLink = `${publicAppUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;
            const { password: _, ...safeUser } = newUser;
            return Response.json({
                success: true,
                emailSent: false,
                message: 'Akun dibuat, tetapi email gagal dikirim karena kendala SMTP server. Silakan verifikasi akun secara langsung menggunakan link di bawah.',
                verificationLink: verificationLink,
                user: safeUser,
            }, { status: 201 });
        }

        const { password: _, ...safeUser } = newUser;
        return Response.json({
            success: true,
            emailSent: true,
            message: `Akun petani berhasil dibuat. Email verifikasi dikirim ke ${normalizedEmail}. Setelah email selesai, hubungkan wallet dan tunggu review koperasi/admin.`,
            user: safeUser,
        }, { status: 201 });

    } catch (err) {
        console.error('Register error:', err);
        if (createdAuthUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
            } catch (cleanupErr) {
                console.error('Register cleanup error:', cleanupErr);
            }
        }
        return Response.json({ success: false, message: 'Server error. Coba lagi.' }, { status: 500 });
    }
}
