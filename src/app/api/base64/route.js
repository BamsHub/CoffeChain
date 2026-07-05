import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// ── Config ──────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'];

// Default Sharp processing options
const DEFAULT_SHARP_OPTIONS = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: 'webp', // webp, jpeg, png
};

// ── Ensure upload directory exists ──────────────────────────────
async function ensureUploadDir() {
    if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
    }
}

// ── Helper: cek apakah string valid Base64 ─────────────────────
function isValidBase64(str) {
    if (!str || typeof str !== 'string') return false;
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    return base64Regex.test(str.trim());
}

// ── Helper: generate unique filename ────────────────────────────
function generateFilename(ext = 'webp') {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    return `img-${timestamp}-${rand}.${ext}`;
}

// ── Helper: format file size ────────────────────────────────────
function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── POST /api/base64 ────────────────────────────────────────────
// Supports:
//   1. JSON body: text encode/decode (existing)
//   2. FormData: image upload with Sharp processing + local storage
export async function POST(req) {
    try {
        const contentType = req.headers.get('content-type') || '';

        // ── Image upload mode (FormData) ────────────────────────
        if (contentType.includes('multipart/form-data')) {
            return await handleImageUpload(req);
        }

        // ── JSON text mode (existing) ───────────────────────────
        const body = await req.json();

        // Batch mode
        if (Array.isArray(body.batch)) {
            const results = body.batch.map((item) => processSingle(item));
            return NextResponse.json({ success: true, results });
        }

        // Image from Base64 string — decode and save locally with Sharp
        if (body.imageBase64) {
            return await handleBase64Image(body);
        }

        // Single text mode
        const result = processSingle(body);
        if (result.error) {
            return NextResponse.json({ success: false, message: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error('[base64 POST]', err.message);
        return NextResponse.json(
            { success: false, message: 'Request body harus JSON valid atau FormData' },
            { status: 400 }
        );
    }
}

// ── Handle image file upload with Sharp ─────────────────────────
async function handleImageUpload(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, message: 'File tidak ditemukan' }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: `Format tidak didukung: ${file.type}. Gunakan JPG, PNG, WEBP, GIF, atau BMP.` },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, message: `Ukuran file ${formatSize(file.size)} melebihi batas ${formatSize(MAX_FILE_SIZE)}` },
                { status: 400 }
            );
        }

        // Read custom options from form data
        const maxWidth  = parseInt(formData.get('maxWidth'))  || DEFAULT_SHARP_OPTIONS.maxWidth;
        const maxHeight = parseInt(formData.get('maxHeight')) || DEFAULT_SHARP_OPTIONS.maxHeight;
        const quality   = parseInt(formData.get('quality'))   || DEFAULT_SHARP_OPTIONS.quality;
        const format    = formData.get('format') || DEFAULT_SHARP_OPTIONS.format;

        // Read file into buffer
        const arrayBuffer = await file.arrayBuffer();
        const originalBuffer = Buffer.from(arrayBuffer);
        const originalSize = originalBuffer.length;

        // Get original image metadata
        const originalMeta = await sharp(originalBuffer).metadata();

        // Process with Sharp — resize + convert + optimize
        let sharpPipeline = sharp(originalBuffer)
            .resize({
                width: maxWidth,
                height: maxHeight,
                fit: 'inside',          // Maintain aspect ratio
                withoutEnlargement: true // Don't upscale small images
            });

        // Apply format conversion
        const outputFormat = format.toLowerCase();
        switch (outputFormat) {
            case 'webp':
                sharpPipeline = sharpPipeline.webp({ quality });
                break;
            case 'jpeg':
            case 'jpg':
                sharpPipeline = sharpPipeline.jpeg({ quality, mozjpeg: true });
                break;
            case 'png':
                sharpPipeline = sharpPipeline.png({ quality, compressionLevel: 9 });
                break;
            case 'avif':
                sharpPipeline = sharpPipeline.avif({ quality });
                break;
            default:
                sharpPipeline = sharpPipeline.webp({ quality });
        }

        const processedBuffer = await sharpPipeline.toBuffer();
        const processedMeta = await sharp(processedBuffer).metadata();
        const processedSize = processedBuffer.length;

        // Save to local file system
        await ensureUploadDir();
        const filename = generateFilename(outputFormat === 'jpg' ? 'jpeg' : outputFormat);
        const filePath = path.join(UPLOAD_DIR, filename);
        await writeFile(filePath, processedBuffer);

        // Generate Base64 string
        const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : `image/${outputFormat}`;
        const base64String = `data:${mimeType};base64,${processedBuffer.toString('base64')}`;

        // Compression stats
        const compressionRatio = ((1 - processedSize / originalSize) * 100).toFixed(1);

        return NextResponse.json({
            success: true,
            action: 'image_encode',
            file: {
                originalName: file.name,
                savedAs: filename,
                localPath: `/uploads/${filename}`,
                localUrl: `/uploads/${filename}`,
            },
            original: {
                size: originalSize,
                sizeFormatted: formatSize(originalSize),
                width: originalMeta.width,
                height: originalMeta.height,
                format: originalMeta.format,
            },
            processed: {
                size: processedSize,
                sizeFormatted: formatSize(processedSize),
                width: processedMeta.width,
                height: processedMeta.height,
                format: processedMeta.format,
            },
            compression: {
                ratio: `${compressionRatio}%`,
                saved: formatSize(originalSize - processedSize),
            },
            options: {
                maxWidth, maxHeight, quality, format: outputFormat,
            },
            base64: base64String,
            base64Length: base64String.length,
        });
    } catch (err) {
        console.error('[base64 image upload]', err);
        return NextResponse.json(
            { success: false, message: `Gagal memproses gambar: ${err.message}` },
            { status: 500 }
        );
    }
}

// ── Handle Base64 image string → process with Sharp + save local ─
async function handleBase64Image(body) {
    try {
        const { imageBase64, maxWidth, maxHeight, quality, format } = body;

        // Extract base64 data
        let buffer;
        let originalMimeType = 'image/png';

        if (imageBase64.startsWith('data:')) {
            const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (!match) {
                return NextResponse.json({ success: false, message: 'Format data URL tidak valid' }, { status: 400 });
            }
            originalMimeType = match[1];
            buffer = Buffer.from(match[2], 'base64');
        } else {
            // Raw base64
            buffer = Buffer.from(imageBase64, 'base64');
        }

        const originalSize = buffer.length;
        const originalMeta = await sharp(buffer).metadata();

        // Sharp processing
        const opts = {
            maxWidth: maxWidth || DEFAULT_SHARP_OPTIONS.maxWidth,
            maxHeight: maxHeight || DEFAULT_SHARP_OPTIONS.maxHeight,
            quality: quality || DEFAULT_SHARP_OPTIONS.quality,
            format: format || DEFAULT_SHARP_OPTIONS.format,
        };

        let pipeline = sharp(buffer)
            .resize({
                width: opts.maxWidth,
                height: opts.maxHeight,
                fit: 'inside',
                withoutEnlargement: true,
            });

        const outputFormat = opts.format.toLowerCase();
        switch (outputFormat) {
            case 'webp':  pipeline = pipeline.webp({ quality: opts.quality }); break;
            case 'jpeg':
            case 'jpg':   pipeline = pipeline.jpeg({ quality: opts.quality, mozjpeg: true }); break;
            case 'png':   pipeline = pipeline.png({ quality: opts.quality, compressionLevel: 9 }); break;
            case 'avif':  pipeline = pipeline.avif({ quality: opts.quality }); break;
            default:      pipeline = pipeline.webp({ quality: opts.quality });
        }

        const processedBuffer = await pipeline.toBuffer();
        const processedMeta = await sharp(processedBuffer).metadata();
        const processedSize = processedBuffer.length;

        // Save locally
        await ensureUploadDir();
        const filename = generateFilename(outputFormat === 'jpg' ? 'jpeg' : outputFormat);
        const filePath = path.join(UPLOAD_DIR, filename);
        await writeFile(filePath, processedBuffer);

        // Generate new base64
        const mimeType = outputFormat === 'jpg' ? 'image/jpeg' : `image/${outputFormat}`;
        const newBase64 = `data:${mimeType};base64,${processedBuffer.toString('base64')}`;

        const compressionRatio = ((1 - processedSize / originalSize) * 100).toFixed(1);

        return NextResponse.json({
            success: true,
            action: 'image_process',
            file: {
                savedAs: filename,
                localPath: `/uploads/${filename}`,
                localUrl: `/uploads/${filename}`,
            },
            original: {
                size: originalSize,
                sizeFormatted: formatSize(originalSize),
                width: originalMeta.width,
                height: originalMeta.height,
                format: originalMeta.format,
            },
            processed: {
                size: processedSize,
                sizeFormatted: formatSize(processedSize),
                width: processedMeta.width,
                height: processedMeta.height,
                format: processedMeta.format,
            },
            compression: {
                ratio: `${compressionRatio}%`,
                saved: formatSize(originalSize - processedSize),
            },
            base64: newBase64,
        });
    } catch (err) {
        console.error('[base64 image process]', err);
        return NextResponse.json(
            { success: false, message: `Gagal memproses gambar: ${err.message}` },
            { status: 500 }
        );
    }
}

// ── GET /api/base64 ─────────────────────────────────────────────
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const text    = searchParams.get('text');
        const encoded = searchParams.get('encoded');
        const data    = searchParams.get('data');
        const action  = searchParams.get('action');

        const input = {};
        if (text)    input.text = text;
        if (encoded) input.encoded = encoded;
        if (data)    input.data = data;
        if (action)  input.action = action;

        if (Object.keys(input).length === 0) {
            return NextResponse.json({
                success: true,
                message: 'Base64 Encoder/Decoder API + Image Processor (Sharp)',
                usage: {
                    text_encode: {
                        POST: '{ "text": "Hello World" }',
                        GET: '/api/base64?text=Hello%20World',
                    },
                    text_decode: {
                        POST: '{ "encoded": "SGVsbG8gV29ybGQ=" }',
                        GET: '/api/base64?encoded=SGVsbG8gV29ybGQ%3D',
                    },
                    auto_detect: {
                        POST: '{ "data": "..." }',
                        GET: '/api/base64?data=...',
                    },
                    image_upload: {
                        POST: 'FormData { file, maxWidth?, maxHeight?, quality?, format? }',
                        note: 'Upload gambar → diproses Sharp → disimpan lokal + Base64 string',
                    },
                    image_from_base64: {
                        POST: '{ "imageBase64": "data:image/png;base64,...", "maxWidth": 800, "quality": 75, "format": "webp" }',
                        note: 'Base64 string → diproses Sharp → disimpan lokal',
                    },
                    batch: {
                        POST: '{ "batch": [{ "text": "A" }, { "encoded": "Qg==" }] }',
                    },
                    sharp_options: {
                        maxWidth: '1920 (default)',
                        maxHeight: '1080 (default)',
                        quality: '80 (default, 1-100)',
                        format: 'webp (default) | jpeg | png | avif',
                    },
                },
            });
        }

        const result = processSingle(input);
        if (result.error) {
            return NextResponse.json({ success: false, message: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        console.error('[base64 GET]', err.message);
        return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

// ── Core text processor ─────────────────────────────────────────
function processSingle(input) {
    const { text, encoded, data, action } = input || {};

    if (typeof text === 'string') {
        const base64 = Buffer.from(text, 'utf-8').toString('base64');
        return { action: 'encode', input: text, output: base64 };
    }

    if (typeof encoded === 'string') {
        if (!isValidBase64(encoded)) {
            return { error: `String bukan format Base64 yang valid: "${encoded.slice(0, 50)}..."` };
        }
        const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        return { action: 'decode', input: encoded, output: decoded };
    }

    if (typeof data === 'string') {
        const forceAction = (action || '').toLowerCase();

        if (forceAction === 'encode') {
            const base64 = Buffer.from(data, 'utf-8').toString('base64');
            return { action: 'encode', input: data, output: base64 };
        }

        if (forceAction === 'decode') {
            if (!isValidBase64(data)) {
                return { error: `String bukan format Base64 yang valid: "${data.slice(0, 50)}..."` };
            }
            const decoded = Buffer.from(data, 'base64').toString('utf-8');
            return { action: 'decode', input: data, output: decoded };
        }

        if (isValidBase64(data) && data.length >= 4) {
            const decoded = Buffer.from(data, 'base64').toString('utf-8');
            return { action: 'decode', detected: true, input: data, output: decoded };
        } else {
            const base64 = Buffer.from(data, 'utf-8').toString('base64');
            return { action: 'encode', detected: true, input: data, output: base64 };
        }
    }

    return { error: 'Berikan salah satu: "text" (encode), "encoded" (decode), "data" (auto-detect), atau "imageBase64" (image)' };
}
