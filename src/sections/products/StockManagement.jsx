'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const STAGES = [
    { id: 1, name: 'Pembersihan/Pencampuran', short: 'Pembersihan', tone: '#7ED44A' },
    { id: 2, name: 'Pemanggangan', short: 'Roasting', tone: '#F5A623' },
    { id: 3, name: 'Pendinginan', short: 'Cooling', tone: '#5BC0EB' },
    { id: 4, name: 'Penggilingan', short: 'Grinding', tone: '#B388FF' },
    { id: 5, name: 'Pelepasan Gas', short: 'Degassing', tone: '#FF8A65' },
    { id: 6, name: 'Produk Jadi', short: 'Finished', tone: '#4CAF50' },
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
    ukuranGiling: 'Medium',
    gasReleaseHours: '',
    productName: '',
    stock: '',
    gram: 250,
    price: '',
    description: '',
};

export default function StockManagement() {
    const { user } = useAuth();
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
    const [photoUrl, setPhotoUrl] = useState('');
    const [msg, setMsg] = useState(null);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const batchUrl = isFarmer && user?.id
                ? `/api/production-batches?farmerId=${encodeURIComponent(user.id)}`
                : '/api/production-batches';
            const [batchRes, logRes] = await Promise.all([
                fetch(batchUrl),
                fetch('/api/production-stages'),
            ]);
            const [batchData, logData] = await Promise.all([batchRes.json(), logRes.json()]);
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
            const res = await fetch('/api/production-batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...batchForm,
                    weightKg: Number(batchForm.weightKg) || null,
                    farmerId: user?.id || null,
                    farmerName: user?.name || user?.email || null,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Gagal membuat batch');
            setMsg({ type: 'ok', text: `Batch "${batchForm.name}" masuk ke tahap pembersihan/pencampuran.` });
            setBatchForm(initialBatchForm);
            setShowBatchForm(false);
            load();
        } catch (err) {
            setMsg({ type: 'err', text: err.message });
        }
        setSaving(false);
    }

    async function uploadPhoto(file) {
        setUploading(true);
        setMsg(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Upload gagal');
            setPhotoUrl(data.url);
        } catch (err) {
            setMsg({ type: 'err', text: err.message });
        }
        setUploading(false);
    }

    function openStageModal(batch, stage) {
        setStageModal({ batch, stage });
        setPhotoUrl('');
        setStageForm({
            ...initialStageForm,
            weightIn: batch.weightKg || '',
            productName: batch.name || '',
            description: batch.notes || '',
        });
        setMsg(null);
    }

    async function submitStage(event) {
        event.preventDefault();
        if (!stageModal) return;

        const { batch, stage } = stageModal;
        setSaving(true);
        setMsg(null);
        try {
            const isFinal = stage.id === 6;
            const stageData = {
                notes: stageForm.notes,
                operator: stageForm.operator || user?.name || user?.email || '',
                durationMinutes: Number(stageForm.durationMinutes) || null,
                weightIn: Number(stageForm.weightIn) || null,
                weightOut: Number(stageForm.weightOut) || null,
                suhu: Number(stageForm.suhu) || null,
                levelRoast: stageForm.levelRoast,
                ukuranGiling: stageForm.ukuranGiling,
                gasReleaseHours: Number(stageForm.gasReleaseHours) || null,
                ...(isFinal ? {
                    productName: stageForm.productName || batch.name,
                    stock: Number(stageForm.stock) || 0,
                    weights: [Number(stageForm.gram) || 250],
                    pricePerUnit: [Number(stageForm.price) || 0],
                    description: stageForm.description,
                    roast: stageForm.levelRoast,
                    image: photoUrl || null,
                } : {}),
            };

            const res = await fetch('/api/production-stages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batchId: batch.id,
                    stage: stage.id,
                    stageData,
                    photoUrl: photoUrl || null,
                    loggedBy: user?.id || null,
                    loggedByName: user?.name || user?.email || null,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Gagal menyimpan tahap');

            const chainText = isFinal
                ? ' dan sertifikat on-chain berhasil dibuat'
                : ' sebagai log produksi lokal';
            const finalText = isFinal ? ' Produk jadi otomatis masuk ke Kelola Produk.' : '';
            setMsg({ type: 'ok', text: `${stage.name} untuk "${batch.name}" tersimpan${chainText}.${finalText}`, explorerUrl: data.explorerUrl });
            setStageModal(null);
            load();
        } catch (err) {
            setMsg({ type: 'err', text: err.message });
        }
        setSaving(false);
    }

    const card = { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 };
    const input = { width: '100%', padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' };
    const label = { fontSize: 12, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5, fontWeight: 700 };
    const button = { border: 'none', borderRadius: 9, cursor: 'pointer', padding: '10px 16px', fontSize: 13, fontWeight: 800 };
    const mutedButton = { ...button, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text)' };
    const primaryButton = { ...button, background: 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))', color: '#fff' };

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
                        <a href={msg.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#B388FF', textDecoration: 'none' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <button type="submit" style={primaryButton} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Batch'}</button>
                    </div>
                </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(145px,1fr))', gap: 10, marginBottom: 18 }}>
                {STAGES.map(stage => (
                    <div key={stage.id} style={{ ...card, padding: 14, borderColor: `${stage.tone}55` }}>
                        <div style={{ fontSize: 11, color: stage.tone, fontWeight: 900 }}>Tahap {stage.id}</div>
                        <div style={{ color: 'var(--color-text)', fontWeight: 800, fontSize: 13, marginTop: 4 }}>{stage.short}</div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 6 }}>{counts[stage.id] || 0} batch aktif</div>
                    </div>
                ))}
            </div>

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
                                        const active = Number(batch.currentStage) === stage.id;
                                        return (
                                            <button
                                                key={stage.id}
                                                type="button"
                                                title={stage.name}
                                                onClick={() => active && openStageModal(batch, stage)}
                                                disabled={!active}
                                                style={{
                                                    height: 34,
                                                    borderRadius: 8,
                                                    border: `1px solid ${done || active ? stage.tone : 'var(--color-border)'}`,
                                                    background: done ? `${stage.tone}22` : active ? `${stage.tone}12` : 'rgba(255,255,255,0.03)',
                                                    color: done || active ? stage.tone : 'var(--color-text-muted)',
                                                    cursor: active ? 'pointer' : 'default',
                                                    fontWeight: 900,
                                                }}
                                            >
                                                {stage.id}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ color: 'var(--color-text)', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>
                                    Sekarang: {currentStage.name}
                                </div>
                                <button type="button" style={{ ...primaryButton, width: '100%', opacity: batch.productId ? 0.65 : 1 }} onClick={() => openStageModal(batch, currentStage)} disabled={!!batch.productId}>
                                    {batch.productId ? 'Sudah Jadi Produk' : `Upload Data ${currentStage.short}`}
                                </button>

                                <div style={{ marginTop: 16, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>Trace Log Blockchain</div>
                                    {batchLogs.length === 0 ? (
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Belum ada log tahap.</div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: 8 }}>
                                            {batchLogs.slice(0, 6).map(log => (
                                                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                                    <span>{log.stage}. {log.stageName}</span>
                                                    {log.explorerUrl ? (
                                                        <a href={log.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#B388FF', textDecoration: 'none', fontWeight: 800 }}>On-chain</a>
                                                    ) : (
                                                        <span style={{ color: '#FF8A65', fontWeight: 800 }}>Local</span>
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

            {stageModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.76)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={event => { if (event.target === event.currentTarget) setStageModal(null); }}>
                    <form onSubmit={submitStage} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 22, width: '100%', maxWidth: 660, maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <h2 style={{ color: 'var(--color-text)', margin: 0, fontSize: 19, fontWeight: 900 }}>Upload {stageModal.stage.name}</h2>
                                <p style={{ color: 'var(--color-text-muted)', margin: '5px 0 0', fontSize: 13 }}>{stageModal.batch.name}</p>
                            </div>
                            <button type="button" onClick={() => setStageModal(null)} style={{ ...mutedButton, padding: '6px 10px' }}>Tutup</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
                            <Field label="Operator" value={stageForm.operator} onChange={value => setStageField('operator', value)} input={input} labelStyle={label} placeholder={user?.name || user?.email || ''} />
                            <Field label="Durasi (menit)" type="number" value={stageForm.durationMinutes} onChange={value => setStageField('durationMinutes', value)} input={input} labelStyle={label} />
                            <Field label="Berat Masuk (kg)" type="number" value={stageForm.weightIn} onChange={value => setStageField('weightIn', value)} input={input} labelStyle={label} />
                            <Field label="Berat Keluar (kg)" type="number" value={stageForm.weightOut} onChange={value => setStageField('weightOut', value)} input={input} labelStyle={label} />
                            {stageModal.stage.id === 2 && (
                                <>
                                    <Field label="Suhu Roasting (C)" type="number" value={stageForm.suhu} onChange={value => setStageField('suhu', value)} input={input} labelStyle={label} />
                                    <SelectField label="Level Roast" value={stageForm.levelRoast} onChange={value => setStageField('levelRoast', value)} options={['Light Roast', 'Medium Roast', 'Medium-Dark Roast', 'Dark Roast']} input={input} labelStyle={label} />
                                </>
                            )}
                            {stageModal.stage.id === 4 && (
                                <SelectField label="Ukuran Giling" value={stageForm.ukuranGiling} onChange={value => setStageField('ukuranGiling', value)} options={['Fine', 'Medium', 'Coarse']} input={input} labelStyle={label} />
                            )}
                            {stageModal.stage.id === 5 && (
                                <Field label="Pelepasan Gas (jam)" type="number" value={stageForm.gasReleaseHours} onChange={value => setStageField('gasReleaseHours', value)} input={input} labelStyle={label} />
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
                            <label style={label}>Bukti Foto</label>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, background: 'rgba(74,124,40,0.12)', border: '1px solid rgba(74,124,40,0.35)', color: 'var(--color-primary-light)', fontSize: 13, fontWeight: 800, cursor: uploading ? 'wait' : 'pointer' }}>
                                {uploading ? 'Mengunggah...' : 'Upload Foto'}
                                <input type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }} onChange={event => { const file = event.target.files?.[0]; if (file) uploadPhoto(file); }} />
                            </label>
                            {photoUrl && (
                                <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                                    <img src={photoUrl} alt="Bukti tahap" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }} />
                                    Foto siap disimpan ke trace log.
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <label style={label}>{stageModal.stage.id === 6 ? 'Deskripsi Produk' : 'Catatan Tahap'}</label>
                            <textarea style={{ ...input, minHeight: 86, resize: 'vertical' }} value={stageModal.stage.id === 6 ? stageForm.description : stageForm.notes} onChange={event => setStageField(stageModal.stage.id === 6 ? 'description' : 'notes', event.target.value)} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                            <button type="button" style={mutedButton} onClick={() => setStageModal(null)}>Batal</button>
                            <button type="submit" style={primaryButton} disabled={saving || uploading}>
                                {saving ? 'Menyimpan...' : stageModal.stage.id === 6 ? 'Jadikan Produk' : 'Simpan & Lanjut Tahap'}
                            </button>
                        </div>
                    </form>
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
