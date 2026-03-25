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
                    { name: 'limit', type: 'number', default: '50', desc: 'Jumlah maksimal produk yang dikembalikan' },
                    { name: 'search', type: 'string', default: '', desc: 'Cari berdasarkan nama/asal/varietas' },
                    { name: 'grade', type: 'string', default: '', desc: 'Filter berdasarkan grade (A, B, C, dll)' },
                ],
                body: null,
                example: `curl "${BASE_URL}/api/public/products?limit=10&search=arabika"`,
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
                example: `curl "${BASE_URL}/api/public/market"`,
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
                body: {
                    productId: 'prod-xxxx',
                    buyerName: 'Nama Pembeli',
                    buyerEmail: 'email@example.com',
                    buyerPhone: '081234567890',
                    weight: 250,
                    quantity: 2,
                    paymentMethod: 'transfer',
                },
                example: `curl -X POST "${BASE_URL}/api/public/order" \\
  -H "Content-Type: application/json" \\
  -d '{"productId":"prod-xxxx","buyerName":"Budi","buyerEmail":"budi@mail.com","weight":250,"quantity":1,"paymentMethod":"transfer"}'`,
            },
            {
                id: 'get-order',
                method: 'GET',
                path: '/api/public/order/{orderId}',
                title: 'Cek Status Pesanan',
                desc: 'Cek status pesanan berdasarkan orderId yang diterima saat membuat pesanan.',
                params: [
                    { name: 'orderId', type: 'string (path)', default: '', desc: 'ID pesanan, contoh: ORD-ABC123' },
                ],
                body: null,
                example: `curl "${BASE_URL}/api/public/order/ORD-ABC123"`,
            },
        ]
    },
    {
        category: 'Internal (Auth Required)',
        icon: '🔐',
        items: [
            {
                id: 'get-farmers',
                method: 'GET',
                path: '/api/farmers',
                title: 'Data Petani',
                desc: 'Ambil semua data petani kopi yang terdaftar. Memerlukan autentikasi.',
                params: [],
                body: null,
                example: `curl "${BASE_URL}/api/farmers" -H "Cookie: token=JWT_TOKEN"`,
            },
            {
                id: 'get-transactions',
                method: 'GET',
                path: '/api/transactions',
                title: 'Riwayat Transaksi',
                desc: 'Ambil riwayat transaksi blockchain. Memerlukan autentikasi.',
                params: [],
                body: null,
                example: `curl "${BASE_URL}/api/transactions" -H "Cookie: token=JWT_TOKEN"`,
            },
            {
                id: 'get-orders',
                method: 'GET',
                path: '/api/orders',
                title: 'Semua Pesanan',
                desc: 'Ambil semua pesanan. Filter berdasarkan userId. Memerlukan autentikasi.',
                params: [
                    { name: 'userId', type: 'string', default: '', desc: 'Filter pesanan berdasarkan user ID' },
                ],
                body: null,
                example: `curl "${BASE_URL}/api/orders?userId=user-123" -H "Cookie: token=JWT_TOKEN"`,
            },
        ]
    },
];

const methodColor = {
    GET: { bg: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: 'rgba(0,212,255,0.3)' },
    POST: { bg: 'rgba(245,166,35,0.1)', color: '#F5A623', border: 'rgba(245,166,35,0.3)' },
    PATCH: { bg: 'rgba(126,212,74,0.1)', color: '#7ED44A', border: 'rgba(126,212,74,0.3)' },
    DELETE: { bg: 'rgba(244,67,54,0.1)', color: '#f44336', border: 'rgba(244,67,54,0.3)' },
};

function MethodBadge({ method }) {
    const c = methodColor[method] || methodColor.GET;
    return (
        <span style={{
            background: c.bg, color: c.color, border: `1px solid ${c.border}`,
            fontWeight: 700, fontSize: 11, padding: '3px 10px', borderRadius: 6,
            letterSpacing: 1, display: 'inline-block',
        }}>{method}</span>
    );
}

export default function IntegrationsPage() {
    const [activeId, setActiveId] = useState('get-products');
    const [testResult, setTestResult] = useState(null);
    const [testing, setTesting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [bodyInput, setBodyInput] = useState('');

    const allItems = ENDPOINTS.flatMap(c => c.items);
    const active = allItems.find(e => e.id === activeId) || allItems[0];

    async function runTest() {
        if (!active) return;
        setTesting(true);
        setTestResult(null);
        try {
            let path = active.path.replace('{orderId}', 'ORD-TEST');
            const opts = { method: active.method, headers: {} };
            if (active.method === 'POST' && bodyInput) {
                opts.headers['Content-Type'] = 'application/json';
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

    function copyExample() {
        if (!active?.example) return;
        navigator.clipboard.writeText(active.example);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>

            {/* ── SIDEBAR ── */}
            <aside style={{
                width: 260, flexShrink: 0, background: 'var(--color-bg-surface)',
                borderRight: '1px solid var(--color-border)', overflowY: 'auto',
                padding: '24px 0',
            }}>
                <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--color-border)', marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text)', marginBottom: 4 }}>🔌 Integrasi API</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>CoffeeChain REST API v1</div>
                </div>

                {ENDPOINTS.map(cat => (
                    <div key={cat.category} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', padding: '8px 20px 4px', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                            {cat.icon} {cat.category}
                        </div>
                        {cat.items.map(item => (
                            <button key={item.id} onClick={() => { setActiveId(item.id); setTestResult(null); setBodyInput(item.body ? JSON.stringify(item.body, null, 2) : ''); }}
                                style={{
                                    width: '100%', textAlign: 'left', padding: '10px 20px',
                                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                                    background: activeId === item.id ? 'rgba(74,124,40,0.15)' : 'transparent',
                                    borderLeft: `3px solid ${activeId === item.id ? 'var(--color-primary-light)' : 'transparent'}`,
                                    border: 'none',
                                    transition: 'all 0.15s',
                                }}>
                                <MethodBadge method={item.method} />
                                <span style={{ fontSize: 13, color: activeId === item.id ? 'var(--color-text)' : 'var(--color-text-secondary)', fontWeight: activeId === item.id ? 600 : 400, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {item.title}
                                </span>
                            </button>
                        ))}
                    </div>
                ))}
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
                {active && (
                    <>
                        {/* Header */}
                        <div style={{ marginBottom: 28 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <MethodBadge method={active.method} />
                                <code style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary-light)', fontFamily: 'monospace' }}>
                                    {active.path}
                                </code>
                            </div>
                            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px' }}>{active.title}</h1>
                            <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 0, lineHeight: 1.6 }}>{active.desc}</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                            {/* LEFT: Params + Body + Example */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                                {/* Parameters */}
                                {active.params?.length > 0 && (
                                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 14 }}>Parameters</div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead>
                                                <tr>
                                                    {['Nama', 'Tipe', 'Deskripsi'].map(h => (
                                                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)', fontWeight: 600, borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {active.params.map(p => (
                                                    <tr key={p.name}>
                                                        <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--color-border)' }}><code style={{ color: 'var(--color-primary-light)', fontFamily: 'monospace' }}>{p.name}</code></td>
                                                        <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>{p.type}</td>
                                                        <td style={{ padding: '8px 8px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>{p.desc}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Request Body */}
                                {active.method === 'POST' && (
                                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 12 }}>Request Body (JSON)</div>
                                        <textarea
                                            value={bodyInput || JSON.stringify(active.body, null, 2)}
                                            onChange={e => setBodyInput(e.target.value)}
                                            rows={10}
                                            style={{
                                                width: '100%', padding: 14, borderRadius: 8, fontFamily: 'monospace', fontSize: 13,
                                                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--color-border)',
                                                color: 'var(--color-text)', resize: 'vertical', outline: 'none', lineHeight: 1.6,
                                            }}
                                        />
                                    </div>
                                )}

                                {/* Example */}
                                <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>📋 Contoh cURL</div>
                                        <button onClick={copyExample} style={{
                                            fontSize: 12, color: 'var(--color-primary-light)', cursor: 'pointer',
                                            background: 'rgba(74,124,40,0.1)', border: '1px solid var(--color-border)',
                                            borderRadius: 6, padding: '4px 12px', fontWeight: 600,
                                        }}>{copied ? '✓ Disalin!' : 'Salin'}</button>
                                    </div>
                                    <pre style={{
                                        background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 14,
                                        fontSize: 12, color: 'var(--color-primary-light)', fontFamily: 'monospace',
                                        overflowX: 'auto', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                    }}>{active.example}</pre>
                                </div>
                            </div>

                            {/* RIGHT: API Tester */}
                            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 16 }}>⚡ API Tester Langsung</div>

                                <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--color-text-muted)' }}>
                                    Endpoint: <code style={{ color: 'var(--color-primary-light)' }}>{active.path}</code>
                                </div>

                                <button onClick={runTest} disabled={testing} style={{
                                    width: '100%', padding: '12px', borderRadius: 8, cursor: testing ? 'not-allowed' : 'pointer',
                                    background: testing ? 'rgba(74,124,40,0.3)' : 'linear-gradient(135deg,var(--color-primary),var(--color-primary-light))',
                                    color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', marginBottom: 16,
                                    transition: 'all 0.2s',
                                }}>
                                    {testing ? '⏳ Mengirim Request...' : '▶ Jalankan Request'}
                                </button>

                                {testResult && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                            <span style={{
                                                fontWeight: 700, fontSize: 13, padding: '3px 10px', borderRadius: 6,
                                                background: testResult.error ? 'rgba(244,67,54,0.15)' : testResult.status < 300 ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)',
                                                color: testResult.error ? '#f44336' : testResult.status < 300 ? '#4CAF50' : '#FF9800',
                                                border: `1px solid ${testResult.error ? 'rgba(244,67,54,0.3)' : testResult.status < 300 ? 'rgba(76,175,80,0.3)' : 'rgba(255,152,0,0.3)'}`,
                                            }}>
                                                {testResult.error ? 'ERROR' : `${testResult.status} ${testResult.status < 300 ? 'OK' : 'ERROR'}`}
                                            </span>
                                            {testResult.ms && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{testResult.ms}ms</span>}
                                        </div>
                                        <pre style={{
                                            background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 14,
                                            fontSize: 12, color: testResult.error ? '#f44336' : 'var(--color-text)',
                                            fontFamily: 'monospace', overflowX: 'auto', lineHeight: 1.6, margin: 0,
                                            maxHeight: 400, overflowY: 'auto',
                                        }}>
                                            {testResult.error || JSON.stringify(testResult.data, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {!testResult && (
                                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                                        Klik "Jalankan Request" untuk melihat respons API
                                    </div>
                                )}

                                <div style={{ marginTop: 20, padding: 14, background: 'rgba(74,124,40,0.06)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary-light)', marginBottom: 6 }}>📡 Base URL</div>
                                    <code style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                        {BASE_URL || 'https://your-domain.pages.dev'}
                                    </code>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                                        Semua endpoint <code style={{ color: 'var(--color-primary-light)' }}>/api/public/*</code> terbuka (CORS enabled). Endpoint lain memerlukan sesi login admin.
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
