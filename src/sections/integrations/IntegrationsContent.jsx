'use client';
import { useState } from 'react';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

const ENDPOINTS = [
    {
        category: 'Produk',
        icon: '☕',
        items: [
            {
                id: 'get-products',
                method: 'GET',
                path: '/api/public/products',
                title: 'Daftar Produk Kopi',
                desc: 'Ambil semua produk kopi yang tersedia. Bisa difilter berdasarkan nama, asal, atau grade.',
                params: [
                    { name: 'limit', type: 'number', default: '50', desc: 'Jumlah maksimal produk' },
                    { name: 'search', type: 'string', default: '', desc: 'Cari berdasarkan nama/asal/varietas' },
                    { name: 'grade', type: 'string', default: '', desc: 'Filter berdasarkan grade (A, B, C)' },
                ],
                body: null,
                example: `curl "{BASE_URL}/api/public/products?limit=10&search=arabika"`,
                isPublic: true,
            },
        ]
    },
    {
        category: 'Pasar',
        icon: '📈',
        items: [
            {
                id: 'get-market',
                method: 'GET',
                path: '/api/public/market',
                title: 'Harga Pasar Kopi',
                desc: 'Ambil data harga pasar komoditas kopi terkini secara real-time.',
                params: [],
                body: null,
                example: `curl "{BASE_URL}/api/public/market"`,
                isPublic: true,
            },
        ]
    },
    {
        category: 'Pesanan',
        icon: '🛒',
        items: [
            {
                id: 'post-order',
                method: 'POST',
                path: '/api/public/order',
                title: 'Buat Pesanan Baru',
                desc: 'Buat pesanan kopi baru dari aplikasi eksternal. Mengembalikan orderId dan informasi pembayaran.',
                params: [],
                body: { productId: 'prod-xxxx', buyerName: 'Nama Pembeli', buyerEmail: 'email@example.com', buyerPhone: '081234567890', weight: 250, quantity: 2, paymentMethod: 'transfer' },
                example: `curl -X POST "{BASE_URL}/api/public/order" \\\n  -H "Content-Type: application/json" \\\n  -d '{"productId":"prod-xxxx","buyerName":"Budi","buyerEmail":"budi@mail.com","weight":250,"quantity":1,"paymentMethod":"transfer"}'`,
                isPublic: true,
            },
            {
                id: 'get-order-status',
                method: 'GET',
                path: '/api/public/order/{orderId}',
                title: 'Cek Status Pesanan',
                desc: 'Cek status pesanan berdasarkan orderId yang diterima saat membuat pesanan.',
                params: [{ name: 'orderId', type: 'path', default: '', desc: 'ID pesanan, contoh: ORD-ABC123' }],
                body: null,
                example: `curl "{BASE_URL}/api/public/order/ORD-ABC123"`,
                isPublic: true,
            },
        ]
    },
    {
        category: 'Internal',
        icon: '🔐',
        items: [
            {
                id: 'get-farmers',
                method: 'GET',
                path: '/api/farmers',
                title: 'Data Petani',
                desc: 'Ambil semua data petani. Memerlukan sesi login.',
                params: [],
                body: null,
                example: `curl "{BASE_URL}/api/farmers" \\\n  -H "Cookie: token=JWT_TOKEN"`,
                isPublic: false,
            },
            {
                id: 'get-transactions',
                method: 'GET',
                path: '/api/transactions',
                title: 'Riwayat Transaksi',
                desc: 'Ambil riwayat transaksi blockchain. Memerlukan sesi login.',
                params: [],
                body: null,
                example: `curl "{BASE_URL}/api/transactions" \\\n  -H "Cookie: token=JWT_TOKEN"`,
                isPublic: false,
            },
            {
                id: 'get-orders',
                method: 'GET',
                path: '/api/orders',
                title: 'Semua Pesanan',
                desc: 'Ambil semua pesanan. Filter berdasarkan userId. Memerlukan sesi login.',
                params: [{ name: 'userId', type: 'string', default: '', desc: 'Filter berdasarkan user ID' }],
                body: null,
                example: `curl "{BASE_URL}/api/orders?userId=user-123" \\\n  -H "Cookie: token=JWT_TOKEN"`,
                isPublic: false,
            },
        ]
    },
];

const METHOD_STYLE = {
    GET: { bg: 'rgba(0,212,255,0.12)', color: '#00D4FF', border: 'rgba(0,212,255,0.3)' },
    POST: { bg: 'rgba(245,166,35,0.12)', color: '#F5A623', border: 'rgba(245,166,35,0.3)' },
};

function MethodBadge({ method }) {
    const s = METHOD_STYLE[method] || METHOD_STYLE.GET;
    return (
        <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 6, letterSpacing: 1 }}>
            {method}
        </span>
    );
}

export default function IntegrationsContent() {
    const [activeId, setActiveId] = useState('get-products');
    const [testResult, setTestResult] = useState(null);
    const [testing, setTesting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [bodyInput, setBodyInput] = useState('');

    const allItems = ENDPOINTS.flatMap(c => c.items);
    const active = allItems.find(e => e.id === activeId) || allItems[0];

    const resolvedExample = active?.example?.replace(/{BASE_URL}/g, BASE_URL || 'https://your-domain.pages.dev') || '';

    async function runTest() {
        setTesting(true);
        setTestResult(null);
        try {
            let path = active.path.replace('{orderId}', 'ORD-TEST');
            const opts = { method: active.method };
            if (active.method === 'POST' && bodyInput) {
                opts.headers = { 'Content-Type': 'application/json' };
                opts.body = bodyInput;
            }
            const t0 = Date.now();
            const res = await fetch(path, opts);
            const ms = Date.now() - t0;
            let data;
            try { data = await res.json(); } catch { data = await res.text(); }
            setTestResult({ status: res.status, ms, data });
        } catch (e) {
            setTestResult({ error: e.message });
        }
        setTesting(false);
    }

    function selectEndpoint(id, item) {
        setActiveId(id);
        setTestResult(null);
        setBodyInput(item.body ? JSON.stringify(item.body, null, 2) : '');
    }

    function copyExample() {
        navigator.clipboard.writeText(resolvedExample);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - var(--header-height))', overflow: 'hidden' }}>

            {/* ── SIDEBAR LIST ── */}
            <aside style={{
                width: 240, flexShrink: 0, background: 'var(--color-bg-surface)',
                borderRight: '1px solid var(--color-border)', overflowY: 'auto', padding: '20px 0',
            }}>
                <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--color-border)', marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text)' }}>🔌 REST API</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>CoffeeChain API v1</div>
                </div>
                {ENDPOINTS.map(cat => (
                    <div key={cat.category} style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', padding: '8px 16px 4px', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                            {cat.icon} {cat.category}
                        </div>
                        {cat.items.map(item => (
                            <button key={item.id}
                                onClick={() => selectEndpoint(item.id, item)}
                                style={{
                                    width: '100%', textAlign: 'left', padding: '9px 16px',
                                    display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: 'none',
                                    background: activeId === item.id ? 'rgba(74,124,40,0.15)' : 'transparent',
                                    borderLeft: `3px solid ${activeId === item.id ? 'var(--color-primary-light)' : 'transparent'}`,
                                    transition: 'all 0.15s',
                                }}>
                                <MethodBadge method={item.method} />
                                <span style={{
                                    fontSize: 12, color: activeId === item.id ? 'var(--color-text)' : 'var(--color-text-secondary)',
                                    fontWeight: activeId === item.id ? 600 : 400,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{item.title}</span>
                            </button>
                        ))}
                    </div>
                ))}
            </aside>

            {/* ── MAIN PANEL ── */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
                {active && (
                    <>
                        {/* Header endpoint */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <MethodBadge method={active.method} />
                                <code style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace' }}>{active.path}</code>
                                {active.isPublic
                                    ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(76,175,80,0.1)', color: '#4CAF50', border: '1px solid rgba(76,175,80,0.3)' }}>Publik</span>
                                    : <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(245,166,35,0.1)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.3)' }}>Auth Required</span>
                                }
                            </div>
                            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>{active.title}</h1>
                            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{active.desc}</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
                            {/* LEFT */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                                {/* Parameters */}
                                {active.params?.length > 0 && (
                                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)', marginBottom: 12 }}>Parameters</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead>
                                                <tr>{['Nama', 'Tipe', 'Deskripsi'].map(h => (
                                                    <th key={h} style={{ textAlign: 'left', padding: '5px 8px', color: 'var(--color-text-muted)', fontWeight: 600, borderBottom: '1px solid var(--color-border)', fontSize: 12 }}>{h}</th>
                                                ))}</tr>
                                            </thead>
                                            <tbody>
                                                {active.params.map(p => (
                                                    <tr key={p.name}>
                                                        <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--color-border)' }}><code style={{ color: 'var(--color-primary-light)', fontSize: 12 }}>{p.name}</code></td>
                                                        <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: 12 }}>{p.type}</td>
                                                        <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 12 }}>{p.desc}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Request Body */}
                                {active.method === 'POST' && (
                                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)', marginBottom: 10 }}>Request Body (JSON)</div>
                                        <textarea value={bodyInput || JSON.stringify(active.body, null, 2)} onChange={e => setBodyInput(e.target.value)} rows={9}
                                            style={{ width: '100%', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, background: 'rgba(0,0,0,0.25)', border: '1px solid var(--color-border)', color: 'var(--color-text)', resize: 'vertical', outline: 'none', lineHeight: 1.6 }} />
                                    </div>
                                )}

                                {/* cURL Example */}
                                <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>📋 Contoh cURL</div>
                                        <button onClick={copyExample} style={{ fontSize: 12, color: 'var(--color-primary-light)', cursor: 'pointer', background: 'rgba(74,124,40,0.1)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>
                                            {copied ? '✓ Disalin!' : 'Salin'}
                                        </button>
                                    </div>
                                    <pre style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--color-primary-light)', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                        {resolvedExample}
                                    </pre>
                                </div>
                            </div>

                            {/* RIGHT — API Tester */}
                            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 18 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)', marginBottom: 14 }}>⚡ API Tester</div>

                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                                    <code style={{ color: 'var(--color-primary-light)' }}>{active.method} {active.path}</code>
                                </div>

                                <button onClick={runTest} disabled={testing} style={{
                                    width: '100%', padding: '11px', borderRadius: 8, cursor: testing ? 'not-allowed' : 'pointer',
                                    background: testing ? 'rgba(74,124,40,0.3)' : 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))',
                                    color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', marginBottom: 14, transition: 'all 0.2s',
                                }}>
                                    {testing ? '⏳ Mengirim...' : '▶ Jalankan Request'}
                                </button>

                                {testResult ? (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <span style={{
                                                fontWeight: 700, fontSize: 12, padding: '2px 8px', borderRadius: 6,
                                                background: testResult.error ? 'rgba(244,67,54,0.15)' : testResult.status < 300 ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
                                                color: testResult.error ? '#f44336' : testResult.status < 300 ? '#4CAF50' : '#FF9800',
                                                border: `1px solid ${testResult.error ? 'rgba(244,67,54,0.3)' : testResult.status < 300 ? 'rgba(76,175,80,0.3)' : 'rgba(255,152,0,0.3)'}`,
                                            }}>
                                                {testResult.error ? 'ERROR' : `${testResult.status} ${testResult.status < 300 ? 'OK' : 'ERROR'}`}
                                            </span>
                                            {testResult.ms && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{testResult.ms}ms</span>}
                                        </div>
                                        <pre style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 12, fontSize: 12, color: testResult.error ? '#f44336' : 'var(--color-text)', fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.6, margin: 0, maxHeight: 360, overflowY: 'auto' }}>
                                            {testResult.error || JSON.stringify(testResult.data, null, 2)}
                                        </pre>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                                        Klik "Jalankan Request" untuk melihat respons
                                    </div>
                                )}

                                <div style={{ marginTop: 16, padding: 12, background: 'rgba(74,124,40,0.05)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary-light)', marginBottom: 4 }}>📡 Base URL</div>
                                    <code style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                        {BASE_URL || 'https://your-domain.pages.dev'}
                                    </code>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, lineHeight: 1.5 }}>
                                        Endpoint <code style={{ color: 'var(--color-primary-light)' }}>/api/public/*</code> bebas CORS. Endpoint internal memerlukan sesi login.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
