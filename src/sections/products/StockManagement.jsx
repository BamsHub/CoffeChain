'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { normalizeExplorerUrl } from '@/lib/contractConfig';

const STAGES = [
    { id: 1, name: 'Panen & Sortasi', short: 'Panen', tone: '#7ED44A' },
    { id: 2, name: 'Pencucian & Fermentasi', short: 'Fermentasi', tone: '#5BC0EB' },
    { id: 3, name: 'Pengeringan', short: 'Pengeringan', tone: '#F5A623' },
    { id: 4, name: 'Pengupasan & Penggilingan', short: 'Penggilingan', tone: '#B388FF' },
    { id: 5, name: 'Pemanggangan', short: 'Roasting', tone: '#FF8A65' },
    { id: 6, name: 'Produk Jadi & Pengemasan', short: 'Produk Jadi', tone: '#4CAF50' },
];

const initialBatchForm = {
    name: '',
    origin: '',
    variety: 'Arabika',
    grade: 'A',
    weightKg: '',
    notes: '',
};

const initialStageForm = {
    notes: '',
    operator: '',
    durationMinutes: '',
    weightIn: '',
    weightOut: '',
    suhu: '',
    levelRoast: 'Medium Roast',
    processMethod: 'Washed',
    moisturePercent: '',
    ukuranGiling: 'Medium',
    gasReleaseHours: '',
    productName: '',
    stock: '',
    gram: 250,
    price: '',
    description: '',
};

export default function StockManagement() {
    const { user, getToken } = useAuth();
    const isFarmer = user?.role === 'farmer';

    const [batches, setBatches] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showBatchForm, setShowBatchForm] = useState(false);
    const [batchForm, setBatchForm] = useState(initialBatchForm);
    const [stageModal, setStageModal] = useState(null);
    const [stageForm, setStageForm] = useState(initialStageForm);
    const [photoProofs, setPhotoProofs] = useState([]);
    const [msg, setMsg] = useState(null);
    const [search, setSearch] = useState('');
    const [detailLog, setDetailLog] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancellingBatchId, setCancellingBatchId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const batchUrl = isFarmer && user?.id
                ? `/api/production-batches?farmerId=${encodeURIComponent(user.id)}`
                : '/api/production-batches';
            const [batchRes, logRes] = await Promise.all([
                fetch(batchUrl, { headers }),
                fetch('/api/production-stages', { headers }),
            ]);
            const [batchData, logData] = await Promise.all([batchRes.json(), logRes.json()]);
            if (!batchRes.ok || !batchData.success) throw new Error(batchData.message || 'Gagal memuat batch');
            if (!logRes.ok || !logData.success) throw new Error(logData.message || 'Gagal memuat log tahap');
            if (batchData.success) setBatches(batchData.data || []);
            if (logData.success) setLogs(logData.data || []);
        } catch (err) {
            setMsg({ type: 'err', text: `Gagal memuat data: ${err.message}` });
        }
        setLoading(false);
    }, [isFarmer, user?.id]);

    useEffect(() => { load(); }, [load]);

    const logsByBatch = useMemo(() => {
        const grouped = {};
        for (const log of logs) {
            if (!grouped[log.batchId]) grouped[log.batchId] = [];
            grouped[log.batchId].push(log);
        }
        return grouped;
    }, [logs]);

    const filteredBatches = useMemo(() => {
        const q = search.trim().toLowerCase();
        return batches.filter(batch => {
            if (!q) return true;
            return [batch.name, batch.origin, batch.variety, batch.grade, batch.farmerName]
                .filter(Boolean)
                .some(value => String(value).toLowerCase().includes(q));
        });
    }, [batches, search]);

    const counts = useMemo(() => {
        return STAGES.reduce((acc, stage) => {
            acc[stage.id] = batches.filter(batch => Number(batch.currentStage) === stage.id).length;
            return acc;
        }, {});
    }, [batches]);

    function setBatchField(key, value) {
        setBatchForm(prev => ({ ...prev, [key]: value }));
    }

    function setStageField(key, value) {
        setStageForm(prev => ({ ...prev, [key]: value }));
    }

    async function createBatch(event) {
        event.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            const token = await getToken();
            const res = await fetch('/api/production-batches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    ...batchForm,
                    weightKg: Number(batchForm.weightKg) || null,
                    farmerId: user?.id || null,
                    farmerName: user?.name || user?.email || null,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Gagal membuat batch');
            setMsg({ type: 'ok', text: `Batch "${batchForm.name}" dibuat. Lanjutkan dengan foto dan deskripsi Tahap 1: Panen & Sortasi.` });
            setBatchForm(initialBatchForm);
            setShowBatchForm(false);
            load();
        } catch (err) {
            setMsg({ type: 'err', text: err.message });
        }
        setSaving(false);
    }

    async function cancelPipeline() {
        if (!cancelTarget) return;

        setCancellingBatchId(cancelTarget.id);
        setMsg(null);
        try {
            const token = await getToken();
            const res = await fetch('/api/production-batches', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ id: cancelTarget.id }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Gagal membatalkan pipeline');

            if (stageModal?.batch?.id === cancelTarget.id) setStageModal(null);
            setBatches(prev => prev.filter(batch => batch.id !== cancelTarget.id));
            setLogs(prev => prev.filter(log => log.batchId !== cancelTarget.id));
            setMsg({ type: 'ok', text: `Pipeline batch "${cancelTarget.name}" berhasil dibatalkan.` });
            setCancelTarget(null);
        } catch (err) {
            setMsg({ type: 'err', text: err.message });
        } finally {
            setCancellingBatchId(null);
        }
    }

    async function uploadPhotos(files) {
        const selectedFiles = Array.from(files || []);
        if (!selectedFiles.length) return;
        setUploading(true);
        setMsg(null);
        try {
            const token = await getToken();
            const uploaded = [];
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('batchId', stageModal?.batch?.id || '');
                formData.append('stage', String(stageModal?.stage?.id || ''));
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: formData,
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || `Upload ${file.name} gagal`);
                if (data.storage !== 'ipfs' || !data.cid || !data.ipfsUri || !data.gatewayUrl) {
                    throw new Error('Server tidak mengembalikan bukti pinning IPFS yang valid');
                }
                uploaded.push({ cid: data.cid, uri: data.ipfsUri, gatewayUrl: data.gatewayUrl });
            }
            setPhotoProofs(current => {
                const merged = [...current, ...uploaded].filter((photo, index, all) => all.findIndex(item => item.cid === photo.cid) === index);
                return merged;
            });
            setMsg({ type: 'ok', text: `${uploaded.length} foto berhasil dipin ke IPFS.` });
        } catch (err) {
            setMsg({ type: 'err', text: err.message });
        }
        setUploading(false);
    }

    function removePhoto(cid) {
        setPhotoProofs(current => current.filter(photo => photo.cid !== cid));
    }

    function openStageCard(batch, stage, existingLog = null) {
        const existingData = existingLog?.data || {};
        const existingEvidence = existingData.evidencePhoto || null;
        const existingPhotos = Array.isArray(existingData.evidencePhotos) && existingData.evidencePhotos.length
            ? existingData.evidencePhotos
            : (existingEvidence ? [existingEvidence] : []);
        setStageModal({ batch, stage, isEditing: !!existingLog });
        setPhotoProofs(existingPhotos);
        setStageForm({
            ...initialStageForm,
            ...existingData,
            notes: existingData.description || existingData.notes || '',
            weightIn: existingData.weightIn ?? batch.weightKg ?? '',
            productName: existingData.productName || batch.name || '',
            description: existingData.description || batch.notes || '',
            gram: existingData.weights?.[0] || initialStageForm.gram,
            price: existingData.pricePerUnit?.[0] || '',
        });
        setMsg(null);
    }

    async function resubmitRejectedProduct(batch) {
        setSaving(true);
        setMsg(null);
        try {
            const token = await getToken();
            const res = await fetch('/api/products', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ id: batch.productId, action: 'resubmit' }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Gagal mengirim ulang permintaan produk');
            setMsg({ type: 'ok', text: `Produk dari batch "${batch.name}" dikirim ulang. Admin akan meninjau pipeline Tahap 1-6 yang sudah diperbaiki.` });
            await load();
        } catch (err) {
            setMsg({ type: 'err', text: err.message });
        }
        setSaving(false);
    }

    async function submitStage(event) {
        event.preventDefault();
        if (!stageModal) return;

        const { batch, stage } = stageModal;
        const primaryPhoto = photoProofs[0];
        if (!primaryPhoto?.gatewayUrl || !primaryPhoto?.cid || !primaryPhoto?.uri) {
            setMsg({ type: 'err', text: 'Upload dan pin minimal satu bukti foto ke IPFS sebelum menyimpan tahap produksi.' });
            return;
        }
        setSaving(true);
        setMsg(null);
        try {
            const token = await getToken();
            const isFinal = stage.id === 6;
            const description = isFinal ? stageForm.description.trim() : stageForm.notes.trim();
            if (!description) {
                setMsg({ type: 'err', text: `Deskripsi ${stage.name} wajib diisi.` });
                setSaving(false);
                return;
            }
            const stageData = {
                description,
                operator: stageForm.operator || user?.name || user?.email || '',
                durationMinutes: Number(stageForm.durationMinutes) || null,
                weightIn: Number(stageForm.weightIn) || null,
                weightOut: Number(stageForm.weightOut) || null,
                suhu: Number(stageForm.suhu) || null,
                levelRoast: stageForm.levelRoast,
                processMethod: stageForm.processMethod,
                moisturePercent: Number(stageForm.moisturePercent) || null,
                ukuranGiling: stageForm.ukuranGiling,
                gasReleaseHours: Number(stageForm.gasReleaseHours) || null,
                evidencePhoto: {
                    cid: primaryPhoto.cid,
                    uri: primaryPhoto.uri,
                    gatewayUrl: primaryPhoto.gatewayUrl,
                },
                evidencePhotos: photoProofs,
                ...(isFinal ? {
                    productName: stageForm.productName || batch.name,
                    stock: Number(stageForm.stock) || 0,
                    weights: [Number(stageForm.gram) || 250],
                    pricePerUnit: [Number(stageForm.price) || 0],
                    description: stageForm.description,
                    roast: stageForm.levelRoast,
                    image: primaryPhoto.gatewayUrl,
                } : {}),
            };

            const res = await fetch('/api/production-stages', {
                method: stageModal.isEditing ? 'PATCH' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    batchId: batch.id,
                    stage: stage.id,
                    stageData,
                    photoUrl: primaryPhoto.gatewayUrl,
                    photoCid: primaryPhoto.cid,
                    ipfsUri: primaryPhoto.uri,
                    loggedBy: user?.id || null,
                    loggedByName: user?.name || user?.email || null,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Gagal menyimpan tahap');

            const nextStage = STAGES.find(item => item.id === data.nextStage);
            const successText = stageModal.isEditing
                ? isRejected
                    ? `${stage.name} untuk "${batch.name}" berhasil diperbarui. Periksa tahap lain lalu kirim ulang request produk.`
                    : `${stage.name} untuk "${batch.name}" berhasil diperbarui. Data masih dapat disunting sampai tahap berikutnya disimpan.`
                : isFinal
                ? `${stage.name} untuk "${batch.name}" tersimpan. Produk menunggu review admin sebelum dikirim ke Solana Testnet.`
                : `${stage.name} tersimpan di IPFS. Batch "${batch.name}" otomatis lanjut ke Tahap ${data.nextStage}: ${nextStage?.name || 'tahap berikutnya'}.`;
            setMsg({ type: 'ok', text: successText, explorerUrl: data.explorerUrl });
            setStageModal(null);
            load();
        } catch (err) {
            setMsg({ type: 'err', text: err.message });
        }
        setSaving(false);
    }

    const card = { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 };
    const input = { width: '100%', padding: '10px 12px', borderRadius: 9, background: 'var(--color-input-bg)', border: '1px solid var(--color-input-border)', color: 'var(--color-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
    const label = { fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5, fontWeight: 700 };
    const button = { border: 'none', borderRadius: 9, cursor: 'pointer', padding: '10px 16px', fontSize: 13, fontWeight: 800 };
    const mutedButton = { ...button, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text)' };
    const primaryButton = { ...button, background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color: '#fff' };

    function renderStageUploadCard() {
        if (!stageModal) return null;

        return (
            <form onSubmit={submitStage} style={{ marginTop: 14, background: 'rgba(255,255,255,0.025)', border: `1px solid ${stageModal.stage.tone}55`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <div style={{ color: stageModal.stage.tone, fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>{stageModal.isEditing ? 'Edit' : 'Card Upload'} Tahap {stageModal.stage.id}</div>
                        <h3 style={{ color: 'var(--color-text)', margin: '4px 0 0', fontSize: 17, fontWeight: 900 }}>{stageModal.stage.name}</h3>
                        <p style={{ color: 'var(--color-text-muted)', margin: '5px 0 0', fontSize: 12 }}>Foto wajib dipin ke IPFS sebelum tahap dapat disimpan.</p>
                    </div>
                    <button type="button" onClick={() => setStageModal(null)} style={{ ...mutedButton, padding: '6px 10px' }}>Tutup Card</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
                    <Field label="Operator" value={stageForm.operator} onChange={value => setStageField('operator', value)} input={input} labelStyle={label} placeholder={user?.name || user?.email || ''} />
                    <Field label="Durasi (menit)" type="number" value={stageForm.durationMinutes} onChange={value => setStageField('durationMinutes', value)} input={input} labelStyle={label} />
                    <Field label="Berat Masuk (kg)" type="number" value={stageForm.weightIn} onChange={value => setStageField('weightIn', value)} input={input} labelStyle={label} />
                    <Field label="Berat Keluar (kg)" type="number" value={stageForm.weightOut} onChange={value => setStageField('weightOut', value)} input={input} labelStyle={label} />
                    {stageModal.stage.id === 2 && (
                        <SelectField label="Metode Proses" value={stageForm.processMethod} onChange={value => setStageField('processMethod', value)} options={['Washed', 'Natural', 'Honey', 'Semi-Washed', 'Wet Hulled']} input={input} labelStyle={label} />
                    )}
                    {stageModal.stage.id === 3 && (
                        <Field label="Kadar Air Akhir (%)" type="number" value={stageForm.moisturePercent} onChange={value => setStageField('moisturePercent', value)} input={input} labelStyle={label} />
                    )}
                    {stageModal.stage.id === 5 && (
                        <>
                            <Field label="Suhu Roasting (C)" type="number" value={stageForm.suhu} onChange={value => setStageField('suhu', value)} input={input} labelStyle={label} />
                            <SelectField label="Level Roast" value={stageForm.levelRoast} onChange={value => setStageField('levelRoast', value)} options={['Light Roast', 'Medium Roast', 'Medium-Dark Roast', 'Dark Roast']} input={input} labelStyle={label} />
                        </>
                    )}
                    {stageModal.stage.id === 4 && (
                        <SelectField label="Ukuran Giling" value={stageForm.ukuranGiling} onChange={value => setStageField('ukuranGiling', value)} options={['Fine', 'Medium', 'Coarse']} input={input} labelStyle={label} />
                    )}
                    {stageModal.stage.id === 6 && (
                        <>
                            <Field label="Nama Produk Jadi" value={stageForm.productName} onChange={value => setStageField('productName', value)} input={input} labelStyle={label} required />
                            <Field label="Stok Produk (unit)" type="number" value={stageForm.stock} onChange={value => setStageField('stock', value)} input={input} labelStyle={label} required />
                            <Field label="Berat Kemasan (gram)" type="number" value={stageForm.gram} onChange={value => setStageField('gram', value)} input={input} labelStyle={label} required />
                            <Field label="Harga" type="number" value={stageForm.price} onChange={value => setStageField('price', value)} input={input} labelStyle={label} required />
                        </>
                    )}
                </div>

                <div style={{ marginTop: 12 }}>
                    <label style={label}>Bukti Foto IPFS * (bisa lebih dari satu)</label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, background: 'rgba(74,124,40,0.12)', border: '1px solid rgba(74,124,40,0.35)', color: 'var(--color-primary-light)', fontSize: 13, fontWeight: 800, cursor: uploading ? 'wait' : 'pointer' }}>
                        {uploading ? 'Mengunggah ke IPFS...' : 'Pilih Beberapa Foto dan Pin ke IPFS'}
                        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" required={!photoProofs.length} disabled={uploading} style={{ display: 'none' }} onChange={event => uploadPhotos(event.target.files)} />
                    </label>
                    {photoProofs.length > 0 && (
                        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
                            {photoProofs.map((photo, index) => (
                                <div key={photo.cid} style={{ position: 'relative', padding: 8, borderRadius: 9, border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 10 }}>
                                    <img src={photo.gatewayUrl} alt={`Bukti tahap ${index + 1}`} style={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 7, marginBottom: 6 }} />
                                    <div>{index === 0 ? 'Cover · ' : ''}CID: <code>{photo.cid.slice(0, 12)}...</code></div>
                                    <button type="button" onClick={() => removePhoto(photo.cid)} disabled={uploading} style={{ position: 'absolute', top: 4, right: 4, border: 'none', borderRadius: 999, width: 24, height: 24, cursor: 'pointer', background: 'rgba(244,67,54,0.9)', color: '#fff', fontWeight: 900 }}>×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 12 }}>
                    <label style={label}>{stageModal.stage.id === 6 ? 'Deskripsi Produk *' : `Deskripsi ${stageModal.stage.name} *`}</label>
                    <textarea required style={{ ...input, minHeight: 86, resize: 'vertical' }} value={stageModal.stage.id === 6 ? stageForm.description : stageForm.notes} onChange={event => setStageField(stageModal.stage.id === 6 ? 'description' : 'notes', event.target.value)} placeholder="Jelaskan proses, kondisi, hasil, dan catatan tahap ini." />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                    <button type="button" style={mutedButton} onClick={() => setStageModal(null)}>Batal</button>
                    <button type="submit" style={{ ...primaryButton, opacity: photoProofs.length ? 1 : 0.6 }} disabled={saving || uploading || !photoProofs.length}>
                        {saving ? 'Menyimpan...' : stageModal.isEditing ? 'Simpan Perbaikan Tahap' : stageModal.stage.id === 6 ? 'Jadikan Produk' : 'Simpan & Lanjut Tahap'}
                    </button>
                </div>
            </form>
        );
    }

    return (
        <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                <Link href="/products" style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                    Kelola Produk
                </Link>
                <span style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color: '#fff' }}>
                    Kelola Stok
                </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
                <div>
                    <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', color: 'var(--color-text)', margin: 0, fontWeight: 900 }}>Kelola Stok Produksi</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 6 }}>
                        Stok pasca-panen diproses bertahap sampai menjadi produk jadi yang muncul di Kelola Produk.
                    </p>
                </div>
                <button type="button" style={primaryButton} onClick={() => setShowBatchForm(prev => !prev)}>
                    {showBatchForm ? 'Tutup Form' : 'Tambah Batch Panen'}
                </button>
            </div>

            {msg && (
                <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: msg.type === 'ok' ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)', border: `1px solid ${msg.type === 'ok' ? 'rgba(76,175,80,0.35)' : 'rgba(244,67,54,0.35)'}`, color: msg.type === 'ok' ? '#4CAF50' : '#ff6b6b', fontSize: 13, fontWeight: 700, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span>{msg.text}</span>
                    {msg.explorerUrl && (
                        <a href={normalizeExplorerUrl(msg.explorerUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#B388FF', textDecoration: 'none' }}>
                            Lihat Solana Explorer
                        </a>
                    )}
                </div>
            )}

            {showBatchForm && (
                <form onSubmit={createBatch} style={{ ...card, marginBottom: 18 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
                        <Field label="Nama Batch" value={batchForm.name} onChange={value => setBatchField('name', value)} input={input} labelStyle={label} required />
                        <Field label="Asal Panen" value={batchForm.origin} onChange={value => setBatchField('origin', value)} input={input} labelStyle={label} required />
                        <SelectField label="Varietas" value={batchForm.variety} onChange={value => setBatchField('variety', value)} options={['Arabika', 'Robusta', 'Liberika', 'Excelsa']} input={input} labelStyle={label} />
                        <SelectField label="Grade" value={batchForm.grade} onChange={value => setBatchField('grade', value)} options={['A', 'B', 'C', 'Specialty', 'Premium']} input={input} labelStyle={label} />
                        <Field label="Berat Panen (kg)" type="number" value={batchForm.weightKg} onChange={value => setBatchField('weightKg', value)} input={input} labelStyle={label} required />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <label style={label}>Catatan Panen</label>
                        <textarea style={{ ...input, minHeight: 74, resize: 'vertical' }} value={batchForm.notes} onChange={event => setBatchField('notes', event.target.value)} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: '1 1 560px' }}>
                            {STAGES.map(stage => (
                                <div key={stage.id} title={stage.name} style={{ minWidth: 78, flex: '1 1 78px', borderRadius: 9, padding: '8px 9px', background: `${stage.tone}0f`, border: `1px solid ${stage.tone}44` }}>
                                    <div style={{ color: stage.tone, fontSize: 10, fontWeight: 900 }}>Tahap {stage.id}</div>
                                    <div style={{ color: 'var(--color-text)', fontSize: 11, fontWeight: 800, marginTop: 2 }}>{stage.short}</div>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: 10, marginTop: 2 }}>{counts[stage.id] || 0} aktif</div>
                                </div>
                            ))}
                        </div>
                        <button type="submit" style={primaryButton} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Batch'}</button>
                    </div>
                </form>
            )}

            <div style={{ marginBottom: 16 }}>
                <input style={{ ...input, maxWidth: 360 }} placeholder="Cari batch, asal, varietas, petani..." value={search} onChange={event => setSearch(event.target.value)} />
            </div>

            {loading ? (
                <div style={{ ...card, padding: 42, textAlign: 'center', color: 'var(--color-text-muted)' }}>Memuat pipeline stok...</div>
            ) : filteredBatches.length === 0 ? (
                <div style={{ ...card, padding: 42, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Belum ada stok pasca-panen. Tambahkan batch panen untuk mulai proses produksi.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
                    {filteredBatches.map(batch => {
                        const currentStage = STAGES.find(stage => stage.id === Number(batch.currentStage)) || STAGES[0];
                        const batchLogs = logsByBatch[batch.id] || [];
                        const isRejected = batch.productStatus === 'rejected';
                        return (
                            <div key={batch.id} style={card}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <h2 style={{ margin: 0, color: 'var(--color-text)', fontSize: 17, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{batch.name}</h2>
                                        <div style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 12 }}>
                                            {batch.origin || 'Asal belum diisi'} - {batch.variety || 'Varietas'} - {batch.weightKg || 0} kg
                                        </div>
                                    </div>
                                    <span style={{ flexShrink: 0, borderRadius: 999, padding: '4px 9px', color: currentStage.tone, background: `${currentStage.tone}18`, border: `1px solid ${currentStage.tone}44`, fontSize: 11, fontWeight: 900 }}>
                                        Tahap {currentStage.id}
                                    </span>
                                </div>

                                <div style={{ margin: '16px 0 14px', display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 5 }}>
                                    {STAGES.map(stage => {
                                        const done = batchLogs.some(log => Number(log.stage) === stage.id);
                                        const active = Number(batch.currentStage) === stage.id && !batch.productId;
                                        const hasLaterLog = batchLogs.some(log => Number(log.stage) > stage.id);
                                        const editable = done && !batch.coffeeId && (isRejected || !hasLaterLog);
                                        return (
                                            <button
                                                key={stage.id}
                                                type="button"
                                                title={stage.name}
                                                onClick={() => (active || editable) && openStageCard(batch, stage, editable ? batchLogs.find(log => Number(log.stage) === stage.id) : null)}
                                                disabled={!active && !editable}
                                                style={{
                                                    height: 34,
                                                    borderRadius: 8,
                                                    border: `1px solid ${done || active ? stage.tone : 'var(--color-border)'}`,
                                                    background: done ? `${stage.tone}22` : active ? `${stage.tone}12` : 'rgba(255,255,255,0.03)',
                                                    color: done || active ? stage.tone : 'var(--color-text-muted)',
                                                    cursor: active || editable ? 'pointer' : 'default',
                                                    fontWeight: 900,
                                                }}
                                            >
                                                {stage.id}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ color: 'var(--color-text)', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                                    {isRejected
                                        ? 'Status: Ditolak - klik tahap 1-6 untuk memperbaiki'
                                        : batch.coffeeId
                                            ? 'Pipeline tersertifikasi on-chain dan tidak dapat diubah'
                                            : `Sekarang: ${currentStage.name} - tahap terakhir masih dapat diperbarui sebelum lanjut`}
                                </div>
                                {isRejected && (
                                    <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 9, color: '#ff8a80', background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.28)', fontSize: 12 }}>
                                        <strong>Alasan penolakan:</strong> {batch.rejectedReason || 'Admin meminta perbaikan data pipeline.'}
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: !batch.productId ? 'minmax(0,1fr) auto' : '1fr', gap: 9 }}>
                                    <button
                                        type="button"
                                        style={{ ...primaryButton, width: '100%', opacity: batch.productId && !isRejected ? 0.65 : 1 }}
                                        onClick={() => isRejected
                                            ? openStageCard(batch, STAGES[5], batchLogs.find(log => Number(log.stage) === 6))
                                            : openStageCard(batch, currentStage)}
                                        disabled={!!batch.productId && !isRejected}
                                    >
                                        {isRejected ? 'Edit Tahap Produk Jadi' : batch.productId ? 'Sudah Jadi Produk' : `Buka Card Upload ${currentStage.short}`}
                                    </button>
                                    {!batch.productId && (
                                        <button
                                            type="button"
                                            onClick={() => setCancelTarget(batch)}
                                            disabled={cancellingBatchId === batch.id}
                                            style={{ ...button, background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.4)', color: '#ff6b6b', whiteSpace: 'nowrap' }}
                                        >
                                            Batalkan Pipeline
                                        </button>
                                    )}
                                </div>

                                {isRejected && isFarmer && (
                                    <button type="button" style={{ ...primaryButton, width: '100%', marginTop: 9 }} disabled={saving} onClick={() => resubmitRejectedProduct(batch)}>
                                        {saving ? 'Mengirim Ulang...' : 'Kirim Ulang Request Produk'}
                                    </button>
                                )}

                                {stageModal?.batch?.id === batch.id && renderStageUploadCard()}

                                <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>Log Audit Produksi</div>
                                    {batchLogs.length === 0 ? (
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Belum ada log tahap.</div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: 8 }}>
                                            {batchLogs.slice(0, 6).map(log => (
                                                <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                                    <span>{log.stage}. {log.stageName}</span>
                                                    <button type="button" onClick={() => setDetailLog(log)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 7, padding: '4px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                                                        Lihat data
                                                    </button>
                                                    {log.explorerUrl ? (
                                                        <a href={normalizeExplorerUrl(log.explorerUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#B388FF', textDecoration: 'none', fontWeight: 800 }}>Sertifikat</a>
                                                    ) : (
                                                        <span style={{ color: '#7ED44A', fontWeight: 800 }}>Local</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {detailLog && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.76)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={event => { if (event.target === event.currentTarget) setDetailLog(null); }}>
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 22, width: '100%', maxWidth: 620, maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <h2 style={{ color: 'var(--color-text)', margin: 0, fontSize: 19, fontWeight: 900 }}>{detailLog.stage}. {detailLog.stageName}</h2>
                                <p style={{ color: 'var(--color-text-muted)', margin: '5px 0 0', fontSize: 12 }}>
                                    {detailLog.createdAt ? new Date(detailLog.createdAt).toLocaleString('id-ID') : 'Waktu tidak tersedia'} oleh {detailLog.loggedByName || 'Operator'}
                                </p>
                            </div>
                            <button type="button" onClick={() => setDetailLog(null)} style={{ ...mutedButton, padding: '6px 10px' }}>Tutup</button>
                        </div>

                        {getLogPhotos(detailLog).length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 14 }}>
                                {getLogPhotos(detailLog).map((photo, index) => (
                                    <a key={`${photo.gatewayUrl}-${index}`} href={photo.gatewayUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                        <img src={photo.gatewayUrl} alt={`Bukti ${detailLog.stageName} ${index + 1}`} style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--color-border)' }} />
                                    </a>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                            {Object.entries(detailLog.data || {})
                                .filter(([key]) => !['evidencePhoto', 'evidencePhotos', 'image'].includes(key))
                                .filter(([, value]) => value !== null && value !== undefined && value !== '')
                                .map(([key, value]) => (
                                    <div key={key} style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid var(--color-border)', borderRadius: 9, padding: 10 }}>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>{formatLogKey(key)}</div>
                                        <div style={{ color: 'var(--color-text)', fontSize: 13, fontWeight: 700, wordBreak: 'break-word' }}>{formatLogValue(value)}</div>
                                    </div>
                                ))}
                        </div>

                        {detailLog.explorerUrl ? (
                            <a href={normalizeExplorerUrl(detailLog.explorerUrl)} target="_blank" rel="noopener noreferrer" style={{ ...primaryButton, display: 'inline-block', textDecoration: 'none', marginTop: 16 }}>
                                Buka Sertifikat Solana
                            </a>
                        ) : (
                            <div style={{ marginTop: 16, color: 'var(--color-text-muted)', fontSize: 12 }}>
                                Tahap ini tersimpan sebagai log audit internal. Sertifikat Solana dibuat saat tahap Produk Jadi.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {cancelTarget && (
                <div
                    role="presentation"
                    style={{ position: 'fixed', inset: 0, zIndex: 1300, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={event => { if (event.target === event.currentTarget && !cancellingBatchId) setCancelTarget(null); }}
                >
                    <div role="alertdialog" aria-modal="true" aria-labelledby="cancel-pipeline-title" aria-describedby="cancel-pipeline-description" style={{ background: '#121414', border: '1px solid rgba(244,67,54,0.48)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520, boxShadow: '0 30px 100px rgba(0,0,0,0.8)' }}>
                        <div style={{ color: '#ff6b6b', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>Tindakan Permanen</div>
                        <h2 id="cancel-pipeline-title" style={{ color: '#F7F3F3', margin: 0, fontSize: 21, fontWeight: 900 }}>Batalkan pipeline batch “{cancelTarget.name}”?</h2>
                        <p id="cancel-pipeline-description" style={{ color: 'rgba(247,243,243,0.62)', fontSize: 13, lineHeight: 1.6, margin: '10px 0 14px' }}>
                            Pastikan Anda memang tidak akan melanjutkan produksi batch ini.
                        </p>
                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(244,67,54,0.07)', border: '1px solid rgba(244,67,54,0.22)', color: 'rgba(247,243,243,0.76)', fontSize: 12, lineHeight: 1.65 }}>
                            <div>Batch akan dihapus dari daftar produksi.</div>
                            <div>Seluruh log Tahap 1-6 pada batch ini ikut dihapus.</div>
                            <div>Tindakan ini tidak dapat dipulihkan.</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                            <button type="button" style={{ ...mutedButton, background: 'rgba(255,255,255,0.06)', color: '#F7F3F3' }} onClick={() => setCancelTarget(null)} disabled={!!cancellingBatchId}>Tidak, Kembali</button>
                            <button
                                type="button"
                                style={{ ...button, background: '#e04444', color: '#fff', boxShadow: '0 8px 22px rgba(224,68,68,0.25)', opacity: cancellingBatchId ? 0.65 : 1 }}
                                onClick={cancelPipeline}
                                disabled={!!cancellingBatchId}
                            >
                                {cancellingBatchId ? 'Membatalkan...' : 'Ya, Hapus Pipeline'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, value, onChange, input, labelStyle, type = 'text', required = false, placeholder = '' }) {
    return (
        <div>
            <label style={labelStyle}>{label}{required ? ' *' : ''}</label>
            <input style={input} type={type} value={value} onChange={event => onChange(event.target.value)} required={required} placeholder={placeholder} />
        </div>
    );
}

function SelectField({ label, value, onChange, options, input, labelStyle }) {
    return (
        <div>
            <label style={labelStyle}>{label}</label>
            <select style={input} value={value} onChange={event => onChange(event.target.value)}>
                {options.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
        </div>
    );
}

function formatLogKey(key) {
    const labels = {
        notes: 'Catatan',
        operator: 'Operator',
        durationMinutes: 'Durasi',
        weightIn: 'Berat Masuk',
        weightOut: 'Berat Keluar',
        suhu: 'Suhu Roasting',
        levelRoast: 'Level Roast',
        ukuranGiling: 'Ukuran Giling',
        gasReleaseHours: 'Pelepasan Gas',
        productName: 'Nama Produk',
        stock: 'Stok Produk',
        weights: 'Berat Kemasan',
        pricePerUnit: 'Harga',
        description: 'Deskripsi',
        roast: 'Roast',
        image: 'Foto',
    };
    return labels[key] || key.replace(/[A-Z]/g, letter => ` ${letter}`).trim();
}

function getLogPhotos(log) {
    const evidencePhotos = Array.isArray(log?.data?.evidencePhotos) && log.data.evidencePhotos.length
        ? log.data.evidencePhotos
        : (log?.data?.evidencePhoto ? [log.data.evidencePhoto] : []);
    const normalized = evidencePhotos
        .map(photo => ({ cid: photo?.cid || '', gatewayUrl: photo?.gatewayUrl || '' }))
        .filter(photo => photo.gatewayUrl);
    if (!normalized.length && log?.photoUrl) return [{ cid: '', gatewayUrl: log.photoUrl }];
    return normalized;
}

function formatLogValue(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}
