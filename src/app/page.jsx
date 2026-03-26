'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ── SVG Icons ── */
const IconCoffee = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
const IconChain = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const IconLock = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const IconCart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>;
const IconArrow = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IconStar = ({ filled }) => <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IconFarmer = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const IconPackage = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconTx = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
const IconSolana = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconSeed = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 3l7 9 7-9"/></svg>;
const IconVerify = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconQr = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const IconBank = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>;
const IconClose = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconCheck = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#7ED44A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

export default function LandingPage() {
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState({ farmers: 0, transactions: 0, products: 0 });
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [orderModal, setOrderModal] = useState(false);
    const [orderForm, setOrderForm] = useState({ buyerName: '', buyerEmail: '', buyerPhone: '', quantity: 1, weight: '', paymentMethod: 'transfer' });
    const [orderResult, setOrderResult] = useState(null);
    const [ordering, setOrdering] = useState(false);
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [mobileMenu, setMobileMenu] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        async function load() {
            try {
                const [prodRes, farmerRes, txRes] = await Promise.all([
                    fetch('/api/public/products?limit=8'),
                    fetch('/api/farmers'),
                    fetch('/api/transactions'),
                ]);
                const prodData = await prodRes.json();
                const farmerData = await farmerRes.json();
                const txData = await txRes.json();
                if (prodData.success) setProducts(prodData.data);
                setStats({
                    farmers: farmerData.success ? farmerData.data?.length : 0,
                    transactions: txData.success ? txData.data?.length : 0,
                    products: prodData.success ? prodData.total : 0,
                });
            } catch { }
            setLoading(false);
        }
        load();
    }, []);

    async function handleOrder(e) {
        e.preventDefault();
        if (!selectedProduct) return;
        setOrdering(true);
        try {
            const res = await fetch('/api/public/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    weight: orderForm.weight || selectedProduct.weight?.[0],
                    quantity: orderForm.quantity,
                    paymentMethod: orderForm.paymentMethod,
                    buyerName: orderForm.buyerName,
                    buyerEmail: orderForm.buyerEmail,
                    buyerPhone: orderForm.buyerPhone,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setOrderResult(data.data);
                try {
                    const qrText = `COFFEECHAIN|${data.data.orderId}|Rp${data.data.totalPrice}`;
                    const QRCode = (await import('qrcode')).default;
                    const url = await QRCode.toDataURL(qrText, { width: 220, margin: 2, color: { dark: '#7ED44A', light: '#0a120a' } });
                    setQrDataUrl(url);
                } catch { setQrDataUrl(null); }
            } else {
                alert(data.message || 'Gagal membuat pesanan');
            }
        } catch { alert('Terjadi kesalahan. Coba lagi.'); }
        setOrdering(false);
    }

    function openOrder(product) {
        setSelectedProduct(product);
        setOrderForm({ buyerName: '', buyerEmail: '', buyerPhone: '', quantity: 1, weight: product.weight?.[0] || '', paymentMethod: 'transfer' });
        setOrderResult(null);
        setQrDataUrl(null);
        setOrderModal(true);
    }

    const weightIdx = selectedProduct && orderForm.weight ? (selectedProduct.weight?.indexOf(orderForm.weight) ?? 0) : 0;
    const unitPrice = selectedProduct?.pricePerUnit?.[weightIdx] ?? 0;
    const totalPrice = unitPrice * orderForm.quantity;

    return (
        <div style={{ background: '#030d06', minHeight: '100vh', color: '#E8F5E0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

            {/* ── GLOBAL RESPONSIVE STYLES ── */}
            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                html { scroll-behavior: smooth; }
                body { overflow-x: hidden; }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
                .lp-nav-links { display:flex; gap:4px; align-items:center; }
                .lp-mobile-toggle { display:none; background:none; border:none; color:#E8F5E0; cursor:pointer; padding:8px; }
                .lp-hero-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
                .lp-stats { display:flex; gap:32px; justify-content:center; flex-wrap:wrap; margin-top:56px; }
                .lp-products-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:20px; }
                .lp-how-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:16px; }
                .lp-cta-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
                .lp-footer-inner { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; }
                .lp-footer-links { display:flex; gap:20px; }
                .lp-modal-grid { display:flex; flex-direction:column; gap:12px; }
                .lp-weight-btns { display:flex; gap:8px; flex-wrap:wrap; }
                .lp-pay-btns { display:flex; gap:8px; flex-wrap:wrap; }
                .lp-card { background:linear-gradient(145deg,rgba(22,30,22,0.95),rgba(12,18,12,0.95)); border:1px solid rgba(74,124,40,0.2); border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:10px; transition:transform 0.2s,border-color 0.2s; }
                .lp-card:hover { transform:translateY(-4px); border-color:rgba(126,212,74,0.4); }
                .lp-btn-primary { background:linear-gradient(135deg,#4A7C28,#7ED44A); color:#fff; font-weight:700; border:none; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:opacity 0.2s,transform 0.1s; text-decoration:none; }
                .lp-btn-primary:hover { opacity:0.9; transform:translateY(-1px); }
                .lp-btn-outline { border:1px solid rgba(126,212,74,0.35); color:#7ED44A; background:transparent; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; text-decoration:none; }
                .lp-btn-outline:hover { background:rgba(126,212,74,0.06); }
                @media (max-width: 768px) {
                    .lp-nav-links { display:none; }
                    .lp-nav-links.open { display:flex; flex-direction:column; position:fixed; top:72px; left:0; right:0; background:rgba(3,13,6,0.98); padding:16px; gap:4px; z-index:99; border-bottom:1px solid rgba(74,124,40,0.2); }
                    .lp-mobile-toggle { display:flex; }
                    .lp-hero-btns { flex-direction:column; align-items:center; }
                    .lp-stats { gap:20px; }
                    .lp-products-grid { grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:12px; }
                    .lp-how-grid { grid-template-columns:1fr 1fr; }
                    .lp-cta-btns { flex-direction:column; align-items:center; }
                    .lp-footer-inner { flex-direction:column; text-align:center; }
                    .lp-footer-links { justify-content:center; }
                    .lp-pay-btns { flex-direction:column; }
                }
                @media (max-width: 480px) {
                    .lp-how-grid { grid-template-columns:1fr; }
                    .lp-products-grid { grid-template-columns:1fr 1fr; gap:8px; }
                }
            `}</style>

            {/* ── NAVBAR ── */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                background: scrolled ? 'rgba(3,13,6,0.97)' : 'transparent',
                backdropFilter: scrolled ? 'blur(20px)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(74,124,40,0.2)' : 'none',
                transition: 'all 0.3s ease', padding: '0 20px',
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
                    {/* Logo */}
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#4A7C28,#7ED44A)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                            <IconCoffee />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 17, color: '#7ED44A', letterSpacing: '-0.5px', lineHeight: 1 }}>CoffeeChain</div>
                            <div style={{ fontSize: 9, color: 'rgba(126,212,74,0.55)', letterSpacing: 1.2, textTransform: 'uppercase' }}>Blockchain Kopi</div>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className={`lp-nav-links${mobileMenu ? ' open' : ''}`}>
                        {[['#products', 'Produk'], ['#how', 'Cara Kerja']].map(([href, label]) => (
                            <a key={href} href={href} onClick={() => setMobileMenu(false)} style={{ color: 'rgba(232,245,224,0.7)', fontSize: 14, padding: '9px 14px', borderRadius: 8, textDecoration: 'none', display: 'block' }}>{label}</a>
                        ))}
                        <Link href="/login" className="lp-btn-primary" onClick={() => setMobileMenu(false)} style={{ padding: '9px 18px', fontSize: 13 }}>
                            <IconLock /> Masuk
                        </Link>
                    </div>

                    {/* Mobile hamburger */}
                    <button className="lp-mobile-toggle" onClick={() => setMobileMenu(m => !m)} aria-label="Menu">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            {mobileMenu ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
                        </svg>
                    </button>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', paddingTop: 68 }}>
                <div style={{ position: 'absolute', width: '70vw', maxWidth: 600, height: '70vw', maxHeight: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(74,124,40,0.1) 0%,transparent 70%)', top: '5%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />

                <div style={{ textAlign: 'center', maxWidth: 820, padding: '0 20px', position: 'relative', zIndex: 1, animation: 'fadeUp 0.6s ease' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74,124,40,0.12)', border: '1px solid rgba(74,124,40,0.3)', borderRadius: 100, padding: '6px 16px', fontSize: 11, color: '#7ED44A', letterSpacing: 1, fontWeight: 600, marginBottom: 28, textTransform: 'uppercase' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7ED44A', display: 'inline-block', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                        <IconChain /> Blockchain Transparan · On Solana
                    </div>

                    <h1 style={{ fontSize: 'clamp(36px,7vw,80px)', fontWeight: 900, lineHeight: 1.05, background: 'linear-gradient(135deg,#E8F5E0 0%,#7ED44A 50%,#F5A623 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 20, letterSpacing: '-1.5px' }}>
                        Kopi Premium<br />Langsung dari<br />Petani Nusantara
                    </h1>

                    <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: 'rgba(232,245,224,0.6)', maxWidth: 520, margin: '0 auto 36px', lineHeight: 1.7 }}>
                        Platform blockchain pertama untuk industri kopi Indonesia. Setiap biji kopi bisa dilacak dari kebun petani sampai cangkir Anda secara transparan.
                    </p>

                    <div className="lp-hero-btns">
                        <a href="#products" className="lp-btn-primary" style={{ padding: '14px 32px', fontSize: 15 }}>
                            <IconCart /> Belanja Sekarang
                        </a>
                        <a href="#how" className="lp-btn-outline" style={{ padding: '14px 32px', fontSize: 15 }}>
                            Cara Kerja <IconArrow />
                        </a>
                    </div>

                    {/* Stats */}
                    <div className="lp-stats">
                        {[
                            { icon: <IconFarmer />, label: 'Petani Bergabung', value: loading ? '–' : `${stats.farmers}+` },
                            { icon: <IconPackage />, label: 'Produk Kopi', value: loading ? '–' : `${stats.products}+` },
                            { icon: <IconTx />, label: 'Transaksi', value: loading ? '–' : `${stats.transactions}+` },
                            { icon: <IconSolana />, label: 'On-Chain Solana', value: '100%' },
                        ].map(({ icon, label, value }) => (
                            <div key={label} style={{ textAlign: 'center', minWidth: 80 }}>
                                <div style={{ color: 'rgba(126,212,74,0.4)', marginBottom: 4, display: 'flex', justifyContent: 'center' }}>{icon}</div>
                                <div style={{ fontSize: 'clamp(26px,5vw,36px)', fontWeight: 800, color: '#7ED44A', lineHeight: 1 }}>{value}</div>
                                <div style={{ fontSize: 12, color: 'rgba(232,245,224,0.45)', marginTop: 4 }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRODUCTS GRID ── */}
            <section id="products" style={{ padding: 'clamp(40px,8vw,80px) 20px', borderTop: '1px solid rgba(74,124,40,0.12)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <h2 style={{ fontSize: 'clamp(26px,5vw,40px)', fontWeight: 800, color: '#E8F5E0', marginBottom: 10, letterSpacing: '-0.5px' }}>Katalog Kopi Premium</h2>
                        <p style={{ color: 'rgba(232,245,224,0.5)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>Kopi pilihan terbaik dari petani bersertifikat blockchain di seluruh Nusantara</p>
                    </div>

                    <div className="lp-products-grid">
                        {loading && Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(74,124,40,0.1)', borderRadius: 16, height: 280 }} />
                        ))}
                        {!loading && products.length === 0 && (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: 'rgba(232,245,224,0.35)', fontSize: 14 }}>
                                <IconPackage /> Belum ada produk tersedia
                            </div>
                        )}
                        {products.map(p => (
                            <div key={p.id} className="lp-card">
                                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(74,124,40,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ED44A' }}>
                                    <IconCoffee />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: '#E8F5E0', marginBottom: 2 }}>{p.name}</div>
                                    <div style={{ fontSize: 12, color: 'rgba(232,245,224,0.45)' }}>{p.origin}{p.variety ? ` · ${p.variety}` : ''}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                    {[p.grade, p.roast].filter(Boolean).map(tag => (
                                        <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'rgba(74,124,40,0.15)', color: '#7ED44A', border: '1px solid rgba(126,212,74,0.2)', fontWeight: 600 }}>{tag}</span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#F5A623' }}><IconStar filled={s <= Math.round(p.rating || 4)} /></span>)}
                                    <span style={{ fontSize: 11, color: 'rgba(232,245,224,0.35)', marginLeft: 4 }}>{p.rating?.toFixed(1)} · {p.sold || 0} terjual</span>
                                </div>
                                <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(74,124,40,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'rgba(232,245,224,0.35)' }}>mulai dari</div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#7ED44A' }}>Rp {(p.pricePerUnit?.[0] || 0).toLocaleString('id-ID')}</div>
                                    </div>
                                    <button onClick={() => openOrder(p)} className="lp-btn-primary" style={{ padding: '9px 14px', fontSize: 12 }}>
                                        <IconCart /> Pesan
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how" style={{ padding: 'clamp(40px,8vw,80px) 20px', borderTop: '1px solid rgba(74,124,40,0.12)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px,5vw,38px)', fontWeight: 800, color: '#E8F5E0', marginBottom: 10, letterSpacing: '-0.5px' }}>Cara Kerja CoffeeChain</h2>
                    <p style={{ textAlign: 'center', color: 'rgba(232,245,224,0.45)', marginBottom: 40, fontSize: 15 }}>Transparansi dari kebun hingga cangkir Anda</p>
                    <div className="lp-how-grid">
                        {[
                            { icon: <IconSeed />, title: 'Petani Mendaftar', desc: 'Petani kopi terverifikasi bergabung dengan identitas on-chain.' },
                            { icon: <IconChain />, title: 'Transaksi Dicatat', desc: 'Setiap transaksi jual-beli direkam permanen di Solana blockchain.' },
                            { icon: <IconVerify />, title: 'Kopi Diverifikasi', desc: 'Grade, asal, dan riwayat kopi bisa dilacak transparan oleh pembeli.' },
                            { icon: <IconCart />, title: 'Anda Memesan', desc: 'Pilih kopi premium, bayar, dan lacak pengiriman Anda.' },
                        ].map(({ icon, title, desc }, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(74,124,40,0.12)', borderRadius: 14, padding: 'clamp(16px,3vw,24px)', position: 'relative' }}>
                                <div style={{ color: '#7ED44A', marginBottom: 12, display: 'flex' }}>{icon}</div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#E8F5E0', marginBottom: 6 }}>{title}</div>
                                <div style={{ fontSize: 13, color: 'rgba(232,245,224,0.45)', lineHeight: 1.6 }}>{desc}</div>
                                <div style={{ position: 'absolute', top: 14, right: 14, width: 24, height: 24, borderRadius: '50%', background: 'rgba(74,124,40,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#7ED44A' }}>{i + 1}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{ padding: 'clamp(40px,8vw,80px) 20px', textAlign: 'center', background: 'linear-gradient(180deg,transparent,rgba(74,124,40,0.05))' }}>
                <h2 style={{ fontSize: 'clamp(24px,5vw,38px)', fontWeight: 800, color: '#E8F5E0', marginBottom: 12, letterSpacing: '-0.5px' }}>
                    Bergabunglah dengan Ekosistem<br />Kopi Blockchain Indonesia
                </h2>
                <p style={{ color: 'rgba(232,245,224,0.45)', marginBottom: 32, fontSize: 15 }}>Platform transparan yang menghubungkan petani, koperasi, dan konsumen secara langsung.</p>
                <div className="lp-cta-btns">
                    <a href="#products" className="lp-btn-primary" style={{ padding: '14px 36px', fontSize: 15 }}><IconCart /> Belanja Sekarang</a>
                    <Link href="/login" className="lp-btn-outline" style={{ padding: '14px 36px', fontSize: 15 }}><IconLock /> Masuk</Link>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ padding: '32px 20px', borderTop: '1px solid rgba(74,124,40,0.12)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }} className="lp-footer-inner">
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                        <div style={{ color: '#7ED44A' }}><IconCoffee /></div>
                        <span style={{ fontWeight: 700, color: '#7ED44A', fontSize: 15 }}>CoffeeChain</span>
                    </Link>
                    <div style={{ color: 'rgba(232,245,224,0.3)', fontSize: 12 }}>© 2026 CoffeeChain · Blockchain Industri Kopi Indonesia</div>
                    <div className="lp-footer-links">
                        {[['/', 'Beranda'], ['/login', 'Masuk'], ['#products', 'Produk']].map(([href, label]) => (
                            <a key={label} href={href} style={{ color: 'rgba(232,245,224,0.4)', fontSize: 13, textDecoration: 'none' }}>{label}</a>
                        ))}
                    </div>
                </div>
            </footer>

            {/* ── ORDER MODAL ── */}
            {orderModal && selectedProduct && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => { setOrderModal(false); setOrderResult(null); }}>
                    <div style={{ background: '#0e1a0e', border: '1px solid rgba(74,124,40,0.3)', borderRadius: 18, padding: 'clamp(20px,4vw,32px)', maxWidth: 480, width: '100%', maxHeight: '92dvh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>

                        {orderResult ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><IconCheck /></div>
                                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#E8F5E0', marginBottom: 6 }}>Pesanan Berhasil!</h3>
                                <p style={{ color: 'rgba(232,245,224,0.45)', marginBottom: 20, fontSize: 13 }}>Simpan detail di bawah untuk pembayaran</p>
                                <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: 16, textAlign: 'left', fontSize: 13, marginBottom: 16 }}>
                                    {[
                                        ['ID Pesanan', orderResult.orderId],
                                        ['Produk', orderResult.productName],
                                        ['Berat × Qty', `${orderResult.weight}g × ${orderResult.quantity}`],
                                        ['Total', `Rp ${orderResult.totalPrice?.toLocaleString('id-ID')}`],
                                        ['Pembayaran', orderResult.paymentMethod === 'qr' ? 'QR Code' : orderResult.paymentMethod === 'transfer' ? 'Transfer Bank' : 'Solana'],
                                        ...(orderResult.virtualAccount ? [['Virtual Account', orderResult.virtualAccount]] : []),
                                        ['Berlaku hingga', new Date(orderResult.expiresAt).toLocaleString('id-ID')],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(74,124,40,0.1)' }}>
                                            <span style={{ color: 'rgba(232,245,224,0.45)', flexShrink: 0 }}>{k}</span>
                                            <span style={{ color: '#E8F5E0', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                                {qrDataUrl && (
                                    <div style={{ marginBottom: 16, textAlign: 'center' }}>
                                        <div style={{ fontSize: 12, color: 'rgba(232,245,224,0.45)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            <IconQr /> Scan QR untuk Pembayaran
                                        </div>
                                        <div style={{ display: 'inline-block', padding: 12, background: '#0a120a', borderRadius: 10, border: '1px solid rgba(126,212,74,0.25)' }}>
                                            <img src={qrDataUrl} alt="QR Pembayaran" style={{ width: 180, height: 180, display: 'block' }} />
                                        </div>
                                    </div>
                                )}
                                <button onClick={() => { setOrderModal(false); setOrderResult(null); setQrDataUrl(null); }} className="lp-btn-primary" style={{ width: '100%', padding: '12px', fontSize: 14, justifyContent: 'center' }}>
                                    Tutup
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#E8F5E0' }}>Pesan {selectedProduct.name}</h3>
                                    <button onClick={() => setOrderModal(false)} style={{ color: 'rgba(232,245,224,0.5)', cursor: 'pointer', background: 'none', border: 'none', padding: 4 }}><IconClose /></button>
                                </div>
                                <form onSubmit={handleOrder} className="lp-modal-grid">
                                    {[
                                        { label: 'Nama Lengkap *', key: 'buyerName', type: 'text', required: true },
                                        { label: 'Email *', key: 'buyerEmail', type: 'email', required: true },
                                        { label: 'No. HP (opsional)', key: 'buyerPhone', type: 'tel', required: false },
                                    ].map(({ label, key, type, required }) => (
                                        <div key={key}>
                                            <label style={{ fontSize: 12, color: 'rgba(232,245,224,0.55)', display: 'block', marginBottom: 5 }}>{label}</label>
                                            <input type={type} required={required} value={orderForm[key]} onChange={e => setOrderForm(f => ({ ...f, [key]: e.target.value }))}
                                                style={{ width: '100%', padding: '10px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(74,124,40,0.25)', color: '#E8F5E0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                    ))}

                                    {selectedProduct.weight?.length > 0 && (
                                        <div>
                                            <label style={{ fontSize: 12, color: 'rgba(232,245,224,0.55)', display: 'block', marginBottom: 6 }}>Ukuran Berat</label>
                                            <div className="lp-weight-btns">
                                                {selectedProduct.weight
                                                    .map((w, i) => ({ w, i, price: selectedProduct.pricePerUnit?.[i] ?? 0 }))
                                                    .filter(({ w, price }) => w >= 50 && w <= 5000 && price <= 10_000_000)
                                                    .map(({ w, i, price }) => (
                                                    <button key={w} type="button" onClick={() => setOrderForm(f => ({ ...f, weight: w }))}
                                                        style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: orderForm.weight === w ? 'rgba(126,212,74,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${orderForm.weight === w ? 'rgba(126,212,74,0.5)' : 'rgba(74,124,40,0.2)'}`, color: orderForm.weight === w ? '#7ED44A' : 'rgba(232,245,224,0.6)' }}>
                                                        {w}g<br /><span style={{ fontSize: 10, opacity: 0.7 }}>Rp {price?.toLocaleString('id-ID')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ fontSize: 12, color: 'rgba(232,245,224,0.55)', display: 'block', marginBottom: 5 }}>Jumlah</label>
                                        <input type="number" min={1} max={50} value={orderForm.quantity} onChange={e => setOrderForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                                            style={{ width: '100%', padding: '10px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(74,124,40,0.25)', color: '#E8F5E0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: 12, color: 'rgba(232,245,224,0.55)', display: 'block', marginBottom: 6 }}>Metode Pembayaran</label>
                                        <div className="lp-pay-btns">
                                            {[['transfer', <IconBank />, 'Transfer Bank'], ['qr', <IconQr />, 'QR Code'], ['solana', <IconSolana />, 'Solana']].map(([v, icon, l]) => (
                                                <button key={v} type="button" onClick={() => setOrderForm(f => ({ ...f, paymentMethod: v }))}
                                                    style={{ flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: orderForm.paymentMethod === v ? 'rgba(126,212,74,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${orderForm.paymentMethod === v ? 'rgba(126,212,74,0.5)' : 'rgba(74,124,40,0.2)'}`, color: orderForm.paymentMethod === v ? '#7ED44A' : 'rgba(232,245,224,0.55)' }}>
                                                    {icon} {l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 9, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 13, color: 'rgba(232,245,224,0.55)' }}>Total Pembayaran</span>
                                        <span style={{ fontSize: 18, fontWeight: 700, color: '#7ED44A' }}>Rp {totalPrice.toLocaleString('id-ID')}</span>
                                    </div>

                                    <button type="submit" disabled={ordering} className="lp-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 14, opacity: ordering ? 0.7 : 1 }}>
                                        {ordering ? 'Memproses...' : <><IconCheck />Konfirmasi Pesanan</>}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
