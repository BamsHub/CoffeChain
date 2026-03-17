'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PaymentModal from './PaymentModal';
import styles from './ShopPage.module.css';

const FILTER_OPTIONS = ['Semua', 'Arabika', 'Robusta', 'Liberika'];
const SORT_OPTIONS = ['Terpopuler', 'Harga Termurah', 'Harga Termahal', 'Rating Tertinggi', 'Stok Terbanyak'];

export default function ShopPage({ user }) {
    const [products, setProducts] = useState([]);
    const [markets, setMarkets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('Semua');
    const [sort, setSort] = useState('Terpopuler');
    const [search, setSearch] = useState('');
    const [selectedMarket, setSelectedMarket] = useState(null); // null = all
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedWeight, setSelectedWeight] = useState({});
    const [cartItem, setCartItem] = useState(null);
    const [showPayment, setShowPayment] = useState(false);
    const router = useRouter();

    useEffect(() => {
        Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetch('/api/markets').then(r => r.json()),
        ]).then(([pd, md]) => {
            setProducts(pd.data || []);
            setMarkets(md.data || []);
        }).finally(() => setLoading(false));
    }, []);

    // Filter products by selected market (via origin matching)
    const marketFiltered = selectedMarket
        ? products.filter(p => {
            const mkt = markets.find(m => m.id === selectedMarket);
            if (!mkt) return true;
            return p.origin?.toLowerCase().includes(mkt.region?.toLowerCase()) ||
                mkt.region?.toLowerCase().includes(p.origin?.toLowerCase());
        })
        : products;

    const filtered = marketFiltered
        .filter(p => filter === 'Semua' || p.variety === filter)
        .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.origin.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (sort === 'Harga Termurah') return a.pricePerUnit[0] - b.pricePerUnit[0];
            if (sort === 'Harga Termahal') return b.pricePerUnit[0] - a.pricePerUnit[0];
            if (sort === 'Rating Tertinggi') return b.rating - a.rating;
            if (sort === 'Stok Terbanyak') return b.stock - a.stock;
            return b.sold - a.sold;
        });

    function getWeightIdx(productId) { return selectedWeight[productId] ?? 0; }

    function handleBuy(product, paymentMethod) {
        const wIdx = getWeightIdx(product.id);
        const mkt = markets.find(m => m.id === selectedMarket);
        setCartItem({
            product,
            weightIndex: wIdx,
            weight: product.weight[wIdx],
            price: product.pricePerUnit[wIdx],
            paymentMethod,
            marketId: mkt?.id || null,
            marketName: mkt?.name || null,
        });
        setShowPayment(true);
    }

    const activeMarket = markets.find(m => m.id === selectedMarket);

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>🛒 Beli Produk Kopi</h1>
                    <p className={styles.pageSubtitle}>Kopi premium langsung dari petani — terverifikasi blockchain</p>
                </div>
            </div>

            {/* ── MARKET SELECTOR ── */}
            <div className={styles.marketSection}>
                <div className={styles.marketSectionHeader}>
                    <span className={styles.marketSectionTitle}>🏪 Pilih Pasar Kopi</span>
                    <span className={styles.marketSectionSub}>{markets.length} pasar tersedia</span>
                </div>
                <div className={styles.marketScroll}>
                    {/* "Semua Pasar" chip */}
                    <button
                        className={`${styles.marketChip} ${!selectedMarket ? styles.marketChipActive : ''}`}
                        onClick={() => setSelectedMarket(null)}
                    >
                        <span className={styles.marketChipIcon}>🌏</span>
                        <div>
                            <div className={styles.marketChipName}>Semua Pasar</div>
                            <div className={styles.marketChipSub}>{products.length} produk</div>
                        </div>
                    </button>
                    {markets.map(mkt => (
                        <button
                            key={mkt.id}
                            className={`${styles.marketChip} ${selectedMarket === mkt.id ? styles.marketChipActive : ''}`}
                            onClick={() => setSelectedMarket(mkt.id)}
                            style={selectedMarket === mkt.id ? { borderColor: mkt.coverColor || 'var(--color-primary-light)' } : {}}
                        >
                            <span className={styles.marketChipIcon}>{mkt.icon}</span>
                            <div>
                                <div className={styles.marketChipName}>{mkt.name}</div>
                                <div className={styles.marketChipSub}>{mkt.farmerCount} petani · {mkt.region}</div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Active market details */}
                {activeMarket && (
                    <div className={styles.marketDetail} style={{ borderColor: activeMarket.coverColor }}>
                        <div className={styles.marketDetailHeader} style={{ background: activeMarket.coverColor }}>
                            <span style={{ fontSize: 28 }}>{activeMarket.icon}</span>
                            <div>
                                <div className={styles.marketDetailName}>{activeMarket.name}</div>
                                <div className={styles.marketDetailRegion}>📍 {activeMarket.region} · {activeMarket.type}</div>
                            </div>
                        </div>
                        <div className={styles.marketDetailBody}>
                            <p className={styles.marketDetailDesc}>{activeMarket.description}</p>
                            <div className={styles.marketFarmers}>
                                <span className={styles.marketFarmersLabel}>👨‍🌾 {activeMarket.farmerCount} Petani Terdaftar:</span>
                                <div className={styles.marketFarmersList}>
                                    {(activeMarket.farmers || []).map(f => (
                                        <span key={f.id} className={styles.farmerTag}>✓ {f.name}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Search + Filter Bar */}
            <div className={styles.filterBar}>
                <div className={styles.searchBox}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kopi, asal daerah..." className={styles.searchInput} />
                </div>
                <div className={styles.filterChips}>
                    {FILTER_OPTIONS.map(f => (
                        <button key={f} className={`${styles.chip} ${filter === f ? styles.chipActive : ''}`} onClick={() => setFilter(f)}>{f}</button>
                    ))}
                </div>
                <select className={styles.sortSelect} value={sort} onChange={e => setSort(e.target.value)}>
                    {SORT_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
            </div>

            {/* Stats Bar */}
            <div className={styles.statsBar}>
                <div className={styles.statItem}>
                    <span className={styles.statNum}>{filtered.length}</span>
                    <span className={styles.statLbl}>{activeMarket ? `Produk di ${activeMarket.name}` : 'Produk Kopi'}</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statNum}>{products.reduce((sum, p) => sum + p.stock, 0)}</span>
                    <span className={styles.statLbl}>Stok Total (kg)</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statNum}>{products.reduce((sum, p) => sum + p.sold, 0).toLocaleString()}</span>
                    <span className={styles.statLbl}>Total Terjual</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statNum}>{markets.length}</span>
                    <span className={styles.statLbl}>Pasar Kopi</span>
                </div>
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className={styles.loadingGrid}>
                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className={styles.skeleton} />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                    ☕ Tidak ada produk di pasar {activeMarket?.name || 'ini'} yang sesuai filter
                </div>
            ) : (
                <div className={styles.grid}>
                    {filtered.map((product) => {
                        const wIdx = getWeightIdx(product.id);
                        const price = product.pricePerUnit[wIdx];
                        const lowStock = product.stock < 30;
                        return (
                            <div key={product.id} className={styles.card} onClick={() => setSelectedProduct(product === selectedProduct ? null : product)}>
                                <div className={styles.cardBadges}>
                                    {product.tags.slice(0, 2).map(t => (
                                        <span key={t} className={styles.tag}>{t}</span>
                                    ))}
                                    {lowStock && <span className={styles.tagLow}>⚠️ Stok Terbatas</span>}
                                </div>
                                <div className={styles.productEmoji}>{product.image}</div>
                                <div className={styles.cardBody}>
                                    <div className={styles.productOrigin}>📍 {product.origin}</div>
                                    <h3 className={styles.productName}>{product.name}</h3>
                                    <div className={styles.productMeta}>
                                        <span className={styles.grade}>Grade {product.grade}</span>
                                        <span className={styles.roast}>{product.roast}</span>
                                    </div>
                                    <div className={styles.ratingRow}>
                                        <span className={styles.stars}>{'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}</span>
                                        <span className={styles.ratingNum}>{product.rating}</span>
                                        <span className={styles.soldNum}>{product.sold.toLocaleString()} terjual</span>
                                    </div>
                                    <div className={styles.weightRow}>
                                        {product.weight.map((w, i) => (
                                            <button
                                                key={w}
                                                className={`${styles.weightBtn} ${getWeightIdx(product.id) === i ? styles.weightActive : ''}`}
                                                onClick={e => { e.stopPropagation(); setSelectedWeight(prev => ({ ...prev, [product.id]: i })); }}
                                            >
                                                {w}g
                                            </button>
                                        ))}
                                    </div>
                                    <div className={styles.priceRow}>
                                        <div>
                                            <div className={styles.priceLabel}>Harga</div>
                                            <div className={styles.price}>Rp {price.toLocaleString('id-ID')}</div>
                                        </div>
                                        <div className={styles.stockInfo}>
                                            <span className={lowStock ? styles.stockLow : styles.stockOk}>
                                                {lowStock ? '⚠️' : '✅'} {product.stock} kg
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.buyRow}>
                                        <button className={styles.btnTransfer} onClick={e => { e.stopPropagation(); handleBuy(product, 'transfer'); }}>
                                            🏦 Transfer
                                        </button>
                                        <button className={styles.btnQris} onClick={e => { e.stopPropagation(); handleBuy(product, 'qris'); }}>
                                            📱 QRIS
                                        </button>
                                    </div>
                                </div>
                                {selectedProduct?.id === product.id && (
                                    <div className={styles.expandedDesc} onClick={e => e.stopPropagation()}>
                                        <p>{product.description}</p>
                                        <div className={styles.blockchainNote}>
                                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" /></svg>
                                            Keaslian produk terverifikasi di Solana Blockchain
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Payment Modal */}
            {showPayment && cartItem && (
                <PaymentModal
                    cartItem={cartItem}
                    user={user}
                    onClose={() => { setShowPayment(false); setCartItem(null); }}
                    onSuccess={() => {
                        setShowPayment(false);
                        setCartItem(null);
                        router.push('/dashboard');
                    }}
                />
            )}
        </div>
    );
}
