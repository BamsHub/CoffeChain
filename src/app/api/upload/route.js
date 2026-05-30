import { NextResponse } from 'next/server';

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

        const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileName = `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || 'jpg'}`;
        const filePath = `products/${fileName}`;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/product-images/${filePath}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceKey}`,
                'apikey': serviceKey,
                'Content-Type': file.type,
                'x-upsert': 'false',
            },
            body: buffer,
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            console.error('Supabase upload error:', errText);
            return NextResponse.json({ success: false, message: 'Gagal upload ke storage' }, { status: 500 });
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${filePath}`;
        return NextResponse.json({ success: true, url: publicUrl });
    } catch (err) {
        console.error('Upload error:', err);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

