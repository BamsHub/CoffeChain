'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import styles from './MarketPage.module.css';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const coffeeTypes = [
    { name: 'Arabika Gayo', grade: 'Grade A', price: 68500, change: -2.1, vol: '4,821 Ton', origin: 'Aceh', emoji: '☕' },
    { name: 'Arabika Toraja', grade: 'Grade A', price: 72000, change: +1.4, vol: '3,210 Ton', origin: 'Sulawesi', emoji: '🫘' },
    { name: 'Robusta Lampung', grade: 'Grade B', price: 42000, change: +0.8, vol: '8,540 Ton', origin: 'Lampung', emoji: '🌿' },
    { name: 'Arabika Flores', grade: 'Grade A', price: 75000, change: +3.2, vol: '1,980 Ton', origin: 'NTT', emoji: '☕' },
    { name: 'Arabika Mandheling', grade: 'Grade AA', price: 80000, change: -0.5, vol: '2,430 Ton', origin: 'Sumut', emoji: '🫘' },
    { name: 'Liberika Riau', grade: 'Grade B', price: 38000, change: +1.8, vol: '920 Ton', origin: 'Riau', emoji: '🌿' },
];

const ROLE_CAN_MANAGE = ['developer', 'koperasi'];

// Modal tambah produk
function AddProductModal({ onClose, onSave }) {
    const [form, setForm] = useState({ name: '', origin: '', grade: 'A', variety: 'Arabika', roast: 'Medium Roast', weightStr: '250,500,1000', priceStr: '60000,110000,200000', description: '', stock: 50, image: '' });
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true); setErr('');
        try {
            const weight = form.weightStr.split(',').map(Number).filter(Boolean);
            const pricePerUnit = form.priceStr.split(',').map(Number).filter(Boolean);
            if (weight.length !== pricePerUnit.length) { setErr('Jumlah berat dan harga harus sama'); setLoading(false); return; }
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, weight, pricePerUnit, rating: 4.5, sold: 0, tags: [form.variety, form.grade] }),
            });
            const data = await res.json();
            if (!data.success) { setErr(data.message || 'Gagal menyimpan'); setLoading(false); return; }
            onSave(data.data);
        } catch { setErr('Server error'); }
        setLoading(false);
    }

    const F = (k, val) => setForm(f => ({ ...f, [k]: val }));
    const inp = (label, k, type = 'text', placeholder = '') => (
        <div className={styles.mField}>
            <label>{label}</label>
            <input type={type} value={form[k]} onChange={e => F(k, e.target.value)} placeholder={placeholder} className={styles.mInput} />
        </div>
    );

    return (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={styles.addModal}>
                <div className={styles.addModalHdr}>
                    <h3 style={{display:'flex',alignItems:'center',gap:8}}>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                        Tambah Produk Kopi
                    </h3>
                    <button onClick={onClose}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className={styles.addForm}>
                    {/* FOTO PRODUK UPLOAD */}
                    <div className={styles.mField}>
                        <label>Foto Produk <span style={{fontWeight:400,opacity:0.6}}>(maks 2MB — developer upload sendiri)</span></label>
                        <div className={styles.photoUploadBox}>
                            {form.image && form.image.startsWith('data:') ? (
                                <img src={form.image} alt="preview" className={styles.photoPreviewImg} />
                            ) : (
                                <div className={styles.photoPlaceholder}>
                                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24" style={{opacity:0.35}}><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                    <span style={{fontSize:12,opacity:0.5,marginTop:6}}>Belum ada foto produk</span>
                                </div>
                            )}
                            <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                                <label className={styles.photoUploadBtn}>
                                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                    Upload Foto
                                    <input type="file" accept="image/*" style={{display:'none'}}
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (file.size > 2 * 1024 * 1024) { setErr('Foto max 2MB'); return; }
                                            const reader = new FileReader();
                                            reader.onload = ev => F('image', ev.target.result);
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                </label>
                                {form.image && form.image.startsWith('data:') && (
                                    <button type="button" className={styles.photoRemoveBtn} onClick={() => F('image', '')}>Hapus Foto</button>
                                )}
                            </div>
                        </div>
                    </div>
                    {inp('Nama Produk *', 'name', 'text', 'Arabika Gayo Premium')}
                    {inp('Asal Daerah *', 'origin', 'text', 'Gayo, Aceh')}
                    <div className={styles.mRow}>
                        <div className={styles.mField}><label>Varietas</label>
                            <select value={form.variety} onChange={e => F('variety', e.target.value)} className={styles.mSelect}>
                                {['Arabika', 'Robusta', 'Liberika'].map(v => <option key={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className={styles.mField}><label>Grade</label>
                            <select value={form.grade} onChange={e => F('grade', e.target.value)} className={styles.mSelect}>
                                {['AA', 'A', 'B'].map(g => <option key={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className={styles.mField}><label>Roast</label>
                            <select value={form.roast} onChange={e => F('roast', e.target.value)} className={styles.mSelect}>
                                {['Light Roast', 'Medium Roast', 'Medium Dark', 'Dark Roast', 'Full City Roast'].map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    {inp('Berat (g) — pisah koma *', 'weightStr', 'text', '250,500,1000')}
                    {inp('Harga (Rp) — pisah koma, urutan sama *', 'priceStr', 'text', '60000,110000,200000')}
                    <div className={styles.mRow}>
                        {inp('Stok (kg)', 'stock', 'number', '50')}
                    </div>
                    <div className={styles.mField}><label>Deskripsi</label>
                        <textarea value={form.description} onChange={e => F('description', e.target.value)} className={styles.mTextarea} placeholder="Deskripsikan produk kopi ini..." />
                    </div>
                    {err && <p className={styles.mErr}>{err}</p>}
                    <div className={styles.mBtns}>
                        <button type="button" onClick={onClose} className={styles.mCancel}>Batal</button>
                        <button type="submit" disabled={loading} className={styles.mSave}>{loading ? 'Menyimpan...' : '💾 Simpan Produk'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function MarketPage({ user }) {
    const { user: ctxUser } = useAuth();
    const activeUser = user || ctxUser;
    const canManage = ROLE_CAN_MANAGE.includes(activeUser?.role);
    const [mounted, setMounted] = useState(false);
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        fetchOrders();
        fetchProducts();
    }, []);

    async function fetchOrders() {
        try {
            const res = await fetch('/api/orders');
            const data = await res.json();
            setOrders((data.data || []).filter(o => o.status === 'paid').sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)));
        } catch { } finally { setOrdersLoading(false); }
    }

    async function fetchProducts() {
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            setProducts(data.data || []);
        } catch { }
    }

    const candleOptions = {
        chart: { type: 'candlestick', toolbar: { show: false }, background: 'transparent' },
        xaxis: { type: 'datetime', labels: { style: { colors: '#5E7A5A' } }, axisBorder: { show: false } },
        yaxis: { labels: { style: { colors: '#5E7A5A' }, formatter: v => `Rp ${(v / 1000).toFixed(0)}K` } },
        grid: { borderColor: 'rgba(74,124,40,0.1)', strokeDashArray: 4 },
        plotOptions: { candlestick: { colors: { upward: '#4A7C28', downward: '#FF6B6B' } } },
        tooltip: { theme: 'dark' },
    };
    const now = new Date('2026-02-27').getTime();
    const candleSeries = [{
        data: [
            { x: now - 6 * 86400000, y: [66000, 70000, 65000, 68000] },
            { x: now - 5 * 86400000, y: [68000, 72000, 67500, 69500] },
            { x: now - 4 * 86400000, y: [69500, 73000, 68000, 71000] },
            { x: now - 3 * 86400000, y: [71000, 74000, 70000, 70500] },
            { x: now - 2 * 86400000, y: [70500, 71500, 67000, 68000] },
            { x: now - 1 * 86400000, y: [68000, 69000, 65500, 66500] },
            { x: now, y: [66500, 70000, 66000, 68500] },
        ]
    }];

    // Gabung products dan orders untuk tampilkan riwayat dengan nama petani
    function getProductImage(productId) {
        return products.find(p => p.id === productId)?.image || '';
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Harga Pasar Kopi</h1>
                    <p className={styles.pageSubtitle}>Data harga kopi Indonesia real-time yang transparan di blockchain</p>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.updateTime}>
                        <span className={styles.liveChip}><span />LIVE</span>
                        Diperbarui: 27 Feb 2026, 14:49
                    </div>
                    {canManage && (
                        <button className={styles.addProductBtn} onClick={() => setShowAddProduct(true)}>
                            ➕ Tambah Produk
                        </button>
                    )}
                </div>
            </div>

            {/* Price Cards */}
            <div className={styles.priceGrid}>
                {coffeeTypes.map((c, i) => (
                    <div key={i} className={`${styles.priceCard} ${c.change >= 0 ? styles.up : styles.down}`}>
                        <div className={styles.priceTop}>
                            <div className={styles.emoji} style={{width:36,height:36,borderRadius:8,background:'var(--color-surface-2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                            </div>
                            <div>
                                <div className={styles.coffeeName}>{c.name}</div>
                                <div className={styles.coffeeGrade}>{c.grade} • {c.origin}</div>
                            </div>
                            <span className={`${styles.changeChip} ${c.change >= 0 ? styles.posChip : styles.negChip}`}>
                                {c.change >= 0 ? '↑' : '↓'} {Math.abs(c.change)}%
                            </span>
                        </div>
                        <div className={styles.coffeePrice}>Rp {c.price.toLocaleString()}<span className={styles.perKg}>/kg</span></div>
                        <div className={styles.coffeeVol}>Volume: {c.vol}</div>
                    </div>
                ))}
            </div>

            {/* Candlestick Chart */}
            <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                    <div>
                        <h3 className={styles.chartTitle}>Grafik Candlestick — Arabika Gayo Grade A</h3>
                        <p className={styles.chartSub}>7 hari terakhir</p>
                    </div>
                    <div className={styles.legendRow}>
                        <span className={styles.legendUp}>▲ Naik</span>
                        <span className={styles.legendDown}>▼ Turun</span>
                    </div>
                </div>
                {mounted && <ReactApexChart options={candleOptions} series={candleSeries} type="candlestick" height={280} />}
            </div>

            {/* ─── RIWAYAT PEMBELIAN ─── */}
            <div className={styles.historyCard}>
                <div className={styles.historyHeader}>
                    <div>
                        <h3 className={styles.chartTitle}>Riwayat Pembelian Produk Kopi</h3>
                        <p className={styles.chartSub}>Transaksi terbayar yang tercatat di sistem</p>
                    </div>
                    <span className={styles.historyCount}>{orders.length} Transaksi</span>
                </div>

                {ordersLoading ? (
                    <div className={styles.histLoading}>
                        {[1, 2, 3].map(i => <div key={i} className={styles.histSkeleton} />)}
                    </div>
                ) : orders.length === 0 ? (
                    <div className={styles.histEmpty}>Belum ada transaksi yang selesai</div>
                ) : (
                    <div className={styles.histList}>
                        {orders.map((o, i) => (
                            <div key={o.id} className={styles.histItem}>
                                <div className={styles.histNum}>#{i + 1}</div>
                                <div className={styles.histEmoji}>
                                    {(() => { const img = getProductImage(o.productId); return img && img.startsWith('data:') ? <img src={img} alt="" style={{width:36,height:36,borderRadius:8,objectFit:'cover'}} /> : <div style={{width:36,height:36,borderRadius:8,background:'var(--color-surface-2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'var(--color-text-muted)'}}>{(o.productName||'?').substring(0,2).toUpperCase()}</div>; })()}
                                </div>
                                <div className={styles.histInfo}>
                                    <div className={styles.histProduct}>{o.productName} <span className={styles.histWeight}>{o.weight}g</span></div>
                                    <div className={styles.histMeta}>
                                        <span className={styles.histBuyer}>{o.userName}</span>
                                        <span className={styles.histDot}>•</span>
                                        <span className={styles.histMethod}>{o.paymentMethod === 'transfer' ? 'Phantom' : 'QRIS'}</span>
                                        <span className={styles.histDot}>•</span>
                                        <span className={styles.histTime}>{new Date(o.paidAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <div className={styles.histRight}>
                                    <div className={styles.histPrice}>Rp {(o.totalPrice || 0).toLocaleString('id-ID')}</div>
                                    <div className={styles.histOrderId}>{o.orderId}</div>
                                    <span className={styles.paiBadge}>LUNAS</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Order Form */}
            <div className={styles.tradeCard}>
                <h3 className={styles.chartTitle}>Buat Order Transaksi Kopi</h3>
                <div className={styles.tradeForm}>
                    <div className={styles.formGroup}><label>Jenis Kopi</label>
                        <select className={styles.select}>{coffeeTypes.map(c => <option key={c.name}>{c.name} — Rp {c.price.toLocaleString()}/kg</option>)}</select>
                    </div>
                    <div className={styles.formGroup}><label>Berat (kg)</label><input type="number" placeholder="e.g. 100" className={styles.input} /></div>
                    <div className={styles.formGroup}><label>Harga Penawaran (Rp/kg)</label><input type="number" placeholder="e.g. 68500" className={styles.input} /></div>
                    <div className={styles.tradeBtns}>
                        <button className={styles.btnBuy}>Beli</button>
                        <button className={styles.btnSell}>Jual</button>
                    </div>
                </div>
            </div>

            {/* Modal Tambah Produk */}
            {showAddProduct && canManage && (
                <AddProductModal
                    onClose={() => setShowAddProduct(false)}
                    onSave={newProd => { setProducts(p => [newProd, ...p]); setShowAddProduct(false); }}
                />
            )}
        </div>
    );
}
