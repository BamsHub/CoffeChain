import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req) {
    try {
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

        const ext = file.name.split('.').pop().toLowerCase();
        const fileName = `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = `products/${fileName}`;

        const supabase = getSupabaseAdmin();
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error } = await supabase.storage
            .from('product-images')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return NextResponse.json({ success: false, message: error.message || 'Gagal upload ke storage' }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        return NextResponse.json({ success: true, url: publicUrl });
    } catch (err) {
        console.error('Upload error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
