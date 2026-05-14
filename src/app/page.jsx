'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
    connectPhantom, disconnectPhantom, getSolBalance,
    shortenAddress, isPhantomInstalled, sendSolTransaction, rupiahToSol,
} from '@/lib/phantom';
import { STORE_WALLET, MEMO_SIGNER_PUBLIC } from '@/lib/contractConfig';

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
const IconPhantomLogo = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 128 128" fill="none"><circle cx="64" cy="64" r="64" fill="#9945FF"/><path d="M64 24C42 24 24 42 24 64s18 40 40 40 40-18 40-40S86 24 64 24zm16 52a10 10 0 110-20 10 10 0 010 20zm-32 0a10 10 0 110-20 10 10 0 010 20z" fill="white"/><path d="M44 64h40" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.35"/></svg>;
const IconBank = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>;
const IconMobileQR = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
const IconClockWait = ({ size = 44 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconSuccessCircle = ({ size = 48 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#7ED44A" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>;
const IconMidtrans = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;

/* ── Market Data ── */
const coffeeTypes = [
    { name: 'Arabika Gayo', grade: 'Grade A', price: 68500, change: -2.1, vol: '4,821 Ton', origin: 'Aceh' },
    { name: 'Arabika Toraja', grade: 'Grade A', price: 72000, change: +1.4, vol: '3,210 Ton', origin: 'Sulawesi' },
    { name: 'Robusta Lampung', grade: 'Grade B', price: 42000, change: +0.8, vol: '8,540 Ton', origin: 'Lampung' },
    { name: 'Arabika Flores', grade: 'Grade A', price: 75000, change: +3.2, vol: '1,980 Ton', origin: 'NTT' },
    { name: 'Arabika Mandheling', grade: 'Grade AA', price: 80000, change: -0.5, vol: '2,430 Ton', origin: 'Sumut' },
    { name: 'Liberika Riau', grade: 'Grade B', price: 38000, change: +1.8, vol: '920 Ton', origin: 'Riau' },
];

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
    const [qrConfirm, setQrConfirm] = useState({ loading: false, done: false, error: null });
    const [bankVerified, setBankVerified] = useState(false);
    const [showBuyAgain, setShowBuyAgain] = useState(false);
    const [detailModal, setDetailModal] = useState(false);
    const [selectedDetailProduct, setSelectedDetailProduct] = useState(null);
    const [traceData, setTraceData] = useState(null);
    const [traceLoading, setTraceLoading] = useState(false);
    const solanaIntervalRef = useRef(null);

    /* ── Admin Session State (untuk floating admin bar) ── */
    const [adminUser, setAdminUser] = useState(null);

    /* ── Phantom Wallet State ── */
    const [walletPublicKey, setWalletPublicKey] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [walletConnecting, setWalletConnecting] = useState(false);
    const [walletMenuOpen, setWalletMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    /* ── Check admin/developer session from localStorage ── */
    useEffect(() => {
        const token = localStorage.getItem('cc_token');
        if (!token) return;
        fetch(`/api/auth/me?token=${token}`)
            .then(r => r.json())
            .then(data => {
                if (data.success && ['admin', 'developer', 'koperasi'].includes(data.user?.role)) {
                    setAdminUser(data.user);
                }
            })
            .catch(() => { /* ignore */ });
    }, []);

    /* ── Load Midtrans Snap.js ── */
    useEffect(() => {
        const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || 'Mid-client-k6WqARMZiLSJbg2_';
        const script = document.createElement('script');
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', clientKey);
        script.async = true;
        document.head.appendChild(script);
        return () => { if (document.head.contains(script)) document.head.removeChild(script); };
    }, []);

    /* ── Auto-connect Phantom if already approved ── */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const tryAutoConnect = async () => {
            try {
                if (window.solana && window.solana.isPhantom && window.solana.isConnected && window.solana.publicKey) {
                    const pk = window.solana.publicKey.toString();
                    const bal = await getSolBalance(pk);
                    setWalletPublicKey(pk);
                    setWalletBalance(bal);
                }
            } catch { /* ignore */ }
        };
        tryAutoConnect();
        if (window.solana) {
            window.solana.on('accountChanged', (newKey) => {
                if (newKey) { setWalletPublicKey(newKey.toString()); }
                else { setWalletPublicKey(null); setWalletBalance(0); }
            });
        }
    }, []);

    useEffect(() => {
        async function load() {
            try {
                const [prodRes, farmerRes, txRes] = await Promise.all([
                    fetch('/api/public/products'),
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

    /* ── Phantom Wallet Functions ── */
    async function connectWallet() {
        if (!isPhantomInstalled()) { window.open('https://phantom.app/', '_blank'); return false; }
        setWalletConnecting(true);
        try {
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
        await disconnectPhantom();
        setWalletPublicKey(null); setWalletBalance(0); setWalletMenuOpen(false);
    }

    async function handleOrder(e) {
        e.preventDefault();
        if (!selectedProduct) return;
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
            setOrdering(true);
            try {
                const res = await fetch('/api/midtrans/create-transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                    setOrdering(false);
                    if (!window.snap) {
                        alert('Midtrans Snap belum siap. Refresh halaman dan coba lagi.');
                        return;
                    }
                    window.snap.pay(data.snapToken, {
                        onSuccess: (result) => {
                            setOrderResult({ ...data.data, status: 'paid' });
                            setProducts(prev => prev.map(p =>
                                p.id === selectedProduct.id
                                    ? { ...p, stock: data.data.stockLeft ?? Math.max(0, (p.stock ?? 0) - orderForm.quantity) }
                                    : p
                            ));
                            setShowBuyAgain(true);
                        },
                        onPending: (result) => {
                            setOrderResult({ ...data.data, status: 'pending' });
                            setProducts(prev => prev.map(p =>
                                p.id === selectedProduct.id
                                    ? { ...p, stock: data.data.stockLeft ?? Math.max(0, (p.stock ?? 0) - orderForm.quantity) }
                                    : p
                            ));
                        },
                        onError: (result) => {
                            alert('Pembayaran Midtrans gagal: ' + (result.status_message || 'Terjadi kesalahan'));
                        },
                        onClose: () => {
                            setOrderResult({ ...data.data, status: 'pending' });
                        },
                    });
                } else {
                    alert(data.message || 'Gagal membuat transaksi Midtrans');
                    setOrdering(false);
                }
            } catch (err) {
                alert(err.message || 'Terjadi kesalahan. Coba lagi.');
                setOrdering(false);
            }
            return;
        }

        setOrdering(true);
        let txSignature = null;
        const targetWallet = selectedProduct.paymentWallet || MEMO_SIGNER_PUBLIC;

        try {
            if (pm === 'transfer') {
                const solAmt = rupiahToSol(totalPrice);
                try { txSignature = await sendSolTransaction(walletPublicKey, targetWallet, solAmt); }
                catch (txErr) { alert(`Transaksi Solana gagal: ${txErr.message}`); setOrdering(false); return; }
            }
            const res = await fetch('/api/public/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

                    // Auto-poll Solana devnet for incoming payment to targetWallet
                    if (solanaIntervalRef.current) clearInterval(solanaIntervalRef.current);
                    const capturedOrderId = data.data.orderId;
                    try {
                        const rpc = 'https://api.devnet.solana.com';
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
                                    await fetch('/api/orders', {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ orderId: capturedOrderId, status: 'paid' }),
                                    });
                                    setOrderResult(prev => ({ ...prev, status: 'paid' }));
                                    setShowBuyAgain(true);
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
            } else {
                alert(data.message || 'Gagal membuat pesanan');
            }
        } catch (err) { alert(err.message || 'Terjadi kesalahan. Coba lagi.'); }
        setOrdering(false);
    }

    async function confirmQrPayment() {
        if (!orderResult?.orderId) return;
        setQrConfirm({ loading: true, done: false, error: null });
        try {
            const res = await fetch('/api/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderResult.orderId, status: 'paid' }),
            });
            const data = await res.json();
            if (data.success) {
                setQrConfirm({ loading: false, done: true, error: null });
                setOrderResult(prev => ({ ...prev, status: 'paid' }));
                setShowBuyAgain(true);
            } else {
                setQrConfirm({ loading: false, done: false, error: data.message || 'Gagal konfirmasi' });
            }
        } catch {
            setQrConfirm({ loading: false, done: false, error: 'Koneksi error' });
        }
    }

    function openOrder(product, defaultPayment = 'midtrans') {
        if (solanaIntervalRef.current) { clearInterval(solanaIntervalRef.current); solanaIntervalRef.current = null; }
        setSelectedProduct(product);
        setOrderForm({ buyerName: '', buyerEmail: '', buyerPhone: '', quantity: 1, weight: product.weight?.[0] || '', paymentMethod: defaultPayment, bankName: 'BCA', accountNumber: '', ewalletApp: 'GoPay', ewalletPhone: '', recipientName: '', shippingAddress: '', shippingCity: '', shippingProvince: '', shippingPostal: '', shippingPhone: '' });
        setOrderResult(null);
        setQrDataUrl(null);
        setQrConfirm({ loading: false, done: false, error: null });
        setBankVerified(false);
        setShowBuyAgain(false);
        setOrderModal(true);
    }

    const weightIdx = selectedProduct && orderForm.weight ? (selectedProduct.weight?.indexOf(orderForm.weight) ?? 0) : 0;
    const unitPrice = selectedProduct?.pricePerUnit?.[weightIdx] ?? 0;
    const totalPrice = unitPrice * orderForm.quantity;
    const solAmount = rupiahToSol(totalPrice);

    return (
        <div style={{ background: '#030d06', minHeight: '100vh', color: '#E8F5E0', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

            {/* ── GLOBAL RESPONSIVE STYLES ── */}
            <style>{`
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                html { scroll-behavior: smooth; }
                body { overflow-x: hidden; }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin { to{transform:rotate(360deg)} }
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
                .lp-pay-btns { display:flex; gap:8px; }
                .lp-card { background:linear-gradient(145deg,rgba(22,30,22,0.95),rgba(12,18,12,0.95)); border:1px solid rgba(74,124,40,0.2); border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:10px; transition:transform 0.2s,border-color 0.2s; }
                .lp-card:hover { transform:translateY(-4px); border-color:rgba(126,212,74,0.4); }
                .lp-btn-primary { background:linear-gradient(135deg,#4A7C28,#7ED44A); color:#fff; font-weight:700; border:none; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:opacity 0.2s,transform 0.1s; text-decoration:none; }
                .lp-btn-primary:hover { opacity:0.9; transform:translateY(-1px); }
                .lp-btn-outline { border:1px solid rgba(126,212,74,0.35); color:#7ED44A; background:transparent; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; text-decoration:none; }
                .lp-btn-outline:hover { background:rgba(126,212,74,0.06); }
                .lp-btn-phantom { background:linear-gradient(135deg,#512da8,#9c27b0); color:#fff; font-weight:700; border:none; border-radius:10px; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:opacity 0.2s; text-decoration:none; }
                .lp-btn-phantom:hover { opacity:0.88; }
                .lp-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }
                .lp-stock-in { background:rgba(76,175,80,0.15); color:#7ED44A; border:1px solid rgba(76,175,80,0.3); }
                .lp-stock-low { background:rgba(255,152,0,0.15); color:#FFB300; border:1px solid rgba(255,152,0,0.3); }
                .lp-stock-out { background:rgba(244,67,54,0.12); color:#f44336; border:1px solid rgba(244,67,54,0.25); }
                .lp-stock-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; padding:3px 8px; border-radius:100px; }
                .lp-inp { width:100%; padding:10px 13px; border-radius:9px; background:rgba(255,255,255,0.04); border:1px solid rgba(74,124,40,0.25); color:#E8F5E0; font-size:14px; outline:none; box-sizing:border-box; }
                .lp-inp:focus { border-color:rgba(126,212,74,0.5); }
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
                        {[['#products', 'Produk'], ['#market', 'Harga Pasar'], ['#how', 'Cara Kerja'], ['/trace', 'Trace Kopi']].map(([href, label]) => (
                            <a key={href} href={href} onClick={() => setMobileMenu(false)} style={{ color: 'rgba(232,245,224,0.7)', fontSize: 14, padding: '9px 14px', borderRadius: 8, textDecoration: 'none', display: 'block' }}>{label}</a>
                        ))}

                        {/* Phantom Wallet Button */}
                        {walletPublicKey ? (
                            <div style={{ position: 'relative' }}>
                                <button onClick={() => setWalletMenuOpen(o => !o)}
                                    style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:10, background:'rgba(81,45,168,0.25)', border:'1px solid rgba(147,51,234,0.4)', color:'#E8F5E0', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                                    <IconPhantomLogo size={18} />
                                    <span>{shortenAddress(walletPublicKey)}</span>
                                    <span style={{ color:'rgba(126,212,74,0.8)', fontSize:11 }}>{walletBalance.toFixed(3)} SOL</span>
                                    <span style={{ width:6, height:6, borderRadius:'50%', background:'#7ED44A', display:'inline-block' }} />
                                </button>
                                {walletMenuOpen && (
                                    <div style={{ position:'absolute', top:'110%', right:0, background:'#0e1a0e', border:'1px solid rgba(74,124,40,0.3)', borderRadius:10, padding:8, minWidth:180, zIndex:200 }}>
                                        <div style={{ padding:'6px 10px', fontSize:11, color:'rgba(232,245,224,0.4)', borderBottom:'1px solid rgba(74,124,40,0.15)', marginBottom:6 }}>
                                            {shortenAddress(walletPublicKey, 6)}<br />
                                            <span style={{ color:'#7ED44A' }}>{walletBalance.toFixed(4)} SOL</span>
                                        </div>
                                        <button onClick={disconnectWallet} style={{ width:'100%', padding:'8px 10px', background:'rgba(244,67,54,0.1)', border:'1px solid rgba(244,67,54,0.2)', borderRadius:7, color:'#f44336', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                                            <IconClose /> Putuskan Koneksi
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button onClick={connectWallet} disabled={walletConnecting} className="lp-btn-phantom" style={{ padding:'9px 16px', fontSize:13 }}>
                                {walletConnecting ? <span className="lp-spinner" /> : <IconPhantomLogo />}
                                {walletConnecting ? 'Menghubungkan...' : 'Phantom Wallet'}
                            </button>
                        )}
                        <Link href="/login" className="lp-btn-outline" onClick={() => setMobileMenu(false)} style={{ padding: '9px 14px', fontSize: 13 }}>
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

            {/* ── ADMIN PANEL BAR (visible only when admin/developer/koperasi is logged in) ── */}
            {adminUser && (
                <div style={{
                    position: 'fixed', top: 68, left: 0, right: 0, zIndex: 99,
                    background: 'linear-gradient(135deg, rgba(10,20,10,0.98), rgba(22,40,14,0.98))',
                    backdropFilter: 'blur(16px)',
                    borderBottom: '1px solid rgba(126,212,74,0.3)',
                    padding: '0 20px',
                }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(232,245,224,0.7)' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7ED44A', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontWeight: 700, color: '#7ED44A', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {adminUser.role === 'developer' ? 'Developer' : adminUser.role === 'koperasi' ? 'Koperasi' : 'Admin'}
                            </span>
                            <span style={{ color: 'rgba(232,245,224,0.45)' }}>·</span>
                            <span>{adminUser.name || adminUser.email}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: 'rgba(126,212,74,0.12)', border: '1px solid rgba(126,212,74,0.25)', color: '#7ED44A', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                                <IconPackage /> Dashboard
                            </Link>
                            <Link href="/dashboard?section=products" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: 'rgba(74,124,40,0.1)', border: '1px solid rgba(74,124,40,0.2)', color: 'rgba(232,245,224,0.8)', fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
                                <IconCart /> Produk
                            </Link>
                            <Link href="/coffee-register" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: 'rgba(74,124,40,0.1)', border: '1px solid rgba(74,124,40,0.2)', color: 'rgba(232,245,224,0.8)', fontSize: 12, fontWeight: 500, textDecoration: 'none' }}>
                                <IconChain /> Register Kopi
                            </Link>
                            <button
                                onClick={() => { localStorage.removeItem('cc_token'); setAdminUser(null); }}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: 'rgba(244,67,54,0.08)', border: '1px solid rgba(244,67,54,0.2)', color: '#f44336', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                                <IconClose /> Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── HERO ── */}
            <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', paddingTop: adminUser ? 112 : 68 }}>
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
                        Platform blockchain pertama untuk industri kopi Indonesia. Bayar via{' '}
                        <strong style={{ color: '#F5A623', display:'inline-flex', alignItems:'center', gap:4 }}><IconBank /> Transfer Bank / QR Rupiah</strong> atau{' '}
                        <strong style={{ color: '#a855f7', display:'inline-flex', alignItems:'center', gap:4 }}><IconPhantomLogo /> Phantom Wallet Solana</strong>.
                    </p>

                    <div className="lp-hero-btns">
                        <a href="#products" className="lp-btn-primary" style={{ padding: '14px 32px', fontSize: 15 }}>
                            <IconCart /> Belanja Sekarang
                        </a>
                        {walletPublicKey ? (
                            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 20px', borderRadius:10, background:'rgba(81,45,168,0.2)', border:'1px solid rgba(147,51,234,0.35)', fontSize:13, color:'#E8F5E0' }}>
                                <IconPhantomLogo size={18} />
                                <span style={{ fontWeight:600 }}>{shortenAddress(walletPublicKey)}</span>
                                <span style={{ color:'#7ED44A' }}>{walletBalance.toFixed(3)} SOL</span>
                            </div>
                        ) : (
                            <button onClick={connectWallet} disabled={walletConnecting} className="lp-btn-phantom" style={{ padding:'14px 28px', fontSize:15 }}>
                                {walletConnecting ? <span className="lp-spinner" /> : <IconPhantomLogo />}
                                {walletConnecting ? 'Menghubungkan...' : 'Connect Phantom'}
                            </button>
                        )}
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
                        <p style={{ color: 'rgba(232,245,224,0.5)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
                            Kopi pilihan terbaik dari petani bersertifikat · Bayar via <strong style={{ color: '#a855f7', display:'inline-flex', alignItems:'center', gap:4, verticalAlign:'middle' }}><IconPhantomLogo /> Phantom Wallet</strong>
                        </p>
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
                        {products.map(p => {
                            const stock = p.stock ?? 0;
                            const outOfStock = stock <= 0;
                            const lowStock = stock > 0 && stock <= 10;
                            return (
                            <div key={p.id} className="lp-card" onClick={() => { setSelectedDetailProduct(p); setDetailModal(true); }} style={{ cursor: 'pointer' }}>
                                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                                    <div style={{ width:48, height:48, borderRadius:12, background: outOfStock ? 'rgba(100,100,100,0.1)' : 'rgba(74,124,40,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color: outOfStock ? 'rgba(255,255,255,0.2)' : '#7ED44A', flexShrink:0 }}>
                                        <IconCoffee />
                                    </div>
                                    <span className={`lp-stock-badge ${outOfStock ? 'lp-stock-out' : lowStock ? 'lp-stock-low' : 'lp-stock-in'}`}>
                                        {outOfStock ? '● Habis' : lowStock ? `● Tersisa ${stock}` : `● Stok ${stock}`}
                                    </span>
                                </div>
                                <div>
                                    <div style={{ fontWeight:700, fontSize:15, color: outOfStock ? 'rgba(232,245,224,0.4)' : '#E8F5E0', marginBottom:2 }}>{p.name}</div>
                                    <div style={{ fontSize:12, color:'rgba(232,245,224,0.45)' }}>{p.origin}{p.variety ? ` · ${p.variety}` : ''}</div>
                                </div>
                                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                                    {[p.grade, p.roast].filter(Boolean).map(tag => (
                                        <span key={tag} style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'rgba(74,124,40,0.15)', color:'#7ED44A', border:'1px solid rgba(126,212,74,0.2)', fontWeight:600 }}>{tag}</span>
                                    ))}
                                    {p.coffeeId && (
                                        <a href={`/trace?id=${p.coffeeId}`} style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'rgba(124,77,255,0.12)', color:'#b388ff', border:'1px solid rgba(124,77,255,0.25)', fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:3 }}>
                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                            On-Chain
                                        </a>
                                    )}
                                </div>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                                        {[1,2,3,4,5].map(s => <span key={s} style={{ color:'#F5A623', fontSize:12 }}><IconStar filled={s <= Math.round(p.rating || 4)} /></span>)}
                                        <span style={{ fontSize:11, color:'rgba(232,245,224,0.5)', marginLeft:3 }}>
                                            {p.rating ? p.rating.toFixed(1) : '4.0'}
                                        </span>
                                    </div>
                                    {p.sold > 0 ? (
                                        <span style={{ fontSize:10, fontWeight:700, color:'#F5A623', background:'rgba(245,166,35,0.12)', border:'1px solid rgba(245,166,35,0.25)', borderRadius:100, padding:'2px 8px', display:'inline-flex', alignItems:'center', gap:3 }}>
                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>
                                            {p.sold.toLocaleString('id-ID')} terjual
                                        </span>
                                    ) : (
                                        <span style={{ fontSize:10, color:'rgba(126,212,74,0.6)', background:'rgba(74,124,40,0.1)', border:'1px solid rgba(74,124,40,0.2)', borderRadius:100, padding:'2px 8px' }}>Baru</span>
                                    )}
                                </div>
                                <div style={{ marginTop:'auto', paddingTop:10, borderTop:'1px solid rgba(74,124,40,0.12)' }}>
                                    <div style={{ marginBottom:8 }}>
                                        <div style={{ fontSize:10, color:'rgba(232,245,224,0.35)' }}>mulai dari</div>
                                        {p.pricePerUnit?.length > 0 ? (
                                            <>
                                                <div style={{ fontSize:16, fontWeight:700, color: outOfStock ? 'rgba(232,245,224,0.3)' : '#7ED44A' }}>
                                                    Rp {(p.pricePerUnit[0]).toLocaleString('id-ID')}
                                                    {p.weight?.length > 0 && <span style={{ fontSize:11, fontWeight:400, color:'rgba(232,245,224,0.35)', marginLeft:4 }}>/{p.weight[0]}g</span>}
                                                </div>
                                                <div style={{ fontSize:10, color:'rgba(147,51,234,0.6)' }}>≈ {rupiahToSol(p.pricePerUnit[0]).toFixed(4)} SOL</div>
                                            </>
                                        ) : (
                                            <div style={{ fontSize:13, color:'rgba(232,245,224,0.3)', fontStyle:'italic' }}>Harga belum diatur</div>
                                        )}
                                    </div>
                                    {outOfStock ? (
                                        <div style={{ padding:'9px', fontSize:11, opacity:0.4, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(74,124,40,0.12)', borderRadius:10, color:'rgba(232,245,224,0.3)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                            <IconPackage /> Stok Habis
                                        </div>
                                    ) : (
                                        <div style={{ display:'flex', gap:6 }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openOrder(p, 'midtrans'); }}
                                                style={{ flex:1, padding:'9px 8px', fontSize:11, fontWeight:700, background:'linear-gradient(135deg,#00AEF0,#0070B8)', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                                                <IconMidtrans /> Midtrans
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openOrder(p, 'transfer'); }}
                                                className="lp-btn-phantom"
                                                style={{ flex:1, padding:'9px 8px', fontSize:11, justifyContent:'center' }}>
                                                <IconPhantomLogo /> SOL
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── HARGA PASAR ── */}
            <section id="market" style={{ padding: 'clamp(40px,8vw,80px) 20px', borderTop: '1px solid rgba(74,124,40,0.12)', background: 'radial-gradient(ellipse at top, rgba(74,124,40,0.05), transparent 70%)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <h2 style={{ fontSize: 'clamp(26px,5vw,40px)', fontWeight: 800, color: '#E8F5E0', marginBottom: 10, letterSpacing: '-0.5px' }}>Harga Pasar Kopi Live</h2>
                        <p style={{ color: 'rgba(232,245,224,0.5)', fontSize: 15, maxWidth: 460, margin: '0 auto' }}>Pantau pergerakan harga komoditas kopi Nusantara secara real-time</p>
                    </div>
                    <div className="lp-products-grid">
                        {coffeeTypes.map((c, i) => (
                            <div key={i} className="lp-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(74,124,40,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7ED44A' }}><IconCoffee /></div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: '#E8F5E0' }}>{c.name}</div>
                                        <div style={{ fontSize: 12, color: 'rgba(232,245,224,0.45)' }}>{c.origin} · <span style={{ color: '#7ED44A' }}>{c.grade}</span></div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: 'rgba(232,245,224,0.4)', marginBottom: 4 }}>Harga per Kg</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: '#E8F5E0', letterSpacing: '-0.5px' }}>Rp {c.price.toLocaleString('id-ID')}</div>
                                        <div style={{ fontSize: 10, color: 'rgba(147,51,234,0.7)', marginTop: 2 }}>≈ {rupiahToSol(c.price).toFixed(4)} SOL</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: c.change > 0 ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)', color: c.change > 0 ? '#4CAF50' : '#f44336' }}>
                                            {c.change > 0 ? '▲' : '▼'} {Math.abs(c.change)}%
                                        </div>
                                        <div style={{ fontSize: 10, color: 'rgba(232,245,224,0.3)', marginTop: 6 }}>Vol: {c.vol}</div>
                                    </div>
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
                    <p style={{ textAlign: 'center', color: 'rgba(232,245,224,0.45)', marginBottom: 40, fontSize: 15 }}>Transparan dari kebun hingga cangkir — bayar Rupiah atau SOL on-chain</p>
                    <div className="lp-how-grid">
                        {[
                            { icon: <IconCart />, title: 'Pilih Kopi', desc: 'Pilih kopi premium dari katalog. Stok real-time, harga transparan.' },
                            { icon: <IconBank />, title: 'Bayar Rupiah', desc: 'Transfer Bank via Virtual Account atau scan QR Code IDR. Tanpa wallet.' },
                            { icon: <IconPhantomLogo size={28} />, title: 'Atau Bayar SOL', desc: 'Hubungkan Phantom Wallet Solana dan bayar langsung via Transfer SOL atau Solana Pay QR.' },
                            { icon: <IconVerify />, title: 'Konfirmasi On-Chain', desc: 'Pesanan tercatat. Transaksi SOL permanen di Solana blockchain — lacak kapan saja.' },
                        ].map(({ icon, title, desc }, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(74,124,40,0.12)', borderRadius: 14, padding: 'clamp(16px,3vw,24px)', position: 'relative' }}>
                                <div style={{ color: '#7ED44A', marginBottom: 12, display: 'flex', fontSize: 28 }}>{icon}</div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#E8F5E0', marginBottom: 6 }}>{title}</div>
                                <div style={{ fontSize: 13, color: 'rgba(232,245,224,0.45)', lineHeight: 1.6 }}>{desc}</div>
                                <div style={{ position: 'absolute', top: 14, right: 14, width: 24, height: 24, borderRadius: '50%', background: 'rgba(74,124,40,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#7ED44A' }}>{i + 1}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── VERIFIKASI BLOCKCHAIN ── */}
            <section id="verify" style={{ padding: 'clamp(40px,8vw,80px) 20px', borderTop: '1px solid rgba(74,124,40,0.12)', background: 'radial-gradient(ellipse at bottom, rgba(124,77,255,0.04), transparent 70%)' }}>
                <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg,rgba(124,77,255,0.15),rgba(74,124,40,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#b388ff' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <h2 style={{ fontSize: 'clamp(24px,5vw,36px)', fontWeight: 800, color: '#E8F5E0', marginBottom: 10, letterSpacing: '-0.5px' }}>Verifikasi Keaslian Kopi</h2>
                    <p style={{ color: 'rgba(232,245,224,0.45)', marginBottom: 28, fontSize: 14, maxWidth: 440, margin: '0 auto 28px' }}>
                        Setiap kopi di CoffeeChain tercatat permanen di blockchain Solana. Masukkan Coffee ID untuk memverifikasi.
                    </p>
                    <div style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto' }}>
                        <input
                            type="text" placeholder="Coffee ID (contoh: CF-A1B2C3)"
                            id="verifyInput"
                            style={{ flex: 1, padding: '13px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(124,77,255,0.25)', color: '#E8F5E0', fontSize: 14, outline: 'none', fontWeight: 600, letterSpacing: '0.5px' }}
                        />
                        <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); const v = document.getElementById('verifyInput')?.value?.trim(); if (v) window.location.href = `/trace?id=${encodeURIComponent(v)}`; }}
                            style={{ padding: '13px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#512da8,#7c4dff)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            Verifikasi
                        </a>
                    </div>
                    <p style={{ marginTop: 16, fontSize: 11, color: 'rgba(232,245,224,0.3)' }}>
                        Atau buka halaman <a href="/trace" style={{ color: '#b388ff', textDecoration: 'none', fontWeight: 600 }}>Trace Kopi</a> untuk pencarian lengkap
                    </p>
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
                    <button onClick={connectWallet} disabled={!!walletPublicKey || walletConnecting} className="lp-btn-phantom" style={{ padding:'14px 36px', fontSize:15, opacity: walletPublicKey ? 0.6 : 1 }}>
                        {walletPublicKey ? <><IconPhantomLogo /> {shortenAddress(walletPublicKey)}</> : walletConnecting ? <><span className="lp-spinner" /> Menghubungkan...</> : <><IconPhantomLogo /> Hubungkan Phantom</>}
                    </button>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ padding: '32px 20px', borderTop: '1px solid rgba(74,124,40,0.12)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }} className="lp-footer-inner">
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                        <div style={{ color: '#7ED44A' }}><IconCoffee /></div>
                        <span style={{ fontWeight: 700, color: '#7ED44A', fontSize: 15 }}>CoffeeChain</span>
                    </Link>
                    <div style={{ color: 'rgba(232,245,224,0.3)', fontSize: 12 }}>© 2026 CoffeeChain · Blockchain Industri Kopi Indonesia · Powered by Solana</div>
                    <div className="lp-footer-links">
                        {[['/', 'Beranda'], ['/login', 'Masuk'], ['#products', 'Produk'], ['/trace', 'Trace Kopi']].map(([href, label]) => (
                            <a key={label} href={href} style={{ color: 'rgba(232,245,224,0.4)', fontSize: 13, textDecoration: 'none' }}>{label}</a>
                        ))}
                    </div>
                </div>
            </footer>

            {/* ══════════════════════════════════════════
                MODAL: Order Form (Multi-Currency Payment)
            ══════════════════════════════════════════ */}
            {orderModal && selectedProduct && (
                <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
                    onClick={() => { setOrderModal(false); setOrderResult(null); }}>
                    <div style={{ background:'#0e1a0e', border:'1px solid rgba(74,124,40,0.3)', borderRadius:18, padding:'clamp(20px,4vw,32px)', maxWidth:500, width:'100%', maxHeight:'92dvh', overflowY:'auto' }}
                        onClick={e => e.stopPropagation()}>

                        {orderResult ? (
                            /* ── Success / Result ── */
                            <div style={{ textAlign:'center' }}>
                                <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
                                    {orderResult.status === 'paid' ? <IconCheck /> : <div style={{ color:'rgba(232,245,224,0.5)' }}>
                                        {orderResult.paymentMethod === 'transfer-idr' ? <IconBank />
                                            : orderResult.paymentMethod === 'qr-idr' ? <IconMobileQR />
                                            : <IconClockWait />}
                                    </div>}
                                </div>
                                <h3 style={{ fontSize:20, fontWeight:700, color:'#E8F5E0', marginBottom:6 }}>
                                    {orderResult.status === 'paid' ? 'Pembayaran Berhasil'
                                        : orderResult.paymentMethod === 'midtrans' ? 'Pesanan Dicatat — Menunggu Konfirmasi'
                                        : orderResult.paymentMethod === 'transfer-idr' ? 'Transfer ke Virtual Account'
                                        : orderResult.paymentMethod === 'qr-idr' ? 'Scan QR Code Pembayaran'
                                        : 'Menunggu Pembayaran Solana'}
                                </h3>
                                <p style={{ color:'rgba(232,245,224,0.45)', marginBottom:20, fontSize:13 }}>
                                    {orderResult.status === 'paid'
                                        ? 'Pembayaran berhasil dikonfirmasi!'
                                        : orderResult.paymentMethod === 'midtrans'
                                            ? 'Pembayaran Midtrans masih dalam proses. Cek email untuk konfirmasi.'
                                            : orderResult.paymentMethod === 'transfer-idr'
                                                ? 'Transfer Rupiah ke nomor Virtual Account di bawah sebelum pesanan kadaluarsa.'
                                                : orderResult.paymentMethod === 'qr-idr'
                                                    ? 'Scan QR Code di bawah menggunakan aplikasi pembayaran Anda.'
                                                    : 'Scan QR Solana Pay di bawah untuk menyelesaikan pembayaran.'}
                                </p>

                                {/* Virtual Account Box */}
                                {orderResult.virtualAccount && (
                                    <div style={{ background:'rgba(245,166,35,0.08)', border:'1px solid rgba(245,166,35,0.3)', borderRadius:12, padding:'16px', marginBottom:16, textAlign:'center' }}>
                                        <div style={{ fontSize:11, color:'rgba(232,245,224,0.45)', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Nomor Virtual Account</div>
                                        <div style={{ fontSize:26, fontWeight:900, letterSpacing:3, color:'#F5A623', fontFamily:'monospace' }}>{orderResult.virtualAccount}</div>
                                        <div style={{ fontSize:11, color:'rgba(232,245,224,0.4)', marginTop:6 }}>Bank CoffeeChain · Berlaku 30 menit</div>
                                    </div>
                                )}

                                <div style={{ background:'rgba(0,0,0,0.35)', borderRadius:10, padding:16, textAlign:'left', fontSize:12, marginBottom:16 }}>
                                    {[
                                        ['ID Pesanan', orderResult.orderId],
                                        ['Produk', orderResult.productName],
                                        ['Berat × Qty', `${orderResult.weight}g × ${orderResult.quantity}`],
                                        ['Total (IDR)', `Rp ${orderResult.totalPrice?.toLocaleString('id-ID')}`],
                                        ...(orderResult.solAmount != null ? [['Total (SOL)', `${orderResult.solAmount?.toFixed(6)} SOL`]] : []),
                                        ['Metode', orderResult.paymentMethod === 'qr' ? 'Solana Pay QR'
                                            : orderResult.paymentMethod === 'transfer' ? 'Transfer SOL'
                                            : orderResult.paymentMethod === 'qr-idr' ? 'QR Code IDR'
                                            : orderResult.paymentMethod === 'midtrans' ? 'Midtrans (Sandbox)'
                                            : 'Transfer Bank IDR'],
                                        ...(orderResult.walletAddress ? [['Wallet', shortenAddress(orderResult.walletAddress, 6)]] : []),
                                        ...(orderResult.txSignature ? [['Tx Hash', `${orderResult.txSignature.slice(0,16)}...`]] : []),
                                        ['Status', orderResult.status === 'paid' ? 'Lunas' : 'Menunggu Pembayaran'],
                                        ['Stok Tersisa', `${orderResult.stockLeft ?? '–'} unit`],
                                    ].map(([k, v]) => (
                                        <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, padding:'7px 0', borderBottom:'1px solid rgba(74,124,40,0.1)' }}>
                                            <span style={{ color:'rgba(232,245,224,0.45)', flexShrink:0 }}>{k}</span>
                                            <span style={{ color:'#E8F5E0', fontWeight:600, textAlign:'right', wordBreak:'break-all' }}>{v}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Solana Pay QR */}
                                {qrDataUrl && orderResult.paymentMethod === 'qr' && (
                                    <div style={{ marginBottom:20, textAlign:'center' }}>
                                        <div style={{ fontSize:12, color:'rgba(232,245,224,0.5)', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                            <IconQr /> Scan dengan Phantom Mobile · Solana Pay · <span style={{ color:'#7ED44A' }}>konfirmasi otomatis</span>
                                        </div>
                                        <div style={{ display:'inline-block', padding:14, background:'#0a120a', borderRadius:12, border:'1px solid rgba(126,212,74,0.3)', boxShadow:'0 0 32px rgba(126,212,74,0.1)' }}>
                                            <img src={qrDataUrl} alt="Solana Pay QR" style={{ width:200, height:200, display:'block' }} />
                                        </div>
                                        <div style={{ marginTop:10, fontSize:11, color:'rgba(232,245,224,0.35)' }}>
                                            Kirim <strong style={{ color:'#7ED44A' }}>{orderResult.solAmount?.toFixed(6)} SOL</strong> ke merchant wallet
                                        </div>
                                    </div>
                                )}

                                {/* Rupiah QR */}
                                {qrDataUrl && orderResult.paymentMethod === 'qr-idr' && (
                                    <div style={{ marginBottom:20, textAlign:'center' }}>
                                        <div style={{ fontSize:12, color:'rgba(232,245,224,0.5)', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                            <IconQr /> Scan QR · Bayar ke GoPay <strong style={{ color:'#F5A623' }}>081389629074</strong>
                                        </div>
                                        <div style={{ display:'inline-block', padding:14, background:'#0a120a', borderRadius:12, border:'1px solid rgba(245,166,35,0.3)', boxShadow:'0 0 32px rgba(245,166,35,0.1)' }}>
                                            <img src={qrDataUrl} alt="QR Pembayaran IDR" style={{ width:200, height:200, display:'block' }} />
                                        </div>
                                        <div style={{ marginTop:10, fontSize:11, color:'rgba(232,245,224,0.35)' }}>
                                            Bayar <strong style={{ color:'#F5A623' }}>Rp {orderResult.totalPrice?.toLocaleString('id-ID')}</strong> ke GoPay 081389629074
                                        </div>
                                    </div>
                                )}

                                {/* Solana Pay — auto-detect indicator */}
                                {orderResult.paymentMethod === 'qr' && orderResult.status !== 'paid' && (
                                    <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10, background:'rgba(126,212,74,0.06)', border:'1px solid rgba(126,212,74,0.2)', textAlign:'center' }}>
                                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:13, color:'rgba(232,245,224,0.7)' }}>
                                            <span className="lp-spinner" style={{ borderTopColor:'#7ED44A' }} />
                                            Menunggu konfirmasi blockchain...
                                        </div>
                                        <div style={{ marginTop:6, fontSize:11, color:'rgba(232,245,224,0.35)' }}>Pembayaran akan dikonfirmasi otomatis setelah transaksi terdeteksi</div>
                                    </div>
                                )}

                                {/* Rupiah QR — manual confirm button */}
                                {orderResult.paymentMethod === 'qr-idr' && orderResult.status !== 'paid' && (
                                    <div style={{ marginBottom: 16 }}>
                                        {qrConfirm.done ? (
                                            <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(76,175,80,0.12)', border:'1px solid rgba(76,175,80,0.35)', color:'#4CAF50', fontWeight:600, fontSize:13, textAlign:'center' }}>
                                                <IconSuccessCircle size={20} /> Pembayaran dikonfirmasi! Pesanan Anda sedang diproses.
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={confirmQrPayment}
                                                    disabled={qrConfirm.loading}
                                                    className="lp-btn-primary"
                                                    style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14, marginBottom:6, opacity: qrConfirm.loading ? 0.7 : 1 }}>
                                                    {qrConfirm.loading ? <><span className="lp-spinner" /> Memverifikasi...</> : <><IconSuccessCircle size={18} /> Saya Sudah Bayar ke GoPay 081389629074</>}
                                                </button>
                                                {qrConfirm.error && (
                                                    <div style={{ fontSize:12, color:'#f44336', textAlign:'center', marginTop:4 }}>{qrConfirm.error}</div>
                                                )}
                                                <div style={{ fontSize:11, color:'rgba(232,245,224,0.35)', textAlign:'center' }}>Klik setelah transfer ke GoPay 081389629074 berhasil</div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {orderResult.txSignature && (
                                    <a href={`https://explorer.solana.com/tx/${orderResult.txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="lp-btn-outline"
                                        style={{ padding:'10px 16px', fontSize:12, justifyContent:'center', marginBottom:12, width:'100%', display:'flex' }}>
                                        <IconSolana /> Lihat di Solana Explorer <IconArrow />
                                    </a>
                                )}
                                <button onClick={() => { if (solanaIntervalRef.current) { clearInterval(solanaIntervalRef.current); solanaIntervalRef.current = null; } setOrderModal(false); setOrderResult(null); setQrDataUrl(null); setShowBuyAgain(false); }} className="lp-btn-primary" style={{ width:'100%', padding:'12px', fontSize:14, justifyContent:'center' }}>
                                    Tutup
                                </button>
                            </div>
                        ) : (
                            /* ── Order Form ── */
                            <>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                                    <div>
                                        <h3 style={{ fontSize:17, fontWeight:700, color:'#E8F5E0', marginBottom:2 }}>Pesan {selectedProduct.name}</h3>
                                        <div style={{ fontSize:12, color:'rgba(232,245,224,0.45)' }}>Stok: <span style={{ color:'#7ED44A', fontWeight:600 }}>{selectedProduct.stock ?? 0} unit</span></div>
                                    </div>
                                    <button onClick={() => setOrderModal(false)} style={{ color:'rgba(232,245,224,0.5)', cursor:'pointer', background:'none', border:'none', padding:4 }}><IconClose /></button>
                                </div>

                                {/* Wallet Banner — only for SOL payment */}
                                {orderForm.paymentMethod === 'transfer' && (
                                    walletPublicKey ? (
                                        <div style={{ background:'rgba(81,45,168,0.15)', border:'1px solid rgba(147,51,234,0.3)', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
                                            <IconPhantomLogo size={20} />
                                            <div>
                                                <div style={{ fontWeight:600, color:'#E8F5E0' }}>{shortenAddress(walletPublicKey, 6)}</div>
                                                <div style={{ color:'#a855f7', fontSize:11 }}>{walletBalance.toFixed(4)} SOL tersedia</div>
                                            </div>
                                            <span style={{ marginLeft:'auto', width:8, height:8, borderRadius:'50%', background:'#7ED44A', flexShrink:0 }} />
                                        </div>
                                    ) : (
                                        <div style={{ background:'rgba(81,45,168,0.1)', border:'1px solid rgba(147,51,234,0.35)', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
                                            <IconPhantomLogo size={18} />
                                            <span style={{ color:'rgba(232,245,224,0.6)', flex:1 }}>Phantom Wallet diperlukan untuk metode ini</span>
                                            <button type="button" onClick={connectWallet} disabled={walletConnecting} className="lp-btn-phantom" style={{ padding:'7px 12px', fontSize:11, flexShrink:0 }}>
                                                {walletConnecting ? <span className="lp-spinner" /> : <IconPhantomLogo />}
                                                {walletConnecting ? 'Menghubungkan...' : 'Connect'}
                                            </button>
                                        </div>
                                    )
                                )}

                                <form onSubmit={handleOrder} className="lp-modal-grid">
                                    {[
                                        { label:'Nama Lengkap *', key:'buyerName', type:'text', required:true },
                                        { label:'Email *', key:'buyerEmail', type:'email', required:true },
                                        { label:'No. HP (opsional)', key:'buyerPhone', type:'tel', required:false },
                                    ].map(({ label, key, type, required }) => (
                                        <div key={key}>
                                            <label style={{ fontSize:12, color:'rgba(232,245,224,0.55)', display:'block', marginBottom:5 }}>{label}</label>
                                            <input type={type} required={required} value={orderForm[key]} onChange={e => setOrderForm(f => ({ ...f, [key]: e.target.value }))} className="lp-inp" />
                                        </div>
                                    ))}

                                    {selectedProduct.weight?.length > 0 && (
                                        <div>
                                            <label style={{ fontSize:12, color:'rgba(232,245,224,0.55)', display:'block', marginBottom:6 }}>Ukuran Berat</label>
                                            <div className="lp-weight-btns">
                                                {selectedProduct.weight
                                                    .map((w, i) => ({ w, i, price: selectedProduct.pricePerUnit?.[i] ?? 0 }))
                                                    .filter(({ w, price }) => w >= 50 && w <= 5000 && price <= 10_000_000)
                                                    .map(({ w, i, price }) => (
                                                    <button key={w} type="button" onClick={() => setOrderForm(f => ({ ...f, weight: w }))}
                                                        style={{ padding:'8px 14px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, background: orderForm.weight===w ? 'rgba(126,212,74,0.2)' : 'rgba(255,255,255,0.04)', border:`1px solid ${orderForm.weight===w ? 'rgba(126,212,74,0.5)' : 'rgba(74,124,40,0.2)'}`, color: orderForm.weight===w ? '#7ED44A' : 'rgba(232,245,224,0.6)' }}>
                                                        {w}g<br /><span style={{ fontSize:10, opacity:0.7 }}>Rp {price?.toLocaleString('id-ID')}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ fontSize:12, color:'rgba(232,245,224,0.55)', display:'block', marginBottom:5 }}>Jumlah (max: {selectedProduct.stock ?? 0})</label>
                                        <input type="number" min={1} max={selectedProduct.stock ?? 50} value={orderForm.quantity}
                                            onChange={e => setOrderForm(f => ({ ...f, quantity: Math.min(parseInt(e.target.value)||1, selectedProduct.stock??999) }))}
                                            className="lp-inp" />
                                    </div>

                                    {/* Payment Methods — Midtrans atau Solana */}
                                    <div>
                                        <label style={{ fontSize:12, color:'rgba(232,245,224,0.55)', display:'block', marginBottom:8 }}>Metode Pembayaran</label>
                                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                                            <button type="button" onClick={() => setOrderForm(f => ({ ...f, paymentMethod:'midtrans' }))}
                                                style={{ padding:'16px 10px', borderRadius:12, cursor:'pointer', textAlign:'center', background: orderForm.paymentMethod==='midtrans' ? 'rgba(0,174,240,0.18)' : 'rgba(255,255,255,0.03)', border:`2px solid ${orderForm.paymentMethod==='midtrans' ? '#00AEF0' : 'rgba(74,124,40,0.15)'}`, color: orderForm.paymentMethod==='midtrans' ? '#00AEF0' : 'rgba(232,245,224,0.5)', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                                                <IconMidtrans size={22} />
                                                <span style={{ fontSize:13, fontWeight:700 }}>Midtrans</span>
                                                <span style={{ fontSize:10, color:'rgba(232,245,224,0.4)' }}>GoPay · OVO · Kartu · VA</span>
                                            </button>
                                            <button type="button" onClick={() => setOrderForm(f => ({ ...f, paymentMethod:'transfer' }))}
                                                style={{ padding:'16px 10px', borderRadius:12, cursor:'pointer', textAlign:'center', background: orderForm.paymentMethod==='transfer' ? 'rgba(153,69,255,0.18)' : 'rgba(255,255,255,0.03)', border:`2px solid ${orderForm.paymentMethod==='transfer' ? '#9945FF' : 'rgba(74,124,40,0.15)'}`, color: orderForm.paymentMethod==='transfer' ? '#b388ff' : 'rgba(232,245,224,0.5)', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                                                <IconPhantomLogo size={22} />
                                                <span style={{ fontSize:13, fontWeight:700 }}>Phantom SOL</span>
                                                <span style={{ fontSize:10, color:'rgba(232,245,224,0.4)' }}>Transfer Solana Wallet</span>
                                            </button>
                                        </div>
                                    </div>



                                                    {/* Shipping Address */}
                                    <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:14 }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                            <span style={{ fontSize:12, fontWeight:700, color:'#F5A623' }}>Alamat Pengiriman</span>
                                        </div>
                                        <div style={{ display:'grid', gap:8 }}>
                                            <div>
                                                <label style={{ fontSize:11, color:'rgba(232,245,224,0.5)', display:'block', marginBottom:3 }}>Nama Penerima *</label>
                                                <input className="lp-inp" type="text" placeholder="Nama lengkap penerima" style={{ fontSize:13 }}
                                                    value={orderForm.recipientName}
                                                    onChange={e => setOrderForm(f => ({ ...f, recipientName: e.target.value }))} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize:11, color:'rgba(232,245,224,0.5)', display:'block', marginBottom:3 }}>Alamat Lengkap *</label>
                                                <textarea className="lp-inp" rows={2} placeholder="Jalan, no. rumah, RT/RW, kelurahan, kecamatan..." style={{ fontSize:13, resize:'none', height:'auto' }}
                                                    value={orderForm.shippingAddress}
                                                    onChange={e => setOrderForm(f => ({ ...f, shippingAddress: e.target.value }))} />
                                            </div>
                                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                                <div>
                                                    <label style={{ fontSize:11, color:'rgba(232,245,224,0.5)', display:'block', marginBottom:3 }}>Kota *</label>
                                                    <input className="lp-inp" type="text" placeholder="Jakarta Selatan" style={{ fontSize:13 }}
                                                        value={orderForm.shippingCity}
                                                        onChange={e => setOrderForm(f => ({ ...f, shippingCity: e.target.value }))} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize:11, color:'rgba(232,245,224,0.5)', display:'block', marginBottom:3 }}>Provinsi</label>
                                                    <input className="lp-inp" type="text" placeholder="DKI Jakarta" style={{ fontSize:13 }}
                                                        value={orderForm.shippingProvince}
                                                        onChange={e => setOrderForm(f => ({ ...f, shippingProvince: e.target.value }))} />
                                                </div>
                                            </div>
                                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                                <div>
                                                    <label style={{ fontSize:11, color:'rgba(232,245,224,0.5)', display:'block', marginBottom:3 }}>Kode Pos</label>
                                                    <input className="lp-inp" type="text" maxLength={6} placeholder="12345" style={{ fontSize:13 }}
                                                        value={orderForm.shippingPostal}
                                                        onChange={e => setOrderForm(f => ({ ...f, shippingPostal: e.target.value }))} />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize:11, color:'rgba(232,245,224,0.5)', display:'block', marginBottom:3 }}>No. HP Penerima</label>
                                                    <input className="lp-inp" type="tel" maxLength={15} placeholder="08xxxxxxxxxx" style={{ fontSize:13 }}
                                                        value={orderForm.shippingPhone}
                                                        onChange={e => setOrderForm(f => ({ ...f, shippingPhone: e.target.value }))} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price Summary */}
                                    <div style={{ background:'rgba(0,0,0,0.35)', borderRadius:10, padding:'14px 16px' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                                            <span style={{ fontSize:12, color:'rgba(232,245,224,0.45)' }}>Total Pembayaran</span>
                                            <span style={{ fontSize:18, fontWeight:700, color:'#7ED44A' }}>Rp {totalPrice.toLocaleString('id-ID')}</span>
                                        </div>
                                        {orderForm.paymentMethod === 'transfer' && (
                                            <>
                                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                                    <span style={{ fontSize:12, color:'rgba(232,245,224,0.45)' }}>Setara SOL</span>
                                                    <span style={{ fontSize:20, fontWeight:800, color:'#a855f7' }}>{solAmount.toFixed(6)} SOL</span>
                                                </div>
                                                {walletPublicKey && walletBalance < solAmount && (
                                                    <div style={{ marginTop:8, padding:'6px 10px', background:'rgba(244,67,54,0.1)', border:'1px solid rgba(244,67,54,0.2)', borderRadius:7, fontSize:11, color:'#f44336' }}>
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
                                                className={isSol ? 'lp-btn-phantom' : 'lp-btn-primary'}
                                                style={{ width:'100%', justifyContent:'center', padding:'14px', fontSize:14, opacity:disabled?0.6:1, cursor:disabled?'not-allowed':'pointer',
                                                    ...(pm === 'midtrans' ? { background:'linear-gradient(135deg,#00AEF0,#0070B8)' } : {}) }}>
                                                {ordering ? <><span className="lp-spinner" /> Memproses...</>
                                                    : needsWallet ? <><IconPhantomLogo /> Connect Phantom dulu</>
                                                    : pm === 'midtrans' ? <><IconMidtrans size={18} /> Bayar dengan Midtrans</>
                                                    : <><IconPhantomLogo /> Transfer {solAmount.toFixed(4)} SOL via Phantom</>
                                                }
                                            </button>
                                        );
                                    })()}
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Beli Lagi? Success Overlay ── */}
            {showBuyAgain && (
                <div style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
                    <div style={{ background:'#0e1a0e', border:'1px solid rgba(126,212,74,0.35)', borderRadius:20, padding:'36px 32px', textAlign:'center', maxWidth:360, width:'100%', boxShadow:'0 0 60px rgba(126,212,74,0.12)' }}>
                        <div style={{ marginBottom:16 }}><IconSuccessCircle size={64} /></div>
                        <h2 style={{ fontSize:20, fontWeight:700, color:'#E8F5E0', marginBottom:8 }}>Pembayaran Berhasil!</h2>
                        <p style={{ fontSize:13, color:'rgba(232,245,224,0.6)', marginBottom:6 }}>
                            Pesanan <strong style={{ color:'#7ED44A' }}>{orderResult?.productName}</strong> telah dikonfirmasi.
                        </p>
                        <p style={{ fontSize:12, color:'rgba(232,245,224,0.4)', marginBottom:28 }}>Terima kasih sudah belanja di CoffeeChain!</p>
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                            <button
                                onClick={() => {
                                    if (solanaIntervalRef.current) { clearInterval(solanaIntervalRef.current); solanaIntervalRef.current = null; }
                                    setShowBuyAgain(false);
                                    setOrderResult(null);
                                    setQrDataUrl(null);
                                    if (selectedProduct) openOrder(selectedProduct);
                                }}
                                className="lp-btn-primary"
                                style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:14 }}>
                                <IconCart /> Beli Lagi
                            </button>
                            <button
                                onClick={() => {
                                    if (solanaIntervalRef.current) { clearInterval(solanaIntervalRef.current); solanaIntervalRef.current = null; }
                                    setShowBuyAgain(false);
                                    setOrderModal(false);
                                    setOrderResult(null);
                                    setQrDataUrl(null);
                                }}
                                className="lp-btn-outline"
                                style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:13 }}>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PRODUCT DETAILS MODAL ── */}
            {detailModal && selectedDetailProduct && (
                <div style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }} onClick={() => setDetailModal(false)}>
                    <div style={{ background:'#0A120A', border:'1px solid rgba(74,124,40,0.2)', borderRadius:20, maxWidth:500, width:'100%', overflow:'hidden', boxShadow:'0 10px 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <h3 style={{ fontSize:18, fontWeight:700, color:'#E8F5E0', display:'flex', alignItems:'center', gap:8 }}>
                                <IconCoffee /> Detail Produk
                            </h3>
                            <button onClick={() => setDetailModal(false)} style={{ background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', padding:4 }}><IconClose /></button>
                        </div>
                        <div style={{ padding:'24px', maxHeight:'70vh', overflowY:'auto' }}>
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                                <div>
                                    <h2 style={{ fontSize:22, fontWeight:800, color:'#7ED44A', marginBottom:4 }}>{selectedDetailProduct.name}</h2>
                                    <p style={{ fontSize:14, color:'rgba(232,245,224,0.6)' }}>{selectedDetailProduct.origin} {selectedDetailProduct.variety && `· ${selectedDetailProduct.variety}`}</p>
                                </div>
                                <div style={{ fontSize:20, fontWeight:700, color:'#F5A623' }}>Rp {selectedDetailProduct.pricePerUnit?.[0]?.toLocaleString('id-ID')}</div>
                            </div>
                            
                            <div style={{ padding:'16px', background:'rgba(255,255,255,0.03)', borderRadius:12, marginBottom:20 }}>
                                <h4 style={{ fontSize:12, color:'rgba(232,245,224,0.4)', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>Deskripsi Kopi</h4>
                                <p style={{ fontSize:14, color:'#E8F5E0', lineHeight:1.6 }}>{selectedDetailProduct.description || 'Tidak ada deskripsi.'}</p>
                            </div>

                            {selectedDetailProduct.coffeeId ? (
                                <div style={{ padding:'16px', background:'rgba(124,77,255,0.05)', border:'1px solid rgba(124,77,255,0.2)', borderRadius:12 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b388ff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                        <h4 style={{ fontSize:14, fontWeight:700, color:'#b388ff' }}>On-Chain Traceability</h4>
                                    </div>
                                    <div style={{ fontSize:13, color:'rgba(232,245,224,0.7)', marginBottom:6 }}>
                                        <strong>Coffee ID:</strong> {selectedDetailProduct.coffeeId}
                                    </div>
                                    {traceLoading ? (
                                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', gap:6 }}><span className="lp-spinner"/> Mengambil transaksi...</div>
                                    ) : traceData?.txSignature ? (
                                        <div style={{ fontSize:13, color:'rgba(232,245,224,0.7)' }}>
                                            <div style={{ marginBottom:8 }}><strong>Hash Transaksi:</strong> <span style={{ fontFamily:'monospace', background:'rgba(0,0,0,0.3)', padding:'2px 6px', borderRadius:4 }}>{shortenAddress(traceData.txSignature)}</span></div>
                                            <a href={`https://explorer.solana.com/tx/${traceData.txSignature}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 12px', background:'rgba(124,77,255,0.15)', color:'#b388ff', borderRadius:8, textDecoration:'none', fontWeight:600, fontSize:12 }}>
                                                Lihat di Solana Explorer
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                                            </a>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize:12, color:'#F5A623', padding:'8px', background:'rgba(245,166,35,0.1)', borderRadius:6 }}>
                                            ⏳ Menunggu verifikasi blockchain (Pending)
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ padding:'12px', background:'rgba(255,255,255,0.02)', borderRadius:12, fontSize:13, color:'rgba(255,255,255,0.3)', textAlign:'center' }}>
                                    Produk ini belum terdaftar di blockchain.
                                </div>
                            )}

                        </div>
                        <div style={{ padding:'16px 24px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                            <button className="lp-btn-outline" onClick={() => setDetailModal(false)} style={{ padding:'12px', justifyContent:'center' }}>Kembali</button>
                            <button className="lp-btn-primary" onClick={() => {
                                setDetailModal(false);
                                if((selectedDetailProduct.stock??0) > 0) openOrder(selectedDetailProduct);
                            }} disabled={(selectedDetailProduct.stock??0) <= 0} style={{ padding:'12px', justifyContent:'center', opacity:(selectedDetailProduct.stock??0) <= 0 ? 0.5 : 1 }}>
                                {(selectedDetailProduct.stock??0) <= 0 ? 'Stok Habis' : 'Beli Sekarang'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
