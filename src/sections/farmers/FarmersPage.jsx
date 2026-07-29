'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './FarmersPage.module.css';

const REVIEW_ROLES = new Set(['koperasi', 'developer', 'admin']);

function fmtVolume(kg) {
    if (!kg && kg !== 0) return '-';
    return kg >= 1000 ? `${(kg / 1000).toFixed(1)} ton` : `${kg} kg`;
}

function fmtWallet(wallet) {
    if (!wallet) return '-';
    return wallet.length > 18 ? `${wallet.slice(0, 8)}...${wallet.slice(-6)}` : wallet;
}

function fmtDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusLabel(status) {
    if (status === 'verified') return 'Terverifikasi';
    if (status === 'rejected') return 'Ditolak';
    return 'Menunggu';
}

export default function FarmersPage() {
    const { user, getToken } = useAuth();
    const canReview = REVIEW_ROLES.has(user?.role);
    const [farmers, setFarmers] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState(null);

    const loadFarmers = useCallback(async () => {
        setLoading(true);
        try {
            const token = getToken();
            const response = await fetch(`/api/farmers${canReview ? '?includeInactive=true' : ''}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                cache: 'no-store',
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Gagal memuat data petani');
            setFarmers(data.data || []);
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    }, [canReview, getToken]);

    useEffect(() => {
        loadFarmers();
    }, [loadFarmers]);

    const selected = farmers.find(farmer => farmer.id === selectedId) || null;
    const stats = useMemo(() => {
        const verified = farmers.filter(item => item.verificationStatus === 'verified').length;
        const pending = farmers.filter(item => item.verificationStatus === 'pending').length;
        const rejected = farmers.filter(item => item.verificationStatus === 'rejected').length;
        return [
            { label: 'Total Akun Petani', value: farmers.length, tone: 'primary' },
            { label: 'Terverifikasi', value: verified, tone: 'success' },
            { label: 'Menunggu Review', value: pending, tone: 'warning' },
            { label: 'Ditolak', value: rejected, tone: 'danger' },
        ];
    }, [farmers]);

    async function updateVerification(action) {
        if (!selected || selected.source !== 'users') return;
        if (action === 'reject' && !notes.trim()) {
            setMessage({ type: 'error', text: 'Alasan penolakan wajib diisi.' });
            return;
        }

        setSubmitting(true);
        setMessage(null);
        try {
            const token = getToken();
            const response = await fetch('/api/farmers', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ id: selected.id, action, notes }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                const failed = (data.checklist || []).filter(item => !item.passed).map(item => item.label);
                throw new Error(failed.length
                    ? `${data.message} Belum lulus: ${failed.join(', ')}.`
                    : data.message || 'Gagal memperbarui status verifikasi');
            }
            setFarmers(current => current.map(item => item.id === data.data.id ? data.data : item));
            setNotes('');
            setMessage({ type: 'success', text: data.message });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Verifikasi Petani</h1>
                    <p className={styles.pageSubtitle}>
                        Verifikasi status petani, komunitas, wilayah kebun, email, dan wallet sebelum produksi dibuka.
                    </p>
                </div>
                <button type="button" className={styles.refreshButton} onClick={loadFarmers} disabled={loading}>
                    {loading ? 'Memuat...' : 'Muat Ulang'}
                </button>
            </div>

            {message && (
                <div className={`${styles.message} ${message.type === 'error' ? styles.messageError : styles.messageSuccess}`}>
                    {message.text}
                </div>
            )}

            <div className={styles.statsRow}>
                {stats.map(stat => (
                    <div key={stat.label} className={styles.statCard}>
                        <div className={`${styles.statVal} ${styles[stat.tone]}`}>{loading ? '...' : stat.value}</div>
                        <div className={styles.statLabel}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {selected && (
                <section className={styles.reviewPanel} aria-label="Detail verifikasi petani">
                    <div className={styles.reviewHeader}>
                        <div>
                            <span className={styles.eyebrow}>Audit identitas petani</span>
                            <h2>{selected.name}</h2>
                            <p>{selected.email || 'Akun legacy tanpa email'} · {selected.region}</p>
                        </div>
                        <span className={`${styles.statusBadge} ${styles[selected.verificationStatus]}`}>
                            {statusLabel(selected.verificationStatus)}
                        </span>
                    </div>

                    <div className={styles.reviewGrid}>
                        <div className={styles.checklist}>
                            {(selected.verificationChecklist || []).length ? selected.verificationChecklist.map(item => (
                                <div key={item.id || item.label} className={`${styles.checkItem} ${item.passed ? styles.checkPassed : styles.checkFailed}`}>
                                    <span className={styles.checkIcon}>{item.passed ? 'OK' : '!'}</span>
                                    <div>
                                        <strong>{item.label}</strong>
                                        <p>{item.detail}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className={styles.readOnlyNotice}>
                                    Data ini berasal dari tabel petani lama dan belum terhubung ke akun autentikasi.
                                </div>
                            )}
                        </div>

                        <div className={styles.reviewMeta}>
                            <div><span>Role akun</span><strong>Petani</strong></div>
                            <div><span>Kategori</span><strong>{selected.farmerCategoryLabel || selected.type || '-'}</strong></div>
                            <div><span>Komunitas / koperasi</span><strong>{selected.farmerCommunityName || 'Petani independen'}</strong></div>
                            <div><span>Lokasi kebun</span><strong>{selected.region || '-'}</strong></div>
                            <div><span>Deklarasi petani</span><strong>{selected.farmerDeclarationAt ? fmtDate(selected.farmerDeclarationAt) : selected.farmerCategory === 'legacy' ? 'Akun lama' : 'Belum tercatat'}</strong></div>
                            <div><span>Wallet</span><strong className={styles.mono}>{fmtWallet(selected.wallet)}</strong></div>
                            <div><span>Bergabung</span><strong>{selected.joined || '-'}</strong></div>
                            <div><span>Direview oleh</span><strong>{selected.verifiedByName || '-'}</strong></div>
                            <div><span>Waktu review</span><strong>{fmtDate(selected.verifiedAt)}</strong></div>
                            <div><span>Catatan</span><strong>{selected.verificationNotes || '-'}</strong></div>
                        </div>
                    </div>

                    {canReview && selected.source === 'users' && (
                        <div className={styles.reviewActions}>
                            <textarea
                                value={notes}
                                onChange={event => setNotes(event.target.value)}
                                placeholder="Catatan reviewer atau alasan penolakan"
                                maxLength={1000}
                                rows={3}
                            />
                            <div className={styles.actionButtons}>
                                <button type="button" className={styles.resetButton} onClick={() => updateVerification('reset')} disabled={submitting}>
                                    Set Pending
                                </button>
                                <button type="button" className={styles.rejectButton} onClick={() => updateVerification('reject')} disabled={submitting}>
                                    Tolak
                                </button>
                                <button type="button" className={styles.verifyButton} onClick={() => updateVerification('verify')} disabled={submitting}>
                                    Verifikasi Petani
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            )}

            <div className={styles.grid}>
                {!loading && farmers.length === 0 && (
                    <div className={styles.emptyState}>Belum ada data petani.</div>
                )}
                {farmers.map(farmer => (
                    <article
                        key={farmer.id}
                        className={`${styles.farmerCard} ${selectedId === farmer.id ? styles.selectedCard : ''}`}
                    >
                        <div className={styles.cardTop}>
                            <div className={styles.avatar}>{(farmer.name || '??').slice(0, 2).toUpperCase()}</div>
                            <div className={styles.cardTopInfo}>
                                <div className={styles.farmerName}>{farmer.name}</div>
                                <div className={styles.farmerType}>{farmer.type} · {farmer.region}</div>
                            </div>
                            <span className={`${styles.statusBadge} ${styles[farmer.verificationStatus]}`}>
                                {statusLabel(farmer.verificationStatus)}
                            </span>
                        </div>

                        <div className={styles.walletRow}>
                            <span>Wallet</span>
                            <span className={styles.walletAddr}>{fmtWallet(farmer.wallet)}</span>
                        </div>

                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <div className={styles.statItemVal}>{fmtVolume(farmer.volume)}</div>
                                <div className={styles.statItemLabel}>Volume</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statItemVal}>{farmer.emailVerified === false ? 'Belum' : 'Ya'}</div>
                                <div className={styles.statItemLabel}>Email Valid</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statItemVal}>
                                    {farmer.verificationChecklist?.filter(item => item.passed).length || 0}/{farmer.verificationChecklist?.length || 0}
                                </div>
                                <div className={styles.statItemLabel}>Kriteria</div>
                            </div>
                        </div>

                        <div className={styles.cardFooter}>
                            <span className={styles.joinDate}>Bergabung: {farmer.joined || '-'}</span>
                            <button
                                type="button"
                                className={styles.detailBtn}
                                onClick={() => {
                                    setSelectedId(current => current === farmer.id ? null : farmer.id);
                                    setNotes('');
                                    setMessage(null);
                                }}
                            >
                                {selectedId === farmer.id ? 'Tutup' : 'Periksa'}
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </div>
    );
}
