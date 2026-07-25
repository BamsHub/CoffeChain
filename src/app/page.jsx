'use client';
import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { STORE_WALLET, SOLANA_NETWORK, getExplorerTxUrl, normalizeExplorerUrl } from '@/lib/contractConfig';
import { calculatePaymentPricing } from '@/lib/paymentPricing';
import { canMakePayment } from '@/lib/paymentAccess';
import { useAuth } from '@/context/AuthContext';

const QRButton = dynamic(() => import('@/components/BlockchainQR/BlockchainQR'), {
    ssr: false,
    loading: () => null,
});

function isPhantomInstalled() {
    return typeof window !== 'undefined' && !!(window.solana && window.solana.isPhantom);
}

function shortenAddress(address, chars = 4) {
    if (!address) return '';
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function rupiahToSol(rupiah, ratePerSol = 2_000_000) {
    return rupiah / ratePerSol;
}

function onIdle(callback, timeout = 1200) {
    if (typeof window === 'undefined') return undefined;
    if ('requestIdleCallback' in window) {
        return window.requestIdleCallback(callback, { timeout });
    }
    return window.setTimeout(callback, 250);
}

function cancelIdle(id) {
    if (typeof window === 'undefined' || id == null) return;
    if ('cancelIdleCallback' in window) window.cancelIdleCallback(id);
    else window.clearTimeout(id);
}

function formatMidtransStatus(status) {
    const labels = {
        settlement: 'Settlement',
        capture: 'Capture',
        pending: 'Pending',
        deny: 'Ditolak',
        cancel: 'Dibatalkan',
        expire: 'Kedaluwarsa',
        failure: 'Gagal',
        snap_not_selected: 'Belum pilih metode pembayaran',
        not_available: 'Belum tersedia',
        unknown: 'Tidak diketahui',
    };
    return labels[status] || status || 'Belum tersedia';
}

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
const IconClose = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconCheck = () => <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#7ED44A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconWallet = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>;
const IconTransfer = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IconPhantomLogo = ({ size = 16 }) => (
  <img src="/solana-logo.png" alt="Solana" width={size} height={size} style={{ display: 'inline-block', objectFit: 'contain', verticalAlign: 'middle' }} />
);
const IconBank = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>;
const IconMobileQR = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
const IconClockWait = ({ size = 44 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconSuccessCircle = ({ size = 48 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#7ED44A" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>;
const IconMidtrans = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IconAlert = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>;
const IconSun = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IconMoon = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

/* ── Market Data ── */
const coffeeTypes = [
    { name: 'Arabika Gayo', grade: 'Grade A', price: 68500, change: -2.1, vol: '4,821 Ton', origin: 'Aceh' },
    { name: 'Arabika Toraja', grade: 'Grade A', price: 72000, change: +1.4, vol: '3,210 Ton', origin: 'Sulawesi' },
    { name: 'Robusta Lampung', grade: 'Grade B', price: 42000, change: +0.8, vol: '8,540 Ton', origin: 'Lampung' },
    { name: 'Arabika Flores', grade: 'Grade A', price: 75000, change: +3.2, vol: '1,980 Ton', origin: 'NTT' },
    { name: 'Arabika Mandheling', grade: 'Grade AA', price: 80000, change: -0.5, vol: '2,430 Ton', origin: 'Sumut' },
    { name: 'Liberika Riau', grade: 'Grade B', price: 38000, change: +1.8, vol: '920 Ton', origin: 'Riau' },
];

/* ── Best Sellers for Hero Carousel ── */
const BEST_SELLERS = [
    { img: 'https://images.unsplash.com/photo-1512372388054-a322888e67a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', name: 'Gayo Arabica Honey', origin: 'Aceh, Gayo', grade: 'Specialty', gradeColor: '#4a9c2e', gradeBg: 'rgba(132,224,104,0.12)', gradeBorder: 'rgba(132,224,104,0.25)', price: 'Rp 145.000', rating: 4.9, flavor: ['Karamel','Aprikot'], weight: '200g', badge: '⭐ Best Seller' },
    { img: 'https://images.unsplash.com/photo-1774801935527-289b26bcc9e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', name: 'Toraja Kalosi Natural', origin: 'Sulawesi', grade: 'Specialty', gradeColor: '#4a9c2e', gradeBg: 'rgba(132,224,104,0.12)', gradeBorder: 'rgba(132,224,104,0.25)', price: 'Rp 160.000', rating: 4.8, flavor: ['Dark Choco','Rempah'], weight: '200g', badge: '🆕 Baru' },
    { img: 'https://images.unsplash.com/photo-1769988426472-e5c665ab08df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', name: 'Kintamani Bali Natural', origin: 'Bali', grade: 'Specialty', gradeColor: '#4a9c2e', gradeBg: 'rgba(132,224,104,0.12)', gradeBorder: 'rgba(132,224,104,0.25)', price: 'Rp 155.000', rating: 4.9, flavor: ['Lemon','Jeruk Bali'], weight: '200g', badge: '⭐ Best Seller' },
    { img: 'https://images.unsplash.com/photo-1765533221476-21ba62961497?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', name: 'Papua Wamena Organic', origin: 'Papua', grade: 'Specialty', gradeColor: '#4a9c2e', gradeBg: 'rgba(132,224,104,0.12)', gradeBorder: 'rgba(132,224,104,0.25)', price: 'Rp 175.000', rating: 4.8, flavor: ['Berry','Floral'], weight: '200g', badge: '🌿 Organik' },
    { img: 'https://images.unsplash.com/photo-1775434247021-1766d422b552?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', name: 'Flores Bajawa Washed', origin: 'NTT, Bajawa', grade: 'Premium', gradeColor: '#b8860b', gradeBg: 'rgba(240,192,32,0.12)', gradeBorder: 'rgba(240,192,32,0.3)', price: 'Rp 128.000', rating: 4.7, flavor: ['Jeruk','Teh Hitam'], weight: '200g', badge: null },
];

export default function LandingPage() {
    const { user, getToken, loading: authLoading, logout } = useAuth();
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState({ farmers: 0, transactions: 0, products: 0 });
    const [activeCard, setActiveCard] = useState(0);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [orderModal, setOrderModal] = useState(false);
    const [orderForm, setOrderForm] = useState({ buyerName: '', buyerEmail: '', buyerPhone: '', quantity: 1, weight: '', paymentMethod: 'transfer' });
    const [orderResult, setOrderResult] = useState(null);
    const [ordering, setOrdering] = useState(false);
    const [checkingMidtrans, setCheckingMidtrans] = useState(false);
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [mobileMenu, setMobileMenu] = useState(false);
    const [qrConfirm, setQrConfirm] = useState({ loading: false, done: false, error: null });
    const [bankVerified, setBankVerified] = useState(false);
    const [showBuyAgain, setShowBuyAgain] = useState(false);
    const [detailModal, setDetailModal] = useState(false);
    const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);
    const [traceData, setTraceData] = useState(null);
    const [traceLoading, setTraceLoading] = useState(false);
    const [supportOpen, setSupportOpen] = useState(false);
    const [supportInput, setSupportInput] = useState('');
    const [supportMessages, setSupportMessages] = useState(() => [
        { id: 'welcome', sender: 'bot', text: 'Halo, saya asisten CoffeeChain. Saya bisa bantu pembayaran, QR sertifikasi, produk, atau pengaduan.' },
    ]);
    const solanaIntervalRef = useRef(null);
    const midtransIntervalRef = useRef(null);
    const snapPaymentActiveRef = useRef(false);
    const supportReplyTimerRef = useRef(null);

    /* ── Katalog Search & Filter ── */
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogGrade, setCatalogGrade] = useState('');
    const [catalogSort, setCatalogSort] = useState('newest');

    /* ── Admin Session State (untuk floating admin bar) ── */
    const [adminUser, setAdminUser] = useState(null);

    /* ── Phantom Wallet State ── */
    const [walletPublicKey, setWalletPublicKey] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [walletConnecting, setWalletConnecting] = useState(false);
    const [walletMenuOpen, setWalletMenuOpen] = useState(false);

    /* ── Theme State ── */
    const [theme, setTheme] = useState('dark');

    /* ── Auto-rotate hero carousel ── */
    useEffect(() => {
        const id = setInterval(() => setActiveCard(c => (c + 1) % BEST_SELLERS.length), 2800);
        return () => clearInterval(id);
    }, []);

    useEffect(() => () => {
        if (supportReplyTimerRef.current) window.clearTimeout(supportReplyTimerRef.current);
    }, []);

    function resetSupportChat() {
        if (supportReplyTimerRef.current) window.clearTimeout(supportReplyTimerRef.current);
        supportReplyTimerRef.current = null;
        setSupportInput('');
        setSupportMessages([{ id: `welcome-${Date.now()}`, sender: 'bot', text: 'Halo, saya asisten CoffeeChain. Saya bisa bantu pembayaran, QR sertifikasi, produk, atau pengaduan.' }]);
    }

    function toggleSupportChat() {
        resetSupportChat();
        setSupportOpen(open => !open);
    }

    function getSupportReply(message) {
        const text = message.toLowerCase();
        if (/(bayar|pembayaran|midtrans|phantom|qris|transfer)/.test(text)) {
            return { text: 'Pembayaran tersedia melalui Midtrans untuk Rupiah atau Phantom untuk SOL. Pilih produk lalu tekan Beli untuk melihat metode yang tersedia.' };
        }
        if (/(qr|sertifikat|sertifikasi|trace|solana)/.test(text)) {
            return { text: 'Tekan tombol QR pada produk berstatus On-Chain untuk membuka sertifikasi. Anda juga dapat memakai halaman Trace Kopi untuk memeriksa Coffee ID.' };
        }
        if (/(produk|stok|kopi|pesan|beli)/.test(text)) {
            return { text: 'Gunakan pencarian katalog untuk menemukan produk. Setiap card menampilkan stok, harga, asal, dan status sertifikasi.' };
        }
        if (/(komplain|pengaduan|keluhan|tiket|masalah|bantuan)/.test(text)) {
            return { text: 'Untuk masalah yang perlu ditindaklanjuti, buat tiket melalui Hubungi Kami. Petani dapat memantau penanganan oleh admin.', action: 'ticket' };
        }
        return { text: 'Saya belum memahami detailnya. Coba tanyakan tentang pembayaran, QR sertifikasi, produk, atau ketik pengaduan untuk membuat tiket.' };
    }

    function sendSupportMessage(value = supportInput) {
        const text = String(value || '').trim();
        if (!text) return;
        const userMessage = { id: `user-${Date.now()}`, sender: 'user', text };
        setSupportMessages(current => [...current, userMessage]);
        setSupportInput('');
        if (supportReplyTimerRef.current) window.clearTimeout(supportReplyTimerRef.current);
        supportReplyTimerRef.current = window.setTimeout(() => {
            const reply = getSupportReply(text);
            setSupportMessages(current => [...current, { id: `bot-${Date.now()}`, sender: 'bot', ...reply }]);
        }, 350);
    }

    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                setScrolled(window.scrollY > 60);
                ticking = false;
            });
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    /* ── Check admin/developer session from localStorage ── */
    useEffect(() => {
        // Load Midtrans Snap immediately on mount to prevent race conditions
        loadMidtransSnap();
        const idleId = onIdle(() => {
            const token = localStorage.getItem('cc_token');
            if (!token) return;
            fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(r => r.json())
                .then(data => {
                    if (data.success && ['admin', 'developer', 'koperasi'].includes(data.user?.role)) {
                        setAdminUser(data.user);
                    }
                })
                .catch(() => { /* ignore */ });
        });
        return () => cancelIdle(idleId);
    }, []);

    /* ── Load Midtrans Snap.js ── */
    const midtransLoadedRef = useRef(false);
    function loadMidtransSnap() {
        if (midtransLoadedRef.current) return;
        const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
        if (!clientKey) return;
        midtransLoadedRef.current = true;
        const snapUrl = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL || 'https://app.sandbox.midtrans.com/snap/snap.js';
        const script = document.createElement('script');
        script.src = snapUrl;
        script.setAttribute('data-client-key', clientKey);
        script.async = true;
        document.head.appendChild(script);
    }

    /* ── Auto-connect Phantom if already approved ── */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleAccountChanged = (newKey) => {
            if (newKey) { setWalletPublicKey(newKey.toString()); }
            else { setWalletPublicKey(null); setWalletBalance(0); }
        };
        const tryAutoConnect = async () => {
            try {
                if (window.solana && window.solana.isPhantom && window.solana.isConnected && window.solana.publicKey) {
                    const { getSolBalance } = await import('@/lib/phantom');
                    const pk = window.solana.publicKey.toString();
                    const bal = await getSolBalance(pk);
                    setWalletPublicKey(pk);
                    setWalletBalance(bal);
                }
            } catch { /* ignore */ }
        };
        const idleId = onIdle(tryAutoConnect, 1800);
        if (window.solana?.on) {
            window.solana.on('accountChanged', handleAccountChanged);
        }
        return () => {
            cancelIdle(idleId);
            window.solana?.removeListener?.('accountChanged', handleAccountChanged);
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const [prodRes, farmerRes, txRes] = await Promise.all([
                    fetch('/api/public/products', { signal: controller.signal }),
                    fetch('/api/farmers', { signal: controller.signal }),
                    fetch('/api/transactions', { signal: controller.signal }),
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
        const idleId = onIdle(load);
        return () => {
            cancelIdle(idleId);
            controller.abort();
        };
    }, []);

    useEffect(() => {
        if (detailModal && selectedDetailProduct?.coffeeId) {
            setTraceLoading(true);
            fetch(`/api/coffee-trace/${selectedDetailProduct.coffeeId}`)
                .then(r => r.json())
                .then(data => {
                    if(data.success && data.data) {
                        setTraceData(data.data);
                    } else {
                        setTraceData(null);
                    }
                }).catch(() => setTraceData(null))
                .finally(() => setTraceLoading(false));
        } else {
            setTraceData(null);
        }
    }, [detailModal, selectedDetailProduct]);

    useEffect(() => {
        if (midtransIntervalRef.current) {
            clearInterval(midtransIntervalRef.current);
            midtransIntervalRef.current = null;
        }
        const shouldPoll = orderResult?.paymentMethod === 'midtrans' &&
            orderResult?.orderId &&
            orderResult?.status !== 'paid' &&
            !['expired', 'cancel', 'deny', 'failure'].includes(orderResult?.midtransStatus);
        if (!shouldPoll) return undefined;

        midtransIntervalRef.current = setInterval(() => {
            refreshMidtransStatus(orderResult.orderId, orderResult, true);
        }, 8000);

        return () => {
            if (midtransIntervalRef.current) {
                clearInterval(midtransIntervalRef.current);
                midtransIntervalRef.current = null;
            }
        };
    }, [orderResult?.orderId, orderResult?.paymentMethod, orderResult?.status, orderResult?.midtransStatus]);

    async function handleLandingLogout() {
        if (!window.confirm('Anda yakin ingin keluar?')) return;
        await logout();
        setAdminUser(null);
    }

    /* ── Phantom Wallet Functions ── */
    async function connectWallet() {
        if (!isPhantomInstalled()) { window.open('https://phantom.app/', '_blank'); return false; }
        setWalletConnecting(true);
        try {
            const { connectPhantom, getSolBalance } = await import('@/lib/phantom');
            const { publicKey } = await connectPhantom();
            const balance = await getSolBalance(publicKey);
            setWalletPublicKey(publicKey);
            setWalletBalance(balance);
            setWalletConnecting(false);
            return true;
        } catch (err) {
            alert(err.message || 'Gagal terhubung ke Phantom Wallet');
            setWalletConnecting(false);
            return false;
        }
    }
    async function disconnectWallet() {
        const { disconnectPhantom } = await import('@/lib/phantom');
        await disconnectPhantom();
        setWalletPublicKey(null); setWalletBalance(0); setWalletMenuOpen(false);
    }

    function goToReceipt(orderId, delay = 250) {
        if (!orderId || typeof window === 'undefined') return;
        window.setTimeout(() => {
            window.location.assign(`/receipt?orderId=${encodeURIComponent(orderId)}`);
        }, delay);
    }

    async function handleOrder(e) {
        e.preventDefault();
        if (!selectedProduct) return;
        if (authLoading) {
            alert('Sesi akun masih diperiksa. Coba lagi sebentar.');
            return;
        }
        if (!user) {
            window.location.assign(`/login?next=${encodeURIComponent('/#products')}`);
            return;
        }
        if (!canMakePayment(user.role)) {
            alert('Sesi akun ini tidak memiliki izin pembayaran.');
            return;
        }
        const sessionToken = getToken();
        if (!sessionToken) {
            window.location.assign(`/login?next=${encodeURIComponent('/#products')}`);
            return;
        }
        const pm = orderForm.paymentMethod;
        const isSolMethod = pm === 'transfer' || pm === 'qr';
        if (isSolMethod && !walletPublicKey) {
            alert('Hubungkan Phantom Wallet terlebih dahulu untuk pembayaran Solana!');
            return;
        }
        // Bank/E-wallet validation
        if (pm === 'transfer-idr') {
            const acc = orderForm.accountNumber.replace(/\D/g, '');
            if (!acc || acc.length < 8 || acc.length > 20) {
                alert('Nomor rekening harus 8-20 digit.'); return;
            }
            if (!orderForm.bankName) { alert('Pilih bank terlebih dahulu.'); return; }
        }
        if (pm === 'qr-idr') {
            const phone = orderForm.ewalletPhone.replace(/\D/g, '');
            if (!phone || phone.length < 9 || phone.length > 15) {
                alert('Nomor HP e-wallet harus valid (9-15 digit).'); return;
            }
            if (!orderForm.ewalletApp) { alert('Pilih aplikasi e-wallet.'); return; }
        }

        /* ── Midtrans Snap Payment ── */
        if (pm === 'midtrans') {
            if (snapPaymentActiveRef.current) {
                alert('Popup pembayaran Midtrans masih aktif. Selesaikan atau tutup popup pembayaran dulu.');
                return;
            }
            snapPaymentActiveRef.current = true;
            setOrdering(true);
            try {
                const res = await fetch('/api/midtrans/create-transaction', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${sessionToken}`,
                    },
                    body: JSON.stringify({
                        productId: selectedProduct.id,
                        weight: orderForm.weight || selectedProduct.weight?.[0],
                        quantity: orderForm.quantity,
                        buyerName: orderForm.buyerName,
                        buyerEmail: orderForm.buyerEmail,
                        buyerPhone: orderForm.buyerPhone || undefined,
                        recipientName: orderForm.recipientName || orderForm.buyerName,
                        shippingAddress: orderForm.shippingAddress || undefined,
                        shippingCity: orderForm.shippingCity || undefined,
                        shippingProvince: orderForm.shippingProvince || undefined,
                        shippingPostal: orderForm.shippingPostal || undefined,
                        shippingPhone: orderForm.shippingPhone || orderForm.buyerPhone || undefined,
                    }),
                });
                const data = await res.json();
                if (data.success && data.snapToken) {
                    const midtransOrder = {
                        ...data.data,
                        snapToken: data.snapToken,
                        redirectUrl: data.redirectUrl || null,
                        receiptUrl: data.receiptUrl || data.data?.receiptUrl || null,
                    };
                    // Jika window.snap belum siap, tunggu sebentar (maks 2 detik)
                    if (!window.snap) {
                        let retries = 4;
                        while (retries > 0 && !window.snap) {
                            await new Promise(r => setTimeout(r, 500));
                            retries--;
                        }
                    }
                    if (!window.snap) {
                        snapPaymentActiveRef.current = false;
                        setOrdering(false);
                        alert('Midtrans Snap belum siap. Hubungan internet Anda lambat atau script diblokir. Refresh halaman dan coba lagi.');
                        return;
                    }
                    const refreshAfterSnap = (baseOrder, delay = 1200) => {
                        window.setTimeout(() => {
                            refreshMidtransStatus(baseOrder.orderId, baseOrder, true);
                        }, delay);
                    };
                    const finishSnapPayment = () => {
                        snapPaymentActiveRef.current = false;
                        setOrdering(false);
                    };
                    try {
                        window.snap.pay(data.snapToken, {
                        onSuccess: (result) => {
                            finishSnapPayment();
                            const nextOrder = {
                                ...midtransOrder,
                                status: 'paid',
                                midtransStatus: result.transaction_status || 'capture',
                                midtransStatusMessage: result.status_message || 'Pembayaran berhasil',
                            };
                            setOrderResult(nextOrder);
                            setProducts(prev => prev.map(p =>
                                p.id === selectedProduct.id
                                    ? { ...p, stock: data.data.stockLeft ?? Math.max(0, (p.stock ?? 0) - orderForm.quantity) }
                                    : p
                            ));
                            refreshAfterSnap(nextOrder, 250);
                            goToReceipt(nextOrder.orderId, 1800);
                        },
                        onPending: (result) => {
                            finishSnapPayment();
                            const nextOrder = {
                                ...midtransOrder,
                                status: 'pending',
                                midtransStatus: result.transaction_status || 'pending',
                                midtransStatusMessage: result.status_message || 'Menunggu pembayaran',
                            };
                            setOrderResult(nextOrder);
                            setProducts(prev => prev.map(p =>
                                p.id === selectedProduct.id
                                    ? { ...p, stock: data.data.stockLeft ?? Math.max(0, (p.stock ?? 0) - orderForm.quantity) }
                                    : p
                            ));
                            refreshAfterSnap(nextOrder);
                        },
                        onError: (result) => {
                            finishSnapPayment();
                            alert('Pembayaran Midtrans gagal: ' + (result.status_message || 'Terjadi kesalahan'));
                        },
                        onClose: () => {
                            finishSnapPayment();
                            const nextOrder = {
                                ...midtransOrder,
                                status: 'pending',
                                midtransStatus: 'pending',
                                midtransStatusMessage: 'Popup pembayaran ditutup. Anda bisa melanjutkan pembayaran tanpa membuat pesanan baru.',
                            };
                            setOrderResult(nextOrder);
                            refreshAfterSnap(nextOrder, 1800);
                        },
                        });
                    } catch (snapErr) {
                        finishSnapPayment();
                        alert(snapErr.message || 'Popup Midtrans gagal dibuka. Coba lagi.');
                    }
                } else {
                    snapPaymentActiveRef.current = false;
                    alert(data.message || 'Gagal membuat transaksi Midtrans');
                    setOrdering(false);
                }
            } catch (err) {
                snapPaymentActiveRef.current = false;
                alert(err.message || 'Terjadi kesalahan. Coba lagi.');
                setOrdering(false);
            }
            return;
        }

        setOrdering(true);
        let txSignature = null;
        const targetWallet = selectedProduct.paymentWallet || STORE_WALLET;

        try {
            if (pm === 'transfer') {
                const solAmt = rupiahToSol(totalPrice);
                try {
                    const { sendSolTransaction } = await import('@/lib/phantom');
                    txSignature = await sendSolTransaction(walletPublicKey, targetWallet, solAmt);
                }
                catch (txErr) { alert(`Transaksi Solana gagal: ${txErr.message}`); setOrdering(false); return; }
            }
            const res = await fetch('/api/public/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionToken}`,
                },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    weight: orderForm.weight || selectedProduct.weight?.[0],
                    quantity: orderForm.quantity,
                    paymentMethod: pm,
                    buyerName: orderForm.buyerName,
                    buyerEmail: orderForm.buyerEmail,
                    buyerPhone: orderForm.buyerPhone,
                    recipientName: orderForm.recipientName || orderForm.buyerName,
                    shippingAddress: orderForm.shippingAddress || undefined,
                    shippingCity: orderForm.shippingCity || undefined,
                    shippingProvince: orderForm.shippingProvince || undefined,
                    shippingPostal: orderForm.shippingPostal || undefined,
                    shippingPhone: orderForm.shippingPhone || orderForm.buyerPhone || undefined,
                    walletAddress: walletPublicKey || null,
                    txSignature,
                    bankName: pm === 'transfer-idr' ? orderForm.bankName : undefined,
                    accountNumber: pm === 'transfer-idr' ? orderForm.accountNumber.replace(/\D/g, '') : undefined,
                    ewalletApp: pm === 'qr-idr' ? orderForm.ewalletApp : undefined,
                    ewalletPhone: pm === 'qr-idr' ? orderForm.ewalletPhone.replace(/\D/g, '') : undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setOrderResult(data.data);
                setQrConfirm({ loading: false, done: false, error: null });
                setProducts(prev => prev.map(p =>
                    p.id === selectedProduct.id
                        ? { ...p, stock: data.data.stockLeft ?? Math.max(0, (p.stock ?? 0) - orderForm.quantity) }
                        : p
                ));
                if (pm === 'qr') {
                    // Solana Pay QR
                    const solAmt = rupiahToSol(totalPrice).toFixed(9);
                    const memo = encodeURIComponent(data.data.orderId);
                    const label = encodeURIComponent('CoffeeChain');
                    const message = encodeURIComponent(selectedProduct.name);
                    const solanaPay = `solana:${targetWallet}?amount=${solAmt}&label=${label}&message=${message}&memo=${memo}`;
                    try {
                        const QRCode = (await import('qrcode')).default;
                        const url = await QRCode.toDataURL(solanaPay, { width: 240, margin: 2, color: { dark: '#7ED44A', light: '#0a120a' } });
                        setQrDataUrl(url);
                    } catch { setQrDataUrl(null); }

                    // Auto-poll Solana testnet for incoming payment to targetWallet
                    if (solanaIntervalRef.current) clearInterval(solanaIntervalRef.current);
                    const capturedOrderId = data.data.orderId;
                    try {
                        const rpc = SOLANA_NETWORK;
                        const baseRes = await fetch(rpc, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getSignaturesForAddress', params:[targetWallet, { limit:1 }] }),
                        });
                        const baseData = await baseRes.json();
                        const latestSig = baseData.result?.[0]?.signature ?? null;
                        let pollCount = 0;
                        solanaIntervalRef.current = setInterval(async () => {
                            pollCount++;
                            if (pollCount > 72) { clearInterval(solanaIntervalRef.current); solanaIntervalRef.current = null; return; } // 6 min timeout
                            try {
                                const checkRes = await fetch(rpc, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getSignaturesForAddress', params:[targetWallet, { limit:1 }] }),
                                });
                                const checkData = await checkRes.json();
                                const newSig = checkData.result?.[0]?.signature ?? null;
                                if (newSig && newSig !== latestSig) {
                                    clearInterval(solanaIntervalRef.current);
                                    solanaIntervalRef.current = null;
                                    const confirmRes = await fetch(`/api/public/order/${encodeURIComponent(capturedOrderId)}`, {
                                        method: 'PATCH',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            Authorization: `Bearer ${sessionToken}`,
                                        },
                                        body: JSON.stringify({ txSignature: newSig }),
                                    });
                                    const confirmData = await confirmRes.json().catch(() => null);
                                    if (!confirmRes.ok || !confirmData?.success) {
                                        setOrderResult(prev => ({
                                            ...prev,
                                            status: prev?.status || 'pending',
                                            midtransStatusMessage: confirmData?.message || 'Transaksi Solana belum valid untuk order ini.',
                                        }));
                                        return;
                                    }
                                    setOrderResult(prev => ({
                                        ...prev,
                                        ...(confirmData?.data || {}),
                                        status: 'paid',
                                        txSignature: confirmData?.data?.txSignature || newSig,
                                        explorerUrl: normalizeExplorerUrl(confirmData?.data?.explorerUrl || getExplorerTxUrl(newSig)),
                                    }));
                                    goToReceipt(capturedOrderId);
                                }
                            } catch { /* ignore poll errors */ }
                        }, 5000);
                    } catch { /* RPC unavailable, skip auto-poll */ }
                } else if (pm === 'qr-idr') {
                    // Rupiah QR — encode GoPay P2P transfer link for 081389629074
                    const gopayNumber = '081389629074';
                    const qrContent = `https://p.gojek.com/gopay/${gopayNumber}?amount=${data.data.totalPrice}&note=${encodeURIComponent('CoffeeChain - ' + data.data.orderId)}`;
                    try {
                        const QRCode = (await import('qrcode')).default;
                        const url = await QRCode.toDataURL(qrContent, { width: 240, margin: 2, color: { dark: '#F5A623', light: '#0a120a' } });
                        setQrDataUrl(url);
                    } catch { setQrDataUrl(null); }
                }
                if (data.data?.status === 'paid') {
                    goToReceipt(data.data.orderId);
                }
            } else {
                alert(data.message || 'Gagal membuat pesanan');
            }
        } catch (err) { alert(err.message || 'Terjadi kesalahan. Coba lagi.'); }
        setOrdering(false);
    }

    async function refreshMidtransStatus(orderId = orderResult?.orderId, baseOrder = null, silent = false) {
        if (!orderId) return;
        if (!silent) setCheckingMidtrans(true);
        try {
            const sessionToken = getToken();
            if (!sessionToken) throw new Error('Silakan login kembali untuk mengecek status pembayaran');
            const res = await fetch(`/api/midtrans/status?orderId=${encodeURIComponent(orderId)}`, {
                cache: 'no-store',
                headers: { Authorization: `Bearer ${sessionToken}` },
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Gagal mengecek status Midtrans');

            setOrderResult(prev => ({
                ...(prev || baseOrder || {}),
                ...data.data,
                status: data.data.status || prev?.status || baseOrder?.status || 'pending',
                midtransStatus: data.data.midtransStatus,
                midtransStatusMessage: data.data.midtransStatusMessage,
            }));
            if (data.data.status === 'paid') goToReceipt(orderId);
        } catch (err) {
            if (!silent) alert(err.message || 'Gagal mengecek status Midtrans');
        } finally {
            if (!silent) setCheckingMidtrans(false);
        }
    }

    async function resumeMidtransPayment() {
        if (!orderResult?.snapToken || orderResult.status === 'paid') return;
        if (snapPaymentActiveRef.current) {
            alert('Popup pembayaran Midtrans masih aktif. Selesaikan atau tutup popup pembayaran dulu.');
            return;
        }

        snapPaymentActiveRef.current = true;
        setCheckingMidtrans(true);
        try {
            loadMidtransSnap();
            if (!window.snap) {
                let retries = 6;
                while (retries > 0 && !window.snap) {
                    await new Promise(r => setTimeout(r, 500));
                    retries--;
                }
            }
            if (!window.snap) throw new Error('Midtrans Snap belum siap. Refresh halaman dan coba lagi.');

            const finish = () => {
                snapPaymentActiveRef.current = false;
                setCheckingMidtrans(false);
            };
            const refreshLater = (delay = 1200) => {
                window.setTimeout(() => refreshMidtransStatus(orderResult.orderId, orderResult, true), delay);
            };

            window.snap.pay(orderResult.snapToken, {
                onSuccess: (result) => {
                    finish();
                    setOrderResult(prev => ({
                        ...prev,
                        status: 'paid',
                        midtransStatus: result.transaction_status || 'capture',
                        midtransStatusMessage: result.status_message || 'Pembayaran berhasil',
                    }));
                    refreshLater(250);
                    goToReceipt(orderResult.orderId, 1800);
                },
                onPending: (result) => {
                    finish();
                    setOrderResult(prev => ({
                        ...prev,
                        status: 'pending',
                        midtransStatus: result.transaction_status || 'pending',
                        midtransStatusMessage: result.status_message || 'Menunggu pembayaran',
                    }));
                    refreshLater();
                },
                onError: (result) => {
                    finish();
                    alert('Pembayaran Midtrans gagal: ' + (result.status_message || 'Terjadi kesalahan'));
                    refreshLater(1500);
                },
                onClose: () => {
                    finish();
                    setOrderResult(prev => ({
                        ...prev,
                        status: prev?.status || 'pending',
                        midtransStatus: prev?.midtransStatus || 'pending',
                        midtransStatusMessage: 'Popup pembayaran ditutup. Anda bisa melanjutkan pembayaran tanpa membuat pesanan baru.',
                    }));
                    refreshLater(1800);
                },
            });
        } catch (err) {
            snapPaymentActiveRef.current = false;
            setCheckingMidtrans(false);
            alert(err.message || 'Popup Midtrans gagal dibuka. Coba lagi.');
        }
    }

    function openOrder(product, defaultPayment = 'midtrans') {
        if (authLoading) {
            alert('Sesi akun masih diperiksa. Coba lagi sebentar.');
            return;
        }
        if (!user) {
            window.location.assign(`/login?next=${encodeURIComponent('/#products')}`);
            return;
        }
        if (!canMakePayment(user.role)) {
            alert('Sesi akun ini tidak memiliki izin pembayaran.');
            return;
        }
        loadMidtransSnap(); // Lazy-load Midtrans SDK on first order
        if (solanaIntervalRef.current) { clearInterval(solanaIntervalRef.current); solanaIntervalRef.current = null; }
        setSelectedProduct(product);
        setOrderForm({ buyerName: user.name || '', buyerEmail: user.email || '', buyerPhone: user.phone || '', quantity: 1, weight: product.weight?.[0] || '', paymentMethod: defaultPayment, bankName: 'BCA', accountNumber: '', ewalletApp: 'GoPay', ewalletPhone: '', recipientName: user.name || '', shippingAddress: '', shippingCity: '', shippingProvince: '', shippingPostal: '', shippingPhone: user.phone || '' });
        setOrderResult(null);
        setQrDataUrl(null);
        setQrConfirm({ loading: false, done: false, error: null });
        setBankVerified(false);
        setShowBuyAgain(false);
        setOrderModal(true);
    }

    const weightIdx = selectedProduct && orderForm.weight ? (selectedProduct.weight?.indexOf(orderForm.weight) ?? 0) : 0;
    const unitPrice = selectedProduct?.pricePerUnit?.[weightIdx] ?? 0;
    const pricing = calculatePaymentPricing({ unitPrice, quantity: orderForm.quantity });
    const totalPrice = pricing.totalPrice;
    const solAmount = rupiahToSol(totalPrice);

    return (
        <div data-theme={theme} style={{ minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background:'var(--cc-bg)', color:'var(--cc-text)', position: 'relative', overflowX: 'hidden',
            backgroundImage: `var(--cc-bg-grad), url('/coffee-bg.jpg')`,
            backgroundSize: 'auto, cover',
            backgroundPosition: 'center, center',
            backgroundAttachment: 'scroll, fixed',
        }}>

            {/* ── GLOBAL RESPONSIVE STYLES ── */}
            <style>{`
                *, *::before, *::after { box-sizing: border-box; }
                html { scroll-behavior: smooth; }
                body { overflow-x: hidden; }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin { to{transform:rotate(360deg)} }
                @keyframes wa-slide-up { from{opacity:0;transform:translateY(16px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes wa-pop { 0%{transform:scale(0.8)} 60%{transform:scale(1.08)} 100%{transform:scale(1)} }
                @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }

                /* Navigation */
                .cc-nav-links { display:flex; gap:4px; align-items:center; }
                .cc-mobile-toggle { display:none; background:none; border:none; color:#f0f0f0; cursor:pointer; padding:8px; }

                /* Grids */
                .cc-products-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:20px; }
                .cc-market-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:16px; }
                .cc-how-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:20px; }
                .cc-hero-btns { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
                .cc-stats-row { display:flex; align-items:stretch; flex-wrap:wrap; border-radius:20px; overflow:hidden; background:var(--cc-card-bg); border:1px solid var(--cc-card-border); backdrop-filter:blur(8px); }

                /* Cards */
                .cc-card { background:var(--cc-card-bg); border:1px solid var(--cc-card-border); border-radius:16px; transition:transform 0.3s,border-color 0.3s,box-shadow 0.3s; }
                .cc-card:hover { transform:translateY(-4px); border-color:rgba(132,224,104,0.25); box-shadow:0 12px 40px rgba(0,0,0,0.3),0 0 20px rgba(132,224,104,0.05); }

                /* Buttons */
                .cc-btn-green { background:linear-gradient(135deg,#5cba3c,#84e068); color:#0d1f08; font-weight:700; border:none; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; text-decoration:none; }
                .cc-btn-green:hover { opacity:0.9; transform:scale(1.02); }
                .cc-btn-green:active { transform:scale(0.96); }
                .cc-btn-phantom { background:linear-gradient(135deg,#6b46c4,#9b59e8); color:#fff; font-weight:700; border:1px solid rgba(171,159,242,0.4); border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; text-decoration:none; }
                .cc-btn-phantom:hover { opacity:0.9; transform:scale(1.02); }
                .cc-btn-phantom:active { transform:scale(0.96); }
                .cc-btn-outline { border:1px solid var(--cc-card-border); color:var(--cc-text); background:var(--cc-input-bg); border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; text-decoration:none; transition:all 0.2s; }
                .cc-btn-outline:hover { border-color:rgba(132,224,104,0.3); color:#84e068; }
                .cc-btn-midtrans { background:linear-gradient(135deg,#0070b8,#00aef0); color:#fff; font-weight:700; border:none; border-radius:12px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all 0.2s; }
                .cc-btn-midtrans:hover { opacity:0.9; }

                /* Inputs */
                .cc-inp { width:100%; padding:11px 14px; border-radius:12px; background:var(--cc-input-bg); border:1px solid var(--cc-input-border); color:var(--cc-text); font-size:14px; outline:none; box-sizing:border-box; font-family:'Inter',sans-serif; transition:border-color 0.2s; }
                .cc-inp:focus { border-color:rgba(132,224,104,0.4); box-shadow:0 0 0 3px rgba(132,224,104,0.08); }
                .cc-inp::placeholder { color:#4b5563; }
                .cc-inp select { background:rgba(20,20,22,0.9); }

                /* Stock badges */
                .cc-stock-in { background:rgba(132,224,104,0.12); color:#84e068; border:1px solid rgba(132,224,104,0.3); }
                .cc-stock-low { background:rgba(240,192,32,0.12); color:#f0c020; border:1px solid rgba(240,192,32,0.3); }
                .cc-stock-out { background:rgba(248,113,113,0.1); color:#f87171; border:1px solid rgba(248,113,113,0.25); }
                .cc-stock-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; padding:3px 9px; border-radius:100px; }

                /* Spinner */
                .cc-spinner { width:14px; height:14px; border:2px solid var(--cc-divider); border-top-color:var(--cc-text); border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; flex-shrink:0; }

                /* Responsive */
                @media (max-width: 768px) {
                    .cc-nav-links { display:none; }
                    .cc-nav-links.open { display:flex; flex-direction:column; position:fixed; top:72px; left:0; right:0; background:var(--cc-nav-mobile-bg); padding:16px; gap:4px; z-index:99; border-bottom:1px solid var(--cc-divider); backdrop-filter:blur(16px); }
                    .cc-mobile-toggle { display:flex; }
                    .cc-products-grid { grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:12px; }
                    .cc-how-grid { grid-template-columns:1fr 1fr; }
                    .cc-market-grid { grid-template-columns:1fr; }
                    .cc-stats-row { flex-direction:column; }
                    .cc-hero-btns { flex-direction:column; align-items:center; }
                }
                @media (max-width: 480px) {
                    .cc-how-grid { grid-template-columns:1fr; }
                    .cc-products-grid { grid-template-columns:1fr 1fr; gap:8px; }
                }
            `}</style>

            {/* ── AMBIENT GLOW ── */}
            <div aria-hidden="true" style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, transition:'all 0.5s', background: theme === 'dark'
                ? 'radial-gradient(ellipse 60% 40% at 50% -10%, rgba(132,224,104,0.07) 0%, transparent 70%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(171,159,242,0.05) 0%, transparent 60%)'
                : 'radial-gradient(ellipse 60% 40% at 50% -10%, rgba(132,224,104,0.12) 0%, transparent 70%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(171,159,242,0.08) 0%, transparent 60%)'
            }} />

            {/* ── NAVBAR ── */}
            <nav style={{ position:'sticky', top:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 clamp(16px,3vw,32px)', height:72, background:'var(--cc-nav-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderBottom:'1px solid var(--cc-divider)', transition:'all 0.3s' }}>
                {/* Logo */}
                <Link href="/" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#84e068,#4ab830)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, boxShadow:'0 0 12px rgba(132,224,104,0.35)' }}>
                        <img src="/coffeechain-logo.png" alt="CoffeeChain" width={28} height={28} style={{ objectFit:'contain' }} onError={(e) => { e.currentTarget.src = '/coffeechain-logo-20260528.png'; }} />
                    </div>
                    <div>
                        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:16, color:'var(--cc-text)', letterSpacing:'-0.5px', lineHeight:1 }}>CoffeeChain</div>
                        <div style={{ fontSize:9, color:'var(--cc-text-highlight)', letterSpacing:'0.18em', textTransform:'uppercase', fontWeight:600 }}>BLOCKCHAIN KOPI</div>
                    </div>
                </Link>

                {/* Desktop Nav Links */}
                <div className={`cc-nav-links${mobileMenu ? ' open' : ''}`}>
                    {[['#products','Produk'],['#market','Harga Pasar'],['#how','Cara Kerja'],['/trace','Trace Kopi'],['/guide','Panduan'],['/documentation','Dokumentasi'],['/contact','Kontak']].map(([href, label]) => (
                        <a key={href} href={href} onClick={() => setMobileMenu(false)}
                            style={{ color:'var(--cc-text-secondary)', fontSize:14, padding:'9px 14px', borderRadius:8, textDecoration:'none', fontWeight:500, transition:'color 0.2s' }}>
                            {label}
                        </a>
                    ))}
                    <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label="Toggle Theme" style={{ background:'var(--cc-input-bg)', border:'1px solid var(--cc-input-border)', color:'var(--cc-text)', borderRadius:8, padding:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition: 'all 0.2s' }}>
                        {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
                    </button>
                    {/* Phantom Wallet */}
                    {walletPublicKey ? (
                        <div style={{ position:'relative' }}>
                            <button onClick={() => setWalletMenuOpen(o => !o)}
                                style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, background:'rgba(107,70,196,0.25)', border:'1px solid rgba(171,159,242,0.4)', color:'var(--cc-text)', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                                <IconPhantomLogo size={16} />
                                <span>{shortenAddress(walletPublicKey)}</span>
                                <span style={{ color:'var(--cc-text-highlight)', fontSize:11 }}>{walletBalance.toFixed(3)} SOL</span>
                                <span style={{ width:6, height:6, borderRadius:'50%', background:'#84e068', display:'inline-block', animation:'pulse 2s infinite' }} />
                            </button>
                            {walletMenuOpen && (
                                <div style={{ position:'absolute', top:'110%', right:0, background:'#1e1e22', border:'1px solid var(--cc-divider)', borderRadius:12, padding:8, minWidth:200, zIndex:200, boxShadow:'0 20px 40px rgba(0,0,0,0.4)' }}>
                                    <div style={{ padding:'6px 10px', fontSize:11, color:'var(--cc-text-muted)', borderBottom:'1px solid var(--cc-divider)', marginBottom:6 }}>
                                        {shortenAddress(walletPublicKey, 6)}<br />
                                        <span style={{ color:'var(--cc-text-highlight)', fontWeight:700 }}>{walletBalance.toFixed(4)} SOL</span>
                                    </div>
                                    <button onClick={disconnectWallet} style={{ width:'100%', padding:'8px 10px', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:8, color:'#f87171', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                                        <IconClose /> Putuskan Koneksi
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button onClick={connectWallet} disabled={walletConnecting} className="cc-btn-phantom" style={{ padding:'9px 16px', fontSize:13 }}>
                            {walletConnecting ? <span className="cc-spinner" /> : <IconPhantomLogo size={16} />}
                            {walletConnecting ? 'Menghubungkan...' : 'Phantom Wallet'}
                        </button>
                    )}
                    <Link href="/login" className="cc-btn-outline" onClick={() => setMobileMenu(false)} style={{ padding:'9px 14px', fontSize:13 }}>
                        <IconLock /> Masuk
                    </Link>
                    {adminUser && (
                        <button onClick={handleLandingLogout} style={{ padding:'9px 14px', fontSize:13, borderRadius:12, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', color:'#f87171', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
                            <IconClose /> Keluar
                        </button>
                    )}
                </div>

                {/* Mobile toggle */}
                <button className="cc-mobile-toggle" onClick={() => setMobileMenu(m => !m)} aria-label="Menu">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        {mobileMenu ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
                    </svg>
                </button>
            </nav>

            {/* ── ADMIN BAR ── */}
            {adminUser && (
                <div style={{ position:'relative', zIndex:30, background:'rgba(17,17,19,0.98)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(132,224,104,0.2)', padding:'0 clamp(16px,3vw,32px)' }}>
                    <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'flex-end', height:44, gap:8, flexWrap:'wrap' }}>
                        <Link href="/dashboard" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, background:'rgba(132,224,104,0.12)', border:'1px solid rgba(132,224,104,0.25)', color:'var(--cc-text-highlight)', fontSize:12, fontWeight:600, textDecoration:'none' }}>
                            <IconPackage /> Dashboard
                        </Link>
                        <Link href="/coffee-register" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, background:'var(--cc-card-bg)', border:'1px solid var(--cc-divider)', color:'var(--cc-text-secondary)', fontSize:12, fontWeight:500, textDecoration:'none' }}>
                            <IconChain /> Register Kopi
                        </Link>
                        <Link href="/documentation" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, background:'var(--cc-card-bg)', border:'1px solid var(--cc-divider)', color:'var(--cc-text-secondary)', fontSize:12, fontWeight:500, textDecoration:'none' }}>
                            Dokumentasi
                        </Link>
                    </div>
                </div>
            )}

            {/* ── HERO SECTION ── */}
            <section style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', maxWidth:1500, margin:'0 auto', minHeight:'88vh', padding:'64px clamp(24px,4vw,64px)', gap:'clamp(56px,7vw,112px)', animation:'fadeUp 0.6s ease' }}>

                {/* ── LEFT: Text Content ── */}
                <div style={{ flex:'1 1 620px', maxWidth:680, minWidth:0, display:'flex', flexDirection:'column' }}>
                    {/* Badge */}
                    <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:100, background:'rgba(132,224,104,0.08)', border:'1px solid rgba(132,224,104,0.25)', color:'var(--cc-text-highlight)', fontSize:11, fontWeight:600, letterSpacing:'0.12em', marginBottom:28, textTransform:'uppercase', alignSelf:'flex-start' }}>
                        <IconChain /> BLOCKCHAIN TRANSPARAN · ON SOLANA
                    </div>

                    <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(2.4rem,5vw,4rem)', fontWeight:900, lineHeight:1.08, letterSpacing:'-0.025em', marginBottom:24 }}>
                        <span style={{ background:'var(--cc-text-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Kopi Premium</span>
                        <br /><span style={{ color:'var(--cc-text)' }}>Langsung dari</span>
                        <br /><span style={{ background:'var(--cc-text-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Petani Nusantara</span>
                    </h1>

                    <p style={{ maxWidth:460, fontSize:'clamp(14px,1.6vw,16px)', color:'var(--cc-text-secondary)', lineHeight:1.8, marginBottom:36 }}>
                        Platform blockchain pertama untuk industri kopi Indonesia. Bayar via{' '}
                        <span style={{ color:'var(--cc-text-highlight)', fontWeight:600, padding:'1px 6px', borderRadius:4, background:'rgba(132,224,104,0.12)', border:'1px solid rgba(132,224,104,0.25)' }}>Transfer Bank / QR Rupiah</span>
                        {' '}atau{' '}
                        <span style={{ color:'#ab9ff2', fontWeight:600, padding:'1px 6px', borderRadius:4, background:'rgba(171,159,242,0.12)', border:'1px solid rgba(171,159,242,0.25)', whiteSpace:'nowrap' }}>Phantom Wallet Solana</span>.
                    </p>

                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:48, flexWrap:'wrap' }}>
                        <a href="#products" className="cc-btn-green" style={{ padding:'14px 28px', fontSize:15, boxShadow:'0 0 24px rgba(132,224,104,0.3)' }}>
                            <IconCart /> Belanja Sekarang
                        </a>
                        {walletPublicKey ? (
                            <div style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'12px 20px', borderRadius:12, background:'rgba(107,70,196,0.2)', border:'1px solid rgba(171,159,242,0.35)', fontSize:13, color:'var(--cc-text)' }}>
                                <IconPhantomLogo size={18} />
                                <span style={{ fontWeight:600 }}>{shortenAddress(walletPublicKey)}</span>
                                <span style={{ color:'var(--cc-text-highlight)', fontWeight:700 }}>{walletBalance.toFixed(3)} SOL</span>
                            </div>
                        ) : (
                            <button onClick={connectWallet} disabled={walletConnecting} className="cc-btn-phantom" style={{ padding:'14px 24px', fontSize:15, boxShadow:'0 0 24px rgba(107,70,196,0.25)' }}>
                                {walletConnecting ? <span className="cc-spinner" /> : <IconPhantomLogo size={18} />}
                                {walletConnecting ? 'Menghubungkan...' : 'Connect Phantom'}
                            </button>
                        )}
                    </div>

                    {/* Stats bar */}
                    <div className="cc-stats-row" style={{ alignSelf:'flex-start' }}>
                        {[
                            { icon:<IconFarmer />, value: loading ? '–' : `${stats.farmers}+`, label:'Petani Bergabung' },
                            { icon:<IconPackage />, value: loading ? '–' : `${stats.products}+`, label:'Produk Kopi' },
                            { icon:<IconTx />, value: loading ? '–' : `${stats.transactions}+`, label:'Transaksi' },
                            { icon:<IconSolana />, value:'100%', label:'On-Chain Solana' },
                        ].map(({ icon, value, label }, i, arr) => (
                            <div key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'16px 20px', borderRight: i < arr.length-1 ? '1px solid var(--cc-divider)' : 'none', minWidth:100 }}>
                                <div style={{ color:'rgba(132,224,104,0.6)', display:'flex' }}>{icon}</div>
                                <span style={{ fontSize:'clamp(18px,3vw,26px)', fontWeight:800, background:'var(--cc-text-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', fontFamily:"'Space Grotesk',sans-serif", lineHeight:1 }}>{value}</span>
                                <span style={{ fontSize:10, color:'var(--cc-text-muted)', textAlign:'center', lineHeight:1.3 }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── RIGHT: Auto-sliding Best Seller Carousel ── */}
                <div className="cc-hero-carousel-wrap" style={{ flex:'1 1 520px', width:'100%', maxWidth:620, minWidth:0, display:'flex', flexDirection:'column', alignItems:'stretch', gap:16 }}>
                    <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--cc-text-highlight)', alignSelf:'flex-start' }}>Produk Terlaris</p>

                    {/* Card viewport */}
                    <div style={{ position:'relative', width:'100%', height:'clamp(600px,68vh,680px)', borderRadius:28, overflow:'hidden', boxShadow:'0 28px 80px rgba(0,0,0,0.32), 0 0 48px rgba(132,224,104,0.07)', flexShrink:0 }}>
                        {BEST_SELLERS.map((p, i) => (
                            <div key={p.name} style={{
                                position:'absolute', inset:0, display:'flex', flexDirection:'column',
                                background:'var(--cc-card-bg)', border:'1px solid var(--cc-card-border)',
                                backdropFilter:'blur(16px)',
                                opacity: i === activeCard ? 1 : 0,
                                transform: i === activeCard ? 'translateX(0)' : 'translateX(28px)',
                                transition:'opacity 0.5s ease, transform 0.5s ease',
                                pointerEvents: i === activeCard ? 'auto' : 'none',
                                visibility: i === activeCard ? 'visible' : 'hidden',
                            }}>
                                {/* Photo */}
                                <div style={{ position:'relative', height:'52%', minHeight:310, flexShrink:0, overflow:'hidden' }}>
                                    <img src={p.img} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:100, background:'linear-gradient(to top, var(--cc-bg), transparent)' }} />
                                    <div style={{ position:'absolute', top:12, right:12, display:'flex', alignItems:'center', gap:6, padding:'3px 10px', borderRadius:100, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', color:'#84e068', border:'1px solid rgba(132,224,104,0.3)', fontSize:10, fontWeight:600 }}>
                                        <span style={{ width:6, height:6, borderRadius:'50%', background:'#84e068', animation:'pulse 1.5s infinite' }} /> On-Chain
                                    </div>
                                    {p.badge && (
                                        <div style={{ position:'absolute', top:12, left:12, padding:'3px 10px', borderRadius:100, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', color:'#f0c020', fontSize:10, fontWeight:700 }}>{p.badge}</div>
                                    )}
                                </div>
                                {/* Body */}
                                <div style={{ display:'flex', flexDirection:'column', flex:1, padding:'16px 20px 20px' }}>
                                    <span style={{ display:'inline-flex', alignSelf:'flex-start', padding:'2px 10px', borderRadius:100, fontSize:10, fontWeight:700, marginBottom:8, background:p.gradeBg, color:p.gradeColor, border:`1px solid ${p.gradeBorder}` }}>{p.grade} Grade</span>
                                    <h4 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:18, lineHeight:1.2, color:'var(--cc-text)', marginBottom:6 }}>{p.name}</h4>
                                    <div style={{ fontSize:12, color:'var(--cc-text-muted)', marginBottom:10 }}>📍 {p.origin}</div>
                                    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                                        {p.flavor.map(f => <span key={f} style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'var(--cc-input-bg)', color:'var(--cc-text-secondary)', border:'1px solid var(--cc-card-border)' }}>{f}</span>)}
                                    </div>
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', paddingTop:12, borderTop:'1px solid var(--cc-divider)' }}>
                                        <div>
                                            <div style={{ fontSize:10, color:'var(--cc-text-dim)', marginBottom:2 }}>Harga / {p.weight}</div>
                                            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:800, background:'linear-gradient(135deg,#4a9c2e,#84e068)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{p.price}</div>
                                        </div>
                                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:2 }}>
                                                {[1,2,3,4,5].map(s => <span key={s} style={{ color:'#f0c020', fontSize:12 }}>★</span>)}
                                            </div>
                                            <span style={{ fontSize:10, color:'var(--cc-text-dim)' }}>{p.rating} rating</span>
                                        </div>
                                    </div>
                                    <a href="#products" className="cc-btn-green" style={{ marginTop:14, justifyContent:'center', padding:'11px', fontSize:13, width:'100%' }}>
                                        <IconCart /> Tambah ke Keranjang
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dot indicators */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                        {BEST_SELLERS.map((_, i) => (
                            <button key={i} onClick={() => setActiveCard(i)} style={{
                                borderRadius:100, border:'none', cursor:'pointer', transition:'all 0.3s',
                                width: i === activeCard ? 24 : 8, height:8,
                                background: i === activeCard ? '#84e068' : 'var(--cc-card-border)',
                                padding:0,
                            }} />
                        ))}
                    </div>
                </div>
            </section>
            <style>{`.cc-hero-carousel-wrap { display: flex !important; } @media (max-width: 1024px) { .cc-hero-carousel-wrap { display: none !important; } }`}</style>

            {/* ── PRODUCTS CATALOG ── */}
            <section id="products" style={{ position:'relative', zIndex:10, padding:'clamp(40px,8vw,80px) clamp(16px,4vw,32px)', scrollMarginTop:72 }}>
                <div style={{ width:'100%', height:1, marginBottom:56, background:'linear-gradient(90deg,transparent,rgba(132,224,104,0.2) 30%,rgba(240,192,32,0.2) 70%,transparent)' }} />
                <div style={{ textAlign:'center', marginBottom:40 }}>
                    <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(1.8rem,4vw,3rem)', fontWeight:800, background:'var(--cc-text-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:12 }}>Katalog Kopi Premium</h2>
                    <p style={{ color:'var(--cc-text-secondary)', fontSize:14, maxWidth:480, margin:'0 auto' }}>
                        Kopi pilihan terbaik dari petani bersertifikat · Bayar via <strong style={{ color:'#ab9ff2', display:'inline-flex', alignItems:'center', gap:3 }}><IconPhantomLogo size={13} /> Phantom Wallet</strong>
                    </p>
                </div>

                {/* Filter bar */}
                <div style={{ display:'flex', gap:10, marginBottom:32, flexWrap:'wrap', alignItems:'center', maxWidth:1200, margin:'0 auto 32px' }}>
                    <div style={{ position:'relative', flex:'1 1 220px', maxWidth:320 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--cc-text-dim)', pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder="Cari nama, asal, varietas..." className="cc-inp" style={{ paddingLeft:36 }} />
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {[['','Semua'],['Specialty','Specialty'],['Premium','Premium'],['A','Grade A'],['B','Grade B'],['C','Grade C']].map(([val, label]) => (
                            <button key={val} onClick={() => setCatalogGrade(val)}
                                style={{ padding:'8px 16px', borderRadius:12, fontSize:12, fontWeight:600, cursor:'pointer', border:'1px solid', transition:'all 0.15s',
                                    background: catalogGrade === val ? 'linear-gradient(135deg,#5cba3c,#84e068)' : 'var(--cc-input-bg)',
                                    borderColor: catalogGrade === val ? 'transparent' : 'var(--cc-input-border)',
                                    color: catalogGrade === val ? '#0d1f08' : '#6b7280',
                                    boxShadow: catalogGrade === val ? '0 0 12px rgba(132,224,104,0.25)' : 'none'
                                }}>{label}</button>
                        ))}
                    </div>
                    <select value={catalogSort} onChange={e => setCatalogSort(e.target.value)} className="cc-inp" style={{ width:'auto', flex:'0 0 auto', minWidth:160 }} aria-label="Urutkan produk">
                        <option value="newest">Terbaru</option>
                        <option value="price_asc">Harga: Rendah → Tinggi</option>
                        <option value="price_desc">Harga: Tinggi → Rendah</option>
                        <option value="popular">Terlaris</option>
                        <option value="rating">Rating Tertinggi</option>
                    </select>
                    {!loading && (
                        <span style={{ fontSize:12, color:'var(--cc-text-dim)', marginLeft:'auto', whiteSpace:'nowrap' }}>
                            {(() => { const q = catalogSearch.toLowerCase(); return products.filter(p => (!q || p.name?.toLowerCase().includes(q) || p.origin?.toLowerCase().includes(q) || p.variety?.toLowerCase().includes(q)) && (!catalogGrade || p.grade === catalogGrade)).length; })()} produk ditemukan
                        </span>
                    )}
                </div>

                {/* Products grid */}
                <div className="cc-products-grid" style={{ maxWidth:1200, margin:'0 auto' }}>
                    {loading && Array.from({ length:8 }).map((_, i) => (
                        <div key={i} style={{ background:'var(--cc-card-bg)', border:'1px solid var(--cc-divider)', borderRadius:16, height:320, animation:'pulse 1.5s ease infinite' }} />
                    ))}
                    {!loading && products.length === 0 && (
                        <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'64px 0', color:'var(--cc-text-dim)', fontSize:14 }}>
                            <div style={{ marginBottom:12, color:'rgba(132,224,104,0.3)' }}><IconPackage /></div> Belum ada produk tersedia
                        </div>
                    )}
                    {!loading && products.length > 0 && (() => {
                        const q = catalogSearch.toLowerCase();
                        let filtered = products.filter(p =>
                            (!q || p.name?.toLowerCase().includes(q) || p.origin?.toLowerCase().includes(q) || p.variety?.toLowerCase().includes(q)) &&
                            (!catalogGrade || p.grade === catalogGrade)
                        );
                        if (catalogSort === 'price_asc') filtered = [...filtered].sort((a, b) => (a.pricePerUnit?.[0] ?? 0) - (b.pricePerUnit?.[0] ?? 0));
                        else if (catalogSort === 'price_desc') filtered = [...filtered].sort((a, b) => (b.pricePerUnit?.[0] ?? 0) - (a.pricePerUnit?.[0] ?? 0));
                        else if (catalogSort === 'popular') filtered = [...filtered].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
                        else if (catalogSort === 'rating') filtered = [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
                        if (filtered.length === 0) return (
                            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'64px 0', color:'var(--cc-text-dim)', fontSize:14 }}>
                                <div style={{ marginBottom:12 }}><IconPackage /></div> Tidak ada produk yang cocok dengan pencarian
                            </div>
                        );
                        return filtered;
                    })()?.map?.(p => {
                        const stock = p.stock ?? 0;
                        const outOfStock = stock <= 0;
                        const lowStock = stock > 0 && stock <= 10;
                        const gradeMap = {
                            'Specialty': { text:'var(--cc-text-highlight)', bg:'rgba(132,224,104,0.12)', border:'rgba(132,224,104,0.3)', barColor:'#84e068' },
                            'Premium':   { text:'#f0c020', bg:'rgba(240,192,32,0.12)',  border:'rgba(240,192,32,0.3)',  barColor:'#f0c020' },
                            'A':         { text:'#60a5fa', bg:'rgba(96,165,250,0.12)',  border:'rgba(96,165,250,0.3)',  barColor:'#60a5fa' },
                            'B':         { text:'#fb923c', bg:'rgba(251,146,60,0.12)', border:'rgba(251,146,60,0.3)', barColor:'#fb923c' },
                            'C':         { text:'#94a3b8', bg:'rgba(148,163,184,0.12)',border:'rgba(148,163,184,0.3)',barColor:'#94a3b8' },
                        };
                        const gc = gradeMap[p.grade] || gradeMap['A'];
                        return (
                            <div key={p.id} className="cc-card" onClick={() => { setSelectedDetailProduct(p); setDetailModal(true); }} style={{ cursor:'pointer', overflow:'hidden', display:'flex', flexDirection:'column' }}>
                                <div style={{ height:3, width:'100%', background:`linear-gradient(90deg,${gc.barColor},transparent)` }} />
                                <div style={{ height:148, position:'relative', background:'var(--cc-img-bg)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                                    {p.image
                                        ? <img src={p.image} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                                        : <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, color:'rgba(132,224,104,0.2)' }}><IconCoffee /></div>
                                    }
                                    <span className={`cc-stock-badge ${outOfStock ? 'cc-stock-out' : lowStock ? 'cc-stock-low' : 'cc-stock-in'}`} style={{ position:'absolute', top:10, right:10 }}>
                                        ● {outOfStock ? 'Habis' : lowStock ? `Tersisa ${stock}` : `Stok ${stock}`}
                                    </span>
                                    {p.coffeeId && (
                                        <div style={{ position:'absolute', top:10, left:10, display:'flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:100, background:'rgba(17,17,19,0.8)', border:'1px solid rgba(132,224,104,0.3)', fontSize:9, color:'var(--cc-text-highlight)', fontWeight:700 }}>
                                            <span style={{ width:5, height:5, borderRadius:'50%', background:'#84e068', animation:'pulse 1.5s infinite' }} /> On-Chain
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:10, flex:1 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                                        {p.grade && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:gc.bg, color:gc.text, border:`1px solid ${gc.border}` }}>{p.grade}</span>}
                                        {p.variety && <span style={{ fontSize:10, color:'var(--cc-text-muted)', fontWeight:500 }}>{p.variety}</span>}
                                    </div>
                                    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, color: outOfStock ? 'var(--cc-text-muted)' : 'var(--cc-text)', lineHeight:1.3 }}>{p.name}</div>
                                    <div style={{ fontSize:12, color:'var(--cc-text-muted)' }}>{p.origin}{p.farmer ? ` · ${p.farmer}` : ''}</div>
                                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                                        {[p.roast].filter(Boolean).map(tag => (
                                            <span key={tag} style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'var(--cc-card-bg)', color:'var(--cc-text-secondary)', border:'1px solid var(--cc-divider)' }}>{tag}</span>
                                        ))}
                                        {p.coffeeId && (
                                            <a href={normalizeExplorerUrl(p.explorerUrl) || `/trace?id=${p.coffeeId}`} target={p.explorerUrl ? '_blank' : undefined} rel={p.explorerUrl ? 'noopener noreferrer' : undefined} onClick={e => e.stopPropagation()}
                                                style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:gc.bg, color:gc.text, border:`1px solid ${gc.border}`, fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:3 }}>
                                                🛡 {p.explorerUrl ? 'Solana' : 'Sertifikasi'}
                                            </a>
                                        )}
                                        {p.coffeeId && (
                                            <div onClick={e => e.stopPropagation()}>
                                                <QRButton
                                                    explorerUrl={normalizeExplorerUrl(p.explorerUrl) || (p.txSignature ? getExplorerTxUrl(p.txSignature) : undefined)}
                                                    traceUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/trace?id=${p.coffeeId}`}
                                                    coffeeId={p.coffeeId}
                                                    productName={p.name}
                                                    label="QR"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                                            {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= Math.round(p.rating || 4) ? '#f0c020' : 'var(--cc-text-dim)', fontSize:11 }}><IconStar filled={s <= Math.round(p.rating || 4)} /></span>)}
                                            <span style={{ fontSize:11, color:'var(--cc-text-muted)', marginLeft:3 }}>{p.rating?.toFixed(1) || '4.0'}</span>
                                        </div>
                                        {p.sold > 0 ? (
                                            <span style={{ fontSize:10, color:'#f0c020', background:'rgba(240,192,32,0.12)', border:'1px solid rgba(240,192,32,0.25)', borderRadius:100, padding:'2px 8px', fontWeight:700 }}>
                                                {p.sold.toLocaleString('id-ID')} terjual
                                            </span>
                                        ) : <span style={{ fontSize:10, color:'var(--cc-text-highlight)', background:'rgba(132,224,104,0.1)', border:'1px solid rgba(132,224,104,0.2)', borderRadius:100, padding:'2px 8px' }}>Baru</span>}
                                    </div>
                                    <div style={{ marginTop:'auto', paddingTop:12, borderTop:'1px solid var(--cc-divider)' }}>
                                        <div style={{ marginBottom:10 }}>
                                            <div style={{ fontSize:10, color:'var(--cc-text-dim)' }}>mulai dari</div>
                                            {p.pricePerUnit?.length > 0 ? (
                                                <>
                                                    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:16, fontWeight:700, color: outOfStock ? 'var(--cc-text-muted)' : 'var(--cc-text-highlight)' }}>
                                                        Rp {(p.pricePerUnit[0]).toLocaleString('id-ID')}
                                                        {p.weight?.length > 0 && <span style={{ fontSize:11, fontWeight:400, color:'var(--cc-text-dim)', marginLeft:4 }}>/{p.weight[0]}g</span>}
                                                    </div>
                                                    <div style={{ fontSize:10, color:'var(--cc-sol-text)' }}>≈ {rupiahToSol(p.pricePerUnit[0]).toFixed(4)} SOL</div>
                                                </>
                                            ) : <div style={{ fontSize:13, color:'var(--cc-text-dim)', fontStyle:'italic' }}>Harga belum diatur</div>}
                                        </div>
                                        {outOfStock ? (
                                            <div style={{ padding:'9px', fontSize:12, background:'var(--cc-card-bg)', border:'1px solid var(--cc-divider)', borderRadius:10, color:'var(--cc-text-dim)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                                <IconPackage /> Stok Habis
                                            </div>
                                        ) : (
                                            <button onClick={e => { e.stopPropagation(); openOrder(p, 'midtrans'); }} className="cc-btn-green" style={{ width:'100%', padding:'10px', fontSize:13, justifyContent:'center', boxShadow:'0 0 12px rgba(132,224,104,0.15)' }}>
                                                <IconCart /> Beli
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── HARGA PASAR ── */}
            <section id="market" style={{ position:'relative', zIndex:10, padding:'clamp(40px,8vw,80px) clamp(16px,4vw,32px)', scrollMarginTop:72 }}>
                <div style={{ width:'100%', height:1, marginBottom:56, background:'linear-gradient(90deg,transparent,rgba(240,192,32,0.2) 30%,rgba(132,224,104,0.2) 70%,transparent)' }} />
                <div style={{ textAlign:'center', marginBottom:40 }}>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:100, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', color:'#f87171', fontSize:11, fontWeight:600, marginBottom:20 }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:'#f87171', animation:'pulse 1.5s infinite' }} /> LIVE
                    </div>
                    <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(1.8rem,4vw,3rem)', fontWeight:800, background:'var(--cc-text-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:12 }}>Harga Pasar Kopi Live</h2>
                    <p style={{ color:'var(--cc-text-secondary)', fontSize:14, maxWidth:440, margin:'0 auto' }}>Pantau pergerakan harga komoditas kopi Nusantara secara real-time</p>
                </div>

                {/* Ticker */}
                <div style={{ display:'flex', alignItems:'center', gap:24, padding:'12px 24px', borderRadius:14, marginBottom:32, background:'var(--cc-card-bg)', border:'1px solid var(--cc-divider)', maxWidth:1200, margin:'0 auto 32px', overflowX:'auto' }}>
                    <span style={{ color:'var(--cc-text-highlight)', fontWeight:700, fontSize:12, flexShrink:0 }}>📊 Market</span>
                    <div style={{ width:1, height:20, background:'var(--cc-divider)', flexShrink:0 }} />
                    {coffeeTypes.map((c, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, fontSize:12 }}>
                            <span style={{ color:'var(--cc-text-secondary)' }}>{c.name}</span>
                            <span style={{ color:'var(--cc-text)', fontWeight:700, fontFamily:"'Space Grotesk',sans-serif" }}>Rp {c.price.toLocaleString('id-ID')}</span>
                            <span style={{ color: c.change > 0 ? '#84e068' : '#f87171', fontWeight:600 }}>{c.change > 0 ? '▲' : '▼'} {Math.abs(c.change)}%</span>
                        </div>
                    ))}
                </div>

                <div className="cc-market-grid" style={{ maxWidth:1200, margin:'0 auto' }}>
                    {coffeeTypes.map((c, i) => (
                        <div key={i} className="cc-card" style={{ overflow:'hidden' }}>
                            <div style={{ height:2, width:'100%', background: c.change > 0 ? 'linear-gradient(90deg,rgba(132,224,104,0.5),transparent)' : 'linear-gradient(90deg,rgba(248,113,113,0.5),transparent)' }} />
                            <div style={{ padding:20 }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                        <div style={{ width:42, height:42, borderRadius:12, background:'rgba(132,224,104,0.1)', border:'1px solid rgba(132,224,104,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--cc-text-highlight)' }}>
                                            <IconCoffee />
                                        </div>
                                        <div>
                                            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, color:'var(--cc-text)' }}>{c.name}</div>
                                            <div style={{ fontSize:11, color:'var(--cc-text-muted)' }}>📍 {c.origin} · <span style={{ color:'var(--cc-text-highlight)' }}>{c.grade}</span></div>
                                        </div>
                                    </div>
                                    <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:12, fontSize:12, fontWeight:700, background: c.change > 0 ? 'rgba(132,224,104,0.1)' : 'rgba(248,113,113,0.1)', color: c.change > 0 ? '#84e068' : '#f87171', border:`1px solid ${c.change > 0 ? 'rgba(132,224,104,0.25)' : 'rgba(248,113,113,0.25)'}` }}>
                                        {c.change > 0 ? '▲' : '▼'} {Math.abs(c.change)}%
                                    </div>
                                </div>
                                <div style={{ marginBottom:14 }}>
                                    <div style={{ fontSize:10, color:'var(--cc-text-dim)', marginBottom:4 }}>Harga per Kg</div>
                                    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:800, color:'var(--cc-text)' }}>Rp {c.price.toLocaleString('id-ID')}</div>
                                    <div style={{ fontSize:10, color:'var(--cc-sol-text)', marginTop:2 }}>≈ {rupiahToSol(c.price).toFixed(4)} SOL</div>
                                </div>
                                <div style={{ paddingTop:12, borderTop:'1px solid var(--cc-divider)', display:'flex', justifyContent:'space-between', fontSize:11 }}>
                                    <div><div style={{ fontSize:9, color:'var(--cc-text-dim)', marginBottom:2 }}>Volume</div><div style={{ color:'var(--cc-text-secondary)', fontWeight:600 }}>{c.vol}</div></div>
                                    <div style={{ textAlign:'right' }}><div style={{ fontSize:9, color:'var(--cc-text-dim)', marginBottom:2 }}>Origin</div><div style={{ color:'var(--cc-text-secondary)', fontWeight:600 }}>{c.origin}</div></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CARA KERJA ── */}
            <section id="how" style={{ position:'relative', zIndex:10, padding:'clamp(40px,8vw,80px) clamp(16px,4vw,32px)', scrollMarginTop:72 }}>
                <div style={{ width:'100%', height:1, marginBottom:56, background:'linear-gradient(90deg,transparent,rgba(171,159,242,0.2) 30%,rgba(132,224,104,0.2) 70%,transparent)' }} />
                <div style={{ textAlign:'center', marginBottom:52 }}>
                    <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(1.8rem,4vw,3rem)', fontWeight:800, background:'var(--cc-text-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:12 }}>Cara Kerja CoffeeChain</h2>
                    <p style={{ color:'var(--cc-text-secondary)', fontSize:14, maxWidth:440, margin:'0 auto' }}>Transparan dari kebun hingga cangkir — <strong style={{ color:'var(--cc-text)' }}>bayar Rupiah atau SOL on-chain</strong></p>
                </div>
                <div className="cc-how-grid" style={{ maxWidth:1100, margin:'0 auto' }}>
                    {[
                        { num:1, icon:<IconCart />, title:'Pilih Kopi', desc:'Pilih kopi premium dari katalog. Stok real-time, harga transparan.', color:'var(--cc-text-highlight)', bg:'rgba(132,224,104,0.1)', border:'rgba(132,224,104,0.25)' },
                        { num:2, icon:<IconBank />, title:'Bayar Rupiah', desc:'Transfer Bank via Virtual Account atau scan QR Code IDR. Tanpa wallet.', color:'#60a5fa', bg:'rgba(96,165,250,0.1)', border:'rgba(96,165,250,0.25)' },
                        { num:3, icon:<IconPhantomLogo size={24} />, title:'Atau Bayar SOL', desc:'Hubungkan Phantom Wallet Solana dan bayar langsung via Transfer SOL atau Solana Pay QR.', color:'#ab9ff2', bg:'rgba(171,159,242,0.1)', border:'rgba(171,159,242,0.25)' },
                        { num:4, icon:<IconVerify />, title:'Konfirmasi On-Chain', desc:'Pesanan tercatat. Transaksi SOL permanen di Solana blockchain — lacak kapan saja.', color:'#f0c020', bg:'rgba(240,192,32,0.1)', border:'rgba(240,192,32,0.25)' },
                    ].map(step => (
                        <div key={step.num} className="cc-card" style={{ padding:24 }}>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                                <div style={{ width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:step.bg, border:`1px solid ${step.border}`, color:step.color }}>
                                    {step.icon}
                                </div>
                                <div style={{ width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:step.bg, border:`1px solid ${step.border}`, color:step.color, fontSize:13, fontWeight:900, fontFamily:"'Space Grotesk',sans-serif" }}>{step.num}</div>
                            </div>
                            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:16, color:'var(--cc-text)', marginBottom:8 }}>{step.title}</div>
                            <p style={{ fontSize:13, color:'var(--cc-text-secondary)', lineHeight:1.65 }}>{step.desc}</p>
                            <div style={{ marginTop:18, height:2, width:36, borderRadius:4, background:`linear-gradient(90deg,${step.color},transparent)` }} />
                        </div>
                    ))}
                </div>
            </section>

            {/* ── VERIFIKASI BLOCKCHAIN ── */}
            <section id="verify" style={{ position:'relative', zIndex:10, padding:'clamp(40px,8vw,80px) clamp(16px,4vw,32px)', scrollMarginTop:72 }}>
                <div style={{ width:'100%', height:1, marginBottom:56, background:'linear-gradient(90deg,transparent,rgba(171,159,242,0.2) 30%,rgba(132,224,104,0.2) 70%,transparent)' }} />
                <div style={{ maxWidth:600, margin:'0 auto', textAlign:'center' }}>
                    <div style={{ width:64, height:64, borderRadius:18, background:'rgba(171,159,242,0.1)', border:'1px solid rgba(171,159,242,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 28px', color:'#ab9ff2' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(1.8rem,4vw,3rem)', fontWeight:800, background:'var(--cc-text-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:16 }}>Verifikasi Keaslian Kopi</h2>
                    <p style={{ color:'var(--cc-text-secondary)', marginBottom:40, fontSize:14, maxWidth:440, margin:'0 auto 40px', lineHeight:1.7 }}>
                        Setiap kopi di CoffeeChain tercatat permanen di blockchain Solana. Masukkan Coffee ID untuk memverifikasi.
                    </p>
                    <div style={{ display:'flex', gap:12, maxWidth:480, margin:'0 auto 16px' }}>
                        <input type="text" placeholder="Coffee ID (contoh: CF-A1B2C3)" id="verifyInput" className="cc-inp" style={{ flex:1 }} />
                        <a href="#" onClick={e => { e.preventDefault(); const v = document.getElementById('verifyInput')?.value?.trim(); if (v) window.location.href = `/trace?id=${encodeURIComponent(v)}`; }}
                            className="cc-btn-green" style={{ padding:'11px 22px', fontSize:14, flexShrink:0, whiteSpace:'nowrap' }}>
                            🔍 Verifikasi
                        </a>
                    </div>
                    <p style={{ fontSize:12, color:'var(--cc-text-dim)' }}>
                        Atau buka halaman <a href="/trace" style={{ color:'var(--cc-text-highlight)', textDecoration:'none', fontWeight:600 }}>Trace Kopi</a> untuk pencarian lengkap
                    </p>
                </div>
            </section>

            {/* ── CTA BANNER ── */}
            <section style={{ position:'relative', zIndex:10, padding:'clamp(60px,10vw,100px) 24px', textAlign:'center' }}>
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(132,224,104,0.04) 0%, transparent 70%)', pointerEvents:'none' }} />
                <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'clamp(1.8rem,5vw,3.2rem)', fontWeight:800, lineHeight:1.2, letterSpacing:'-0.02em', background:'linear-gradient(135deg,#84e068,#c8e830 45%,#f0c020)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', marginBottom:16, maxWidth:680, margin:'0 auto 16px' }}>
                    Bergabunglah dengan Ekosistem<br />Kopi Blockchain Indonesia
                </h2>
                <p style={{ color:'var(--cc-text-secondary)', fontSize:15, marginBottom:40, maxWidth:460, margin:'0 auto 40px' }}>
                    Platform transparan yang menghubungkan petani, koperasi, dan konsumen secara langsung.
                </p>
                <div style={{ display:'flex', alignItems:'center', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
                    <a href="#products" className="cc-btn-green" style={{ padding:'16px 32px', fontSize:15, boxShadow:'0 0 28px rgba(132,224,104,0.35)' }}>
                        <IconCart /> Belanja Sekarang
                    </a>
                    <button onClick={connectWallet} disabled={!!walletPublicKey || walletConnecting} className="cc-btn-phantom" style={{ padding:'16px 32px', fontSize:15, opacity: walletPublicKey ? 0.6 : 1, boxShadow:'0 0 28px rgba(107,70,196,0.3)' }}>
                        {walletPublicKey ? <><IconPhantomLogo size={18} /> {shortenAddress(walletPublicKey)}</> : walletConnecting ? <><span className="cc-spinner" /> Menghubungkan...</> : <><IconPhantomLogo size={18} /> Hubungkan Phantom</>}
                    </button>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ position:'relative', zIndex:10, background:'var(--cc-footer-bg)', borderTop:'1px solid rgba(132,224,104,0.1)' }}>
                <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'24px clamp(16px,3vw,32px)', gap:20, flexWrap:'wrap' }}>
                    <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
                        <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#84e068,#4ab830)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                            <img src="/coffeechain-logo.png" alt="CoffeeChain" width={24} height={24} style={{ objectFit:'contain' }} onError={e => { e.currentTarget.src='/coffeechain-logo-20260528.png'; }} />
                        </div>
                        <div>
                            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:14, color:'var(--cc-text-highlight)' }}>CoffeeChain</div>
                            <div style={{ fontSize:9, color:'#2d4a2d', letterSpacing:'0.2em', textTransform:'uppercase' }}>BLOCKCHAIN TRACEABILITY</div>
                        </div>
                    </Link>
                    <p style={{ fontSize:12, color:'#2d4a2d', textAlign:'center', flex:1, minWidth:200 }}>
                        2026 CoffeeChain · Blockchain Industri Kopi Indonesia · Powered by Solana
                    </p>
                    <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
                        {[['/', 'Beranda'], ['/login', 'Masuk'], ['#products', 'Produk'], ['/trace', 'Trace Kopi'], ['/guide', 'Panduan'], ['/documentation', 'Dokumentasi']].map(([href, label]) => (
                            <a key={label} href={href} style={{ color:'#2d4a2d', fontSize:12, textDecoration:'none', transition:'color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.color='#84e068'}
                                onMouseLeave={e => e.currentTarget.style.color='#2d4a2d'}
                            >{label}</a>
                        ))}
                    </div>
                </div>
            </footer>

            {/* ── WHATSAPP FAB ── */}
            <div style={{ position:'fixed', bottom:28, right:28, zIndex:90 }}>
                {supportOpen && (
                    <section aria-label="Chat bantuan CoffeeChain" style={{ position:'absolute', right:0, bottom:66, width:'min(360px, calc(100vw - 32px))', background:'var(--cc-bg)', border:'1px solid rgba(37,211,102,0.35)', borderRadius:14, overflow:'hidden', boxShadow:'0 18px 48px rgba(0,0,0,0.48)' }}>
                        <header style={{ padding:'13px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(135deg,#128c7e,#25d366)', color:'#fff' }}>
                            <div><div style={{ fontSize:13, fontWeight:800 }}>Bantuan CoffeeChain</div><div style={{ fontSize:10, opacity:0.85 }}>Asisten web siap membantu</div></div>
                            <button type="button" onClick={() => { setSupportOpen(false); resetSupportChat(); }} aria-label="Tutup chat" style={{ color:'#fff', padding:4, display:'flex' }}><IconClose /></button>
                        </header>
                        <div style={{ padding:12, height:264, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, background:'var(--cc-card-bg)' }}>
                            {supportMessages.map(message => (
                                <div key={message.id} style={{ alignSelf:message.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth:'88%', padding:'9px 11px', borderRadius:message.sender === 'user' ? '11px 11px 2px 11px' : '11px 11px 11px 2px', background:message.sender === 'user' ? 'rgba(37,211,102,0.18)' : 'var(--cc-input-bg)', border:'1px solid var(--cc-divider)', color:'var(--cc-text)', fontSize:12, lineHeight:1.5 }}>
                                    {message.text}
                                    {message.action === 'ticket' && <a href="/contact" style={{ display:'inline-flex', marginTop:8, color:'#84e068', fontWeight:800, textDecoration:'none' }}>Buat tiket pengaduan <IconArrow /></a>}
                                </div>
                            ))}
                        </div>
                        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--cc-divider)', display:'flex', gap:7 }}>
                            <form onSubmit={event => { event.preventDefault(); sendSupportMessage(); }} style={{ display:'flex', gap:7, width:'100%' }}>
                                <input value={supportInput} onChange={event => setSupportInput(event.target.value)} placeholder="Tulis pertanyaan..." aria-label="Pesan bantuan" style={{ flex:1, minWidth:0, padding:'9px 10px', borderRadius:8, border:'1px solid var(--cc-input-border)', background:'var(--cc-input-bg)', color:'var(--cc-text)', outline:'none', fontSize:12 }} />
                                <button type="submit" disabled={!supportInput.trim()} style={{ padding:'9px 11px', borderRadius:8, background:'#25d366', color:'#102d1f', fontWeight:900, fontSize:12, opacity:supportInput.trim() ? 1 : 0.45 }}>Kirim</button>
                            </form>
                        </div>
                        <div style={{ padding:'0 12px 11px', display:'flex', gap:6, flexWrap:'wrap' }}>
                            {['Pembayaran', 'Cek QR sertifikasi', 'Buat pengaduan'].map(question => <button key={question} type="button" onClick={() => sendSupportMessage(question)} style={{ padding:'5px 8px', borderRadius:999, border:'1px solid rgba(37,211,102,0.3)', color:'#84e068', fontSize:10, fontWeight:700 }}>{question}</button>)}
                        </div>
                    </section>
                )}
                <button type="button" onClick={toggleSupportChat} aria-label={supportOpen ? 'Tutup chat bantuan' : 'Buka chat bantuan'}
                    style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#25d366,#128c7e)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(37,211,102,0.4)', animation:'wa-pop 0.4s ease', transition:'transform 0.2s,box-shadow 0.2s', color:'#fff' }}
                    title="Chat bantuan CoffeeChain"
                    onMouseEnter={e => { e.currentTarget.style.transform='scale(1.1)'; e.currentTarget.style.boxShadow='0 6px 28px rgba(37,211,102,0.55)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(37,211,102,0.4)'; }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </button>
            </div>

            {/* ══════════════════════════════════════════
                MODAL: Order Form (Multi-Currency Payment)
            ══════════════════════════════════════════ */}
            {orderModal && selectedProduct && (
                <div style={{ position:'fixed', inset:0, zIndex:1000, background:'var(--cc-modal-backdrop)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
                    onClick={() => { setOrderModal(false); setOrderResult(null); }}>
                    <div style={{ background:'var(--cc-bg)', border:'1px solid var(--cc-input-border)', borderRadius:20, padding:'clamp(20px,4vw,32px)', maxWidth:660, width:'100%', maxHeight:'92dvh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}
                        onClick={e => e.stopPropagation()}>

                        {orderResult ? (
                            /* ── Success / Result ── */
                            <div style={{ textAlign:'center' }}>
                                <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
                                    {orderResult.status === 'paid' ? <IconCheck /> : <div style={{ color:'rgba(240,240,240,0.5)' }}>
                                        {orderResult.paymentMethod === 'transfer-idr' ? <IconBank />
                                            : orderResult.paymentMethod === 'qr-idr' ? <IconMobileQR />
                                            : <IconClockWait />}
                                    </div>}
                                </div>
                                <h3 style={{ fontSize:20, fontWeight:700, color:'var(--cc-text)', marginBottom:6, fontFamily:"'Space Grotesk',sans-serif" }}>
                                    {orderResult.status === 'paid' ? 'Pembayaran Berhasil'
                                        : orderResult.paymentMethod === 'midtrans' ? 'Pesanan Dicatat — Menunggu Konfirmasi'
                                        : orderResult.paymentMethod === 'transfer-idr' ? 'Transfer ke Virtual Account'
                                        : orderResult.paymentMethod === 'qr-idr' ? 'Scan QR Code Pembayaran'
                                        : 'Menunggu Pembayaran Solana'}
                                </h3>
                                <p style={{ color:'var(--cc-text-secondary)', marginBottom:20, fontSize:13 }}>
                                    {orderResult.status === 'paid' ? 'Pembayaran berhasil dikonfirmasi!'
                                        : orderResult.paymentMethod === 'midtrans' ? 'Pembayaran Midtrans masih dalam proses. Cek email untuk konfirmasi.'
                                        : orderResult.paymentMethod === 'transfer-idr' ? 'Transfer Rupiah ke nomor Virtual Account di bawah sebelum pesanan kadaluarsa.'
                                        : orderResult.paymentMethod === 'qr-idr' ? 'Scan QR Code di bawah menggunakan aplikasi pembayaran Anda.'
                                        : 'Scan QR Solana Pay di bawah untuk menyelesaikan pembayaran.'}
                                </p>

                                {orderResult.virtualAccount && (
                                    <div style={{ background:'rgba(240,192,32,0.08)', border:'1px solid rgba(240,192,32,0.3)', borderRadius:12, padding:'16px', marginBottom:16, textAlign:'center' }}>
                                        <div style={{ fontSize:11, color:'var(--cc-text-secondary)', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Nomor Virtual Account</div>
                                        <div style={{ fontSize:26, fontWeight:900, letterSpacing:3, color:'#f0c020', fontFamily:'monospace' }}>{orderResult.virtualAccount}</div>
                                        <div style={{ fontSize:11, color:'var(--cc-text-muted)', marginTop:6 }}>Bank CoffeeChain · Berlaku 30 menit</div>
                                    </div>
                                )}

                                <div style={{ background:'var(--cc-box-bg)', borderRadius:12, padding:16, textAlign:'left', fontSize:12, marginBottom:16, border:'1px solid var(--cc-divider)' }}>
                                    {[
                                        ['ID Pesanan', orderResult.orderId],
                                        ['Produk', orderResult.productName],
                                        ['Berat × Qty', `${orderResult.weight}g × ${orderResult.quantity}`],
                                        ['Subtotal', `Rp ${(orderResult.subtotalPrice ?? orderResult.totalPrice)?.toLocaleString('id-ID')}`],
                                        ['Biaya trace Solana', `Rp ${(orderResult.solanaTraceFee || 0).toLocaleString('id-ID')}`],
                                        [`PPN Indonesia ${Number(orderResult.ppnRate || 0) * 100}%`, `Rp ${(orderResult.ppnAmount || 0).toLocaleString('id-ID')}`],
                                        ['Total (IDR)', `Rp ${orderResult.totalPrice?.toLocaleString('id-ID')}`],
                                        ...(orderResult.solAmount != null ? [['Total (SOL)', `${orderResult.solAmount?.toFixed(6)} SOL`]] : []),
                                        ['Metode', orderResult.paymentMethod === 'qr' ? 'Solana Pay QR'
                                            : orderResult.paymentMethod === 'transfer' ? 'Transfer SOL'
                                            : orderResult.paymentMethod === 'qr-idr' ? 'QR Code IDR'
                                            : orderResult.paymentMethod === 'midtrans' ? 'Midtrans (Sandbox)'
                                            : 'Transfer Bank IDR'],
                                        ...(orderResult.walletAddress ? [['Wallet', shortenAddress(orderResult.walletAddress, 6)]] : []),
                                        ...(orderResult.txSignature ? [['Tx Hash', `${orderResult.txSignature.slice(0,18)}...${orderResult.txSignature.slice(-8)}`]] : []),
                                        ...(orderResult.coffeeId ? [['Coffee ID', orderResult.coffeeId]] : []),
                                        ['Status', orderResult.status === 'paid' ? 'Lunas' : 'Menunggu Pembayaran'],
                                        ...(orderResult.paymentMethod === 'midtrans' ? [
                                            ['Status Midtrans', orderResult.displayStatus || formatMidtransStatus(orderResult.midtransStatus)],
                                            ...(orderResult.paymentLabel ? [['Metode Midtrans', orderResult.paymentLabel]] : []),
                                            ...(orderResult.transactionId ? [['ID Transaksi Midtrans', orderResult.transactionId]] : []),
                                            ...(orderResult.expiryTime ? [['Batas Bayar', new Date(String(orderResult.expiryTime).replace(' ', 'T')).toLocaleString('id-ID')]] : []),
                                            ...(orderResult.midtransStatusMessage ? [['Pesan Midtrans', orderResult.midtransStatusMessage]] : []),
                                        ] : []),
                                        ['Stok Tersisa', `${orderResult.stockLeft ?? '–'} unit`],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, padding:'7px 0', borderBottom:'1px solid var(--cc-divider)' }}>
                                            <span style={{ color:'var(--cc-text-muted)', flexShrink:0 }}>{k}</span>
                                            <span style={{ color:'var(--cc-text)', fontWeight:600, textAlign:'right', wordBreak:'break-all' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>

                                {orderResult.paymentMethod === 'midtrans' && orderResult.status !== 'paid' && (
                                    <div style={{ background:'rgba(0,174,240,0.08)', border:'1px solid rgba(0,174,240,0.25)', borderRadius:12, padding:14, textAlign:'left', marginBottom:16 }}>
                                        <div style={{ color:'#00AEF0', fontWeight:900, fontSize:13, marginBottom:6 }}>
                                            {orderResult.displayStatus || 'Menunggu status Midtrans'}
                                        </div>
                                        <div style={{ color:'var(--cc-text-secondary)', fontSize:12, lineHeight:1.6 }}>
                                            {orderResult.paymentInstruction || 'Selesaikan pembayaran di aplikasi, lalu sistem akan mengecek status ke Midtrans otomatis.'}
                                        </div>
                                        {orderResult.qrCodeUrl && (
                                            <div style={{ marginTop:12, textAlign:'center' }}>
                                                <img src={orderResult.qrCodeUrl} alt="QR GoPay/QRIS Midtrans" style={{ width:180, height:180, objectFit:'contain', background:'#fff', borderRadius:10, padding:8 }} />
                                            </div>
                                        )}
                                        {(orderResult.deeplinkUrl || orderResult.qrCodeUrl) && (
                                            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
                                                {orderResult.deeplinkUrl && (
                                                    <a href={orderResult.deeplinkUrl} target="_blank" rel="noopener noreferrer" className="cc-btn-outline" style={{ padding:'8px 12px', fontSize:12 }}>
                                                        Buka Aplikasi Bayar <IconArrow />
                                                    </a>
                                                )}
                                                {orderResult.qrCodeUrl && (
                                                    <a href={orderResult.qrCodeUrl} target="_blank" rel="noopener noreferrer" className="cc-btn-outline" style={{ padding:'8px 12px', fontSize:12 }}>
                                                        Buka QR <IconArrow />
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {orderResult.paymentMethod === 'midtrans' && (
                                    <div style={{ display:'grid', gap:8, marginBottom:16 }}>
                                        {orderResult.status !== 'paid' && orderResult.snapToken && (
                                            <button type="button" onClick={resumeMidtransPayment} disabled={checkingMidtrans}
                                                className="cc-btn-midtrans"
                                                style={{ width:'100%', padding:'12px 16px', fontSize:13, justifyContent:'center', cursor:checkingMidtrans ? 'wait' : 'pointer' }}>
                                                <IconMidtrans size={18} /> {checkingMidtrans ? 'Membuka Snap...' : 'Lanjutkan Pembayaran'}
                                            </button>
                                        )}
                                        <button type="button" onClick={() => refreshMidtransStatus()} disabled={checkingMidtrans}
                                            style={{ width:'100%', padding:'11px 16px', borderRadius:12, border:'1px solid rgba(0,174,240,0.35)', background:'rgba(0,174,240,0.12)', color:'#00AEF0', fontWeight:800, cursor:checkingMidtrans ? 'wait' : 'pointer' }}>
                                            {checkingMidtrans ? 'Mengecek Status...' : 'Cek Status Midtrans'}
                                        </button>
                                    </div>
                                )}

                                {(orderResult.txSignature || orderResult.coffeeId) && (
                                    <div style={{ background:'rgba(171,159,242,0.06)', border:'1px solid rgba(171,159,242,0.2)', borderRadius:12, padding:16, textAlign:'left', marginBottom:16 }}>
                                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:10, flexWrap:'wrap' }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:8, color:'#ab9ff2', fontWeight:800, fontSize:13 }}>
                                                <IconSolana /> Riwayat Blockchain Solana
                                            </div>
                                            <span style={{ fontSize:11, color: orderResult.txSignature ? '#84e068' : '#f0c020', border:`1px solid ${orderResult.txSignature ? 'rgba(132,224,104,0.35)' : 'rgba(240,192,32,0.35)'}`, borderRadius:999, padding:'3px 8px', background: orderResult.txSignature ? 'rgba(132,224,104,0.08)' : 'rgba(240,192,32,0.08)', fontWeight:800 }}>
                                                {orderResult.txSignature ? 'On-chain confirmed' : 'Menunggu TX'}
                                            </span>
                                        </div>
                                        <div style={{ display:'grid', gap:8, fontSize:12 }}>
                                            {orderResult.coffeeId && (
                                                <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                                                    <span style={{ color:'var(--cc-text-muted)' }}>Sertifikat Coffee ID</span>
                                                    <span style={{ color:'var(--cc-text-highlight)', fontFamily:'monospace', fontWeight:800 }}>{orderResult.coffeeId}</span>
                                                </div>
                                            )}
                                            {orderResult.txSignature && (
                                                <div>
                                                    <div style={{ color:'var(--cc-text-muted)', marginBottom:4 }}>Solana Signature</div>
                                                    <div style={{ color:'var(--cc-text)', fontFamily:'monospace', wordBreak:'break-all', lineHeight:1.45 }}>{orderResult.txSignature}</div>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
                                            {orderResult.txSignature && (
                                                <a href={normalizeExplorerUrl(orderResult.explorerUrl) || getExplorerTxUrl(orderResult.txSignature)} target="_blank" rel="noopener noreferrer" className="cc-btn-outline"
                                                    style={{ padding:'8px 12px', fontSize:12 }}>
                                                    <IconSolana /> Solana Explorer <IconArrow />
                                                </a>
                                            )}
                                            {orderResult.coffeeId && (
                                                <a href={`/trace?id=${orderResult.coffeeId}`} target="_blank" rel="noopener noreferrer" className="cc-btn-outline"
                                                    style={{ padding:'8px 12px', fontSize:12 }}>
                                                    <IconChain /> Trace Sertifikasi
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {qrDataUrl && orderResult.paymentMethod === 'qr' && (
                                    <div style={{ marginBottom:20, textAlign:'center' }}>
                                        <div style={{ fontSize:12, color:'var(--cc-text-secondary)', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                            <IconQr /> Scan dengan Phantom Mobile · Solana Pay · <span style={{ color:'var(--cc-text-highlight)' }}>konfirmasi otomatis</span>
                                        </div>
                                        <div style={{ display:'inline-block', padding:14, background:'#0d1f0d', borderRadius:14, border:'1px solid rgba(132,224,104,0.3)', boxShadow:'0 0 32px rgba(132,224,104,0.1)' }}>
                                            <img src={qrDataUrl} alt="Solana Pay QR" style={{ width:200, height:200, display:'block' }} />
                                        </div>
                                        <div style={{ marginTop:10, fontSize:11, color:'var(--cc-text-dim)' }}>
                                            Kirim <strong style={{ color:'var(--cc-text-highlight)' }}>{orderResult.solAmount?.toFixed(6)} SOL</strong> ke merchant wallet
                                        </div>
                                    </div>
                                )}

                                {qrDataUrl && orderResult.paymentMethod === 'qr-idr' && (
                                    <div style={{ marginBottom:20, textAlign:'center' }}>
                                        <div style={{ fontSize:12, color:'var(--cc-text-secondary)', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                            <IconQr /> Scan QR · Bayar ke GoPay <strong style={{ color:'#f0c020' }}>081389629074</strong>
                                        </div>
                                        <div style={{ display:'inline-block', padding:14, background:'#1a1200', borderRadius:14, border:'1px solid rgba(240,192,32,0.3)', boxShadow:'0 0 32px rgba(240,192,32,0.1)' }}>
                                            <img src={qrDataUrl} alt="QR Pembayaran IDR" style={{ width:200, height:200, display:'block' }} />
                                        </div>
                                        <div style={{ marginTop:10, fontSize:11, color:'var(--cc-text-dim)' }}>
                                            Bayar <strong style={{ color:'#f0c020' }}>Rp {orderResult.totalPrice?.toLocaleString('id-ID')}</strong> ke GoPay 081389629074
                                        </div>
                                    </div>
                                )}

                                {orderResult.paymentMethod === 'qr' && orderResult.status !== 'paid' && (
                                    <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:12, background:'rgba(132,224,104,0.06)', border:'1px solid rgba(132,224,104,0.2)', textAlign:'center' }}>
                                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:13, color:'var(--cc-text-secondary)' }}>
                                            <span className="cc-spinner" style={{ borderTopColor:'var(--cc-text-highlight)' }} />
                                            Menunggu konfirmasi blockchain...
                                        </div>
                                        <div style={{ marginTop:6, fontSize:11, color:'var(--cc-text-dim)' }}>Pembayaran akan dikonfirmasi otomatis setelah transaksi terdeteksi</div>
                                    </div>
                                )}

                                {orderResult.paymentMethod === 'qr-idr' && orderResult.status !== 'paid' && (
                                    <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:12, background:'rgba(240,192,32,0.06)', border:'1px solid rgba(240,192,32,0.22)', textAlign:'center' }}>
                                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:13, color:'var(--cc-text-secondary)' }}>
                                            <IconClockWait size={18} />
                                            Menunggu verifikasi pembayaran
                                        </div>
                                        <div style={{ marginTop:6, fontSize:11, color:'var(--cc-text-dim)' }}>Status hanya akan berubah setelah admin atau payment provider mengonfirmasi pembayaran.</div>
                                    </div>
                                )}

                                {orderResult.txSignature && (
                                    <a href={normalizeExplorerUrl(orderResult.explorerUrl) || getExplorerTxUrl(orderResult.txSignature)} target="_blank" rel="noopener noreferrer" className="cc-btn-outline"
                                        style={{ padding:'10px 16px', fontSize:12, justifyContent:'center', marginBottom:12, width:'100%', display:'flex' }}>
                                        <IconSolana /> Lihat di Solana Explorer <IconArrow />
                                    </a>
                                )}
                                {orderResult.orderId && (
                                    <a href={`/receipt?orderId=${encodeURIComponent(orderResult.orderId)}`} target="_blank" rel="noopener noreferrer" className="cc-btn-outline"
                                        style={{ padding:'10px 16px', fontSize:12, justifyContent:'center', marginBottom:12, width:'100%', display:'flex' }}>
                                        <IconQr /> Lihat Receipt &amp; QR <IconArrow />
                                    </a>
                                )}
                                <button onClick={() => { if (solanaIntervalRef.current) { clearInterval(solanaIntervalRef.current); solanaIntervalRef.current = null; } setOrderModal(false); setOrderResult(null); setQrDataUrl(null); setShowBuyAgain(false); }} className="cc-btn-green" style={{ width:'100%', padding:'12px', fontSize:14, justifyContent:'center' }}>
                                    Tutup
                                </button>
                            </div>
                        ) : (
                            /* ── Order Form ── */
                            <>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                                    <div>
                                        <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, color:'var(--cc-text)', marginBottom:2 }}>Pesan {selectedProduct.name}</h3>
                                        <div style={{ fontSize:12, color:'var(--cc-text-muted)' }}>Stok: <span style={{ color:'var(--cc-text-highlight)', fontWeight:600 }}>{selectedProduct.stock ?? 0} unit</span></div>
                                    </div>
                                    <button onClick={() => setOrderModal(false)} style={{ color:'var(--cc-text-muted)', cursor:'pointer', background:'none', border:'none', padding:4 }}><IconClose /></button>
                                </div>

                                {/* Wallet Banner — for SOL payment */}
                                {orderForm.paymentMethod === 'transfer' && (
                                    walletPublicKey ? (
                                        <div style={{ background:'rgba(107,70,196,0.15)', border:'1px solid rgba(171,159,242,0.3)', borderRadius:12, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
                                            <IconPhantomLogo size={20} />
                                            <div>
                                                <div style={{ fontWeight:600, color:'var(--cc-text)' }}>{shortenAddress(walletPublicKey, 6)}</div>
                                                <div style={{ color:'#ab9ff2', fontSize:11 }}>{walletBalance.toFixed(4)} SOL tersedia</div>
                                            </div>
                                            <span style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'#84e068', flexShrink:0 }} />
                                        </div>
                                    ) : (
                                        <div style={{ background:'rgba(107,70,196,0.1)', border:'1px solid rgba(171,159,242,0.35)', borderRadius:12, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
                                            <IconPhantomLogo size={18} />
                                            <span style={{ color:'var(--cc-text-secondary)', flex:1 }}>Phantom Wallet diperlukan untuk metode ini</span>
                                            <button type="button" onClick={connectWallet} disabled={walletConnecting} className="cc-btn-phantom" style={{ padding:'7px 12px', fontSize:11, flexShrink:0 }}>
                                                {walletConnecting ? <span className="cc-spinner" /> : <IconPhantomLogo size={14} />}
                                                {walletConnecting ? 'Menghubungkan...' : 'Connect'}
                                            </button>
                                        </div>
                                    )
                                )}

                                <form onSubmit={handleOrder} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                                    <div>
                                        <label style={{ fontSize:12, color:'var(--cc-text-muted)', display:'block', marginBottom:5 }}>Nama Lengkap *</label>
                                        <input type="text" required className="cc-inp" value={orderForm.buyerName}
                                            onChange={e => setOrderForm(f => ({ ...f, buyerName: e.target.value, recipientName: e.target.value }))} />
                                    </div>
                                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                                        <div>
                                            <label style={{ fontSize:12, color:'var(--cc-text-muted)', display:'block', marginBottom:5 }}>Email *</label>
                                            <input type="email" required className="cc-inp" value={orderForm.buyerEmail} onChange={e => setOrderForm(f => ({ ...f, buyerEmail: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize:12, color:'var(--cc-text-muted)', display:'block', marginBottom:5 }}>No. HP (opsional)</label>
                                            <input type="tel" className="cc-inp" value={orderForm.buyerPhone} onChange={e => setOrderForm(f => ({ ...f, buyerPhone: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                                        <div>
                                            <label style={{ fontSize:12, color:'var(--cc-text-muted)', display:'block', marginBottom:5 }}>Kode Pos</label>
                                            <input type="text" maxLength={6} placeholder="12345" className="cc-inp" value={orderForm.shippingPostal} onChange={e => setOrderForm(f => ({ ...f, shippingPostal: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize:12, color:'var(--cc-text-muted)', display:'block', marginBottom:5 }}>Kota *</label>
                                            <input type="text" placeholder="Jakarta Selatan" className="cc-inp" value={orderForm.shippingCity} onChange={e => setOrderForm(f => ({ ...f, shippingCity: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize:12, color:'var(--cc-text-muted)', display:'block', marginBottom:5 }}>Provinsi</label>
                                        <input type="text" placeholder="DKI Jakarta" className="cc-inp" value={orderForm.shippingProvince} onChange={e => setOrderForm(f => ({ ...f, shippingProvince: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize:12, color:'var(--cc-text-muted)', display:'block', marginBottom:5 }}>Alamat Lengkap *</label>
                                        <textarea required className="cc-inp" rows={2} placeholder="Jalan, no. rumah, RT/RW, kelurahan, kecamatan..." style={{ resize:'none', height:'auto' }}
                                            value={orderForm.shippingAddress} onChange={e => setOrderForm(f => ({ ...f, shippingAddress: e.target.value }))} />
                                    </div>

                                    {selectedProduct.weight?.length > 0 && (
                                        <div>
                                            <label style={{ fontSize:12, color:'var(--cc-text-muted)', display:'block', marginBottom:6 }}>Ukuran Berat</label>
                                            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                                                {selectedProduct.weight
                                                    .map((w, i) => ({ w, i, price: selectedProduct.pricePerUnit?.[i] ?? 0 }))
                                                    .filter(({ w, price }) => w >= 50 && w <= 5000 && price <= 10_000_000)
                                                    .map(({ w, i, price }) => (
                                                    <button key={w} type="button" onClick={() => setOrderForm(f => ({ ...f, weight: w }))}
                                                        style={{ padding:'8px 14px', borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:600,
                                                            background: orderForm.weight === w ? 'rgba(132,224,104,0.15)' : 'var(--cc-input-bg)',
                                                            border:`1px solid ${orderForm.weight === w ? 'rgba(132,224,104,0.5)' : 'var(--cc-input-border)'}`,
                                                            color: orderForm.weight === w ? 'var(--cc-text-highlight)' : 'var(--cc-text-muted)' }}>
                                                        {w}g<br /><span style={{ fontSize:10, opacity:0.7 }}>Rp {price?.toLocaleString('id-ID')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ fontSize:12, color:'var(--cc-text-muted)', display:'block', marginBottom:5 }}>Jumlah (max: {selectedProduct.stock ?? 0})</label>
                                        <input type="number" min={1} max={selectedProduct.stock ?? 50} value={orderForm.quantity}
                                            onChange={e => setOrderForm(f => ({ ...f, quantity: Math.min(parseInt(e.target.value)||1, selectedProduct.stock??999) }))}
                                            className="cc-inp" />
                                    </div>

                                    {/* Payment Methods */}
                                    <div>
                                        <label style={{ fontSize:12, color:'var(--cc-text-muted)', display:'block', marginBottom:8 }}>Metode Pembayaran</label>
                                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                                            <button type="button" onClick={() => setOrderForm(f => ({ ...f, paymentMethod:'midtrans' }))}
                                                style={{ padding:'16px 10px', borderRadius:14, cursor:'pointer', textAlign:'center',
                                                    background: orderForm.paymentMethod === 'midtrans' ? 'rgba(0,174,240,0.15)' : 'var(--cc-input-bg)',
                                                    border:`2px solid ${orderForm.paymentMethod === 'midtrans' ? '#00AEF0' : 'var(--cc-input-border)'}`,
                                                    color: orderForm.paymentMethod === 'midtrans' ? '#00AEF0' : '#6b7280',
                                                    display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                                                <IconMidtrans size={22} />
                                                <span style={{ fontSize:13, fontWeight:700 }}>Midtrans</span>
                                                <span style={{ fontSize:10, color:'var(--cc-text-dim)' }}>GoPay · OVO · Kartu · VA</span>
                                            </button>
                                            <button type="button" onClick={() => setOrderForm(f => ({ ...f, paymentMethod:'transfer' }))}
                                                style={{ padding:'16px 10px', borderRadius:14, cursor:'pointer', textAlign:'center',
                                                    background: orderForm.paymentMethod === 'transfer' ? 'rgba(107,70,196,0.15)' : 'var(--cc-input-bg)',
                                                    border:`2px solid ${orderForm.paymentMethod === 'transfer' ? '#9945FF' : 'var(--cc-input-border)'}`,
                                                    color: orderForm.paymentMethod === 'transfer' ? '#ab9ff2' : '#6b7280',
                                                    display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                                                <IconPhantomLogo size={22} />
                                                <span style={{ fontSize:13, fontWeight:700 }}>Phantom SOL</span>
                                                <span style={{ fontSize:10, color:'var(--cc-text-dim)' }}>Transfer Solana Wallet</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Price Summary */}
                                    <div style={{ background:'var(--cc-img-bg)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--cc-divider)' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                                            <span style={{ fontSize:12, color:'var(--cc-text-muted)' }}>Subtotal</span>
                                            <span style={{ fontSize:12, color:'var(--cc-text)' }}>Rp {pricing.subtotalPrice.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                                            <span style={{ fontSize:12, color:'var(--cc-text-muted)' }}>Biaya trace Solana</span>
                                            <span style={{ fontSize:12, color:'var(--cc-text)' }}>Rp {pricing.solanaTraceFee.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                                            <span style={{ fontSize:12, color:'var(--cc-text-muted)' }}>PPN Indonesia {pricing.ppnPercent}%</span>
                                            <span style={{ fontSize:12, color:'var(--cc-text)' }}>Rp {pricing.ppnAmount.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, paddingTop:8, borderTop:'1px solid var(--cc-divider)' }}>
                                            <span style={{ fontSize:12, color:'var(--cc-text-muted)', fontWeight:700 }}>Total Pembayaran</span>
                                            <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, color:'var(--cc-text-highlight)' }}>Rp {totalPrice.toLocaleString('id-ID')}</span>
                                        </div>
                                        {orderForm.paymentMethod === 'transfer' && (
                                            <>
                                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                                    <span style={{ fontSize:12, color:'var(--cc-text-muted)' }}>Setara SOL</span>
                                                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:800, color:'#ab9ff2' }}>{solAmount.toFixed(6)} SOL</span>
                                                </div>
                                                {walletPublicKey && walletBalance < solAmount && (
                                                    <div style={{ marginTop:8, padding:'6px 10px', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:8, fontSize:11, color:'#f87171' }}>
                                                        ⚠️ Saldo tidak cukup — Anda memiliki {walletBalance.toFixed(4)} SOL
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {(() => {
                                        const pm = orderForm.paymentMethod;
                                        const isSol = pm === 'transfer';
                                        const needsWallet = isSol && !walletPublicKey;
                                        const insufficientBal = pm === 'transfer' && walletPublicKey && walletBalance < solAmount;
                                        const disabled = ordering || needsWallet || insufficientBal;
                                        return (
                                            <button type="submit" disabled={disabled}
                                                className={pm === 'transfer' ? 'cc-btn-phantom' : pm === 'midtrans' ? 'cc-btn-midtrans' : 'cc-btn-green'}
                                                style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:14, opacity:disabled?0.6:1, cursor:disabled?'not-allowed':'pointer' }}>
                                                {ordering ? <><span className="cc-spinner" /> Memproses...</>
                                                    : needsWallet ? <><IconPhantomLogo size={16} /> Connect Phantom dulu</>
                                                    : <><IconCart /> Beli</>}
                                            </button>
                                        );
                                    })()}
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Success Buy Again Overlay ── */}
            {showBuyAgain && (
                <div style={{ position:'fixed', inset:0, zIndex:3000, background:'var(--cc-modal-backdrop)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
                    <div style={{ background:'var(--cc-bg)', border:'1px solid rgba(132,224,104,0.3)', borderRadius:20, padding:'36px 32px', textAlign:'center', maxWidth:360, width:'100%', boxShadow:'0 0 60px rgba(132,224,104,0.12)' }}>
                        <div style={{ marginBottom:16 }}><IconSuccessCircle size={64} /></div>
                        <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700, color:'var(--cc-text)', marginBottom:8 }}>Pembayaran Berhasil!</h2>
                        <p style={{ fontSize:13, color:'var(--cc-text-secondary)', marginBottom:6 }}>
                            Pesanan <strong style={{ color:'var(--cc-text-highlight)' }}>{orderResult?.productName}</strong> telah dikonfirmasi.
                        </p>
                        <p style={{ fontSize:12, color:'var(--cc-text-dim)', marginBottom:28 }}>Terima kasih sudah belanja di CoffeeChain!</p>
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                            {orderResult?.orderId && (
                                <a href={`/receipt?orderId=${encodeURIComponent(orderResult.orderId)}`} target="_blank" rel="noopener noreferrer" className="cc-btn-outline"
                                    style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:13 }}>
                                    <IconQr /> Lihat Receipt &amp; QR
                                </a>
                            )}
                            <button onClick={() => { if (solanaIntervalRef.current) { clearInterval(solanaIntervalRef.current); solanaIntervalRef.current = null; } setShowBuyAgain(false); setOrderResult(null); setQrDataUrl(null); if (selectedProduct) openOrder(selectedProduct); }}
                                className="cc-btn-green" style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:14 }}>
                                <IconCart /> Beli Lagi
                            </button>
                            <button onClick={() => { if (solanaIntervalRef.current) { clearInterval(solanaIntervalRef.current); solanaIntervalRef.current = null; } setShowBuyAgain(false); setOrderModal(false); setOrderResult(null); setQrDataUrl(null); }}
                                className="cc-btn-outline" style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:13 }}>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PRODUCT DETAIL MODAL ── */}
            {detailModal && selectedDetailProduct && (
                <div style={{ position:'fixed', inset:0, zIndex:2000, background:'var(--cc-modal-backdrop)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(6px)' }}
                    onClick={() => setDetailModal(false)}>
                    <div style={{ background:'var(--cc-bg)', border:'1px solid var(--cc-input-border)', borderRadius:20, maxWidth:500, width:'100%', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--cc-divider)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:700, color:'var(--cc-text)', display:'flex', alignItems:'center', gap:8 }}>
                                <IconCoffee /> Detail Produk
                            </h3>
                            <button onClick={() => setDetailModal(false)} style={{ background:'transparent', border:'none', color:'var(--cc-text-muted)', cursor:'pointer', padding:4 }}><IconClose /></button>
                        </div>
                        <div style={{ padding:'24px', maxHeight:'70vh', overflowY:'auto' }}>
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                                <div>
                                    <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:800, color:'var(--cc-text-highlight)', marginBottom:4 }}>{selectedDetailProduct.name}</h2>
                                    <p style={{ fontSize:14, color:'var(--cc-text-secondary)' }}>{selectedDetailProduct.origin} {selectedDetailProduct.variety && `· ${selectedDetailProduct.variety}`}</p>
                                </div>
                                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:20, fontWeight:700, color:'#f0c020' }}>Rp {selectedDetailProduct.pricePerUnit?.[0]?.toLocaleString('id-ID')}</div>
                            </div>

                            <div style={{ padding:'16px', background:'var(--cc-card-bg)', borderRadius:12, marginBottom:20, border:'1px solid var(--cc-divider)' }}>
                                <h4 style={{ fontSize:12, color:'var(--cc-text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>Deskripsi Kopi</h4>
                                <p style={{ fontSize:14, color:'var(--cc-text)', lineHeight:1.7 }}>{selectedDetailProduct.description || 'Tidak ada deskripsi.'}</p>
                            </div>

                            {traceLoading && <div style={{ textAlign:'center', padding:'16px 0', color:'var(--cc-text-muted)', fontSize:13 }}><span className="cc-spinner" style={{ borderTopColor:'var(--cc-text-highlight)' }} /> Memuat data blockchain...</div>}

                            {selectedDetailProduct.coffeeId ? (
                                <div style={{ padding:'16px', background:'rgba(132,224,104,0.06)', border:'1px solid rgba(132,224,104,0.2)', borderRadius:12 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#84e068" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                        <span style={{ fontSize:13, fontWeight:700, color:'var(--cc-text-highlight)' }}>On-Chain Terverifikasi</span>
                                    </div>
                                    <div style={{ fontSize:12, color:'var(--cc-text-muted)', marginBottom:12, fontFamily:'monospace' }}>ID: {selectedDetailProduct.coffeeId}</div>
                                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                                        <a href={`/trace?id=${selectedDetailProduct.coffeeId}`} target="_blank" rel="noreferrer"
                                            style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 18px', background:'rgba(132,224,104,0.12)', border:'1px solid rgba(132,224,104,0.3)', borderRadius:10, color:'var(--cc-text-highlight)', fontWeight:700, fontSize:13, textDecoration:'none' }}>
                                            <IconQr /> Lihat Sertifikasi
                                        </a>
                                        {(selectedDetailProduct.explorerUrl || selectedDetailProduct.txSignature) && (
                                            <a href={normalizeExplorerUrl(selectedDetailProduct.explorerUrl) || getExplorerTxUrl(selectedDetailProduct.txSignature)} target="_blank" rel="noreferrer"
                                                style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 18px', background:'rgba(171,159,242,0.1)', border:'1px solid rgba(171,159,242,0.3)', borderRadius:10, color:'#ab9ff2', fontWeight:700, fontSize:13, textDecoration:'none' }}>
                                                <IconSolana /> Solana Explorer
                                            </a>
                                        )}
                                        {(selectedDetailProduct.explorerUrl || selectedDetailProduct.txSignature) && (
                                            <div style={{ marginTop:8 }}>
                                                <QRButton
                                                    explorerUrl={normalizeExplorerUrl(selectedDetailProduct.explorerUrl) || getExplorerTxUrl(selectedDetailProduct.txSignature)}
                                                    traceUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/trace?id=${selectedDetailProduct.coffeeId}`}
                                                    coffeeId={selectedDetailProduct.coffeeId}
                                                    productName={selectedDetailProduct.name}
                                                    label="QR Solana"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding:'12px', background:'var(--cc-card-bg)', borderRadius:12, fontSize:13, color:'var(--cc-text-dim)', textAlign:'center', border:'1px solid var(--cc-divider)' }}>
                                    Produk ini belum terdaftar di blockchain.
                                </div>
                            )}
                        </div>
                        <div style={{ padding:'16px 24px', borderTop:'1px solid var(--cc-divider)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                            <button className="cc-btn-outline" onClick={() => setDetailModal(false)} style={{ padding:'12px', justifyContent:'center' }}>Kembali</button>
                            <button className="cc-btn-green" onClick={() => { setDetailModal(false); if ((selectedDetailProduct.stock ?? 0) > 0) openOrder(selectedDetailProduct); }}
                                disabled={(selectedDetailProduct.stock ?? 0) <= 0} style={{ padding:'12px', justifyContent:'center', opacity:(selectedDetailProduct.stock ?? 0) <= 0 ? 0.5 : 1 }}>
                                {(selectedDetailProduct.stock ?? 0) <= 0 ? 'Stok Habis' : 'Beli'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
