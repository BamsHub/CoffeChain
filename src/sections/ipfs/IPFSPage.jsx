'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ── Helpers ─────────────────────────────────────────────────────
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function truncateCid(cid, len = 16) {
    if (!cid) return '';
    if (cid.length <= len * 2) return cid;
    return cid.slice(0, len) + '…' + cid.slice(-len);
}

function isImageFile(file) {
    return file && file.type && file.type.startsWith('image/');
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

// ── Copy Button Component ───────────────────────────────────────
function CopyButton({ text, label = ' Copy' }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        if (!text) return;
        try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            style={{ ...styles.copyBtn, ...(copied ? styles.copyBtnSuccess : {}) }}
            disabled={!text}
        >
            {copied ? '✓ Tersalin!' : label}
        </button>
    );
}

// ── Recent Pin Item ─────────────────────────────────────────────
function RecentPinItem({ item }) {
    return (
        <div style={styles.recentPinItem}>
            <div style={styles.recentPinLeft}>
                <div style={styles.recentPinIcon}>{item.isImage ? '' : item.isJson ? '' : ''}</div>
                <div style={styles.recentPinInfo}>
                    <span style={styles.recentPinName}>{item.name || 'Unnamed'}</span>
                    <span style={styles.recentPinCid} title={item.cid}>{truncateCid(item.cid, 12)}</span>
                </div>
            </div>
            <div style={styles.recentPinRight}>
                {item.size && <span style={styles.recentPinSize}>{item.size}</span>}
                <CopyButton text={item.cid} label="CID" />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
export default function IPFSPage() {
    // Upload state
    const [uploadResult, setUploadResult] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Lookup state
    const [lookupCid, setLookupCid] = useState('');
    const [lookupResult, setLookupResult] = useState(null);
    const [isLookingUp, setIsLookingUp] = useState(false);

    // On-chain pin state
    const [isPinning, setIsPinning] = useState(false);
    const [pinResult, setPinResult] = useState(null);

    // JSON metadata state
    const [jsonInput, setJsonInput] = useState('{\n  "name": "CoffeeChain Metadata",\n  "description": "",\n  "attributes": {}\n}');
    const [showJsonInput, setShowJsonInput] = useState(false);
    const [isUploadingJson, setIsUploadingJson] = useState(false);

    // Recent pins
    const [recentPins, setRecentPins] = useState([]);

    // Error
    const [error, setError] = useState('');


    // ── File handling ───────────────────────────────────────────
    const handleFileSelect = (file) => {
        if (!file) return;
        setError('');
        setUploadResult(null);
        setPinResult(null);
        setSelectedFile(file);

        if (isImageFile(file)) {
            const url = URL.createObjectURL(file);
            setImagePreviewUrl(url);
        } else {
            setImagePreviewUrl(null);
        }
    };

    const handleInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleClearFile = () => {
        setSelectedFile(null);
        setImagePreviewUrl(null);
        setUploadResult(null);
        setPinResult(null);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Upload to IPFS ──────────────────────────────────────────
    const handleUpload = async () => {
        if (!selectedFile) { setError('Pilih file terlebih dahulu'); return; }

        setIsUploading(true);
        setError('');
        setUploadResult(null);
        setPinResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await fetch('/api/ipfs', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload gagal');

            const result = {
                cid: data.cid,
                ipfsUrl: data.ipfsUrl || `ipfs://${data.cid}`,
                gatewayUrl: data.gatewayUrl || `https://gateway.pinata.cloud/ipfs/${data.cid}`,
                localUrl: data.localUrl || data.file?.localUrl || '',
                compression: data.compression || data.processed || null,
                file: {
                    name: selectedFile.name,
                    size: selectedFile.size,
                    type: selectedFile.type,
                },
            };

            setUploadResult(result);
            addRecentPin({
                cid: result.cid,
                name: selectedFile.name,
                size: formatFileSize(selectedFile.size),
                isImage: isImageFile(selectedFile),
                isJson: false,
                time: Date.now(),
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // ── Upload JSON Metadata ────────────────────────────────────
    const handleUploadJson = async () => {

        let parsed;
        try {
            parsed = JSON.parse(jsonInput);
        } catch {
            setError('JSON tidak valid. Periksa format JSON Anda.');
            return;
        }

        setIsUploadingJson(true);
        setError('');

        try {
            const res = await fetch('/api/ipfs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ json: parsed, name: 'metadata' }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload JSON gagal');

            const result = {
                cid: data.cid,
                ipfsUrl: data.ipfsUrl || `ipfs://${data.cid}`,
                gatewayUrl: data.gatewayUrl || `https://gateway.pinata.cloud/ipfs/${data.cid}`,
                localUrl: data.localUrl || '',
                compression: null,
                file: { name: 'metadata.json', size: new Blob([jsonInput]).size, type: 'application/json' },
            };

            setUploadResult(result);
            setShowJsonInput(false);
            addRecentPin({
                cid: result.cid,
                name: 'metadata.json',
                size: formatFileSize(new Blob([jsonInput]).size),
                isImage: false,
                isJson: true,
                time: Date.now(),
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploadingJson(false);
        }
    };

    // ── Lookup CID ──────────────────────────────────────────────
    const handleLookup = async () => {
        if (!lookupCid.trim()) { setError('Masukkan CID untuk lookup'); return; }
        setIsLookingUp(true);
        setError('');
        setLookupResult(null);

        try {
            const res = await fetch(`/api/ipfs/${lookupCid.trim()}`);
            const contentType = res.headers.get('content-type') || '';

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Lookup gagal');
            }

            if (contentType.includes('image')) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setLookupResult({ type: 'image', url, cid: lookupCid.trim() });
            } else if (contentType.includes('json')) {
                const data = await res.json();
                setLookupResult({ type: 'json', data, cid: lookupCid.trim() });
            } else {
                const text = await res.text();
                setLookupResult({ type: 'text', data: text, cid: lookupCid.trim() });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLookingUp(false);
        }
    };

    // ── Pin to Solana On-Chain ───────────────────────────────────
    const handlePinToChain = async () => {
        if (!uploadResult?.cid) { setError('Upload file terlebih dahulu'); return; }

        setIsPinning(true);
        setError('');
        setPinResult(null);

        try {
            const res = await fetch('/api/ipfs/pin-to-chain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cid: uploadResult.cid,
                    fileName: uploadResult.file?.name || 'unknown',
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Pin to chain gagal');

            setPinResult({
                txSignature: data.txSignature || data.signature,
                explorerUrl: data.explorerUrl || `https://explorer.solana.com/tx/${data.txSignature || data.signature}?cluster=devnet`,
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsPinning(false);
        }
    };

    // ── Recent pins helper ──────────────────────────────────────
    const addRecentPin = (pin) => {
        setRecentPins((prev) => [pin, ...prev].slice(0, 20));
    };

    // ── Cleanup blob URLs ───────────────────────────────────────
    useEffect(() => {
        return () => {
            if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
        };
    }, [imagePreviewUrl]);

    // ═════════════════════════════════════════════════════════════
    // ── RENDER ──────────────────────────────────────────────────
    // ═════════════════════════════════════════════════════════════
    return (
        <div style={styles.wrapper}>
            <ParticleCanvas />

            {/* ── Header ─────────────────────────────────────────── */}
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
                {/* ── Title Section ──────────────────────────────── */}
                <div style={styles.titleSection}>
                    <div style={styles.titleBadge}> Desentralisasi</div>
                    <h1 style={styles.title}>
                        IPFS <span style={styles.titleAccent}>Off-Chain Storage</span>
                    </h1>
                    <p style={styles.subtitle}>
                        Upload dan simpan file ke IPFS secara desentralisasi. CID hash tercatat on-chain di Solana.
                        <br />
                        <span style={{ fontSize: 13, opacity: 0.8 }}>
                            Pinata IPFS · Solana Memo Program · Gateway Access
                        </span>
                    </p>
                </div>

                {/* ═══ UPLOAD SECTION ═════════════════════════════ */}
                <div style={styles.sectionCard}>
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionTitle}> Upload ke IPFS</span>
                        <span style={styles.sectionDesc}>Drag & drop atau pilih file — gambar, dokumen, atau data lainnya</span>
                    </div>

                    <div style={styles.sectionBody}>
                        {/* Drop Zone */}
                        <div
                            style={{ ...styles.dropZone, ...(isDragging ? styles.dropZoneActive : {}) }}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" onChange={handleInputChange} style={{ display: 'none' }} />
                            {isUploading ? (
                                <div style={styles.dropZoneContent}>
                                    <div style={styles.spinner} />
                                    <div style={{ ...styles.dropZoneText, marginTop: 16 }}>
                                        <strong>Mengupload ke IPFS...</strong>
                                    </div>
                                    <div style={styles.dropZoneHint}>Pinning file ke jaringan IPFS</div>
                                </div>
                            ) : selectedFile && imagePreviewUrl ? (
                                <div style={styles.imagePreviewContainer}>
                                    <img src={imagePreviewUrl} alt="Preview" style={styles.imagePreviewImg} />
                                    <div style={styles.imageMetaOverlay}>
                                        <span>{selectedFile.name}</span>
                                        <span>{formatFileSize(selectedFile.size)}</span>
                                    </div>
                                </div>
                            ) : selectedFile ? (
                                <div style={styles.dropZoneContent}>
                                    <div style={styles.dropZoneIcon}></div>
                                    <div style={styles.dropZoneText}><strong>{selectedFile.name}</strong></div>
                                    <div style={styles.dropZoneHint}>{selectedFile.type || 'Unknown type'} · {formatFileSize(selectedFile.size)}</div>
                                </div>
                            ) : (
                                <div style={styles.dropZoneContent}>
                                    <div style={styles.dropZoneIcon}></div>
                                    <div style={styles.dropZoneText}><strong>Klik atau drag & drop file</strong></div>
                                    <div style={styles.dropZoneHint}>Gambar, dokumen, JSON — semua format didukung · Max 10MB</div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div style={styles.uploadActions}>
                            {selectedFile && !isUploading && (
                                <button onClick={handleClearFile} style={styles.clearImageBtn}>✕ Hapus File</button>
                            )}
                            <button
                                onClick={handleUpload}
                                style={{ ...styles.uploadBtn, ...(isUploading || !selectedFile ? styles.uploadBtnDisabled : {}) }}
                                disabled={isUploading || !selectedFile}
                            >
                                {isUploading ? ' Mengupload...' : ' Upload ke IPFS'}
                            </button>
                            <button
                                onClick={() => setShowJsonInput(!showJsonInput)}
                                style={styles.jsonToggleBtn}
                            >
                                {showJsonInput ? '✕ Tutup JSON' : ' Pin JSON Metadata'}
                            </button>
                        </div>

                        {/* JSON Metadata Input */}
                        {showJsonInput && (
                            <div style={styles.jsonSection}>
                                <div style={styles.jsonHeader}>
                                    <span style={styles.jsonTitle}> JSON Metadata</span>
                                    <span style={styles.jsonHint}>Paste atau tulis JSON metadata untuk di-pin ke IPFS</span>
                                </div>
                                <textarea
                                    style={styles.jsonTextarea}
                                    value={jsonInput}
                                    onChange={(e) => setJsonInput(e.target.value)}
                                    placeholder='{ "name": "...", "description": "..." }'
                                    spellCheck={false}
                                    rows={8}
                                />
                                <button
                                    onClick={handleUploadJson}
                                    style={{ ...styles.uploadBtn, width: '100%', ...(isUploadingJson ? styles.uploadBtnDisabled : {}) }}
                                    disabled={isUploadingJson}
                                >
                                    {isUploadingJson ? ' Pinning JSON...' : ' Pin JSON ke IPFS'}
                                </button>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && <div style={styles.errorMsg}> {error}</div>}

                        {/* Upload Result */}
                        {uploadResult && (
                            <div style={styles.resultCard}>
                                <div style={styles.resultHeader}>
                                    <span style={styles.resultTitle}> Upload Berhasil!</span>
                                    <span style={styles.resultBadge}>IPFS Pinned</span>
                                </div>

                                <div style={styles.resultGrid}>
                                    {/* CID */}
                                    <div style={styles.resultRow}>
                                        <span style={styles.resultLabel}> CID</span>
                                        <div style={styles.resultValueRow}>
                                            <code style={styles.cidCode}>{uploadResult.cid}</code>
                                            <CopyButton text={uploadResult.cid} label="" />
                                        </div>
                                    </div>

                                    {/* IPFS URL */}
                                    <div style={styles.resultRow}>
                                        <span style={styles.resultLabel}> IPFS URL</span>
                                        <div style={styles.resultValueRow}>
                                            <code style={styles.urlCode}>{uploadResult.ipfsUrl}</code>
                                            <CopyButton text={uploadResult.ipfsUrl} label="" />
                                        </div>
                                    </div>

                                    {/* Gateway URL */}
                                    <div style={styles.resultRow}>
                                        <span style={styles.resultLabel}> Gateway URL</span>
                                        <div style={styles.resultValueRow}>
                                            <a href={uploadResult.gatewayUrl} target="_blank" rel="noopener noreferrer" style={styles.resultLink}>
                                                {truncateCid(uploadResult.gatewayUrl, 24)}
                                            </a>
                                            <CopyButton text={uploadResult.gatewayUrl} label="" />
                                        </div>
                                    </div>

                                    {/* Local URL */}
                                    {uploadResult.localUrl && (
                                        <div style={styles.resultRow}>
                                            <span style={styles.resultLabel}> Local URL</span>
                                            <div style={styles.resultValueRow}>
                                                <code style={styles.urlCode}>{uploadResult.localUrl}</code>
                                                <CopyButton text={uploadResult.localUrl} label="" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Image Preview */}
                                {imagePreviewUrl && (
                                    <div style={styles.resultPreviewBox}>
                                        <img src={imagePreviewUrl} alt="Uploaded" style={styles.resultPreviewImg} />
                                    </div>
                                )}

                                {/* Compression Stats */}
                                {uploadResult.compression && (
                                    <div style={styles.statsCard}>
                                        <div style={styles.statsTitle}> Compression Stats</div>
                                        <div style={styles.statsGrid}>
                                            <div style={styles.statItem}>
                                                <span style={styles.statLabel}>Original</span>
                                                <span style={styles.statValue}>
                                                    {uploadResult.compression.originalSizeFormatted || formatFileSize(uploadResult.file?.size || 0)}
                                                </span>
                                            </div>
                                            <div style={styles.statArrow}>→</div>
                                            <div style={styles.statItem}>
                                                <span style={styles.statLabel}>Processed</span>
                                                <span style={styles.statValue}>
                                                    {uploadResult.compression.processedSizeFormatted || uploadResult.compression.sizeFormatted || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        {uploadResult.compression.saved && (
                                            <div style={styles.statsSaved}>
                                                 Hemat: <strong>{uploadResult.compression.saved}</strong>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ ON-CHAIN SECTION ═══════════════════════════ */}
                {uploadResult && (
                    <div style={{ ...styles.sectionCard, animation: 'fadeInUp 0.6s ease both' }}>
                        <div style={styles.sectionHeader}>
                            <span style={styles.sectionTitle}> Pin On-Chain (Solana)</span>
                            <span style={styles.sectionDesc}>Simpan CID hash ke Solana blockchain melalui Memo Program</span>
                        </div>
                        <div style={styles.sectionBody}>
                            <div style={styles.onchainInfo}>
                                <span style={styles.onchainCidLabel}>CID yang akan di-pin:</span>
                                <code style={styles.cidCode}>{uploadResult.cid}</code>
                            </div>

                            <button
                                onClick={handlePinToChain}
                                style={{ ...styles.chainBtn, ...(isPinning ? styles.chainBtnDisabled : {}) }}
                                disabled={isPinning}
                            >
                                {isPinning ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                                        <span style={styles.spinnerSmall} />
                                        Menyimpan ke Solana...
                                    </span>
                                ) : ' Simpan CID ke Solana'}
                            </button>

                            {pinResult && (
                                <div style={styles.pinResultCard}>
                                    <div style={styles.pinResultHeader}>
                                        <span style={styles.pinResultIcon}></span>
                                        <span style={styles.pinResultTitle}>Berhasil disimpan on-chain!</span>
                                    </div>
                                    <div style={styles.resultRow}>
                                        <span style={styles.resultLabel}> TX Signature</span>
                                        <div style={styles.resultValueRow}>
                                            <code style={styles.cidCode}>{truncateCid(pinResult.txSignature, 20)}</code>
                                            <CopyButton text={pinResult.txSignature} label="" />
                                        </div>
                                    </div>
                                    <a
                                        href={pinResult.explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={styles.explorerLink}
                                    >
                                         Lihat di Solana Explorer →
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══ LOOKUP SECTION ═════════════════════════════ */}
                <div style={{ ...styles.sectionCard, animation: 'fadeInUp 0.7s ease both' }}>
                    <div style={styles.sectionHeader}>
                        <span style={styles.sectionTitle}> Lookup CID</span>
                        <span style={styles.sectionDesc}>Cari dan preview file dari IPFS menggunakan Content Identifier (CID)</span>
                    </div>
                    <div style={styles.sectionBody}>
                        <div style={styles.lookupRow}>
                            <input
                                type="text"
                                style={styles.lookupInput}
                                value={lookupCid}
                                onChange={(e) => setLookupCid(e.target.value)}
                                placeholder="Masukkan CID... contoh: Qm..."
                                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                            />
                            <button
                                onClick={handleLookup}
                                style={{ ...styles.lookupBtn, ...(isLookingUp ? styles.uploadBtnDisabled : {}) }}
                                disabled={isLookingUp || !lookupCid.trim()}
                            >
                                {isLookingUp ? ' Mencari...' : ' Lookup'}
                            </button>
                        </div>

                        {lookupResult && (
                            <div style={styles.lookupResultCard}>
                                <div style={styles.lookupResultHeader}>
                                    <span style={styles.resultTitle}>
                                        {lookupResult.type === 'image' ? '' : ''} Hasil Lookup
                                    </span>
                                    <a
                                        href={`https://gateway.pinata.cloud/ipfs/${lookupResult.cid}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={styles.resultLink}
                                    >
                                        Buka di Gateway →
                                    </a>
                                </div>

                                {lookupResult.type === 'image' && (
                                    <div style={styles.lookupImageBox}>
                                        <img src={lookupResult.url} alt="IPFS content" style={styles.lookupImage} />
                                    </div>
                                )}

                                {lookupResult.type === 'json' && (
                                    <pre style={styles.lookupJsonPre}>
                                        {JSON.stringify(lookupResult.data, null, 2)}
                                    </pre>
                                )}

                                {lookupResult.type === 'text' && (
                                    <pre style={styles.lookupJsonPre}>
                                        {lookupResult.data}
                                    </pre>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ RECENT PINS ═══════════════════════════════ */}
                {recentPins.length > 0 && (
                    <div style={styles.recentSection}>
                        <div style={styles.recentHeader}>
                            <h3 style={styles.recentTitle}> Recent Pins</h3>
                            <button onClick={() => setRecentPins([])} style={styles.clearHistoryBtn}>Hapus</button>
                        </div>
                        <div style={styles.recentList}>
                            {recentPins.map((item, i) => (
                                <RecentPinItem key={`${item.cid}-${item.time}-${i}`} item={item} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ INFO CARDS ════════════════════════════════ */}
                <div style={styles.infoGrid}>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}></div>
                        <h3 style={styles.infoTitle}>Desentralisasi</h3>
                        <p style={styles.infoDesc}>File disimpan di jaringan IPFS — tidak bergantung pada satu server. Data tersebar di seluruh dunia.</p>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}></div>
                        <h3 style={styles.infoTitle}>Immutable</h3>
                        <p style={styles.infoDesc}>Setiap file memiliki CID unik berdasarkan kontennya. File tidak bisa diubah setelah di-pin — integritas terjamin.</p>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}></div>
                        <h3 style={styles.infoTitle}>On-Chain Reference</h3>
                        <p style={styles.infoDesc}>CID hash tercatat di Solana blockchain melalui Memo Program. Bukti tak terbantahkan bahwa data ada.</p>
                    </div>
                    <div style={styles.infoCard}>
                        <div style={styles.infoIcon}></div>
                        <h3 style={styles.infoTitle}>Local Backup</h3>
                        <p style={styles.infoDesc}>File juga disimpan lokal di server sebagai cadangan. Akses cepat tanpa bergantung gateway IPFS.</p>
                    </div>
                </div>
            </div>

            {/* ── Footer ─────────────────────────────────────────── */}
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

    // Header
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backdropFilter: 'blur(12px)', background: 'rgba(10, 15, 10, 0.6)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 100 },
    logoLink: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
    logoIcon: { fontSize: 28 },
    logoText: { fontSize: 20, fontWeight: 700, color: 'var(--color-logo-text)', letterSpacing: '-0.02em' },
    nav: { display: 'flex', gap: 12, alignItems: 'center' },
    navLink: { padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)', transition: 'var(--transition)', textDecoration: 'none' },
    navLinkPrimary: { padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', textDecoration: 'none', transition: 'var(--transition)' },

    // Container
    container: { maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px', flex: 1, width: '100%' },

    // Title
    titleSection: { textAlign: 'center', marginBottom: 36, animation: 'fadeInUp 0.5s ease both' },
    titleBadge: { display: 'inline-block', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: 'rgba(74, 124, 40, 0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(74, 124, 40, 0.3)', marginBottom: 16 },
    title: { fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 12, color: 'var(--color-text)' },
    titleAccent: { background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    subtitle: { fontSize: 16, color: 'var(--color-text-secondary)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 },

    // Section Card
    sectionCard: { background: 'var(--color-bg-card)', borderRadius: 20, border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 24, animation: 'fadeInUp 0.6s ease both' },
    sectionHeader: { padding: '20px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-card2)' },
    sectionTitle: { display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 },
    sectionDesc: { fontSize: 13, color: 'var(--color-text-muted)' },
    sectionBody: { padding: 24 },

    // Drop Zone
    dropZone: { border: '2px dashed rgba(74, 124, 40, 0.3)', borderRadius: 16, cursor: 'pointer', transition: 'all 0.3s ease', background: 'rgba(74, 124, 40, 0.03)', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
    dropZoneActive: { borderColor: 'var(--color-primary-light)', background: 'rgba(74, 124, 40, 0.08)', boxShadow: '0 0 30px rgba(74, 124, 40, 0.1)' },
    dropZoneContent: { textAlign: 'center', padding: 32 },
    dropZoneIcon: { fontSize: 48, marginBottom: 12, opacity: 0.8 },
    dropZoneText: { fontSize: 15, color: 'var(--color-text)', marginBottom: 8 },
    dropZoneHint: { fontSize: 12, color: 'var(--color-text-muted)' },

    // Image Preview
    imagePreviewContainer: { width: '100%', position: 'relative' },
    imagePreviewImg: { width: '100%', maxHeight: 300, objectFit: 'contain', display: 'block', borderRadius: 12 },
    imageMetaOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#fff', fontWeight: 500 },

    // Upload Actions
    uploadActions: { display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' },
    clearImageBtn: { padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500, background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.2)', cursor: 'pointer', transition: 'all 0.2s ease' },
    uploadBtn: { padding: '12px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 16px rgba(74, 124, 40, 0.3)', flex: 1, minWidth: 180 },
    uploadBtnDisabled: { opacity: 0.5, cursor: 'not-allowed', boxShadow: 'none' },
    jsonToggleBtn: { padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'rgba(245, 166, 35, 0.1)', color: 'var(--color-accent)', border: '1px solid rgba(245, 166, 35, 0.25)', cursor: 'pointer', transition: 'all 0.2s ease' },

    // JSON Section
    jsonSection: { marginTop: 20, padding: 20, borderRadius: 14, background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)', animation: 'fadeInUp 0.3s ease both' },
    jsonHeader: { marginBottom: 12 },
    jsonTitle: { display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 },
    jsonHint: { fontSize: 12, color: 'var(--color-text-muted)' },
    jsonTextarea: { width: '100%', minHeight: 160, padding: '14px 16px', border: '1px solid var(--color-input-border)', borderRadius: 10, background: 'var(--color-input-bg)', color: 'var(--color-text)', fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace", fontSize: 13, lineHeight: 1.6, resize: 'vertical', outline: 'none', marginBottom: 12, boxSizing: 'border-box' },

    // Error
    errorMsg: { padding: '12px 18px', fontSize: 13, color: '#f87171', background: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.15)', borderRadius: 10, marginTop: 16 },

    // Copy Button
    copyBtn: { padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(74, 124, 40, 0.15)', color: 'var(--color-primary-light)', border: '1px solid rgba(74, 124, 40, 0.3)', cursor: 'pointer', transition: 'all 0.25s ease', whiteSpace: 'nowrap', flexShrink: 0 },
    copyBtnSuccess: { background: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50', borderColor: 'rgba(76, 175, 80, 0.4)' },

    // Result Card
    resultCard: { marginTop: 20, padding: 24, borderRadius: 16, background: 'rgba(74, 124, 40, 0.05)', border: '1px solid rgba(74, 124, 40, 0.2)', animation: 'fadeInUp 0.4s ease both' },
    resultHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    resultTitle: { fontSize: 16, fontWeight: 700, color: 'var(--color-success)' },
    resultBadge: { fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 8, background: 'rgba(76, 175, 80, 0.15)', color: '#4CAF50', border: '1px solid rgba(76, 175, 80, 0.3)' },
    resultGrid: { display: 'flex', flexDirection: 'column', gap: 14 },
    resultRow: { display: 'flex', flexDirection: 'column', gap: 6 },
    resultLabel: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' },
    resultValueRow: { display: 'flex', alignItems: 'center', gap: 8 },
    cidCode: { padding: '8px 14px', borderRadius: 8, background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, color: 'var(--color-primary-light)', wordBreak: 'break-all', flex: 1 },
    urlCode: { padding: '8px 14px', borderRadius: 8, background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, color: 'var(--color-text-secondary)', wordBreak: 'break-all', flex: 1 },
    resultLink: { padding: '8px 14px', borderRadius: 8, background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 12, color: 'var(--color-primary-light)', wordBreak: 'break-all', flex: 1, textDecoration: 'none', transition: 'all 0.2s ease' },
    resultPreviewBox: { marginTop: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-bg-card2)', textAlign: 'center' },
    resultPreviewImg: { maxWidth: '100%', maxHeight: 280, objectFit: 'contain', display: 'block', margin: '0 auto', padding: 8 },

    // Compression Stats
    statsCard: { marginTop: 16, background: 'var(--color-bg-card2)', borderRadius: 14, border: '1px solid var(--color-border)', padding: 20 },
    statsTitle: { fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 14 },
    statsGrid: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
    statItem: { flex: 1, minWidth: 120, padding: '10px 14px', borderRadius: 10, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', textAlign: 'center' },
    statLabel: { display: 'block', fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 },
    statValue: { display: 'block', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' },
    statArrow: { fontSize: 20, color: 'var(--color-primary-light)', fontWeight: 700, flexShrink: 0 },
    statsSaved: { fontSize: 13, color: 'var(--color-success)', padding: '8px 14px', borderRadius: 8, background: 'rgba(76, 175, 80, 0.08)' },

    // On-Chain Section
    onchainInfo: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
    onchainCidLabel: { fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' },
    chainBtn: { width: '100%', padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)' },
    chainBtnDisabled: { opacity: 0.5, cursor: 'not-allowed', boxShadow: 'none' },
    pinResultCard: { marginTop: 20, padding: 20, borderRadius: 14, background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', animation: 'fadeInUp 0.4s ease both' },
    pinResultHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 },
    pinResultIcon: { fontSize: 20 },
    pinResultTitle: { fontSize: 15, fontWeight: 700, color: '#a78bfa' },
    explorerLink: { display: 'block', marginTop: 16, padding: '12px 20px', borderRadius: 10, background: 'rgba(99, 102, 241, 0.1)', color: '#a78bfa', fontSize: 14, fontWeight: 600, textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(99, 102, 241, 0.2)', transition: 'all 0.2s ease' },

    // Lookup Section
    lookupRow: { display: 'flex', gap: 12, marginBottom: 16 },
    lookupInput: { flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 14, outline: 'none', transition: 'border-color 0.2s ease' },
    lookupBtn: { padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', whiteSpace: 'nowrap' },
    lookupResultCard: { padding: 20, borderRadius: 14, background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)', animation: 'fadeInUp 0.3s ease both' },
    lookupResultHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    lookupImageBox: { borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.2)', textAlign: 'center' },
    lookupImage: { maxWidth: '100%', maxHeight: 400, objectFit: 'contain', display: 'block', margin: '0 auto' },
    lookupJsonPre: { padding: '16px 18px', borderRadius: 10, background: 'var(--color-input-bg)', border: '1px solid var(--color-border)', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 13, color: 'var(--color-text)', overflow: 'auto', maxHeight: 400, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 },

    // Recent Pins
    recentSection: { marginBottom: 32, animation: 'fadeInUp 0.8s ease both' },
    recentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    recentTitle: { fontSize: 16, fontWeight: 600, color: 'var(--color-text)' },
    clearHistoryBtn: { fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', transition: 'var(--transition)' },
    recentList: { display: 'flex', flexDirection: 'column', gap: 8 },
    recentPinItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', transition: 'all 0.2s ease' },
    recentPinLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
    recentPinIcon: { fontSize: 22, flexShrink: 0 },
    recentPinInfo: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
    recentPinName: { fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    recentPinCid: { fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: 'var(--color-primary-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    recentPinRight: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
    recentPinSize: { fontSize: 12, color: 'var(--color-text-muted)' },

    // Info Grid
    infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, animation: 'fadeInUp 0.9s ease both' },
    infoCard: { padding: '24px 20px', borderRadius: 14, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', textAlign: 'center', transition: 'all 0.25s ease' },
    infoIcon: { fontSize: 28, marginBottom: 10 },
    infoTitle: { fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 },
    infoDesc: { fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 },

    // Spinner
    spinner: { width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary-light)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' },
    spinnerSmall: { display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

    // Footer
    footer: { textAlign: 'center', padding: '24px 16px', fontSize: 13, color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' },
};
