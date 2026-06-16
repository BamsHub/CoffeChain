'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function DocumentationPage() {
    const { user, getToken } = useAuth();
    const [activeTab, setActiveTab] = useState('guides'); // guides | buttons | testing
    
    // DB documentation state
    const [guides, setGuides] = useState({ farmerGuides: [], developerGuides: [] });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Editing states
    const [isEditing, setIsEditing] = useState(false);
    const [editTarget, setEditTarget] = useState('farmer'); // farmer | developer
    const [editGuides, setEditGuides] = useState([]); // Array being edited

    const role = user?.role || 'farmer';
    const isDeveloper = role === 'developer' || role === 'koperasi';
    const roleLabel = isDeveloper ? 'Developer / Koperasi' : 'Petani';

    // Fetch guides on mount
    useEffect(() => {
        fetchGuides();
    }, []);

    async function fetchGuides() {
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch('/api/documentation');
            const data = await res.json();
            if (data.success) {
                setGuides({
                    farmerGuides: data.farmerGuides || [],
                    developerGuides: data.developerGuides || [],
                });
            } else {
                setErrorMsg('Gagal memuat dokumentasi dari database.');
            }
        } catch (err) {
            setErrorMsg('Gagal terhubung ke API dokumentasi.');
        } finally {
            setLoading(false);
        }
    }

    // Initialize editing mode
    function startEditing(target) {
        setEditTarget(target);
        // Create a deep copy of the selected guides array
        const source = target === 'farmer' ? guides.farmerGuides : guides.developerGuides;
        setEditGuides(JSON.parse(JSON.stringify(source)));
        setIsEditing(true);
        setSuccessMsg(null);
        setErrorMsg(null);
    }

    function cancelEditing() {
        setIsEditing(false);
        setEditGuides([]);
    }

    // Form item updates
    function updateSectionTitle(sectionIndex, newTitle) {
        const updated = [...editGuides];
        updated[sectionIndex].title = newTitle;
        setEditGuides(updated);
    }

    function updateItemText(sectionIndex, itemIndex, newText) {
        const updated = [...editGuides];
        updated[sectionIndex].items[itemIndex] = newText;
        setEditGuides(updated);
    }

    function deleteItem(sectionIndex, itemIndex) {
        const updated = [...editGuides];
        updated[sectionIndex].items.splice(itemIndex, 1);
        setEditGuides(updated);
    }

    function addItem(sectionIndex) {
        const updated = [...editGuides];
        updated[sectionIndex].items.push('Baris panduan baru...');
        setEditGuides(updated);
    }

    function deleteSection(sectionIndex) {
        const updated = [...editGuides];
        updated.splice(sectionIndex, 1);
        setEditGuides(updated);
    }

    function addSection() {
        setEditGuides([
            ...editGuides,
            { title: 'Kategori Panduan Baru', items: ['Baris panduan pertama...'] }
        ]);
    }

    // Save changes to Supabase
    async function saveGuides() {
        setSaving(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
            const token = getToken();
            const res = await fetch('/api/documentation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    id: editTarget === 'farmer' ? 'farmer_guides' : 'developer_guides',
                    content: editGuides,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMsg(`Dokumentasi ${editTarget === 'farmer' ? 'Petani' : 'Developer'} berhasil disimpan!`);
                setIsEditing(false);
                // Refresh local data
                await fetchGuides();
            } else {
                setErrorMsg(data.message || 'Gagal menyimpan dokumentasi.');
            }
        } catch (err) {
            setErrorMsg('Terjadi kesalahan koneksi saat menyimpan.');
        } finally {
            setSaving(false);
        }
    }

    const featureMap = [
        ['Dashboard', 'Ringkasan aktivitas, visualisasi grafik penjualan, widget kalender penanggalan, dan live feed transaksi blockchain.'],
        ['Kelola Stok', 'Pelacakan alur rantai pasok produksi kopi dari tahap 1-6 dengan pencatatan parameter wajib dan upload foto bukti.'],
        ['Kelola Produk', 'Pencatatan varietas kopi, tingkat sangrai, status verifikasi on-chain, serta persetujuan (approval) produk petani.'],
        ['Register Kopi', 'Registrasi metadata kopi secara permanen ke Solana Memo program, melahirkan Coffee ID serta QR Trace.'],
        ['Pembayaran', 'Integrasi otomatis Midtrans Snap Gateway (bank transfer & QRIS) serta direct payment SOL wallet Phantom.'],
        ['Trace Publik', 'Validasi transparansi asal-usul kopi, pelacakan histori tahap produksi, dan verifikasi hash transaksi Solana Explorer.'],
        ['Dompet', 'Penyedia fungsionalitas kirim/terima saldo SOL, salin address public key, dan memantau explorer address.'],
        ['Transaksi', 'Riwayat order pesanan dari landing page, detail status bayar, data kontak pembeli, dan filter per tanggal.'],
    ];

    const cardStyle = {
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 4px 20px var(--color-shadow)',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
    };

    const tabBtnStyle = (tabId) => ({
        padding: '10px 20px',
        borderRadius: 8,
        border: 'none',
        background: activeTab === tabId ? 'linear-gradient(135deg, var(--color-primary-light), var(--color-success))' : 'var(--color-bg-card2)',
        color: activeTab === tabId ? '#ffffff' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        fontWeight: 800,
        fontSize: 13,
        transition: 'var(--transition)',
        boxShadow: activeTab === tabId ? '0 4px 12px rgba(126, 212, 74, 0.2)' : 'none',
    });

    const activeGuides = isDeveloper ? guides.developerGuides : guides.farmerGuides;

    return (
        <div style={{ padding: 'clamp(16px,3vw,32px)', maxWidth: 1200, margin: '0 auto' }}>
            {/* Notification Messages */}
            {successMsg && (
                <div style={{ background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)', color: '#81C784', padding: '12px 18px', borderRadius: 8, marginBottom: 20, fontSize: 14, fontWeight: 800 }}>
                    ✅ {successMsg}
                </div>
            )}
            {errorMsg && (
                <div style={{ background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.3)', color: '#E57373', padding: '12px 18px', borderRadius: 8, marginBottom: 20, fontSize: 14, fontWeight: 800 }}>
                    ⚠️ {errorMsg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
                <div>
                    <div style={{ color: 'var(--color-primary-light)', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        DOKUMENTASI SISTEM & PENGUJIAN
                    </div>
                    <h1 style={{ color: 'var(--color-text)', fontSize: 'clamp(26px,4vw,36px)', margin: '6px 0', fontWeight: 900, letterSpacing: '-0.5px' }}>
                        Panduan Teknis CoffeeChain
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14, maxWidth: 720, lineHeight: 1.7 }}>
                        Portal informasi fungsionalitas tombol, alur proses bisnis kopi berbasis blockchain, serta laporan hasil pengujian fungsionalitas (Black Box) & struktural (White Box).
                    </p>
                </div>
                <div style={{ ...cardStyle, padding: '14px 20px', minWidth: 240, background: 'var(--color-bg-card2)' }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Akun Aktif</div>
                    <div style={{ color: 'var(--color-text)', fontWeight: 900, marginTop: 4, fontSize: 16 }}>{user?.name || 'User'}</div>
                    <div style={{ color: 'var(--color-primary-light)', fontSize: 13, fontWeight: 800, marginTop: 3 }}>Role: {roleLabel}</div>
                </div>
            </div>

            {/* Admin Editing Toolbar */}
            {isDeveloper && !isEditing && (
                <div style={{ ...cardStyle, background: 'rgba(74, 124, 40, 0.05)', border: '1px dashed var(--color-border)', marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <strong style={{ color: 'var(--color-text)', fontSize: 14 }}>🛠️ Mode Editor Admin</strong>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 2 }}>Anda memiliki wewenang untuk mengedit panduan manual secara langsung ke database.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => startEditing('farmer')} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--color-primary-light)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                            ✏️ Edit Panduan Petani
                        </button>
                        <button onClick={() => startEditing('developer')} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--color-secondary)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                            ✏️ Edit Panduan Developer
                        </button>
                    </div>
                </div>
            )}

            {/* Editing Canvas */}
            {isEditing && (
                <div style={{ ...cardStyle, background: 'var(--color-bg-card2)', border: '2px solid var(--color-primary-light)', marginBottom: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 14, marginBottom: 20 }}>
                        <div>
                            <h2 style={{ color: 'var(--color-text)', fontSize: 18, fontWeight: 900 }}>
                                ✍️ Mengedit Panduan: <span style={{ color: 'var(--color-logo-sub)' }}>{editTarget === 'farmer' ? 'Petani' : 'Developer & Koperasi'}</span>
                            </h2>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>Pastikan tidak memasukkan data kode rahasia, token, atau informasi kredensial berbahaya.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={saveGuides} disabled={saving} style={{ padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#4A7C28,#7ED44A)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>
                                {saving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                            </button>
                            <button onClick={cancelEditing} disabled={saving} style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                                Batal
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: 20 }}>
                        {editGuides.map((section, sidx) => (
                            <div key={sidx} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 16 }}>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        value={section.title} 
                                        onChange={(e) => updateSectionTitle(sidx, e.target.value)}
                                        style={{ 
                                            flex: 1, 
                                            background: 'var(--color-input-bg)', 
                                            border: '1px solid var(--color-input-border)', 
                                            color: 'var(--color-text)', 
                                            padding: '8px 12px', 
                                            borderRadius: 6, 
                                            fontSize: 14, 
                                            fontWeight: 800 
                                        }} 
                                        placeholder="Judul Kategori Panduan"
                                    />
                                    <button onClick={() => deleteSection(sidx)} style={{ background: '#E57373', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>
                                        🗑️ Hapus Kategori
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gap: 8 }}>
                                    {section.items.map((item, iidx) => (
                                        <div key={iidx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                            <span style={{ color: 'var(--color-logo-sub)', marginTop: 8, fontSize: 12 }}>✓</span>
                                            <textarea 
                                                value={item} 
                                                onChange={(e) => updateItemText(sidx, iidx, e.target.value)}
                                                rows={2}
                                                style={{ 
                                                    flex: 1, 
                                                    background: 'var(--color-input-bg)', 
                                                    border: '1px solid var(--color-input-border)', 
                                                    color: 'var(--color-text-secondary)', 
                                                    padding: '8px 10px', 
                                                    borderRadius: 6, 
                                                    fontSize: 13, 
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical'
                                                }}
                                                placeholder="Isi butir panduan..."
                                            />
                                            <button onClick={() => deleteItem(sidx, iidx)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FF8A80', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 800 }}>
                                                ✕ Hapus
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => addItem(sidx)} style={{ marginTop: 12, background: 'rgba(126,212,74,0.1)', border: '1px dashed rgba(126,212,74,0.3)', color: 'var(--color-logo-sub)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 800 }}>
                                    ➕ Tambah Item Panduan
                                </button>
                            </div>
                        ))}
                    </div>

                    <button onClick={addSection} style={{ marginTop: 18, width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--color-border)', color: 'var(--color-text)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 800 }}>
                        ➕ Tambah Kategori Baru
                    </button>
                </div>
            )}

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap', borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
                <button style={tabBtnStyle('guides')} onClick={() => setActiveTab('guides')}>
                    📖 Panduan Alur Kerja ({roleLabel})
                </button>
                <button style={tabBtnStyle('buttons')} onClick={() => setActiveTab('buttons')}>
                    🔘 Detail Fungsional Tombol
                </button>
                <button style={tabBtnStyle('testing')} onClick={() => setActiveTab('testing')}>
                    🧪 Hasil Pengujian (White Box & Black Box)
                </button>
            </div>

            {/* Tab 1: Guides */}
            {activeTab === 'guides' && (
                <div>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                            <div style={{ display: 'inline-block', width: 30, height: 30, border: '3px solid rgba(126,212,74,0.2)', borderTopColor: 'var(--color-logo-sub)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                            <div>Memuat panduan dokumentasi...</div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
                            {activeGuides.map((section, idx) => (
                                <section key={idx} style={cardStyle}>
                                    <h3 style={{ color: 'var(--color-text)', fontSize: 17, fontWeight: 900, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 10 }}>
                                        {section.title}
                                    </h3>
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        {section.items.map((item, i) => (
                                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10, alignItems: 'start' }}>
                                                <span style={{ 
                                                    width: 20, 
                                                    height: 20, 
                                                    borderRadius: '50%', 
                                                    background: 'rgba(126,212,74,0.12)', 
                                                    border: '1px solid rgba(126,212,74,0.3)', 
                                                    color: 'var(--color-logo-sub)', 
                                                    display: 'grid', 
                                                    placeItems: 'center', 
                                                    fontSize: 11, 
                                                    fontWeight: 900 
                                                }}>✓</span>
                                                <span style={{ color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.6 }}>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Buttons */}
            {activeTab === 'buttons' && (
                <div style={{ display: 'grid', gap: 24 }}>
                    {buttonRegistry.map((reg, idx) => (
                        <div key={idx} style={cardStyle}>
                            <h3 style={{ color: 'var(--color-logo-sub)', fontSize: 18, fontWeight: 900, marginBottom: 16 }}>
                                {reg.section}
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--color-border)', color: 'var(--color-text)' }}>
                                            <th style={{ padding: '10px 14px', fontSize: 13, fontWeight: 900 }}>Nama Tombol</th>
                                            <th style={{ padding: '10px 14px', fontSize: 13, fontWeight: 900 }}>Pengguna/Akses</th>
                                            <th style={{ padding: '10px 14px', fontSize: 13, fontWeight: 900 }}>Deskripsi Fungsi & Reaksi Sistem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reg.buttons.map((btn, bidx) => (
                                            <tr key={bidx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)' }}>
                                                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
                                                    <span style={{ background: 'var(--color-bg-card2)', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 6 }}>
                                                        {btn.name}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px', fontSize: 12 }}>
                                                    <span style={{ 
                                                        background: btn.type.includes('Public') ? 'rgba(0,212,255,0.1)' : 'rgba(126,212,74,0.1)', 
                                                        color: btn.type.includes('Public') ? 'var(--color-crypto)' : 'var(--color-logo-sub)', 
                                                        padding: '3px 8px', 
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        fontWeight: 800
                                                    }}>
                                                        {btn.type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>{btn.desc}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab 3: Testing */}
            {activeTab === 'testing' && (
                <div style={{ display: 'grid', gap: 28 }}>
                    {/* Intro Card */}
                    <div style={cardStyle}>
                        <h3 style={{ color: 'var(--color-text)', fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
                            Metodologi Verifikasi & Pengujian Kode
                        </h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                            Guna menjamin integritas data rantai pasok kopi fisik dan sinkronisasi on-chain ke jaringan Solana, CoffeeChain menerapkan strategi pengujian ganda:
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                            <div style={{ background: 'var(--color-bg-card2)', padding: 16, borderRadius: 8, borderLeft: '4px solid var(--color-primary-light)' }}>
                                <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>◼ Black Box Testing (Fungsional)</strong>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                                    Menguji input-output antarmuka aplikasi. Memastikan tombol, form pengisian, verifikasi email, drag & drop upload foto, snap payment, dan pencarian ID Kopi bekerja normal sesuai ekspektasi user.
                                </span>
                            </div>
                            <div style={{ background: 'var(--color-bg-card2)', padding: 16, borderRadius: 8, borderLeft: '4px solid var(--color-crypto)' }}>
                                <strong style={{ color: 'var(--color-text)', display: 'block', marginBottom: 6 }}>◽ White Box Testing (Struktural)</strong>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                                    Menguji jalur internal kode pemrograman, logika API routes, enkripsi token verifikasi, validasi middleware (JWT), pembacaan block hash, serta integrasi RPC Solana Smart Contract.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Conceptual Diagrams */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
                        <div style={cardStyle}>
                            <h4 style={{ color: 'var(--color-text)', fontSize: 15, fontWeight: 900, marginBottom: 12, textAlign: 'center' }}>
                                Alur Black Box Testing (Perspektif User)
                            </h4>
                            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#050705' }}>
                                <img src="/docs/blackbox-testing.png" alt="Black Box Testing Flow" style={{ width: '100%', height: 'auto', display: 'block' }} />
                            </div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                                Skema input data form, interaksi tombol UI, dan validasi output visual bagi pengguna.
                            </p>
                        </div>
                        <div style={cardStyle}>
                            <h4 style={{ color: 'var(--color-text)', fontSize: 15, fontWeight: 900, marginBottom: 12, textAlign: 'center' }}>
                                Alur White Box Testing (Logika Kode Internal)
                            </h4>
                            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)', background: '#050705' }}>
                                <img src="/docs/whitebox-testing.png" alt="White Box Testing Flow" style={{ width: '100%', height: 'auto', display: 'block' }} />
                            </div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
                                Aliran data internal, pemanggilan API, verifikasi cryptographic signature, dan execution path.
                            </p>
                        </div>
                    </div>

                    {/* Feature-specific Testing Reports */}
                    <h3 style={{ color: 'var(--color-text)', fontSize: 18, fontWeight: 900, borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginTop: 12 }}>
                        Laporan Pengujian per Fitur Utama
                    </h3>

                    {/* Fitur 1: Auth & Verifikasi */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px', minWidth: 280 }}>
                                <span style={{ background: 'var(--color-primary-light)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 4 }}>Fitur 01</span>
                                <h4 style={{ color: 'var(--color-text)', fontSize: 16, fontWeight: 900, margin: '8px 0 12px' }}>
                                    Autentikasi & Verifikasi Email (Tanpa Localhost)
                                </h4>
                                
                                <div style={{ marginBottom: 14 }}>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>🔍 Pengujian Black Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Mendaftar dengan email baru → Form memunculkan password strength meter (Lemah/Cukup/Kuat).</li>
                                        <li>Login dengan akun belum terverifikasi → Tombol "Kirim Ulang Email Verifikasi" muncul dan dapat ditekan.</li>
                                        <li>Membuka link dari inbox email → Pengguna diarahkan ke domain produksi Vercel (bukan localhost) dan otomatis terverifikasi.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>⚙️ Pengujian White Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Fungsi hashing SHA-256 memverifikasi kecocokan password internal.</li>
                                        <li>API `/api/auth/verify-email?token=xxx` memproses query parameter token dari database Supabase secara real-time.</li>
                                        <li>Setting domain dikonfigurasi ke domain Vercel untuk menghindari fallback tautan localhost.</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div style={{ flex: '1 1 400px', minWidth: 320 }}>
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#050705' }}>
                                    <img src="/docs/testing-login-register.png" alt="Auth Testing Screenshots" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                                    Bukti UI Testing: Form Pendaftaran Akun, Meteran Keamanan Sandi, dan Halaman Verifikasi Email di Vercel.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fitur 2: Pipeline Produksi */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px', minWidth: 280 }}>
                                <span style={{ background: 'var(--color-primary-light)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 4 }}>Fitur 02</span>
                                <h4 style={{ color: 'var(--color-text)', fontSize: 16, fontWeight: 900, margin: '8px 0 12px' }}>
                                    Kelola Stok & Pipeline Produksi Kopi (6 Tahap)
                                </h4>
                                
                                <div style={{ marginBottom: 14 }}>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>🔍 Pengujian Black Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Membuat batch baru → Status awal dimulai pada Tahap 1 (Pembersihan).</li>
                                        <li>Tombol "Catat Tahap" dinonaktifkan jika input form tidak lengkap atau foto bukti kosong.</li>
                                        <li>Setiap tahap diselesaikan, persentase progress bar meningkat 16.6% hingga mencapai 100% pada Tahap 6 (Produk Jadi).</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>⚙️ Pengujian White Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Fungsi backend `/api/production-stages` memvalidasi sequence log agar tahapan tidak dilewati secara acak.</li>
                                        <li>Handler storage menyimpan gambar bukti ke Supabase Storage, dengan fallback base64 string jika koneksi storage terganggu.</li>
                                        <li>Pemicu event Tahap 6 otomatis mengeksekusi function penulisan entri produk baru dengan status draft/pending.</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div style={{ flex: '1 1 400px', minWidth: 320 }}>
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#050705' }}>
                                    <img src="/docs/testing-product-pipeline.png" alt="Pipeline Testing Screenshots" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                                    Bukti UI Testing: Dashboard Rantai Pasok, Input Suhu & Berat, serta Upload Foto Bukti Tiap Tahapan.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fitur 3: Midtrans & SOL Pay */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px', minWidth: 280 }}>
                                <span style={{ background: 'var(--color-primary-light)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 4 }}>Fitur 03</span>
                                <h4 style={{ color: 'var(--color-text)', fontSize: 16, fontWeight: 900, margin: '8px 0 12px' }}>
                                    Integrasi Pembayaran (Midtrans Snap & Solana SOL)
                                </h4>
                                
                                <div style={{ marginBottom: 14 }}>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>🔍 Pengujian Black Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Memilih Midtrans IDR → Menampilkan modal Snap berisi instruksi transfer Virtual Account atau barcode QRIS.</li>
                                        <li>Memilih SOL Transfer → Tombol meminta koneksi ke Phantom Wallet, menampilkan saldo SOL pengguna, dan mengisi otomatis alamat target store.</li>
                                        <li>Klik tombol "Cek Status Midtrans" → Status order diperbarui dari "Pending" ke "Lunas" setelah pembayaran diproses.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>⚙️ Pengujian White Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>API endpoint `/api/midtrans` memformat request payload sesuai format resmi API Midtrans.</li>
                                        <li>Middleware webhook memverifikasi signature hash key dari server Midtrans untuk mencegah manipulasi data status bayar.</li>
                                        <li>Sistem pooling database mengaktifkan scheduler otomatis untuk memeriksa transaksi pending setiap 8 detik selama modal pembayaran aktif.</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div style={{ flex: '1 1 400px', minWidth: 320 }}>
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#050705' }}>
                                    <img src="/docs/testing-blockchain-payment.png" alt="Payment Testing Screenshots" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                                    Bukti UI Testing: Pembayaran Midtrans Snap, Verifikasi Virtual Account Bank, Koneksi Dompet Phantom, dan Riwayat Order.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fitur 4: Registrasi Blockchain */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px', minWidth: 280 }}>
                                <span style={{ background: 'var(--color-primary-light)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 4 }}>Fitur 04</span>
                                <h4 style={{ color: 'var(--color-text)', fontSize: 16, fontWeight: 900, margin: '8px 0 12px' }}>
                                    Registrasi Blockchain Kopi & Trace QR Code
                                </h4>
                                
                                <div style={{ marginBottom: 14 }}>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>🔍 Pengujian Black Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Klik mendaftarkan kopi published ke rantai blok → Phantom wallet memunculkan prompt tanda tangan digital (signature request).</li>
                                        <li>Setelah ditandatangani, sistem menampilkan Coffee ID (misal: CF-001) beserta link Solana Explorer.</li>
                                        <li>Memindai QR Code di sertifikat kopi → Mengarahkan browser ponsel ke halaman `/trace?id=CF-001` dengan visual timeline produksi.</li>
                                    </ul>
                                </div>

                                <div>
                                    <strong style={{ fontSize: 12, color: 'var(--color-text)' }}>⚙️ Pengujian White Box:</strong>
                                    <ul style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 4, display: 'grid', gap: 4 }}>
                                        <li>Handler frontend memanfaatkan library `@solana/web3.js` untuk membuat payload instruksi Memo.</li>
                                        <li>Validasi on-chain memastikan transaction slot telah terkonfirmasi (confirmed status) di kluster Testnet sebelum ID Kopi disimpan ke database lokal.</li>
                                        <li>QR Code dihasilkan menggunakan dynamic canvas generator dengan input URL validasi trace terenkripsi SHA-256.</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div style={{ flex: '1 1 400px', minWidth: 320 }}>
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden', background: '#050705' }}>
                                    <img src="/docs/testing-trace-qr.png" alt="Blockchain Testing Screenshots" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                                    Bukti UI Testing: Sertifikasi On-Chain, Prompt Transaksi Solana Memo Program, Tautan Explorer, dan Layout Pelacakan Kopi Publik.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Access Footer */}
            <div style={{ 
                ...cardStyle, 
                marginTop: 24, 
                display: 'flex', 
                gap: 16, 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'var(--color-bg-card2)'
            }}>
                <div>
                    <div style={{ color: 'var(--color-text)', fontWeight: 900, fontSize: 15 }}>Navigasi Cepat</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 3 }}>Akses cepat ke halaman utama sistem Anda.</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <DocLink href="/products/stock" label="Kelola Stok" />
                    <DocLink href="/products" label="Kelola Produk" />
                    {isDeveloper && <DocLink href="/coffee-register" label="Register Kopi" />}
                    <DocLink href="/transactions" label="Transaksi" />
                    <DocLink href="/trace" label="Trace Publik" />
                </div>
            </div>

            {/* Spinner CSS animation */}
            <style jsx global>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

function DocLink({ href, label }) {
    return (
        <Link href={href} style={{
            color: 'var(--color-primary-light)',
            textDecoration: 'none',
            border: '1px solid rgba(126,212,74,0.3)',
            background: 'rgba(126,212,74,0.06)',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 900,
            transition: 'var(--transition)',
        }}>
            {label}
        </Link>
    );
}
