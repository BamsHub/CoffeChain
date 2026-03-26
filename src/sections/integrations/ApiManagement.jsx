'use client';
import { useState, useEffect } from 'react';

const PLATFORMS = [
    {
        id: 'tiktok',
        name: 'TikTok Shop',
        icon: (
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.33 6.33 0 00-6.33 6.33 6.33 6.33 0 006.33 6.33 6.33 6.33 0 006.33-6.33V8.75a8.28 8.28 0 004.84 1.55V6.85a4.85 4.85 0 01-1.07-.16z"/>
            </svg>
        ),
        color: 'from-gray-900 to-gray-800',
        accent: '#EE1D52',
        accentLight: '#ffeef2',
        desc: 'Sinkronisasi produk dan pesanan dari TikTok Shop ke CoffeeChain.',
        docsUrl: 'https://developers.tiktok.com',
        fields: ['API Key', 'App Secret', 'Shop ID'],
    },
    {
        id: 'shopee',
        name: 'Shopee',
        icon: (
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
        ),
        color: 'from-orange-900 to-orange-800',
        accent: '#EE4D2D',
        accentLight: '#fff1ee',
        desc: 'Integrasikan toko Shopee Anda dan sinkronkan stok kopi secara otomatis.',
        docsUrl: 'https://open.shopee.com',
        fields: ['Partner ID', 'Partner Key', 'Shop ID'],
    },
    {
        id: 'gojek',
        name: 'GoFood / Gojek',
        icon: (
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
        ),
        color: 'from-green-900 to-green-800',
        accent: '#00AA13',
        accentLight: '#efffef',
        desc: 'Hubungkan outlet GoFood dan terima pesanan kopi secara real-time.',
        docsUrl: 'https://developer.gojek.com',
        fields: ['Client ID', 'Client Secret', 'Merchant ID'],
    },
    {
        id: 'tokopedia',
        name: 'Tokopedia',
        icon: (
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
        ),
        color: 'from-green-900 to-teal-900',
        accent: '#42B549',
        accentLight: '#f0fdf4',
        desc: 'Sinkronisasi katalog produk dan manajemen pesanan dari Tokopedia.',
        docsUrl: 'https://developer.tokopedia.com',
        fields: ['Client ID', 'Client Secret', 'Shop ID'],
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        icon: (
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12.05 2.047C6.478 2.047 1.957 6.569 1.957 12.14c0 1.759.458 3.408 1.258 4.844L2 21.953l5.103-1.186a10.04 10.04 0 004.947 1.28c5.572 0 10.093-4.521 10.093-10.093S17.622 2.047 12.05 2.047z"/>
            </svg>
        ),
        color: 'from-green-900 to-emerald-900',
        accent: '#25D366',
        accentLight: '#f0fff4',
        desc: 'Kirim notifikasi pesanan dan update status via WhatsApp Business API.',
        docsUrl: 'https://developers.facebook.com/docs/whatsapp',
        fields: ['Phone Number ID', 'Access Token', 'Verify Token'],
    },
    {
        id: 'custom',
        name: 'Custom Webhook',
        icon: (
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
        ),
        color: 'from-purple-900 to-indigo-900',
        accent: '#A78BFA',
        accentLight: '#f5f3ff',
        desc: 'Hubungkan aplikasi custom Anda via webhook endpoint CoffeeChain.',
        docsUrl: '#',
        fields: ['Webhook URL', 'Secret Key', 'Event Types'],
    },
];

const STORAGE_KEY = 'cc_api_integrations';

function loadApiKeys() {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveApiKeys(data) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function ApiManagement() {
    const [modal, setModal] = useState(null); // platform object or null
    const [apiKeys, setApiKeys] = useState({});
    const [formValues, setFormValues] = useState({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [disconnecting, setDisconnecting] = useState(null);
    const [showKeys, setShowKeys] = useState({});
    const [filter, setFilter] = useState('all'); // all | connected | disconnected

    useEffect(() => { setApiKeys(loadApiKeys()); }, []);

    function openModal(platform) {
        const existing = apiKeys[platform.id] || {};
        const init = {};
        platform.fields.forEach(f => { init[f] = existing[f] || ''; });
        setFormValues(init);
        setModal(platform);
        setSaved(false);
    }

    function handleSave() {
        setSaving(true);
        setTimeout(() => {
            const updated = { ...apiKeys, [modal.id]: { ...formValues, connectedAt: new Date().toISOString() } };
            setApiKeys(updated);
            saveApiKeys(updated);
            setSaving(false);
            setSaved(true);
            setTimeout(() => { setModal(null); setSaved(false); }, 1200);
        }, 800);
    }

    function handleDisconnect(id) {
        setDisconnecting(id);
        setTimeout(() => {
            const updated = { ...apiKeys };
            delete updated[id];
            setApiKeys(updated);
            saveApiKeys(updated);
            setDisconnecting(null);
        }, 600);
    }

    function toggleShowKey(id) {
        setShowKeys(s => ({ ...s, [id]: !s[id] }));
    }

    const connectedCount = Object.keys(apiKeys).length;
    const filteredPlatforms = PLATFORMS.filter(p => {
        if (filter === 'connected') return !!apiKeys[p.id];
        if (filter === 'disconnected') return !apiKeys[p.id];
        return true;
    });

    return (
        <div className="p-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-extrabold text-white mb-1">Manajemen API Integration</h1>
                    <p className="text-sm text-gray-400">
                        Hubungkan CoffeeChain ke platform e-commerce & marketplace favorit Anda
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-green-900/30 border border-green-700/40 rounded-xl px-4 py-2 text-center">
                        <div className="text-xl font-bold text-green-400">{connectedCount}</div>
                        <div className="text-xs text-gray-400">Terhubung</div>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700/40 rounded-xl px-4 py-2 text-center">
                        <div className="text-xl font-bold text-gray-300">{PLATFORMS.length - connectedCount}</div>
                        <div className="text-xs text-gray-400">Tersedia</div>
                    </div>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-6">
                {[['all', 'Semua'], ['connected', 'Terhubung'], ['disconnected', 'Belum Terhubung']].map(([val, label]) => (
                    <button key={val} onClick={() => setFilter(val)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${filter === val
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Platform Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {filteredPlatforms.map(platform => {
                    const isConnected = !!apiKeys[platform.id];
                    const info = apiKeys[platform.id];
                    return (
                        <div key={platform.id} className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${isConnected
                            ? 'border-green-600/50 bg-gradient-to-br from-gray-900 to-gray-800 shadow-lg shadow-green-900/20'
                            : 'border-gray-700/50 bg-gradient-to-br from-gray-900 to-gray-850 hover:border-gray-600/60'}`}>

                            {/* Connected indicator strip */}
                            {isConnected && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400" />}

                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-white`}
                                            style={{ color: platform.accent }}>
                                            {platform.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm leading-tight">{platform.name}</h3>
                                            <div className={`flex items-center gap-1.5 mt-0.5`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                                                <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-gray-500'}`}>
                                                    {isConnected ? 'Connected' : 'Disconnected'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400 mb-4 leading-relaxed">{platform.desc}</p>

                                {isConnected && info.connectedAt && (
                                    <div className="text-xs text-gray-500 mb-3 bg-gray-800/60 rounded-lg px-3 py-1.5">
                                        Terhubung: {new Date(info.connectedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button onClick={() => openModal(platform)}
                                        className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all bg-green-600 hover:bg-green-500 text-white">
                                        {isConnected ? '⚙ Edit API Key' : '+ Tambah API Key'}
                                    </button>
                                    {isConnected && (
                                        <button onClick={() => handleDisconnect(platform.id)}
                                            disabled={disconnecting === platform.id}
                                            className="py-2 px-3 rounded-xl text-xs font-semibold transition-all bg-red-900/40 hover:bg-red-800/60 text-red-400 border border-red-800/40">
                                            {disconnecting === platform.id ? '...' : 'Disconnect'}
                                        </button>
                                    )}
                                </div>

                                {platform.docsUrl !== '#' && (
                                    <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer"
                                        className="block mt-2 text-center text-xs text-gray-500 hover:text-gray-400 transition-colors">
                                        Lihat dokumentasi →
                                    </a>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Public API Docs section */}
            <div className="rounded-2xl border border-gray-700/50 bg-gray-900/60 p-6">
                <h2 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                    </svg>
                    Public REST API
                </h2>
                <p className="text-xs text-gray-400 mb-4">Endpoint terbuka — bisa diakses tanpa autentikasi dari aplikasi eksternal apapun</p>
                <div className="space-y-2">
                    {[
                        { method: 'GET', path: '/api/public/products', desc: 'Katalog produk kopi' },
                        { method: 'GET', path: '/api/public/market', desc: 'Harga pasar real-time' },
                        { method: 'POST', path: '/api/public/order', desc: 'Buat pesanan baru' },
                        { method: 'GET', path: '/api/public/order/{id}', desc: 'Cek status pesanan' },
                    ].map(({ method, path, desc }) => (
                        <div key={path} className="flex flex-wrap items-center gap-3 bg-gray-800/50 rounded-xl px-4 py-2.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${method === 'GET' ? 'bg-blue-900/50 text-blue-300' : 'bg-orange-900/50 text-orange-300'}`}>
                                {method}
                            </span>
                            <code className="text-green-400 text-xs font-mono flex-1">{path}</code>
                            <span className="text-gray-500 text-xs">{desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={() => setModal(null)}>
                    <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}>

                        {/* Modal header */}
                        <div className="flex items-center gap-3 p-5 border-b border-gray-800">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${modal.color} flex items-center justify-center`}
                                style={{ color: modal.accent }}>
                                {modal.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white">{modal.name}</h3>
                                <p className="text-xs text-gray-400">Tambah / perbarui API credentials</p>
                            </div>
                            <button onClick={() => setModal(null)} className="text-gray-500 hover:text-gray-300 transition-colors p-1">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>

                        {/* Modal form */}
                        <div className="p-5 space-y-4">
                            {modal.fields.map(field => (
                                <div key={field}>
                                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">{field}</label>
                                    <div className="relative">
                                        <input
                                            type={showKeys[field] ? 'text' : 'password'}
                                            value={formValues[field] || ''}
                                            onChange={e => setFormValues(v => ({ ...v, [field]: e.target.value }))}
                                            placeholder={`Masukkan ${field}...`}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600/30 pr-10 transition-all"
                                        />
                                        <button type="button" onClick={() => toggleShowKey(field)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                {showKeys[field]
                                                    ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                                                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                                                }
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal footer */}
                        <div className="flex items-center gap-3 px-5 pb-5">
                            <button onClick={() => setModal(null)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all">
                                Batal
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                                style={{ background: saved ? '#16a34a' : '#15803d', color: '#fff', opacity: saving ? 0.7 : 1 }}>
                                {saved ? (
                                    <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Tersimpan!</>
                                ) : saving ? 'Menyimpan...' : 'Simpan API Key'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
