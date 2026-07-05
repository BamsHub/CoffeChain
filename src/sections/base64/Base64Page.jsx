'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import imageCompression from 'browser-image-compression';

// ── Helpers ─────────────────────────────────────────────────────
function isValidBase64(str) {
    if (!str || typeof str !== 'string') return false;
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    return base64Regex.test(str.trim());
}

function isBase64Image(str) {
    if (!str) return false;
    return /^data:image\/[a-zA-Z+]+;base64,/.test(str.trim());
}

function encodeBase64(text) {
    try { return btoa(unescape(encodeURIComponent(text))); }
    catch { return btoa(text); }
}

function decodeBase64(encoded) {
    try { return decodeURIComponent(escape(atob(encoded))); }
    catch { return atob(encoded); }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ── Floating particles ──────────────────────────────────────────
function ParticleCanvas() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let particles = [];
        function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        resize();
        window.addEventListener('resize', resize);
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                r: Math.random() * 2 + 0.5, dx: (Math.random() - 0.5) * 0.4,
                dy: (Math.random() - 0.5) * 0.4, opacity: Math.random() * 0.4 + 0.1,
            });
        }
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p) => {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(74, 124, 40, ${p.opacity})`; ctx.fill();
                p.x += p.dx; p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
            });
            animId = requestAnimationFrame(draw);
        }
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

// ── History item ────────────────────────────────────────────────
function HistoryItem({ item, onReuse }) {
    const badgeLabel = item.action === 'encode' ? ' Encode' : item.action === 'image' ? ' Image' : ' Decode';
    return (
        <div style={styles.historyItem} onClick={() => onReuse(item)}>
            <div style={styles.historyBadge}>{badgeLabel}</div>
            <div style={styles.historyInput} title={item.input}>
                {item.input.length > 40 ? item.input.slice(0, 40) + '…' : item.input}
            </div>
            <div style={styles.historyArrow}>→</div>
            <div style={styles.historyOutput} title={item.output}>
                {item.output.length > 40 ? item.output.slice(0, 40) + '…' : item.output}
            </div>
        </div>
    );
}

// ── Compression Stats Card ──────────────────────────────────────
function CompressionStats({ stats }) {
    if (!stats) return null;
    return (
        <div style={styles.statsCard}>
            <div style={styles.statsTitle}> Hasil Kompresi</div>
            <div style={styles.statsGrid}>
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>Original</span>
                    <span style={styles.statValue}>{stats.originalSize}</span>
                    {stats.originalDimensions && (
                        <span style={styles.statDim}>{stats.originalDimensions}</span>
                    )}
                </div>
                <div style={styles.statArrow}>→</div>
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>Frontend Compressed</span>
                    <span style={styles.statValue}>{stats.compressedSize}</span>
                </div>
                {stats.sharpSize && (
                    <>
                        <div style={styles.statArrow}>→</div>
                        <div style={styles.statItem}>
                            <span style={styles.statLabel}>Sharp Processed</span>
                            <span style={styles.statValue}>{stats.sharpSize}</span>
                            {stats.sharpDimensions && (
                                <span style={styles.statDim}>{stats.sharpDimensions}</span>
                            )}
                        </div>
                    </>
                )}
            </div>
            {stats.totalSaved && (
                <div style={styles.statsSaved}>
                     Total hemat: <strong>{stats.totalSaved}</strong> ({stats.totalRatio} lebih kecil)
                </div>
            )}
            {stats.localUrl && (
                <div style={styles.statsLocal}>
                     Tersimpan lokal: <code style={styles.code}>{stats.localUrl}</code>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function Base64Page() {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [mode, setMode] = useState('auto');
    const [detectedAction, setDetectedAction] = useState(null);
    const [copied, setCopied] = useState(false);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState('');
    const [charCount, setCharCount] = useState({ input: 0, output: 0 });
    const outputRef = useRef(null);

    // Image state
    const [imagePreview, setImagePreview] = useState(null);
    const [imageInfo, setImageInfo] = useState(null);
    const [imageBase64String, setImageBase64String] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [stringToImageInput, setStringToImageInput] = useState('');
    const [stringToImagePreview, setStringToImagePreview] = useState(null);
    const [stringToImageError, setStringToImageError] = useState('');
    const [copiedImageString, setCopiedImageString] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [compressionStats, setCompressionStats] = useState(null);
    const fileInputRef = useRef(null);

    // Compression settings
    const [compressSettings, setCompressSettings] = useState({
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        quality: 80,
        format: 'webp',
        useBackend: true, // also process through Sharp backend
    });

    // ── Text processing ─────────────────────────────────────────
    const processInput = useCallback(
        (text, forceMode) => {
            setError('');
            setDetectedAction(null);
            if (!text.trim()) { setOutput(''); setCharCount({ input: 0, output: 0 }); return; }
            const currentMode = forceMode || mode;
            let result = '', action = '';
            try {
                if (currentMode === 'encode') {
                    result = encodeBase64(text); action = 'encode';
                } else if (currentMode === 'decode') {
                    if (!isValidBase64(text.trim())) { setError('Input bukan format Base64 yang valid'); setOutput(''); return; }
                    result = decodeBase64(text.trim()); action = 'decode';
                } else {
                    if (isValidBase64(text.trim()) && text.trim().length >= 4) {
                        result = decodeBase64(text.trim()); action = 'decode'; setDetectedAction('decode');
                    } else {
                        result = encodeBase64(text); action = 'encode'; setDetectedAction('encode');
                    }
                }
                setOutput(result);
                setCharCount({ input: text.length, output: result.length });
                setHistory((prev) => {
                    const exists = prev.some((h) => h.input === text && h.action === action);
                    if (exists) return prev;
                    return [{ input: text, output: result, action, time: Date.now() }, ...prev].slice(0, 10);
                });
            } catch (err) { setError('Gagal memproses: ' + err.message); setOutput(''); }
        },
        [mode]
    );

    useEffect(() => { if (mode !== 'image' && input.trim()) processInput(input); }, [mode]); // eslint-disable-line

    const handleInputChange = (e) => { const val = e.target.value; setInput(val); processInput(val); };
    const handleCopy = async () => {
        if (!output) return;
        try { await navigator.clipboard.writeText(output); } catch { /* fallback */ }
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };
    const handleSwap = () => { if (!output) return; setInput(output); processInput(output); };
    const handleClear = () => { setInput(''); setOutput(''); setError(''); setDetectedAction(null); setCharCount({ input: 0, output: 0 }); };
    const handleReuse = (item) => { setInput(item.input); setOutput(item.output); setCharCount({ input: item.input.length, output: item.output.length }); };

    // ── Image processing pipeline ───────────────────────────────
    // 1. browser-image-compression (frontend) → 2. Sharp (backend) → 3. Base64 + local save
    const processImageFile = async (file) => {
        if (!file) return;
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            setError('Format tidak didukung. Gunakan JPG, PNG, WEBP, GIF, SVG, atau BMP.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) { setError('Ukuran file maksimal 10MB'); return; }

        setError('');
        setIsProcessing(true);
        setCompressionStats(null);

        try {
            const originalSize = file.size;
            let originalWidth = 0, originalHeight = 0;

            // Get original dimensions
            const origUrl = URL.createObjectURL(file);
            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => { originalWidth = img.naturalWidth; originalHeight = img.naturalHeight; resolve(); };
                img.onerror = resolve;
                img.src = origUrl;
            });
            URL.revokeObjectURL(origUrl);

            // ── Step 1: Frontend compression with browser-image-compression ──
            const compressionOptions = {
                maxSizeMB: compressSettings.maxSizeMB,
                maxWidthOrHeight: compressSettings.maxWidthOrHeight,
                useWebWorker: true,
                fileType: `image/${compressSettings.format === 'jpg' ? 'jpeg' : compressSettings.format}`,
            };

            let compressedFile;
            try {
                compressedFile = await imageCompression(file, compressionOptions);
            } catch (compErr) {
                console.warn('Frontend compression fallback:', compErr.message);
                compressedFile = file; // fallback to original
            }

            const frontendCompressedSize = compressedFile.size;

            // Read compressed file as data URL for preview
            const compressedDataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(compressedFile);
            });

            // Show frontend result immediately
            setImagePreview(compressedDataUrl);
            setImageBase64String(compressedDataUrl);
            setImageInfo({
                name: file.name,
                size: frontendCompressedSize,
                originalSize,
                type: compressedFile.type,
                width: originalWidth,
                height: originalHeight,
            });

            let stats = {
                originalSize: formatFileSize(originalSize),
                originalDimensions: `${originalWidth}×${originalHeight}`,
                compressedSize: formatFileSize(frontendCompressedSize),
                totalSaved: formatFileSize(originalSize - frontendCompressedSize),
                totalRatio: ((1 - frontendCompressedSize / originalSize) * 100).toFixed(1) + '%',
            };

            // ── Step 2: Backend processing with Sharp ──────────────
            if (compressSettings.useBackend) {
                try {
                    const formData = new FormData();
                    formData.append('file', compressedFile); // send pre-compressed file
                    formData.append('maxWidth', compressSettings.maxWidthOrHeight.toString());
                    formData.append('maxHeight', compressSettings.maxWidthOrHeight.toString());
                    formData.append('quality', compressSettings.quality.toString());
                    formData.append('format', compressSettings.format);

                    const res = await fetch('/api/base64', { method: 'POST', body: formData });
                    const data = await res.json();

                    if (data.success) {
                        // Update with Sharp-processed result
                        setImagePreview(data.base64);
                        setImageBase64String(data.base64);
                        setImageInfo((prev) => ({
                            ...prev,
                            size: data.processed.size,
                            width: data.processed.width,
                            height: data.processed.height,
                            format: data.processed.format,
                            localUrl: data.file.localUrl,
                        }));

                        stats = {
                            ...stats,
                            sharpSize: data.processed.sizeFormatted,
                            sharpDimensions: `${data.processed.width}×${data.processed.height}`,
                            sharpFormat: data.processed.format,
                            localUrl: data.file.localUrl,
                            totalSaved: formatFileSize(originalSize - data.processed.size),
                            totalRatio: ((1 - data.processed.size / originalSize) * 100).toFixed(1) + '%',
                        };
                    }
                } catch (backendErr) {
                    console.warn('Backend Sharp processing skipped:', backendErr.message);
                }
            }

            setCompressionStats(stats);

            // Add to history
            setHistory((prev) => {
                const newHistory = [
                    { input: file.name, output: `base64 (${stats.totalSaved} hemat)`, action: 'image', time: Date.now() },
                    ...prev,
                ];
                return newHistory.slice(0, 10);
            });
        } catch (err) {
            setError('Gagal memproses gambar: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelect = (e) => { const file = e.target.files?.[0]; if (file) processImageFile(file); };
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); processImageFile(e.dataTransfer.files?.[0]); };

    const handleCopyImageString = async () => {
        if (!imageBase64String) return;
        try { await navigator.clipboard.writeText(imageBase64String); } catch { /* fallback */ }
        setCopiedImageString(true); setTimeout(() => setCopiedImageString(false), 2000);
    };

    const handleClearImage = () => {
        setImagePreview(null); setImageInfo(null); setImageBase64String('');
        setError(''); setCompressionStats(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // String → Image
    const handleStringToImageChange = (e) => {
        const val = e.target.value;
        setStringToImageInput(val);
        setStringToImageError(''); setStringToImagePreview(null);
        if (!val.trim()) return;
        const trimmed = val.trim();
        if (isBase64Image(trimmed)) { setStringToImagePreview(trimmed); return; }
        if (isValidBase64(trimmed) && trimmed.length >= 20) {
            const testUrl = `data:image/png;base64,${trimmed}`;
            const img = new Image();
            img.onload = () => setStringToImagePreview(testUrl);
            img.onerror = () => {
                const jpegUrl = `data:image/jpeg;base64,${trimmed}`;
                const img2 = new Image();
                img2.onload = () => setStringToImagePreview(jpegUrl);
                img2.onerror = () => setStringToImageError('Base64 valid tapi bukan data gambar yang dapat di-render');
                img2.src = jpegUrl;
            };
            img.src = testUrl;
            return;
        }
        if (val.trim().length > 10) setStringToImageError('Input bukan Base64 image string yang valid');
    };

    const handlePasteExample = () => {
        const example = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        setStringToImageInput(example); setStringToImagePreview(example); setStringToImageError('');
    };

    return (
        <div style={styles.wrapper}>
            <ParticleCanvas />

            <header style={styles.header}>
                <a href="/" style={styles.logoLink}>
                    <span style={styles.logoIcon}></span>
                    <span style={styles.logoText}>CoffeeChain</span>
                </a>
                <nav style={styles.nav}>
                    <a href="/login" style={styles.navLink}>Login</a>
                    <a href="/register" style={styles.navLinkPrimary}>Daftar</a>
                </nav>
            </header>

            <div style={styles.container}>
                <div style={styles.titleSection}>
                    <div style={styles.titleBadge}> Gratis & Tanpa Login</div>
                    <h1 style={styles.title}>
                        Base64 <span style={styles.titleAccent}>Encoder / Decoder</span>
                    </h1>
                    <p style={styles.subtitle}>
                        Encode & decode teks dan gambar ke Base64 dengan kompresi otomatis.
                        <br />
                        <span style={{ fontSize: 13, opacity: 0.8 }}>
                            Frontend: browser-image-compression · Backend: Sharp
                        </span>
                    </p>
                </div>

                {/* Mode Selector */}
                <div style={styles.modeSelector}>
                    {[
                        { key: 'auto', label: ' Auto-Detect', desc: 'Otomatis encode/decode' },
                        { key: 'encode', label: ' Encode', desc: 'Teks → Base64' },
                        { key: 'decode', label: ' Decode', desc: 'Base64 → Teks' },
                        { key: 'image', label: ' Image', desc: 'Gambar  Base64' },
                    ].map((m) => (
                        <button
                            key={m.key}
                            onClick={() => setMode(m.key)}
                            style={{ ...styles.modeBtn, ...(mode === m.key ? styles.modeBtnActive : {}) }}
                        >
                            <span style={styles.modeBtnLabel}>{m.label}</span>
                            <span style={styles.modeBtnDesc}>{m.desc}</span>
                        </button>
                    ))}
                </div>

                {/* ═══ IMAGE MODE ═══════════════════════════════════ */}
                {mode === 'image' && (
                    <div style={styles.imageSection}>
                        {/* Compression Settings */}
                        <div style={styles.settingsCard}>
                            <div style={styles.settingsTitle}> Pengaturan Kompresi</div>
                            <div style={styles.settingsGrid}>
                                <div style={styles.settingItem}>
                                    <label style={styles.settingLabel}>Max Size (MB)</label>
                                    <input
                                        type="number"
                                        min="0.1" max="10" step="0.1"
                                        value={compressSettings.maxSizeMB}
                                        onChange={(e) => setCompressSettings((s) => ({ ...s, maxSizeMB: parseFloat(e.target.value) || 1 }))}
                                        style={styles.settingInput}
                                    />
                                </div>
                                <div style={styles.settingItem}>
                                    <label style={styles.settingLabel}>Max Dimensi (px)</label>
                                    <input
                                        type="number"
                                        min="100" max="4096" step="100"
                                        value={compressSettings.maxWidthOrHeight}
                                        onChange={(e) => setCompressSettings((s) => ({ ...s, maxWidthOrHeight: parseInt(e.target.value) || 1920 }))}
                                        style={styles.settingInput}
                                    />
                                </div>
                                <div style={styles.settingItem}>
                                    <label style={styles.settingLabel}>Quality ({compressSettings.quality}%)</label>
                                    <input
                                        type="range"
                                        min="10" max="100" step="5"
                                        value={compressSettings.quality}
                                        onChange={(e) => setCompressSettings((s) => ({ ...s, quality: parseInt(e.target.value) }))}
                                        style={styles.settingRange}
                                    />
                                </div>
                                <div style={styles.settingItem}>
                                    <label style={styles.settingLabel}>Format Output</label>
                                    <select
                                        value={compressSettings.format}
                                        onChange={(e) => setCompressSettings((s) => ({ ...s, format: e.target.value }))}
                                        style={styles.settingSelect}
                                    >
                                        <option value="webp">WebP (terbaik)</option>
                                        <option value="jpeg">JPEG</option>
                                        <option value="png">PNG</option>
                                        <option value="avif">AVIF</option>
                                    </select>
                                </div>
                                <div style={styles.settingItem}>
                                    <label style={styles.settingLabel}>Backend Sharp</label>
                                    <button
                                        onClick={() => setCompressSettings((s) => ({ ...s, useBackend: !s.useBackend }))}
                                        style={{
                                            ...styles.toggleBtn,
                                            ...(compressSettings.useBackend ? styles.toggleBtnActive : {}),
                                        }}
                                    >
                                        {compressSettings.useBackend ? ' Aktif' : ' Off'}
                                    </button>
                                </div>
                            </div>
                            <div style={styles.settingsInfo}>
                                 <strong>browser-image-compression</strong> mengkompresi di browser terlebih dulu →
                                lalu <strong>Sharp</strong> di backend standarisasi format & ukuran → disimpan <strong>lokal</strong> di server
                            </div>
                        </div>

                        {/* Section 1: Image → Base64 */}
                        <div style={styles.imageSectionCard}>
                            <div style={styles.imageSectionHeader}>
                                <span style={styles.imageSectionTitle}> Gambar → Base64 String</span>
                                <span style={styles.imageSectionDesc}>Upload foto → kompresi frontend → proses Sharp backend → simpan lokal + Base64</span>
                            </div>

                            <div style={styles.imageContentRow}>
                                {/* Upload Area */}
                                <div style={styles.uploadCol}>
                                    <div
                                        style={{ ...styles.dropZone, ...(isDragging ? styles.dropZoneActive : {}) }}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                                        {isProcessing ? (
                                            <div style={styles.dropZoneContent}>
                                                <div style={styles.spinner} />
                                                <div style={{ ...styles.dropZoneText, marginTop: 16 }}>
                                                    <strong>Memproses gambar...</strong>
                                                </div>
                                                <div style={styles.dropZoneHint}>Kompresi frontend + Sharp backend</div>
                                            </div>
                                        ) : imagePreview ? (
                                            <div style={styles.imagePreviewContainer}>
                                                <img src={imagePreview} alt="Preview" style={styles.imagePreviewImg} />
                                                {imageInfo && (
                                                    <div style={styles.imageMetaOverlay}>
                                                        <span>{imageInfo.name}</span>
                                                        <span>
                                                            {imageInfo.width}×{imageInfo.height} · {formatFileSize(imageInfo.size)}
                                                            {imageInfo.localUrl && ` ·  Lokal`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={styles.dropZoneContent}>
                                                <div style={styles.dropZoneIcon}></div>
                                                <div style={styles.dropZoneText}><strong>Klik atau drag & drop gambar</strong></div>
                                                <div style={styles.dropZoneHint}>JPG, PNG, WEBP, GIF, SVG · Max 10MB</div>
                                            </div>
                                        )}
                                    </div>
                                    {imagePreview && !isProcessing && (
                                        <button onClick={handleClearImage} style={styles.clearImageBtn}>✕ Hapus Gambar</button>
                                    )}
                                </div>

                                <div style={styles.arrowCol}><div style={styles.arrowCircle}>→</div></div>

                                {/* Base64 Output */}
                                <div style={styles.stringCol}>
                                    <div style={styles.stringOutputPanel}>
                                        <div style={styles.stringOutputHeader}>
                                            <span style={styles.panelTitle}> Base64 String</span>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                {imageBase64String && (
                                                    <span style={styles.charCounter}>{formatFileSize(imageBase64String.length)}</span>
                                                )}
                                                <button
                                                    onClick={handleCopyImageString}
                                                    style={{ ...styles.copyBtn, ...(copiedImageString ? styles.copyBtnSuccess : {}) }}
                                                    disabled={!imageBase64String}
                                                >
                                                    {copiedImageString ? '✓ Tersalin!' : ' Copy'}
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            style={{ ...styles.textarea, ...styles.textareaOutput, minHeight: 200 }}
                                            value={imageBase64String} readOnly
                                            placeholder="Base64 string akan muncul di sini..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && <div style={{ ...styles.errorMsg, margin: '0 24px 16px' }}> {error}</div>}

                            {/* Compression Stats */}
                            {compressionStats && (
                                <div style={{ padding: '0 24px 24px' }}>
                                    <CompressionStats stats={compressionStats} />
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div style={styles.sectionDivider}>
                            <div style={styles.dividerLine} />
                            <span style={styles.dividerText}>⇅ atau sebaliknya</span>
                            <div style={styles.dividerLine} />
                        </div>

                        {/* Section 2: String → Image */}
                        <div style={styles.imageSectionCard}>
                            <div style={styles.imageSectionHeader}>
                                <span style={styles.imageSectionTitle}> Base64 String → Gambar</span>
                                <span style={styles.imageSectionDesc}>Paste Base64 image string untuk melihat gambar</span>
                            </div>
                            <div style={styles.imageContentRow}>
                                <div style={styles.stringCol}>
                                    <div style={styles.stringOutputPanel}>
                                        <div style={styles.stringOutputHeader}>
                                            <span style={styles.panelTitle}> Paste Base64</span>
                                            <button onClick={handlePasteExample} style={styles.exampleBtn}> Contoh</button>
                                        </div>
                                        <textarea
                                            style={{ ...styles.textarea, minHeight: 200 }}
                                            value={stringToImageInput}
                                            onChange={handleStringToImageChange}
                                            placeholder={"Paste base64 image string...\n\nContoh:\ndata:image/png;base64,iVBORw0KGgo..."}
                                            spellCheck={false}
                                        />
                                    </div>
                                    {stringToImageError && (
                                        <div style={{ ...styles.errorMsg, borderRadius: 10, marginTop: 8 }}> {stringToImageError}</div>
                                    )}
                                </div>
                                <div style={styles.arrowCol}><div style={styles.arrowCircle}>→</div></div>
                                <div style={styles.uploadCol}>
                                    <div style={styles.resultImageBox}>
                                        {stringToImagePreview ? (
                                            <div style={styles.imagePreviewContainer}>
                                                <img src={stringToImagePreview} alt="Decoded" style={styles.imagePreviewImg} />
                                                <div style={styles.imageMetaOverlay}><span> Gambar berhasil di-render</span></div>
                                            </div>
                                        ) : (
                                            <div style={styles.dropZoneContent}>
                                                <div style={styles.dropZoneIcon}></div>
                                                <div style={styles.dropZoneText}><strong>Preview gambar</strong></div>
                                                <div style={styles.dropZoneHint}>Paste Base64 string di sebelah kiri</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ TEXT MODE ════════════════════════════════════ */}
                {mode !== 'image' && (
                    <div style={styles.editorGrid}>
                        <div style={styles.panel}>
                            <div style={styles.panelHeader}>
                                <span style={styles.panelTitle}>
                                     Input
                                    {detectedAction && mode === 'auto' && (
                                        <span style={styles.detectedBadge}>Auto: {detectedAction === 'encode' ? 'akan di-encode' : 'akan di-decode'}</span>
                                    )}
                                </span>
                                <span style={styles.charCounter}>{charCount.input} karakter</span>
                            </div>
                            <textarea
                                id="base64-input" style={styles.textarea}
                                placeholder={mode === 'decode' ? 'Paste Base64 string...\nContoh: SGVsbG8gV29ybGQ=' : mode === 'encode' ? 'Ketik teks...\nContoh: Hello World' : 'Ketik atau paste apa saja...\nAuto-detect encode/decode'}
                                value={input} onChange={handleInputChange} spellCheck={false}
                            />
                            {error && <div style={styles.errorMsg}> {error}</div>}
                        </div>
                        <div style={styles.actionCol}>
                            <button onClick={handleSwap} style={styles.swapBtn} title="Tukar" disabled={!output}>⇄</button>
                            <button onClick={handleClear} style={styles.clearBtn} title="Bersihkan">✕</button>
                        </div>
                        <div style={styles.panel}>
                            <div style={styles.panelHeader}>
                                <span style={styles.panelTitle}> Output</span>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={styles.charCounter}>{charCount.output} karakter</span>
                                    <button onClick={handleCopy} style={{ ...styles.copyBtn, ...(copied ? styles.copyBtnSuccess : {}) }} disabled={!output}>
                                        {copied ? '✓ Tersalin!' : ' Copy'}
                                    </button>
                                </div>
                            </div>
                            <textarea ref={outputRef} id="base64-output" style={{ ...styles.textarea, ...styles.textareaOutput }}
                                value={output} readOnly placeholder="Hasil muncul di sini..."
                            />
                        </div>
                    </div>
                )}

                {/* History */}
                {history.length > 0 && (
                    <div style={styles.historySection}>
                        <div style={styles.historySectionHeader}>
                            <h3 style={styles.historyTitle}> Riwayat</h3>
                            <button onClick={() => setHistory([])} style={styles.clearHistoryBtn}>Hapus</button>
                        </div>
                        <div style={styles.historyList}>
                            {history.map((item, i) => <HistoryItem key={item.time + '-' + i} item={item} onReuse={handleReuse} />)}
                        </div>
                    </div>
                )}

                {/* Info Cards */}
                <div style={styles.infoGrid}>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}></div>
                        <h3 style={styles.infoTitle}>2-Step Compression</h3>
                        <p style={styles.infoDesc}>browser-image-compression di frontend, lalu Sharp di backend untuk hasil optimal.</p>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}></div>
                        <h3 style={styles.infoTitle}>Local Storage</h3>
                        <p style={styles.infoDesc}>Gambar disimpan ke server lokal di <code style={styles.code}>/uploads/</code>, tidak perlu cloud.</p>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}></div>
                        <h3 style={styles.infoTitle}>Kustomisasi</h3>
                        <p style={styles.infoDesc}>Atur max size, dimensi, quality, dan format output sesuai kebutuhan.</p>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}></div>
                        <h3 style={styles.infoTitle}>API Tersedia</h3>
                        <p style={styles.infoDesc}>Endpoint <code style={styles.code}>/api/base64</code> mendukung FormData upload + Sharp processing.</p>
                    </div>
                </div>
            </div>

            <footer style={styles.footer}>
                <p> 2025 CoffeeChain — Blockchain Industri Kopi Indonesia</p>
            </footer>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ── STYLES ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const styles = {
    wrapper: { minHeight: '100vh', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' },

    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backdropFilter: 'blur(12px)', background: 'rgba(10, 15, 10, 0.6)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 100 },
    logoLink: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
    logoIcon: { fontSize: 28 },
    logoText: { fontSize: 20, fontWeight: 700, color: 'var(--color-logo-text)', letterSpacing: '-0.02em' },
    nav: { display: 'flex', gap: 12, alignItems: 'center' },
    navLink: { padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)', transition: 'var(--transition)', textDecoration: 'none' },
    navLinkPrimary: { padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', textDecoration: 'none', transition: 'var(--transition)' },

    container: { maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px', flex: 1, width: '100%' },

    titleSection: { textAlign: 'center', marginBottom: 36, animation: 'fadeInUp 0.5s ease both' },
    titleBadge: { display: 'inline-block', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: 'rgba(74, 124, 40, 0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(74, 124, 40, 0.3)', marginBottom: 16 },
    title: { fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 12, color: 'var(--color-text)' },
    titleAccent: { background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    subtitle: { fontSize: 16, color: 'var(--color-text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 },

    modeSelector: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap', animation: 'fadeInUp 0.6s ease both' },
    modeBtn: { padding: '12px 24px', borderRadius: 12, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.25s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 150 },
    modeBtnActive: { background: 'rgba(74, 124, 40, 0.15)', borderColor: 'var(--color-primary-light)', boxShadow: '0 0 20px rgba(74, 124, 40, 0.15)' },
    modeBtnLabel: { fontSize: 15, fontWeight: 600, color: 'var(--color-text)' },
    modeBtnDesc: { fontSize: 11, color: 'var(--color-text-muted)' },

    editorGrid: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, marginBottom: 40, animation: 'fadeInUp 0.7s ease both' },
    panel: { background: 'var(--color-bg-card)', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card2)' },
    panelTitle: { fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    detectedBadge: { fontSize: 11, padding: '2px 10px', borderRadius: 10, background: 'rgba(245, 166, 35, 0.15)', color: 'var(--color-accent)', fontWeight: 500 },
    charCounter: { fontSize: 12, color: 'var(--color-text-muted)' },
    textarea: { width: '100%', minHeight: 220, padding: '16px 18px', border: 'none', outline: 'none', resize: 'vertical', fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace", fontSize: 14, lineHeight: 1.7, background: 'transparent', color: 'var(--color-text)' },
    textareaOutput: { background: 'rgba(74, 124, 40, 0.03)', cursor: 'default' },
    errorMsg: { padding: '10px 18px', fontSize: 13, color: '#f87171', background: 'rgba(248, 113, 113, 0.08)', borderTop: '1px solid rgba(248, 113, 113, 0.15)' },

    actionCol: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12 },
    swapBtn: { width: 44, height: 44, borderRadius: '50%', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', fontSize: 20, color: 'var(--color-primary-light)', cursor: 'pointer', transition: 'all 0.25s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    clearBtn: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', fontSize: 14, color: '#f87171', cursor: 'pointer', transition: 'all 0.25s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' },

    copyBtn: { padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(74, 124, 40, 0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(74, 124, 40, 0.3)', cursor: 'pointer', transition: 'all 0.25s ease', whiteSpace: 'nowrap' },
    copyBtnSuccess: { background: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50', borderColor: 'rgba(76, 175, 80, 0.4)' },

    /* Settings Card */
    settingsCard: { background: 'var(--color-bg-card)', borderRadius: 16, border: '1px solid var(--color-border)', padding: 24, marginBottom: 24, animation: 'fadeInUp 0.65s ease both' },
    settingsTitle: { fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 16 },
    settingsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 },
    settingItem: { display: 'flex', flexDirection: 'column', gap: 6 },
    settingLabel: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' },
    settingInput: { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14, outline: 'none' },
    settingRange: { width: '100%', accentColor: 'var(--color-primary-light)' },
    settingSelect: { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontSize: 14, outline: 'none' },
    toggleBtn: { padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' },
    toggleBtnActive: { background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50', borderColor: 'rgba(76, 175, 80, 0.3)' },
    settingsInfo: { fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6, padding: '12px 16px', background: 'rgba(74, 124, 40, 0.05)', borderRadius: 10, border: '1px solid var(--color-border)' },

    /* Compression Stats */
    statsCard: { background: 'var(--color-bg-card2)', borderRadius: 14, border: '1px solid var(--color-border)', padding: 20, marginTop: 8 },
    statsTitle: { fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 14 },
    statsGrid: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
    statItem: { flex: 1, minWidth: 120, padding: '10px 14px', borderRadius: 10, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', textAlign: 'center' },
    statLabel: { display: 'block', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 },
    statValue: { display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' },
    statDim: { display: 'block', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 },
    statArrow: { fontSize: 20, color: 'var(--color-primary-light)', fontWeight: 700, flexShrink: 0 },
    statsSaved: { fontSize: 13, color: 'var(--color-success)', padding: '8px 14px', borderRadius: 8, background: 'rgba(76, 175, 80, 0.08)', marginBottom: 8 },
    statsLocal: { fontSize: 12, color: 'var(--color-text-secondary)', padding: '6px 14px', borderRadius: 8, background: 'rgba(74, 124, 40, 0.05)' },

    /* Image Section */
    imageSection: { animation: 'fadeInUp 0.7s ease both', marginBottom: 40 },
    imageSectionCard: { background: 'var(--color-bg-card)', borderRadius: 20, border: '1px solid var(--color-border)', overflow: 'hidden' },
    imageSectionHeader: { padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card2)' },
    imageSectionTitle: { display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 },
    imageSectionDesc: { fontSize: 13, color: 'var(--color-text-muted)' },
    imageContentRow: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 0, padding: 24, alignItems: 'stretch' },

    uploadCol: { display: 'flex', flexDirection: 'column', gap: 12 },
    dropZone: { border: '2px dashed rgba(74, 124, 40, 0.3)', borderRadius: 16, cursor: 'pointer', transition: 'all 0.3s ease', background: 'rgba(74, 124, 40, 0.03)', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
    dropZoneActive: { borderColor: 'var(--color-primary-light)', background: 'rgba(74, 124, 40, 0.08)', boxShadow: '0 0 30px rgba(74, 124, 40, 0.1)' },
    dropZoneContent: { textAlign: 'center', padding: 32 },
    dropZoneIcon: { fontSize: 48, marginBottom: 12, opacity: 0.8 },
    dropZoneText: { fontSize: 15, color: 'var(--color-text)', marginBottom: 8 },
    dropZoneHint: { fontSize: 12, color: 'var(--color-text-muted)' },

    imagePreviewContainer: { width: '100%', position: 'relative' },
    imagePreviewImg: { width: '100%', maxHeight: 300, objectFit: 'contain', display: 'block', borderRadius: 12 },
    imageMetaOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#fff', fontWeight: 500 },
    clearImageBtn: { padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.2)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'center' },

    arrowCol: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' },
    arrowCircle: { width: 44, height: 44, borderRadius: '50%', background: 'rgba(74, 124, 40, 0.12)', border: '1px solid rgba(74, 124, 40, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--color-primary-light)', fontWeight: 700 },

    stringCol: { display: 'flex', flexDirection: 'column', gap: 0 },
    stringOutputPanel: { borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden', background: 'var(--color-bg-card2)', flex: 1, display: 'flex', flexDirection: 'column' },
    stringOutputHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' },

    resultImageBox: { border: '2px dashed rgba(74, 124, 40, 0.2)', borderRadius: 16, minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'rgba(74, 124, 40, 0.02)' },

    sectionDivider: { display: 'flex', alignItems: 'center', gap: 16, padding: '24px 0' },
    dividerLine: { flex: 1, height: 1, background: 'var(--color-border)' },
    dividerText: { fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 500 },

    exampleBtn: { padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: 'rgba(245, 166, 35, 0.1)', color: 'var(--color-accent)', border: '1px solid rgba(245, 166, 35, 0.25)', cursor: 'pointer', transition: 'all 0.2s ease' },

    spinner: { width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary-light)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' },

    historySection: { marginBottom: 40, animation: 'fadeInUp 0.8s ease both' },
    historySectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    historyTitle: { fontSize: 16, fontWeight: 600, color: 'var(--color-text)' },
    clearHistoryBtn: { fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', transition: 'var(--transition)' },
    historyList: { display: 'flex', flexDirection: 'column', gap: 8 },
    historyItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: 13 },
    historyBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: 'rgba(74, 124, 40, 0.12)', color: 'var(--color-primary-light)', whiteSpace: 'nowrap' },
    historyInput: { flex: 1, color: 'var(--color-text-secondary)', fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    historyArrow: { color: 'var(--color-text-muted)', fontSize: 16, flexShrink: 0 },
    historyOutput: { flex: 1, color: 'var(--color-primary-light)', fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, animation: 'fadeInUp 0.9s ease both' },
    infoCard: { padding: '24px 20px', borderRadius: 14, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', textAlign: 'center', transition: 'all 0.25s ease' },
    infoIcon: { fontSize: 28, marginBottom: 10 },
    infoTitle: { fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 },
    infoDesc: { fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 },
    code: { padding: '2px 8px', borderRadius: 4, background: 'rgba(74, 124, 40, 0.12)', fontFamily: 'monospace', fontSize: 12, color: 'var(--color-primary-light)' },

    footer: { textAlign: 'center', padding: '24px 16px', fontSize: 13, color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' },
};
