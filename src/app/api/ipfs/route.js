import { NextResponse } from 'next/server';

export function GET() {
    return NextResponse.json({
        success: true,
        mode: 'read-only',
        message: 'Upload IPFS hanya tersedia melalui Pipeline Stok Tahap 1-6.',
    });
}

export function POST() {
    return NextResponse.json({
        success: false,
        message: 'Upload langsung dinonaktifkan. Gunakan Pipeline Stok Tahap 1-6.',
    }, { status: 405, headers: { Allow: 'GET' } });
}
