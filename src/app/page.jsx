'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
    const [products, setProducts] = useState([]);
    const [market, setMarket] = useState([]);
    const [stats, setStats] = useState({ farmers: 0, transactions: 0, products: 0 });
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [orderModal, setOrderModal] = useState(false);
    const [orderForm, setOrderForm] = useState({ buyerName: '', buyerEmail: '', buyerPhone: '', quantity: 1, weight: '', paymentMethod: 'transfer' });
    const [orderResult, setOrderResult] = useState(null);
    const [ordering, setOrdering] = useState(false);
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        async function load() {
            try {
                const [prodRes, mktRes, farmerRes, txRes] = await Promise.all([
                    fetch('/api/public/products?limit=8'),
                    fetch('/api/public/market'),
                    fetch('/api/farmers'),
                    fetch('/api/transactions'),
                ]);
                const prodData = await prodRes.json();
                const mktData = await mktRes.json();
                const farmerData = await farmerRes.json();
                const txData = await txRes.json();
                if (prodData.success) setProducts(prodData.data);
                if (mktData.success) setMarket(mktData.data.slice(0, 5));
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
            } else {
                alert(data.message || 'Gagal membuat pesanan');
            }
        } catch {
            alert('Terjadi kesalahan. Coba lagi.');
        }
        setOrdering(false);
    }

    function openOrder(product) {
        setSelectedProduct(product);
        setOrderForm({ buyerName: '', buyerEmail: '', buyerPhone: '', quantity: 1, weight: product.weight?.[0] || '', paymentMethod: 'transfer' });
        setOrderResult(null);
        setOrderModal(true);
    }

    const weightIdx = selectedProduct && orderForm.weight
        ? (selectedProduct.weight?.indexOf(orderForm.weight) ?? 0)
        : 0;
    const unitPrice = selectedProduct?.pricePerUnit?.[weightIdx] ?? 0;
    const totalPrice = unitPrice * orderForm.quantity;

    return (
        <div style={{ background: '#030d06', minHeight: '100vh', color: '#E8F5E0', fontFamily: "'Inter', sans-serif" }}>

            {/* ── NAVBAR ── */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                background: scrolled ? 'rgba(3,13,6,0.97)' : 'transparent',
                backdropFilter: scrolled ? 'blur(20px)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(74,124,40,0.2)' : 'none',
                transition: 'all 0.3s ease',
                padding: '0 24px',
            }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 10,
                            background: 'linear-gradient(135deg,#4A7C28,#7ED44A)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 20,
                        }}>☕</div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 18, color: '#7ED44A', letterSpacing: '-0.5px' }}>CoffeeChain</div>
                            <div style={{ fontSize: 10, color: 'rgba(126,212,74,0.6)', letterSpacing: 1 }}>BLOCKCHAIN KOPI</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <a href="#products" style={{ color: 'rgba(232,245,224,0.7)', fontSize: 14, padding: '8px 16px', borderRadius: 8, transition: 'color 0.2s' }}>Produk</a>
                        <a href="#market" style={{ color: 'rgba(232,245,224,0.7)', fontSize: 14, padding: '8px 16px', borderRadius: 8 }}>Harga Pasar</a>
                        <a href="#api" style={{ color: 'rgba(232,245,224,0.7)', fontSize: 14, padding: '8px 16px', borderRadius: 8 }}>API</a>
                        <Link href="/login" style={{
                            background: 'linear-gradient(135deg,#4A7C28,#7ED44A)',
                            color: '#fff', fontWeight: 700, fontSize: 13,
                            padding: '9px 20px', borderRadius: 8, letterSpacing: 0.3,
                        }}>
                            🔐 Admin Login
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden', paddingTop: 72,
            }}>
                {/* Background glow */}
                <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(74,124,40,0.12) 0%,transparent 70%)', top: '10%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }} />

                <div style={{ textAlign: 'center', maxWidth: 800, padding: '0 24px', position: 'relative', zIndex: 1 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'rgba(74,124,40,0.12)', border: '1px solid rgba(74,124,40,0.3)',
                        borderRadius: 100, padding: '6px 16px', fontSize: 12, color: '#7ED44A',
                        letterSpacing: 1, fontWeight: 600, marginBottom: 32, textTransform: 'uppercase',
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7ED44A', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                        Blockchain Transparan ⛓️ On Solana
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(40px,7vw,88px)', fontWeight: 900, lineHeight: 1.05,
                        background: 'linear-gradient(135deg,#E8F5E0 0%,#7ED44A 50%,#F5A623 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text', marginBottom: 24,
                        letterSpacing: '-2px',
                    }}>
                        Kopi Premium<br />Langsung dari<br />Petani Nusantara
                    </h1>

                    <p style={{ fontSize: 18, color: 'rgba(232,245,224,0.65)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
                        Platform blockchain pertama untuk industri kopi Indonesia. Setiap biji kopi bisa dilacak — dari kebun petani sampai cangkir Anda — secara transparan dan adil.
                    </p>

                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="#products" style={{
                            background: 'linear-gradient(135deg,#4A7C28,#7ED44A)',
                            color: '#fff', fontWeight: 700, fontSize: 16,
                            padding: '16px 36px', borderRadius: 12, letterSpacing: 0.3,
                            display: 'inline-block',
                        }}>☕ Belanja Sekarang</a>
                        <a href="#how" style={{
                            border: '1px solid rgba(126,212,74,0.35)', color: '#7ED44A',
                            fontWeight: 600, fontSize: 16, padding: '16px 36px', borderRadius: 12,
                            display: 'inline-block',
                        }}>Pelajari Cara Kerja →</a>
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 72, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Petani Bergabung', value: loading ? '...' : `${stats.farmers}+` },
                            { label: 'Produk Kopi', value: loading ? '...' : `${stats.products}+` },
                            { label: 'Transaksi Tercatat', value: loading ? '...' : `${stats.transactions}+` },
                            { label: 'On-Chain Solana', value: '100%' },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 36, fontWeight: 800, color: '#7ED44A', lineHeight: 1 }}>{value}</div>
                                <div style={{ fontSize: 13, color: 'rgba(232,245,224,0.5)', marginTop: 4 }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── MARKET TICKER ── */}
            <section id="market" style={{ padding: '60px 24px', borderTop: '1px solid rgba(74,124,40,0.15)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7ED44A', animation: 'pulse 1.5s infinite' }} />
                        <span style={{ fontSize: 13, color: '#7ED44A', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Harga Pasar Live</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                        {market.length === 0 && !loading && (
                            <div style={{ color: 'rgba(232,245,224,0.4)', fontSize: 14 }}>Data pasar tidak tersedia</div>
                        )}
                        {market.map(item => (
                            <div key={item.id} style={{
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(74,124,40,0.2)',
                                borderRadius: 12, padding: '20px 20px', position: 'relative', overflow: 'hidden',
                            }}>
                                <div style={{ fontSize: 12, color: 'rgba(232,245,224,0.5)', marginBottom: 4 }}>{item.name || item.id}</div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#E8F5E0', marginBottom: 2 }}>
                                    Rp {(item.price || 0).toLocaleString('id-ID')}
                                </div>
                                <div style={{ fontSize: 12, color: (item.change ?? 0) >= 0 ? '#4CAF50' : '#f44336', fontWeight: 600 }}>
                                    {(item.change ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(item.change ?? 0)}%
                                </div>
                                <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 22, opacity: 0.15 }}>☕</div>
                            </div>
                        ))}
                        {loading && Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(74,124,40,0.1)', borderRadius: 12, padding: 20, height: 88 }} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRODUCTS GRID ── */}
            <section id="products" style={{ padding: '80px 24px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 56 }}>
                        <h2 style={{ fontSize: 44, fontWeight: 800, color: '#E8F5E0', marginBottom: 12, letterSpacing: '-1px' }}>
                            Katalog Kopi Premium
                        </h2>
                        <p style={{ color: 'rgba(232,245,224,0.55)', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
                            Kopi pilihan terbaik dari petani bersertifikat blockchain di seluruh Nusantara
                        </p>
                    </div>

                    {loading && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(74,124,40,0.1)', borderRadius: 16, height: 320 }} />
                            ))}
                        </div>
                    )}

                    {!loading && products.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(232,245,224,0.4)' }}>
                            Belum ada produk tersedia. Hubungi admin untuk menambahkan produk.
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
                        {products.map(p => (
                            <div key={p.id} style={{
                                background: 'linear-gradient(145deg,rgba(22,30,22,0.9),rgba(12,18,12,0.9))',
                                border: '1px solid rgba(74,124,40,0.2)', borderRadius: 16, padding: 24,
                                transition: 'transform 0.2s, border-color 0.2s',
                                cursor: 'default',
                                display: 'flex', flexDirection: 'column', gap: 12,
                            }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(126,212,74,0.4)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(74,124,40,0.2)'; }}
                            >
                                <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 4 }}>{p.image || '☕'}</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: '#E8F5E0', marginBottom: 2 }}>{p.name}</div>
                                    <div style={{ fontSize: 13, color: 'rgba(232,245,224,0.5)' }}>{p.origin} · {p.variety}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {[p.grade, p.roast].filter(Boolean).map(tag => (
                                        <span key={tag} style={{
                                            fontSize: 11, padding: '3px 10px', borderRadius: 100,
                                            background: 'rgba(74,124,40,0.15)', color: '#7ED44A',
                                            border: '1px solid rgba(126,212,74,0.2)', fontWeight: 600,
                                        }}>{tag}</span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: '#F5A623', fontSize: 13 }}>{'★'.repeat(Math.round(p.rating || 4))}</span>
                                    <span style={{ color: 'rgba(232,245,224,0.4)', fontSize: 12 }}>{p.rating?.toFixed(1)} · {p.sold || 0} terjual</span>
                                </div>
                                {p.weight?.length > 0 && (
                                    <div style={{ fontSize: 13, color: 'rgba(232,245,224,0.5)' }}>
                                        Tersedia: {p.weight.join(', ')} gram
                                    </div>
                                )}
                                <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(74,124,40,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'rgba(232,245,224,0.4)' }}>mulai dari</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#7ED44A' }}>
                                            Rp {(p.pricePerUnit?.[0] || 0).toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                    <button onClick={() => openOrder(p)} style={{
                                        background: 'linear-gradient(135deg,#4A7C28,#7ED44A)',
                                        color: '#fff', fontWeight: 700, fontSize: 13,
                                        padding: '10px 18px', borderRadius: 10, cursor: 'pointer', border: 'none',
                                    }}>Pesan →</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how" style={{ padding: '80px 24px', borderTop: '1px solid rgba(74,124,40,0.15)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', fontSize: 40, fontWeight: 800, color: '#E8F5E0', marginBottom: 16, letterSpacing: '-1px' }}>
                        Cara Kerja CoffeeChain
                    </h2>
                    <p style={{ textAlign: 'center', color: 'rgba(232,245,224,0.5)', marginBottom: 56, fontSize: 16 }}>
                        Transparansi dari kebun hingga cangkir Anda
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
                        {[
                            { icon: '🌱', title: 'Petani Mendaftar', desc: 'Petani kopi terverifikasi bergabung ke platform dengan identitas on-chain.' },
                            { icon: '⛓️', title: 'Transaksi Dicatat', desc: 'Setiap transaksi jual-beli kopi direkam permanen di Solana blockchain.' },
                            { icon: '☕', title: 'Kopi Diverifikasi', desc: 'Grade, asal, dan riwayat kopi bisa dilacak transparan oleh pembeli.' },
                            { icon: '🛒', title: 'Anda Memesan', desc: 'Pilih kopi premium, lakukan pembayaran, dan lacak pengiriman Anda.' },
                        ].map(({ icon, title, desc }, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(74,124,40,0.15)',
                                borderRadius: 16, padding: 28, position: 'relative',
                            }}>
                                <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
                                <div style={{ fontWeight: 700, fontSize: 16, color: '#E8F5E0', marginBottom: 8 }}>{title}</div>
                                <div style={{ fontSize: 14, color: 'rgba(232,245,224,0.5)', lineHeight: 1.6 }}>{desc}</div>
                                <div style={{
                                    position: 'absolute', top: 20, right: 20,
                                    width: 28, height: 28, borderRadius: '50%', background: 'rgba(74,124,40,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 700, color: '#7ED44A',
                                }}>{i + 1}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PUBLIC API SECTION ── */}
            <section id="api" style={{ padding: '80px 24px', borderTop: '1px solid rgba(74,124,40,0.15)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 40, fontWeight: 800, color: '#E8F5E0', marginBottom: 12, letterSpacing: '-1px' }}>
                        Integrasi API
                    </h2>
                    <p style={{ color: 'rgba(232,245,224,0.5)', marginBottom: 48, fontSize: 16, maxWidth: 560 }}>
                        Sambungkan aplikasi Anda ke ekosistem CoffeeChain menggunakan REST API publik kami. Gratis, tanpa autentikasi.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { method: 'GET', path: '/api/public/products', desc: 'Ambil katalog produk kopi. Param: limit, search, grade' },
                            { method: 'GET', path: '/api/public/market', desc: 'Ambil data harga pasar kopi real-time' },
                            { method: 'POST', path: '/api/public/order', desc: 'Buat pesanan baru. Body: productId, buyerName, buyerEmail, weight, quantity, paymentMethod' },
                            { method: 'GET', path: '/api/public/order/{orderId}', desc: 'Cek status pesanan berdasarkan orderId' },
                        ].map(({ method, path, desc }) => (
                            <div key={path} style={{
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(74,124,40,0.2)', borderRadius: 12,
                                padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
                            }}>
                                <span style={{
                                    background: method === 'GET' ? 'rgba(0,212,255,0.1)' : 'rgba(245,166,35,0.1)',
                                    color: method === 'GET' ? '#00D4FF' : '#F5A623',
                                    border: `1px solid ${method === 'GET' ? 'rgba(0,212,255,0.3)' : 'rgba(245,166,35,0.3)'}`,
                                    fontWeight: 700, fontSize: 11, padding: '4px 12px', borderRadius: 6,
                                    letterSpacing: 1, minWidth: 52, textAlign: 'center',
                                }}>{method}</span>
                                <code style={{ flex: 1, color: '#7ED44A', fontSize: 14, fontFamily: 'monospace' }}>{path}</code>
                                <span style={{ color: 'rgba(232,245,224,0.5)', fontSize: 13 }}>{desc}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{
                        marginTop: 32, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(74,124,40,0.2)',
                        borderRadius: 12, padding: 24,
                    }}>
                        <div style={{ fontSize: 13, color: '#7ED44A', marginBottom: 12, fontWeight: 600 }}>📋 Contoh Request</div>
                        <pre style={{ color: 'rgba(232,245,224,0.8)', fontSize: 13, fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.7 }}>{`# Ambil daftar produk
curl https://coffee-blockchain.pages.dev/api/public/products

# Buat pesanan
curl -X POST https://coffee-blockchain.pages.dev/api/public/order \\
  -H "Content-Type: application/json" \\
  -d '{
    "productId": "prod-abc123",
    "buyerName": "Budi Santoso",
    "buyerEmail": "budi@example.com",
    "weight": 250,
    "quantity": 2,
    "paymentMethod": "transfer"
  }'`}</pre>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{
                padding: '80px 24px', textAlign: 'center',
                background: 'linear-gradient(180deg,transparent,rgba(74,124,40,0.06))',
            }}>
                <h2 style={{ fontSize: 40, fontWeight: 800, color: '#E8F5E0', marginBottom: 16, letterSpacing: '-1px' }}>
                    Bergabunglah dengan Ekosistem<br />Kopi Blockchain Indonesia
                </h2>
                <p style={{ color: 'rgba(232,245,224,0.5)', marginBottom: 36, fontSize: 16 }}>
                    Platform transparan yang menghubungkan petani, koperasi, dan konsumen secara langsung.
                </p>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <a href="#products" style={{
                        background: 'linear-gradient(135deg,#4A7C28,#7ED44A)',
                        color: '#fff', fontWeight: 700, fontSize: 16,
                        padding: '16px 40px', borderRadius: 12, display: 'inline-block',
                    }}>☕ Belanja Kopi Sekarang</a>
                    <Link href="/login" style={{
                        border: '1px solid rgba(126,212,74,0.35)', color: '#7ED44A',
                        fontWeight: 600, fontSize: 16, padding: '16px 40px', borderRadius: 12,
                        display: 'inline-block',
                    }}>🔐 Login Admin</Link>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ padding: '40px 24px', borderTop: '1px solid rgba(74,124,40,0.15)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 22 }}>☕</span>
                        <span style={{ fontWeight: 700, color: '#7ED44A' }}>CoffeeChain</span>
                    </div>
                    <div style={{ color: 'rgba(232,245,224,0.35)', fontSize: 13 }}>
                        © 2026 CoffeeChain · Blockchain Industri Kopi Indonesia · On Solana
                    </div>
                    <div style={{ display: 'flex', gap: 24 }}>
                        <Link href="/login" style={{ color: 'rgba(232,245,224,0.5)', fontSize: 13 }}>Admin Login</Link>
                        <a href="#api" style={{ color: 'rgba(232,245,224,0.5)', fontSize: 13 }}>API Docs</a>
                        <a href="#products" style={{ color: 'rgba(232,245,224,0.5)', fontSize: 13 }}>Produk</a>
                    </div>
                </div>
            </footer>

            {/* ── ORDER MODAL ── */}
            {orderModal && selectedProduct && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 24,
                }} onClick={() => { setOrderModal(false); setOrderResult(null); }}>
                    <div style={{
                        background: '#111811', border: '1px solid rgba(74,124,40,0.3)',
                        borderRadius: 20, padding: 36, maxWidth: 500, width: '100%',
                        maxHeight: '90vh', overflowY: 'auto',
                    }} onClick={e => e.stopPropagation()}>

                        {orderResult ? (
                            /* SUCCESS STATE */
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#E8F5E0', marginBottom: 8 }}>Pesanan Berhasil Dibuat!</h3>
                                <p style={{ color: 'rgba(232,245,224,0.5)', marginBottom: 24, fontSize: 14 }}>Simpan detail di bawah untuk melakukan pembayaran</p>

                                <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 20, textAlign: 'left', fontSize: 14, marginBottom: 24 }}>
                                    {[
                                        ['ID Pesanan', orderResult.orderId],
                                        ['Produk', orderResult.productName],
                                        ['Berat', `${orderResult.weight}g × ${orderResult.quantity}`],
                                        ['Total', `Rp ${orderResult.totalPrice.toLocaleString('id-ID')}`],
                                        ['Pembayaran', orderResult.paymentMethod],
                                        ...(orderResult.virtualAccount ? [['Virtual Account', orderResult.virtualAccount]] : []),
                                        ['Berlaku hingga', new Date(orderResult.expiresAt).toLocaleString('id-ID')],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(74,124,40,0.1)' }}>
                                            <span style={{ color: 'rgba(232,245,224,0.5)' }}>{k}</span>
                                            <span style={{ color: '#E8F5E0', fontWeight: 600 }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => { setOrderModal(false); setOrderResult(null); }} style={{
                                    background: 'linear-gradient(135deg,#4A7C28,#7ED44A)',
                                    color: '#fff', fontWeight: 700, fontSize: 14,
                                    padding: '12px 32px', borderRadius: 10, cursor: 'pointer', border: 'none', width: '100%',
                                }}>Tutup</button>
                            </div>
                        ) : (
                            /* FORM STATE */
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#E8F5E0' }}>Pesan {selectedProduct.name}</h3>
                                    <button onClick={() => setOrderModal(false)} style={{ color: 'rgba(232,245,224,0.5)', fontSize: 20, cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>
                                </div>

                                <form onSubmit={handleOrder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {[
                                        { label: 'Nama Lengkap *', key: 'buyerName', type: 'text', required: true },
                                        { label: 'Email *', key: 'buyerEmail', type: 'email', required: true },
                                        { label: 'No. HP (opsional)', key: 'buyerPhone', type: 'tel', required: false },
                                    ].map(({ label, key, type, required }) => (
                                        <div key={key}>
                                            <label style={{ fontSize: 13, color: 'rgba(232,245,224,0.6)', display: 'block', marginBottom: 6 }}>{label}</label>
                                            <input
                                                type={type} required={required}
                                                value={orderForm[key]}
                                                onChange={e => setOrderForm(f => ({ ...f, [key]: e.target.value }))}
                                                style={{
                                                    width: '100%', padding: '11px 14px', borderRadius: 10,
                                                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(74,124,40,0.25)',
                                                    color: '#E8F5E0', fontSize: 14, outline: 'none',
                                                }}
                                            />
                                        </div>
                                    ))}

                                    {selectedProduct.weight?.length > 0 && (
                                        <div>
                                            <label style={{ fontSize: 13, color: 'rgba(232,245,224,0.6)', display: 'block', marginBottom: 6 }}>Ukuran Berat</label>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {selectedProduct.weight.map((w, i) => (
                                                    <button key={w} type="button"
                                                        onClick={() => setOrderForm(f => ({ ...f, weight: w }))}
                                                        style={{
                                                            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                            background: orderForm.weight === w ? 'rgba(126,212,74,0.2)' : 'rgba(255,255,255,0.04)',
                                                            border: `1px solid ${orderForm.weight === w ? 'rgba(126,212,74,0.5)' : 'rgba(74,124,40,0.2)'}`,
                                                            color: orderForm.weight === w ? '#7ED44A' : 'rgba(232,245,224,0.6)',
                                                        }}>
                                                        {w}g<br />
                                                        <span style={{ fontSize: 11, opacity: 0.7 }}>Rp {selectedProduct.pricePerUnit?.[i]?.toLocaleString('id-ID')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ fontSize: 13, color: 'rgba(232,245,224,0.6)', display: 'block', marginBottom: 6 }}>Jumlah</label>
                                        <input type="number" min={1} max={50}
                                            value={orderForm.quantity}
                                            onChange={e => setOrderForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                                            style={{
                                                width: '100%', padding: '11px 14px', borderRadius: 10,
                                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(74,124,40,0.25)',
                                                color: '#E8F5E0', fontSize: 14, outline: 'none',
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: 13, color: 'rgba(232,245,224,0.6)', display: 'block', marginBottom: 6 }}>Metode Pembayaran</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {[['transfer', '🏦 Transfer Bank'], ['solana', '⚡ Solana']].map(([v, l]) => (
                                                <button key={v} type="button"
                                                    onClick={() => setOrderForm(f => ({ ...f, paymentMethod: v }))}
                                                    style={{
                                                        flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                        background: orderForm.paymentMethod === v ? 'rgba(126,212,74,0.15)' : 'rgba(255,255,255,0.04)',
                                                        border: `1px solid ${orderForm.paymentMethod === v ? 'rgba(126,212,74,0.5)' : 'rgba(74,124,40,0.2)'}`,
                                                        color: orderForm.paymentMethod === v ? '#7ED44A' : 'rgba(232,245,224,0.6)',
                                                    }}>{l}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{
                                        background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 14,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <span style={{ fontSize: 14, color: 'rgba(232,245,224,0.6)' }}>Total Pembayaran</span>
                                        <span style={{ fontSize: 20, fontWeight: 700, color: '#7ED44A' }}>Rp {totalPrice.toLocaleString('id-ID')}</span>
                                    </div>

                                    <button type="submit" disabled={ordering} style={{
                                        background: 'linear-gradient(135deg,#4A7C28,#7ED44A)',
                                        color: '#fff', fontWeight: 700, fontSize: 15,
                                        padding: '14px', borderRadius: 10, cursor: ordering ? 'not-allowed' : 'pointer',
                                        border: 'none', opacity: ordering ? 0.7 : 1,
                                    }}>
                                        {ordering ? 'Memproses...' : '✅ Konfirmasi Pesanan'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
