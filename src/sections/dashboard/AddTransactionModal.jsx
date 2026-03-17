'use client';

import { useState } from 'react';
import { simulateCoffeeTransaction } from '@/lib/solana';
import styles from './AddTransactionModal.module.css';

const VARIETIES = ['Arabika', 'Robusta', 'Liberika', 'Excelsa'];
const GRADES = ['A', 'AA', 'B', 'C'];
const LOCATIONS = [
    'Gayo, Aceh', 'Toraja, Sulsel', 'Flores, NTT', 'Mandheling, Sumut',
    'Kintamani, Bali', 'Wamena, Papua', 'Bandung, Jabar', 'Lampung',
    'Oku Selatan, Sumsel', 'Riau', 'Lainnya'
];
const MARKET_PRICES = { 'Arabika-A': 68500, 'Arabika-AA': 80000, 'Arabika-B': 55000, 'Robusta-A': 48000, 'Robusta-B': 42000, 'Liberika-A': 40000 };

export default function AddTransactionModal({ onClose, onSuccess, walletPublicKey }) {
    const [form, setForm] = useState({
        farmer: '', location: '', weight: '', variety: 'Arabika', grade: 'A',
        pricePerKg: 68500, note: '', walletTo: '',
    });
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1=form, 2=konfirmasi, 3=proses
    const [txResult, setTxResult] = useState(null);

    const totalAmount = Number(form.weight || 0) * Number(form.pricePerKg || 0);

    function updatePriceFromVarietyGrade(variety, grade) {
        const key = `${variety}-${grade}`;
        return MARKET_PRICES[key] || MARKET_PRICES[`${variety}-A`] || 68500;
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'variety' || name === 'grade') {
                const v = name === 'variety' ? value : prev.variety;
                const g = name === 'grade' ? value : prev.grade;
                updated.pricePerKg = updatePriceFromVarietyGrade(v, g);
            }
            return updated;
        });
    }

    async function handleSubmit() {
        if (!form.farmer || !form.weight || !form.location) {
            alert('Harap isi semua field wajib: Nama Petani, Berat, dan Lokasi');
            return;
        }
        setStep(2);
    }

    async function handleConfirm() {
        setStep(3);
        setLoading(true);
        try {
            // 1. Simulasi smart contract on-chain
            const chainTx = await simulateCoffeeTransaction(
                walletPublicKey || 'Demo',
                Number(form.weight),
                Number(form.pricePerKg),
                form.variety
            );

            // 2. Simpan ke database lokal
            const res = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    farmer: form.farmer,
                    location: form.location,
                    weight: form.weight,
                    variety: form.variety,
                    grade: form.grade,
                    amount: totalAmount,
                    note: form.note,
                    walletFrom: walletPublicKey || 'Demo Mode',
                    walletTo: form.walletTo || '9b4c...d7f2',
                }),
            });
            const data = await res.json();
            setTxResult({ ...data.data, chainSignature: chainTx.signature, slot: chainTx.slot });
            onSuccess?.(data.data);
        } catch (err) {
            alert('Transaksi gagal: ' + err.message);
            setStep(1);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.modalTitle}>
                            {step === 1 && '📝 Buat Transaksi Kopi'}
                            {step === 2 && '✅ Konfirmasi Transaksi'}
                            {step === 3 && (txResult ? '🎉 Transaksi Berhasil!' : '⏳ Memproses...')}
                        </h2>
                        <p className={styles.modalSub}>
                            {step === 1 && 'Data akan dicatat on-chain di Solana blockchain'}
                            {step === 2 && 'Periksa detail sebelum dikirim ke blockchain'}
                            {step === 3 && (txResult ? 'Transaksi berhasil dicatat di blockchain' : 'Menunggu konfirmasi blockchain...')}
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Step indicator */}
                <div className={styles.steps}>
                    {['Form', 'Konfirmasi', 'Selesai'].map((s, i) => (
                        <div key={i} className={`${styles.step} ${step > i + 1 ? styles.stepDone : step === i + 1 ? styles.stepActive : ''}`}>
                            <div className={styles.stepCircle}>{step > i + 1 ? '✓' : i + 1}</div>
                            <span>{s}</span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Form */}
                {step === 1 && (
                    <div className={styles.formBody}>
                        <div className={styles.formGrid}>
                            <div className={styles.field}>
                                <label className={styles.label}>Nama Petani / Koperasi *</label>
                                <input name="farmer" value={form.farmer} onChange={handleChange} className={styles.input} placeholder="Contoh: Pak Slamet Riyadi" />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Lokasi Kebun *</label>
                                <select name="location" value={form.location} onChange={handleChange} className={styles.select}>
                                    <option value="">-- Pilih Lokasi --</option>
                                    {LOCATIONS.map(l => <option key={l}>{l}</option>)}
                                </select>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Jenis Kopi</label>
                                <select name="variety" value={form.variety} onChange={handleChange} className={styles.select}>
                                    {VARIETIES.map(v => <option key={v}>{v}</option>)}
                                </select>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Grade / Kualitas</label>
                                <select name="grade" value={form.grade} onChange={handleChange} className={styles.select}>
                                    {GRADES.map(g => <option key={g}>Grade {g}</option>)}
                                </select>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Berat (kg) *</label>
                                <input name="weight" type="number" min="1" value={form.weight} onChange={handleChange} className={styles.input} placeholder="Contoh: 100" />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Harga per kg (Rp)</label>
                                <input name="pricePerKg" type="number" value={form.pricePerKg} onChange={handleChange} className={styles.input} />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Wallet Penerima (Solana)</label>
                                <input name="walletTo" value={form.walletTo} onChange={handleChange} className={styles.input} placeholder="Opsional — alamat wallet pembeli" />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Catatan</label>
                                <input name="note" value={form.note} onChange={handleChange} className={styles.input} placeholder="Mis: Panen musim hujan, batch spesial..." />
                            </div>
                        </div>

                        {/* Total Summary */}
                        <div className={styles.totalBox}>
                            <span className={styles.totalLabel}>Total Nilai Transaksi</span>
                            <span className={styles.totalValue}>Rp {totalAmount.toLocaleString('id-ID')}</span>
                        </div>

                        <div className={styles.modalFooter}>
                            <button className={styles.btnCancel} onClick={onClose}>Batal</button>
                            <button className={styles.btnSubmit} onClick={handleSubmit}>Lanjut ke Konfirmasi →</button>
                        </div>
                    </div>
                )}

                {/* Step 2: Konfirmasi */}
                {step === 2 && (
                    <div className={styles.formBody}>
                        <div className={styles.confirmCard}>
                            <div className={styles.confirmRow}><span>Petani</span><strong>{form.farmer}</strong></div>
                            <div className={styles.confirmRow}><span>Lokasi</span><strong>{form.location}</strong></div>
                            <div className={styles.confirmRow}><span>Kopi</span><strong>{form.variety} Grade {form.grade}</strong></div>
                            <div className={styles.confirmRow}><span>Berat</span><strong>{form.weight} kg</strong></div>
                            <div className={styles.confirmRow}><span>Harga/kg</span><strong>Rp {Number(form.pricePerKg).toLocaleString()}</strong></div>
                            <div className={`${styles.confirmRow} ${styles.totalRow}`}><span>Total</span><strong>Rp {totalAmount.toLocaleString('id-ID')}</strong></div>
                            {form.walletTo && <div className={styles.confirmRow}><span>Wallet Tujuan</span><code className={styles.code}>{form.walletTo}</code></div>}
                            {walletPublicKey && <div className={styles.confirmRow}><span>Wallet Pengirim</span><code className={styles.code}>{walletPublicKey.slice(0, 8)}...{walletPublicKey.slice(-6)}</code></div>}
                        </div>
                        <div className={styles.chainNote}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            Transaksi akan dicatat permanen di Solana blockchain
                        </div>
                        <div className={styles.modalFooter}>
                            <button className={styles.btnCancel} onClick={() => setStep(1)}>← Edit</button>
                            <button className={styles.btnSubmit} onClick={handleConfirm}>Konfirmasi & Kirim ke Blockchain</button>
                        </div>
                    </div>
                )}

                {/* Step 3: Proses / Sukses */}
                {step === 3 && (
                    <div className={styles.formBody}>
                        {!txResult ? (
                            <div className={styles.processingBox}>
                                <div className={styles.processingSpinner} />
                                <p className={styles.processingText}>Mengirim transaksi ke Solana blockchain...</p>
                                <p className={styles.processingSubText}>Harap tunggu konfirmasi jaringan</p>
                            </div>
                        ) : (
                            <div className={styles.successBox}>
                                <div className={styles.successIcon}>✅</div>
                                <div className={styles.successMsg}>Transaksi berhasil dicatat!</div>
                                <div className={styles.successDetails}>
                                    <div className={styles.confirmRow}><span>Tx ID</span><code className={styles.code}>{txResult.id}</code></div>
                                    <div className={styles.confirmRow}><span>Hash</span><code className={styles.code}>{txResult.hash}</code></div>
                                    <div className={styles.confirmRow}><span>Block</span><code className={styles.code}>#{txResult.block}</code></div>
                                    <div className={styles.confirmRow}><span>Signature</span><code className={`${styles.code} ${styles.sigCode}`}>{txResult.chainSignature?.slice(0, 16)}...</code></div>
                                    <div className={styles.confirmRow}><span>Status</span><span className={styles.pendingBadge}>⏳ Pending</span></div>
                                </div>
                                <button className={styles.btnSubmit} onClick={onClose}>Selesai</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
