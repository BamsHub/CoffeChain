import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req) {
    try {
        const token = req.headers.get('Authorization')?.replace('Bearer ', '');
        const session = await verifyToken(token);
        if (!session) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, message: 'File tidak ditemukan' }, { status: 400 });
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ success: false, message: 'Format harus JPG, PNG, WEBP, atau GIF' }, { status: 400 });
        }

        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ success: false, message: 'Ukuran file maksimal 5MB' }, { status: 400 });
        }

        const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileName = `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || 'jpg'}`;
        const filePath = `products/${fileName}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const bucket = 'product-images';
        let supabase;
        try {
            supabase = getSupabaseAdmin();
        } catch (storageErr) {
            const fallbackUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
            return NextResponse.json({
                success: true,
                url: fallbackUrl,
                storage: 'inline',
                warning: `Storage belum dikonfigurasi, foto disimpan inline: ${storageErr.message}`,
            });
        }

        const { error: bucketErr } = await supabase.storage.getBucket(bucket);
        if (bucketErr) {
            const { error: createBucketErr } = await supabase.storage.createBucket(bucket, {
                public: true,
                fileSizeLimit: MAX_SIZE,
                allowedMimeTypes: allowedTypes,
            });
            if (createBucketErr && !createBucketErr.message?.toLowerCase().includes('already exists')) {
                console.error('Supabase bucket create error:', createBucketErr.message);
                const fallbackUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
                return NextResponse.json({
                    success: true,
                    url: fallbackUrl,
                    storage: 'inline',
                    warning: `Storage belum siap, foto disimpan inline: ${createBucketErr.message}`,
                });
            }
        }

        const { error: uploadErr } = await supabase.storage.from(bucket).upload(filePath, buffer, {
            contentType: file.type,
            upsert: false,
        });

        if (uploadErr) {
            console.error('Supabase upload error:', uploadErr.message);
            const fallbackUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
            return NextResponse.json({
                success: true,
                url: fallbackUrl,
                storage: 'inline',
                warning: `Storage gagal, foto disimpan inline: ${uploadErr.message}`,
            });
        }

        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        const publicUrl = publicData?.publicUrl;
        if (!publicUrl) {
            return NextResponse.json({ success: false, message: 'Upload berhasil tapi public URL tidak tersedia' }, { status: 500 });
        }
        return NextResponse.json({ success: true, url: publicUrl });
    } catch (err) {
        console.error('Upload error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
