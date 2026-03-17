'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Connection, PublicKey, SystemProgram, Transaction,
    LAMPORTS_PER_SOL, ComputeBudgetProgram,
} from '@solana/web3.js';
import styles from './PaymentModal.module.css';
import {
    IS_CONTRACT_DEPLOYED,
    COFFEE_PROGRAM_ID,
    STORE_WALLET,
    SOLANA_NETWORK,
    SOL_PER_IDR,
    PRIORITY_FEE_MICROLAMPORTS,
    COMPUTE_UNIT_LIMIT,
} from '@/lib/contractConfig';

const PAYMENT_DURATION = 30 * 60; // 30 menit

// Tentukan cluster explorer berdasarkan network yang dipakai
function getExplorerUrl(signature) {
    const isDevnet = SOLANA_NETWORK.includes('devnet');
    const cluster = isDevnet ? 'devnet' : 'mainnet-beta';
    return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

const BANK_ACCOUNTS = [
    { bank: 'BRI', account: '0888-0100-7654-321', name: 'PT CoffeeChain Indonesia' },
    { bank: 'BCA', account: '1234-5678-9012-3456', name: 'PT CoffeeChain Indonesia' },
    { bank: 'Mandiri', account: '9012-3456-7890-1234', name: 'PT CoffeeChain Indonesia' },
];

export default function PaymentModal({ cartItem, user, onClose, onSuccess }) {
    const [order, setOrder] = useState(null);
    const [timeLeft, setTimeLeft] = useState(PAYMENT_DURATION);
    const [step, setStep] = useState('loading'); // loading | payment | confirming | success | expired
    const [payTab, setPayTab] = useState(cartItem.paymentMethod); // 'phantom' | 'qris'
    const [selectedBank, setSelectedBank] = useState(0);
    const [copied, setCopied] = useState('');
    const [phantomStatus, setPhantomStatus] = useState('idle'); // idle | connecting | awaiting | sending | done | error
    const [phantomError, setPhantomError] = useState('');
    const [txSignature, setTxSignature] = useState('');
    const [walletPubKey, setWalletPubKey] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const intervalRef = useRef(null);
    const pollRef = useRef(null);
    const baselineSigRef = useRef(null);   // signature SEBELUM order — untuk filter transaksi lama
    const orderCreatedAtRef = useRef(null); // unix timestamp saat order dibuat
    const { product, weightIndex, weight, price } = cartItem;

    // SOL amount (setidaknya 0.001 untuk demo agar tidak terlalu besar)
    const solAmount = Math.max(Math.round(price * SOL_PER_IDR * 1000) / 1000, 0.001);

    useEffect(() => {
        const pubKey = typeof window !== 'undefined' ? window.__phantomPubKey || (window.solana?.publicKey?.toString()) : null;
        setWalletPubKey(pubKey);
        setPayTab(cartItem.paymentMethod === 'transfer' ? 'phantom' : 'qris');
        createOrder();
        return () => { clearInterval(intervalRef.current); clearInterval(pollRef.current); };
    }, []);

    // Buat QR saat order ada
    useEffect(() => {
        if (order) generateQR(order.orderId);
    }, [order, solAmount]);

    // Auto-poll Solana devnet untuk QRIS (setiap 6 detik, mulai setelah baseline tersedia)
    useEffect(() => {
        if (step !== 'payment' || payTab !== 'qris' || !order) return;
        // Tunggu 3 detik agar baseline sudah diisi oleh createOrder()
        const startDelay = setTimeout(() => {
            pollRef.current = setInterval(() => pollForPayment(), 6000);
        }, 3000);
        return () => { clearTimeout(startDelay); clearInterval(pollRef.current); };
    }, [step, payTab, order]);

    async function pollForPayment() {
        // Jika belum ada baseline (artinya createOrder belum selesai), skip
        if (!orderCreatedAtRef.current) return;
        try {
            const connection = new Connection(SOLANA_NETWORK, 'confirmed');
            const storeKey = new PublicKey(STORE_WALLET);

            // Ambil HANYA transaksi BARU setelah baseline
            // until: baselineSigRef.current berarti hanya kembalikan sig yang LEBIH BARU dari baseline
            const opts = baselineSigRef.current
                ? { limit: 5, until: baselineSigRef.current }
                : { limit: 1 };
            const sigs = await connection.getSignaturesForAddress(storeKey, opts);

            // Jika tidak ada transaksi baru → bukan false positive, kembali
            if (!sigs || sigs.length === 0) return;

            for (const sig of sigs) {
                if (sig.err) continue;
                // Double-check: blockTime harus >= orderCreatedAt (unix detik)
                if (sig.blockTime && sig.blockTime < orderCreatedAtRef.current) continue;

                const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
                if (!tx) continue;
                const meta = tx.meta;
                if (!meta) continue;
                const accountKeys = tx.transaction.message.staticAccountKeys || tx.transaction.message.accountKeys;
                const storeIdx = accountKeys?.findIndex(k => k.toString() === STORE_WALLET);
                if (storeIdx < 0) continue;
                const postBal = meta.postBalances?.[storeIdx] || 0;
                const preBal = meta.preBalances?.[storeIdx] || 0;
                const receivedLamports = postBal - preBal;
                const expectedLamports = Math.round(solAmount * LAMPORTS_PER_SOL);
                // Toleransi ±2000 lamports untuk fee jaringan
                if (receivedLamports >= expectedLamports - 2000 && receivedLamports > 0) {
                    clearInterval(pollRef.current);
                    setTxSignature(sig.signature);
                    await markPaid(sig.signature);
                    setStep('success');
                    clearInterval(intervalRef.current);
                    setTimeout(() => onSuccess(), 3500);
                    return;
                }
            }
        } catch (e) {
            console.warn('Poll error:', e.message);
        }
    }

    // Countdown
    useEffect(() => {
        if (step !== 'payment') return;
        intervalRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(intervalRef.current); setStep('expired'); expireOrder(); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, [step]);

    async function generateQR(orderId) {
        try {
            // Solana Pay URI — bisa di-scan oleh Phantom Mobile langsung!
            const solanaPayUri = `solana:${STORE_WALLET}?amount=${solAmount}&label=CoffeeChain&message=Pembelian%20${encodeURIComponent(product.name)}%20${weight}g&memo=${orderId}&network=devnet`;
            const QRCode = (await import('qrcode')).default;
            const dataUrl = await QRCode.toDataURL(solanaPayUri, {
                width: 220,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' },
                errorCorrectionLevel: 'M',
            });
            setQrDataUrl(dataUrl);
        } catch (e) {
            console.error('QR error:', e);
        }
    }

    async function createOrder() {
        try {
            // 1. Ambil baseline signature SEBELUM order dibuat
            try {
                const conn = new Connection(SOLANA_NETWORK, 'confirmed');
                const sigs = await conn.getSignaturesForAddress(new PublicKey(STORE_WALLET), { limit: 1 });
                baselineSigRef.current = sigs?.[0]?.signature || null;
            } catch { baselineSigRef.current = null; }

            // Simpan waktu sekarang sebagai batas (unix detik)
            orderCreatedAtRef.current = Math.floor(Date.now() / 1000);

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.id || 'guest',
                    userName: user?.name || 'Guest',
                    productId: product.id,
                    productName: product.name,
                    weightIndex,
                    weight,
                    quantity: 1,
                    totalPrice: price,
                    paymentMethod: cartItem.paymentMethod,
                }),
            });
            const data = await res.json();
            if (data.data) {
                setOrder(data.data);
                const remaining = Math.floor((new Date(data.data.expiresAt) - Date.now()) / 1000);
                setTimeLeft(Math.max(0, remaining));
            }
            setStep('payment');
        } catch { setStep('payment'); }
    }

    async function expireOrder() {
        if (order) await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.orderId, status: 'expired' }) });
    }

    async function markPaid(signature = '') {
        if (order) await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.orderId, status: 'paid', txSignature: signature }) });
    }

    // ═══ PHANTOM WALLET PAYMENT (dengan gas minimum) ═══
    async function handlePhantomPay() {
        if (!window.solana) {
            setPhantomError('Phantom Wallet tidak ditemukan. Install ekstensi Phantom terlebih dahulu.');
            return;
        }
        setPhantomStatus('connecting');
        setPhantomError('');
        try {
            // 1. Connect jika belum
            let pubKey = walletPubKey;
            if (!pubKey) {
                const resp = await window.solana.connect();
                pubKey = resp.publicKey.toString();
                setWalletPubKey(pubKey);
                window.__phantomPubKey = pubKey;
            }

            setPhantomStatus('awaiting');
            const connection = new Connection(SOLANA_NETWORK, 'confirmed');
            const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

            // ── Gas Minimum: ComputeBudget instructions ──────────────────
            // setComputeUnitLimit: paksa batas 50.000 compute units (default 200.000)
            // setComputeUnitPrice: priority fee = 1 microLamport (paling murah, ~0 Rp extra)
            // Total gas ≈ 5.000 lamports = Rp 0.005 — hampir gratis!
            const budgetInstructions = [
                ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNIT_LIMIT }),
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_FEE_MICROLAMPORTS }),
            ];

            let transaction;

            if (IS_CONTRACT_DEPLOYED) {
                // ── Mode: Smart Contract CPI ─────────────────────────────
                // Gunakan program coffee_payment untuk validasi on-chain + simpan PaymentReceipt PDA
                const { Transaction: AnchorTx } = await import('@solana/web3.js');
                const [receiptPda] = PublicKey.findProgramAddressSync(
                    [Buffer.from('coffee-pay'), Buffer.from(order?.orderId || 'fallback')],
                    new PublicKey(COFFEE_PROGRAM_ID)
                );

                // Encode instruction data sesuai Anchor discriminator + args
                // Discriminator = sha256("global:pay_for_coffee")[0..8]
                const discriminator = Buffer.from([0x7a, 0xd4, 0x8e, 0x3c, 0x6e, 0x1a, 0x9f, 0x2b]);
                const orderId = order?.orderId || 'unknown';
                const productId = product.id?.slice(0, 20) || 'unknown';
                const marketId = cartItem.marketId || 'unknown';

                // Encode string: 4 bytes length LE + utf8
                function encStr(s) {
                    const b = Buffer.from(s, 'utf8');
                    const len = Buffer.alloc(4); len.writeUInt32LE(b.length);
                    return Buffer.concat([len, b]);
                }
                // Encode u64 LE
                const amtBuf = Buffer.alloc(8);
                amtBuf.writeBigUInt64LE(BigInt(lamports));

                const data = Buffer.concat([
                    discriminator,
                    encStr(orderId),
                    encStr(productId),
                    amtBuf,
                    encStr(marketId),
                ]);

                const { TransactionInstruction, AccountMeta } = await import('@solana/web3.js');
                const contractIx = new TransactionInstruction({
                    programId: new PublicKey(COFFEE_PROGRAM_ID),
                    keys: [
                        { pubkey: new PublicKey(pubKey), isSigner: true, isWritable: true },
                        { pubkey: new PublicKey(STORE_WALLET), isSigner: false, isWritable: true },
                        { pubkey: receiptPda, isSigner: false, isWritable: true },
                        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    ],
                    data,
                });

                transaction = new Transaction().add(...budgetInstructions, contractIx);
            } else {
                // ── Mode: SystemProgram.transfer biasa + ComputeBudget ───
                // Lebih murah (tidak ada rent PDA), tetap aman dengan gas minimum
                transaction = new Transaction().add(
                    ...budgetInstructions,
                    SystemProgram.transfer({
                        fromPubkey: new PublicKey(pubKey),
                        toPubkey: new PublicKey(STORE_WALLET),
                        lamports,
                    })
                );
            }

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new PublicKey(pubKey);

            // 3. Minta tanda tangan dari Phantom
            setPhantomStatus('sending');
            const { signature } = await window.solana.signAndSendTransaction(transaction);

            // 4. Tunggu konfirmasi
            await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

            setTxSignature(signature);
            setPhantomStatus('done');
            await markPaid(signature);
            setStep('success');
            clearInterval(intervalRef.current);
            setTimeout(() => onSuccess(), 3500);

        } catch (err) {
            console.error('Phantom pay error:', err);
            setPhantomStatus('error');
            if (err.code === 4001) setPhantomError('Transaksi ditolak pengguna.');
            else if (err.message?.includes('insufficient')) setPhantomError('Saldo SOL tidak cukup. Coba airdrop di devnet.');
            else setPhantomError(err.message || 'Transaksi gagal. Coba lagi.');
        }
    }

    // ═══ MANUAL CONFIRM (QRIS fall-back) ═══
    async function handleManualConfirm() {
        setStep('confirming');
        await new Promise(r => setTimeout(r, 2000));
        await markPaid();
        setStep('success');
        clearInterval(intervalRef.current);
        setTimeout(() => onSuccess(), 3500);
    }

    function copyToClipboard(text, field) {
        navigator.clipboard.writeText(text).then(() => { setCopied(field); setTimeout(() => setCopied(''), 2000); });
    }

    // Timer UI
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const secs = String(timeLeft % 60).padStart(2, '0');
    const timerPct = (timeLeft / PAYMENT_DURATION) * 100;
    const timerColor = timerPct > 50 ? '#4CAF50' : timerPct > 20 ? '#F5A623' : '#F44336';

    const isPhantomInstalled = typeof window !== 'undefined' && !!window.solana?.isPhantom;

    return (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && step !== 'confirming' && onClose()}>
            <div className={styles.modal}>

                {/* LOADING */}
                {step === 'loading' && (
                    <div className={styles.centerBox}>
                        <div className={styles.spinner} />
                        <p className={styles.loadingText}>Membuat order...</p>
                    </div>
                )}

                {/* PAYMENT */}
                {step === 'payment' && (
                    <>
                        <div className={styles.modalHeader}>
                            <div>
                                <h2 className={styles.modalTitle}>Pembayaran Produk</h2>
                                <p className={styles.modalSub}>Order ID: <code className={styles.code}>{order?.orderId || '...'}</code></p>
                            </div>
                            <button className={styles.closeBtn} onClick={onClose}>✕</button>
                        </div>

                        {/* Timer */}
                        <div className={styles.timerSection}>
                            <div className={styles.timerLabel}>⏳ Batas Waktu Pembayaran</div>
                            <div className={styles.timerDisplay} style={{ color: timerColor }}>{mins}:{secs}</div>
                            <div className={styles.timerBar}><div className={styles.timerFill} style={{ width: `${timerPct}%`, background: timerColor }} /></div>
                            <p className={styles.timerNote}>Pembayaran otomatis dibatalkan jika waktu habis</p>
                        </div>

                        {/* Order Summary */}
                        <div className={styles.orderSummary}>
                            <div className={styles.summaryRow}><span>{product.image} {product.name}</span><span>{weight}g</span></div>
                            <div className={styles.summaryRowTotal}>
                                <span>Total (IDR)</span>
                                <strong style={{ color: '#F5A623', fontSize: 18 }}>Rp {price.toLocaleString('id-ID')}</strong>
                            </div>
                            <div className={styles.summaryRowSol}>
                                <span>≈ SOL (devnet)</span>
                                <strong>◎ {solAmount.toFixed(4)} SOL</strong>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className={styles.payTabs}>
                            <button className={`${styles.payTab} ${payTab === 'phantom' ? styles.payTabActive : ''}`} onClick={() => setPayTab('phantom')}>
                                👻 Phantom Wallet
                            </button>
                            <button className={`${styles.payTab} ${payTab === 'qris' ? styles.payTabActive : ''}`} onClick={() => setPayTab('qris')}>
                                📱 QRIS (Phantom Mobile)
                            </button>
                        </div>

                        {/* ── PHANTOM DESKTOP PAYMENT ── */}
                        {payTab === 'phantom' && (
                            <div className={styles.phantomSection}>
                                <div className={styles.phantomCard}>
                                    <div className={styles.phantomLogo}>👻</div>
                                    <div className={styles.phantomInfo}>
                                        {walletPubKey ? (
                                            <>
                                                <div className={styles.phantomConnected}>✅ Wallet Terhubung</div>
                                                <code className={styles.phantomAddr}>{walletPubKey.slice(0, 8)}...{walletPubKey.slice(-6)}</code>
                                            </>
                                        ) : (
                                            <>
                                                <div className={styles.phantomNotConn}>{isPhantomInstalled ? '⚠️ Belum terhubung' : '❌ Phantom belum terinstall'}</div>
                                                {!isPhantomInstalled && <a href="https://phantom.app" target="_blank" rel="noreferrer" className={styles.installLink}>→ Download Phantom</a>}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.txDetail}>
                                    <div className={styles.txRow}><span>Kirim ke</span><code className={styles.txCode}>{STORE_WALLET.slice(0, 8)}...{STORE_WALLET.slice(-6)}</code></div>
                                    <div className={styles.txRow}><span>Jumlah</span><strong style={{ color: '#A855F7' }}>◎ {solAmount.toFixed(4)} SOL</strong></div>
                                    <div className={styles.txRow}><span>Network</span><span className={styles.devnetBadge}>Devnet</span></div>
                                    <div className={styles.txRow}><span>Memo</span><code>{order?.orderId || '...'}</code></div>
                                </div>

                                {phantomStatus === 'error' && (
                                    <div className={styles.errorBox}>⚠️ {phantomError}</div>
                                )}

                                {phantomStatus === 'awaiting' && (
                                    <div className={styles.awaitBox}>
                                        <div className={styles.phantomPulse}>👻</div>
                                        <p>Menunggu persetujuan di Phantom Wallet...</p>
                                        <p className={styles.awaitSub}>Cek popup Phantom di browser kamu</p>
                                    </div>
                                )}

                                {phantomStatus === 'sending' && (
                                    <div className={styles.awaitBox}>
                                        <div className={styles.spinner} />
                                        <p>Mengirim transaksi ke Solana...</p>
                                    </div>
                                )}

                                {(phantomStatus === 'idle' || phantomStatus === 'error' || phantomStatus === 'connecting') && (
                                    <button
                                        className={`${styles.phantomPayBtn} ${!isPhantomInstalled ? styles.phantomBtnDisabled : ''}`}
                                        onClick={handlePhantomPay}
                                        disabled={!isPhantomInstalled || phantomStatus === 'connecting'}
                                    >
                                        {phantomStatus === 'connecting' ? (
                                            <><div className={styles.spinnerSm} /> Menghubungkan...</>
                                        ) : (
                                            <>👻 Bayar ◎ {solAmount.toFixed(4)} SOL dengan Phantom</>
                                        )}
                                    </button>
                                )}

                                <p className={styles.phantomNote}>
                                    Phantom akan meminta persetujuan sebelum mengirim SOL. Pastikan kamu sudah memiliki SOL di devnet
                                    (<a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className={styles.faucetLink}>Airdrop devnet SOL gratis</a>).
                                </p>
                            </div>
                        )}

                        {/* ── QRIS / SOLANA PAY QR ── */}
                        {payTab === 'qris' && (
                            <div className={styles.qrisSection}>
                                <div className={styles.qrLabel}>
                                    <span className={styles.solanaPay}>⚡ Solana Pay QR</span>
                                    <span className={styles.qrNote2}>Scan dengan Phantom Mobile</span>
                                </div>

                                {qrDataUrl ? (
                                    <div className={styles.qrWrapper}>
                                        <img src={qrDataUrl} alt="Solana Pay QR Code" className={styles.qrImg} width={220} height={220} />
                                        <div className={styles.qrBrand}>
                                            <span>👻 Phantom</span>
                                            <span>|</span>
                                            <span>⚡ Solana Pay</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.qrLoading}><div className={styles.spinner} /><p>Membuat QR...</p></div>
                                )}

                                <div className={styles.qrisInfo}>
                                    <div className={styles.qrisRow}><span>Tujuan</span><code>{STORE_WALLET.slice(0, 8)}...{STORE_WALLET.slice(-6)}</code></div>
                                    <div className={styles.qrisRow}><span>Jumlah</span><strong style={{ color: '#A855F7' }}>◎ {solAmount.toFixed(4)} SOL ≈ Rp {price.toLocaleString()}</strong></div>
                                    <div className={styles.qrisRow}><span>Memo</span><code>{order?.orderId || '...'}</code></div>
                                </div>

                                <div className={styles.qrisScanSteps}>
                                    <p className={styles.scanTitle}>Cara Scan dengan Phantom Mobile:</p>
                                    <ol>
                                        <li>Buka aplikasi <strong>Phantom</strong> di HP kamu</li>
                                        <li>Klik ikon <strong>Scan QR</strong> (pojok kanan bawah)</li>
                                        <li>Arahkan kamera ke QR di atas</li>
                                        <li>Konfirmasi transaksi di Phantom Mobile</li>
                                        <li>Aplikasi akan <strong>otomatis mendeteksi</strong> pembayaran</li>
                                    </ol>
                                </div>

                                <div className={styles.autoDetectBox}>
                                    <div className={styles.autoDetectDot} />
                                    <span>Mendeteksi pembayaran secara otomatis di Solana Devnet...</span>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* CONFIRMING */}
                {step === 'confirming' && (
                    <div className={styles.centerBox}>
                        <div className={styles.spinner} />
                        <p className={styles.loadingText}>Memverifikasi pembayaran...</p>
                        <p className={styles.loadingSubText}>Menunggu konfirmasi blockchain</p>
                    </div>
                )}

                {/* SUCCESS */}
                {step === 'success' && (
                    <div className={styles.successBox}>
                        <div className={styles.successAnim}>✅</div>
                        <h2 className={styles.successTitle}>Pembayaran Berhasil!</h2>
                        <p className={styles.successSub}>Terima kasih, <strong>{user?.name || 'pelanggan'}!</strong></p>
                        <div className={styles.successDetails}>
                            <div><span>Produk</span><strong>{product.name} {weight}g</strong></div>
                            <div><span>Total</span><strong style={{ color: '#4CAF50' }}>Rp {price.toLocaleString()}</strong></div>
                            <div><span>Order ID</span><code>{order?.orderId}</code></div>
                            {txSignature && (
                                <div>
                                    <span>TX Solana</span>
                                    <a
                                        href={getExplorerUrl(txSignature)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.txLink}
                                        title={txSignature}
                                    >
                                        <code style={{ fontSize: 10 }}>{txSignature.slice(0, 16)}...</code>
                                        <span className={styles.explorerBadge}>🔍 Explorer</span>
                                    </a>
                                </div>
                            )}
                            <div><span>Status</span><span className={styles.paidBadge}>🎉 DIBAYAR</span></div>
                        </div>

                        {/* Tombol View di Solana Explorer */}
                        {txSignature && (
                            <a
                                href={getExplorerUrl(txSignature)}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.explorerBtn}
                            >
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                🔗 Lihat Transaksi di Solana Explorer
                            </a>
                        )}

                        <div className={styles.redirectNote}>
                            <div className={styles.redirectSpinner} /> Mengalihkan ke Dashboard dalam 3 detik...
                        </div>
                    </div>
                )}

                {/* EXPIRED */}
                {step === 'expired' && (
                    <div className={styles.expiredBox}>
                        <div className={styles.expiredIcon}>⏰</div>
                        <h2 className={styles.expiredTitle}>Waktu Pembayaran Habis</h2>
                        <p className={styles.expiredSub}>Batas 30 menit terlewat. Order dibatalkan otomatis.</p>
                        <button className={styles.btnRetry} onClick={onClose}>Coba Lagi</button>
                    </div>
                )}
            </div>
        </div>
    );
}
