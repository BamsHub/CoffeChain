'use client';

import { useState, useEffect } from 'react';
import { useAuth, ROLE_LABELS } from '@/context/AuthContext';
import styles from './MarketsPage.module.css';

const TYPES = ['Semua', 'Arabika', 'Robusta', 'Liberika', 'Campuran'];
const ICONS = ['☕', '🌿', '🏔️', '🌺', '⛰️', '🦜', '🌱', '🍃', '🫘'];
const COLORS = ['#2D5016', '#1A3A5C', '#5C1A3A', '#3A2A1A', '#1C3A1C', '#2A1A5C', '#4A2010', '#1A4A3A'];

export default function MarketsPage() {
    const { user } = useAuth();
    const [markets, setMarkets] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState('Semua');
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState(null); // market being edited
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', region: '', description: '', icon: '☕', type: 'Arabika', farmerIds: [], coverColor: '#2D5016' });

    const isdev = user?.role === 'developer';
    const canManage = user?.role === 'developer' || user?.role === 'koperasi';

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [mRes, fRes] = await Promise.all([fetch('/api/markets'), fetch('/api/farmers')]);
            const mData = await mRes.json();
            const fData = await fRes.json();
            setMarkets(mData.data || []);
            setFarmers(fData.data || []);
        } catch { }
        setLoading(false);
    }

    function openAdd() { setForm({ name: '', region: '', description: '', icon: '☕', type: 'Arabika', farmerIds: [], coverColor: '#2D5016' }); setEditing(null); setShowAdd(true); }
    function openEdit(mkt) { setForm({ name: mkt.name, region: mkt.region, description: mkt.description || '', icon: mkt.icon || '☕', type: mkt.type || 'Arabika', farmerIds: mkt.farmerIds || [], coverColor: mkt.coverColor || '#2D5016' }); setEditing(mkt.id); setShowAdd(true); }

    async function handleSave(e) {
        e.preventDefault();
        if (!form.name.trim() || !form.region.trim()) return;
        setSaving(true);
        try {
            if (editing) {
                await fetch('/api/markets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, ...form }) });
            } else {
                await fetch('/api/markets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, createdBy: user?.name }) });
            }
            await loadData();
            setShowAdd(false);
        } catch { }
        setSaving(false);
    }

    async function handleDelete(id) {
        if (!confirm('Hapus market ini?')) return;
        await fetch(`/api/markets?id=${id}`, { method: 'DELETE' });
        setMarkets(prev => prev.filter(m => m.id !== id));
    }

    function toggleFarmer(id) {
        setForm(f => ({
            ...f,
            farmerIds: f.farmerIds.includes(id) ? f.farmerIds.filter(x => x !== id) : [...f.farmerIds, id],
        }));
    }

    const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const filtered = typeFilter === 'Semua' ? markets : markets.filter(m => m.type === typeFilter);

    // Sort by most popular (orderCount desc)
    const sorted = [...filtered].sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0));
    const topMarket = sorted[0];

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>🏪 Manajemen Pasar Kopi</h1>
                    <p className={styles.pageSub}>Kelola marketplace kopi dengan petani terafiliasi</p>
                </div>
                {isdev && (
                    <button className={styles.btnAdd} onClick={openAdd}>
                        <span>+</span> Tambah Market
                    </button>
                )}
            </div>

            {/* Top market banner */}
            {!loading && topMarket && topMarket.orderCount > 0 && (
                <div className={styles.topBanner} style={{ borderColor: topMarket.coverColor }}>
                    <div className={styles.topIcon}>{topMarket.icon}</div>
                    <div className={styles.topInfo}>
                        <div className={styles.topLabel}>🏆 Market Paling Laris</div>
                        <div className={styles.topName}>{topMarket.name}</div>
                        <div className={styles.topStats}>{topMarket.orderCount} transaksi · Rp {topMarket.totalRevenue.toLocaleString('id-ID')} revenue · {topMarket.farmerCount} petani</div>
                    </div>
                    <div className={styles.topBadge}># 1 TERLARIS</div>
                </div>
            )}

            {/* Type filter tabs */}
            <div className={styles.typeTabs}>
                {TYPES.map(t => (
                    <button key={t} className={`${styles.typeTab} ${typeFilter === t ? styles.typeTabActive : ''}`} onClick={() => setTypeFilter(t)}>{t}</button>
                ))}
            </div>

            {/* Market Grid */}
            {loading ? (
                <div className={styles.loadingGrid}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} />)}</div>
            ) : (
                <div className={styles.grid}>
                    {sorted.map((mkt, idx) => (
                        <div key={mkt.id} className={styles.card}>
                            {/* Rank badge */}
                            {idx === 0 && mkt.orderCount > 0 && <div className={styles.rankBadge}>🏆</div>}

                            {/* Header */}
                            <div className={styles.cardHeader} style={{ background: mkt.coverColor || '#2D5016' }}>
                                <div className={styles.cardIcon}>{mkt.icon || '☕'}</div>
                                <div className={styles.cardStatus}>
                                    <span className={mkt.status === 'active' ? styles.statusActive : styles.statusInactive}>
                                        {mkt.status === 'active' ? '● Aktif' : '○ Nonaktif'}
                                    </span>
                                </div>
                            </div>

                            {/* Body */}
                            <div className={styles.cardBody}>
                                <div className={styles.cardRegion}>📍 {mkt.region}</div>
                                <h3 className={styles.cardName}>{mkt.name}</h3>
                                <p className={styles.cardDesc}>{mkt.description}</p>

                                {/* Type badge */}
                                <span className={styles.typeBadge}>{mkt.type}</span>

                                {/* Stats row */}
                                <div className={styles.statsRow}>
                                    <div className={styles.stat}>
                                        <div className={styles.statVal}>{mkt.farmerCount}</div>
                                        <div className={styles.statLbl}>Petani</div>
                                    </div>
                                    <div className={styles.statDiv} />
                                    <div className={styles.stat}>
                                        <div className={styles.statVal}>{mkt.orderCount}</div>
                                        <div className={styles.statLbl}>Transaksi</div>
                                    </div>
                                    <div className={styles.statDiv} />
                                    <div className={styles.stat}>
                                        <div className={styles.statVal}>{(mkt.totalVolume / 1000).toFixed(1)}T</div>
                                        <div className={styles.statLbl}>Volume</div>
                                    </div>
                                </div>

                                {/* Farmers list */}
                                {mkt.farmers && mkt.farmers.length > 0 && (
                                    <div className={styles.farmersList}>
                                        <div className={styles.farmersTitle}>Petani Terafiliasi:</div>
                                        <div className={styles.farmersChips}>
                                            {mkt.farmers.map(f => (
                                                <span key={f.id} className={`${styles.farmerChip} ${f.status === 'Verified' ? styles.chipVerified : styles.chipPending}`}>
                                                    {f.status === 'Verified' ? '✓' : '…'} {f.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Revenue */}
                                {mkt.totalRevenue > 0 && (
                                    <div className={styles.revRow}>
                                        💰 Revenue: <span className={styles.revAmt}>Rp {mkt.totalRevenue.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions (developer only) */}
                            {isdev && (
                                <div className={styles.cardActions}>
                                    <button className={styles.editBtn} onClick={() => openEdit(mkt)}>✏️ Edit</button>
                                    <button className={styles.delBtn} onClick={() => handleDelete(mkt.id)}>🗑️ Hapus</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAdd && (
                <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>{editing ? '✏️ Edit Market' : '➕ Tambah Market Baru'}</h2>
                            <button className={styles.closeBtn} onClick={() => setShowAdd(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave} className={styles.modalForm}>
                            <div className={styles.row2}>
                                <div className={styles.field}>
                                    <label>Nama Market *</label>
                                    <input value={form.name} onChange={e => F('name', e.target.value)} placeholder="Pasar Kopi Aceh" className={styles.input} required />
                                </div>
                                <div className={styles.field}>
                                    <label>Region / Daerah *</label>
                                    <input value={form.region} onChange={e => F('region', e.target.value)} placeholder="Aceh" className={styles.input} required />
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label>Deskripsi</label>
                                <textarea value={form.description} onChange={e => F('description', e.target.value)} placeholder="Deskripsi market ini..." className={styles.textarea} rows={2} />
                            </div>
                            <div className={styles.row2}>
                                <div className={styles.field}>
                                    <label>Tipe Kopi</label>
                                    <select value={form.type} onChange={e => F('type', e.target.value)} className={styles.select}>
                                        {['Arabika', 'Robusta', 'Liberika', 'Campuran'].map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label>Icon</label>
                                    <div className={styles.iconPicker}>
                                        {ICONS.map(ic => (
                                            <button type="button" key={ic} className={`${styles.iconBtn} ${form.icon === ic ? styles.iconBtnActive : ''}`} onClick={() => F('icon', ic)}>{ic}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label>Warna Background Card</label>
                                <div className={styles.colorPicker}>
                                    {COLORS.map(c => (
                                        <button type="button" key={c} className={`${styles.colorBtn} ${form.coverColor === c ? styles.colorBtnActive : ''}`} style={{ background: c }} onClick={() => F('coverColor', c)} />
                                    ))}
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label>Pilih Petani Terafiliasi ({form.farmerIds.length} dipilih)</label>
                                <div className={styles.farmerGrid}>
                                    {farmers.map(f => (
                                        <label key={f.id} className={`${styles.farmerCheck} ${form.farmerIds.includes(f.id) ? styles.farmerCheckActive : ''}`}>
                                            <input type="checkbox" checked={form.farmerIds.includes(f.id)} onChange={() => toggleFarmer(f.id)} style={{ display: 'none' }} />
                                            <span className={styles.checkMark}>{form.farmerIds.includes(f.id) ? '✓' : ''}</span>
                                            <div>
                                                <div className={styles.checkName}>{f.name}</div>
                                                <div className={styles.checkRegion}>{f.region}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowAdd(false)}>Batal</button>
                                <button type="submit" disabled={saving} className={styles.saveBtn}>
                                    {saving ? '⏳ Menyimpan...' : '💾 Simpan Market'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
