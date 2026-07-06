'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const STAGE_NAMES = {
    1: 'Panen & Sortasi',
    2: 'Pencucian & Fermentasi',
    3: 'Pengeringan',
    4: 'Pengupasan & Penggilingan',
    5: 'Pemanggangan',
    6: 'Produk Jadi & Pengemasan',
};

function tagValue(tags, prefix) {
    return (Array.isArray(tags) ? tags : []).map(String).find(tag => tag.startsWith(prefix))?.slice(prefix.length) || null;
}

export default function IPFSPage() {
    const { user, getToken } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [copied, setCopied] = useState('');

    const loadStorage = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const token = await getToken();
            if (!token) throw new Error('Login diperlukan untuk melihat Storage IPFS');
            const headers = { Authorization: `Bearer ${token}` };
            const productUrl = user?.role === 'farmer' && user?.id
                ? `/api/products?submittedBy=${encodeURIComponent(user.id)}`
                : '/api/products';
            const [batchResponse, logResponse, productResponse] = await Promise.all([
                fetch('/api/production-batches', { headers }),
                fetch('/api/production-stages', { headers }),
                fetch(productUrl),
            ]);
            const [batchData, logData, productData] = await Promise.all([
                batchResponse.json(), logResponse.json(), productResponse.json(),
            ]);
            if (!batchResponse.ok || !batchData.success) throw new Error(batchData.message || 'Gagal memuat batch');
            if (!logResponse.ok || !logData.success) throw new Error(logData.message || 'Gagal memuat storage pipeline');
            if (!productResponse.ok || !productData.success) throw new Error(productData.message || 'Gagal memuat metadata produk');

            const batches = new Map((batchData.data || []).map(batch => [batch.id, batch]));
            const pipelineItems = (logData.data || []).map(log => {
                const evidence = log.data?.evidencePhoto || {};
                const batch = batches.get(log.batchId);
                return {
                    id: `stage-${log.id}`,
                    type: 'Bukti Pipeline',
                    cid: evidence.cid || null,
                    gatewayUrl: evidence.gatewayUrl || log.photoUrl || null,
                    imageUrl: log.photoUrl || evidence.gatewayUrl || null,
                    title: batch?.name || `Batch ${log.batchId}`,
                    subtitle: `Tahap ${log.stage}: ${STAGE_NAMES[Number(log.stage)] || log.stageName}`,
                    description: log.data?.description || log.data?.notes || '',
                };
            }).filter(item => item.cid && item.gatewayUrl);

            const metadataItems = (productData.data || []).map(product => {
                const metadataCid = product.offchain?.metadataCid || tagValue(product.tags, 'ipfs-metadata:');
                return metadataCid ? {
                    id: `metadata-${product.id}`,
                    type: 'Metadata Produk',
                    cid: metadataCid,
                    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${metadataCid}`,
                    imageUrl: product.image || null,
                    title: product.name,
                    subtitle: product.coffeeId ? `Coffee ID ${product.coffeeId}` : 'Menunggu sertifikasi',
                    description: product.description || '',
                } : null;
            }).filter(Boolean);

            setItems([...pipelineItems, ...metadataItems]);
        } catch (loadError) {
            setError(loadError.message || 'Gagal memuat Storage IPFS');
        }
        setLoading(false);
    }, [user?.id, user?.role]);

    useEffect(() => { loadStorage(); }, [loadStorage]);

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return items;
        return items.filter(item => [item.title, item.subtitle, item.description, item.cid, item.type]
            .filter(Boolean)
            .some(value => String(value).toLowerCase().includes(query)));
    }, [items, search]);

    async function copyCid(cid) {
        await navigator.clipboard.writeText(cid);
        setCopied(cid);
        window.setTimeout(() => setCopied(''), 1500);
    }

    const card = { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' };
    const button = { borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text)', padding: '8px 11px', fontSize: 12, fontWeight: 800, cursor: 'pointer', textDecoration: 'none' };

    return (
        <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ marginBottom: 22 }}>
                <div style={{ color: '#7ED44A', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.2 }}>Read-only Storage</div>
                <h1 style={{ color: 'var(--color-text)', fontSize: 'clamp(22px,4vw,30px)', margin: '5px 0 7px', fontWeight: 900 }}>Storage IPFS</h1>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.7, maxWidth: 760, margin: 0 }}>
                    Halaman ini hanya menampilkan foto dan metadata yang masuk dari Pipeline Stok. Upload dilakukan oleh petani pada Tahap 1-6, bukan dari halaman ini.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 18 }}>
                <div style={{ ...card, padding: 14 }}><div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Total Objek</div><div style={{ color: 'var(--color-text)', fontSize: 24, fontWeight: 900, marginTop: 3 }}>{items.length}</div></div>
                <div style={{ ...card, padding: 14 }}><div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Foto Pipeline</div><div style={{ color: '#7ED44A', fontSize: 24, fontWeight: 900, marginTop: 3 }}>{items.filter(item => item.type === 'Bukti Pipeline').length}</div></div>
                <div style={{ ...card, padding: 14 }}><div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Metadata Produk</div><div style={{ color: '#B388FF', fontSize: 24, fontWeight: 900, marginTop: 3 }}>{items.filter(item => item.type === 'Metadata Produk').length}</div></div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Cari batch, tahap, Coffee ID, atau CID..." style={{ flex: '1 1 300px', maxWidth: 480, padding: '11px 13px', borderRadius: 9, border: '1px solid var(--color-input-border)', background: 'var(--color-input-bg)', color: 'var(--color-text)', outline: 'none' }} />
                <button type="button" onClick={loadStorage} style={button}>Muat Ulang</button>
            </div>

            {error && <div style={{ ...card, padding: 16, color: '#ff6b6b', borderColor: 'rgba(244,67,54,0.35)', marginBottom: 16 }}>{error}</div>}
            {loading ? (
                <div style={{ ...card, padding: 42, textAlign: 'center', color: 'var(--color-text-muted)' }}>Memuat isi Storage IPFS...</div>
            ) : filteredItems.length === 0 ? (
                <div style={{ ...card, padding: 42, textAlign: 'center', color: 'var(--color-text-muted)' }}>Belum ada objek IPFS dari pipeline yang sesuai.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                    {filteredItems.map(item => (
                        <article key={item.id} style={card}>
                            <div style={{ height: 170, background: 'rgba(74,124,40,0.06)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                                {item.imageUrl ? <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Metadata JSON</span>}
                            </div>
                            <div style={{ padding: 15 }}>
                                <div style={{ color: item.type === 'Bukti Pipeline' ? '#7ED44A' : '#B388FF', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>{item.type}</div>
                                <h2 style={{ color: 'var(--color-text)', fontSize: 15, fontWeight: 900, margin: '5px 0 2px' }}>{item.title}</h2>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{item.subtitle}</div>
                                {item.description && <p style={{ color: 'var(--color-text-muted)', fontSize: 12, lineHeight: 1.55, margin: '10px 0' }}>{item.description}</p>}
                                <code style={{ display: 'block', color: '#7ED44A', background: 'rgba(0,0,0,0.18)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 9, margin: '10px 0', fontSize: 10, wordBreak: 'break-all' }}>{item.cid}</code>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button type="button" onClick={() => copyCid(item.cid)} style={button}>{copied === item.cid ? 'CID Tersalin' : 'Salin CID'}</button>
                                    <a href={item.gatewayUrl} target="_blank" rel="noopener noreferrer" style={button}>Buka Gateway</a>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
