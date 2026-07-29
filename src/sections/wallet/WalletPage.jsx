'use client';

import { useState, useEffect } from 'react';
import { connectPhantom, disconnectPhantom, getSolBalance, shortenAddress, isPhantomInstalled, sendSolTransaction } from '@/lib/phantom';
import { getExplorerAddressUrl, getExplorerTxUrl } from '@/lib/contractConfig';
import styles from './WalletPage.module.css';

const IconWallet = ({ size = 20 }) => (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 12V7H5a2 2 0 010-4h14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 5v14a2 2 0 002 2h16v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 12a2 2 0 000 4h4v-4h-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const IconCopy = ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);
const IconExplorer = ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const IconSend = ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const IconReceive = ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);
const IconChart = ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V5M4 19h16M8 16V9M12 16V7M16 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);
const IconHistory = ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12a9 9 0 101.8-5.4M3 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);
const IconLink = ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L11 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M14 11a5 5 0 00-7.07 0L4.8 13.12a5 5 0 007.07 7.07L13 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);
const IconLock = ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);
const IconSol = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6.5 7.25h11l-2 2.25h-11l2-2.25zM4.5 11h11l2 2.25h-11L4.5 11zM6.5 14.75h11l-2 2.25h-11l2-2.25z" fill="currentColor"/>
    </svg>
);
const SolanaLogo = ({ size = 24 }) => (
    <img src="/solana-logo.png" alt="Solana" width={size} height={size} style={{ display: 'block', objectFit: 'contain' }} />
);

const demoTxHistory = [
    { type: 'Masuk', desc: 'Penjualan Arabika Gayo 120kg', amount: 8220000, hash: '0x3f8a...c9d1', time: '27 Feb 14:21', status: 'Confirmed' },
    { type: 'Keluar', desc: 'Komisi Koperasi (2%)', amount: -164000, hash: '0x3f8a...c9d2', time: '27 Feb 14:21', status: 'Confirmed' },
    { type: 'Masuk', desc: 'Penjualan Toraja 85kg', amount: 5820000, hash: '0x7b2c...e4f9', time: '27 Feb 14:08', status: 'Pending' },
];

export default function WalletPage() {
    const [wallet, setWallet] = useState({ connected: false, publicKey: null, balance: 0 });
    const [loading, setLoading] = useState(false);
    const [txHistory, setTxHistory] = useState(demoTxHistory);
    const [sendForm, setSendForm] = useState({ to: '', amount: '' });
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);
    const [tab, setTab] = useState('overview');
    const [receiveQr, setReceiveQr] = useState(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.solana?.isConnected) return;
        const pk = window.solana.publicKey?.toString();
        if (pk) {
            getSolBalance(pk).then(bal => setWallet({ connected: true, publicKey: pk, balance: bal }));
        }
    }, []);

    useEffect(() => {
        if (!wallet.connected || !wallet.publicKey) {
            setReceiveQr(null);
            return;
        }
        let cancelled = false;
        import('qrcode')
            .then(m => m.default.toDataURL(wallet.publicKey, {
                width: 220,
                margin: 2,
                color: { dark: '#111111', light: '#ffffff' },
                errorCorrectionLevel: 'M',
            }))
            .then(data => { if (!cancelled) setReceiveQr(data); })
            .catch(() => { if (!cancelled) setReceiveQr(null); });
        return () => { cancelled = true; };
    }, [wallet.connected, wallet.publicKey]);

    async function handleConnect() {
        if (!isPhantomInstalled()) { window.open('https://phantom.app/', '_blank'); return; }
        setLoading(true);
        try {
            const { publicKey } = await connectPhantom();
            const balance = await getSolBalance(publicKey);
            setWallet({ connected: true, publicKey, balance });
        } catch (err) { alert(err.message); }
        finally { setLoading(false); }
    }

    async function handleDisconnect() {
        await disconnectPhantom();
        setWallet({ connected: false, publicKey: null, balance: 0 });
    }

    async function handleSend() {
        if (!sendForm.to || !sendForm.amount) { alert('Isi alamat tujuan dan jumlah'); return; }
        setSending(true);
        try {
            const signature = await sendSolTransaction(wallet.publicKey, sendForm.to, sendForm.amount);
            const explorerUrl = getExplorerTxUrl(signature);
            setSendResult({ success: true, signature, explorerUrl });
            setTxHistory(prev => [{
                type: 'Keluar',
                desc: `Transfer SOL ke ${sendForm.to.slice(0, 8)}...`,
                amount: -Number(sendForm.amount),
                hash: `${signature.slice(0, 8)}...${signature.slice(-8)}`,
                explorerUrl,
                time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                status: 'Confirmed',
            }, ...prev]);
            const balance = await getSolBalance(wallet.publicKey);
            setWallet(current => ({ ...current, balance }));
            setSendForm({ to: '', amount: '' });
        } catch (err) { alert('Transaksi gagal: ' + err.message); }
        finally { setSending(false); }
    }

    const solPrice = 150; // USD
    const usdToIdr = 16000;
    const balanceIdr = wallet.balance * solPrice * usdToIdr;

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Dompet Phantom</h1>
                    <p className={styles.pageSubtitle}>Kelola aset SOL dan transaksi kopi on-chain Solana blockchain</p>
                </div>
                {!wallet.connected ? (
                    <button className={styles.connectPhantomBtn} onClick={handleConnect} disabled={loading}>
                        <span className={styles.phantomEmoji}><SolanaLogo size={24} /></span>
                        {loading ? 'Menghubungkan...' : 'Hubungkan Phantom Wallet'}
                    </button>
                ) : (
                    <button className={styles.disconnectBtn} onClick={handleDisconnect}>Putuskan Sambungan</button>
                )}
            </div>

            {/* Not Connected */}
            {!wallet.connected && (
                <div className={styles.notConnected}>
                    <div className={styles.phantomLogo}><SolanaLogo size={24} /></div>
                    <h2 className={styles.ncTitle}>Phantom Wallet Belum Terhubung</h2>
                    <p className={styles.ncDesc}>Hubungkan Phantom wallet Solana untuk mengakses saldo, mengirim transaksi, dan melihat riwayat aktivitas blockchain kopi kamu.</p>
                    <div className={styles.ncFeatures}>
                        <div className={styles.ncFeature}><span><IconLink /></span> Transaksi on-chain Solana</div>
                        <div className={styles.ncFeature}><span><IconLock /></span> Tanda tangan transaksi kopi</div>
                        <div className={styles.ncFeature}><span><IconChart /></span> Riwayat transaksi lengkap</div>
                        <div className={styles.ncFeature}><span><IconSol /></span> Kirim/terima SOL</div>
                    </div>
                    {!isPhantomInstalled() && (
                        <div className={styles.installNote}>
                            Phantom belum terinstall.
                            <a href="https://phantom.app/" target="_blank" rel="noreferrer" className={styles.installLink}> Download di sini</a>
                        </div>
                    )}
                    <button className={styles.connectPhantomBtn} onClick={handleConnect} disabled={loading}>
                        <span><SolanaLogo size={24} /></span> {loading ? 'Menghubungkan...' : 'Hubungkan Phantom'}
                    </button>
                </div>
            )}

            {/* Connected Wallet */}
            {wallet.connected && (
                <>
                    {/* Main Balance Card */}
                    <div className={styles.balanceCard}>
                        <div className={styles.balanceBg} />
                        <div className={styles.balanceTop}>
                            <div>
                                <div className={styles.balanceLabel}>Total Saldo SOL</div>
                                <div className={styles.balanceAmount}>{wallet.balance.toFixed(4)} <span className={styles.balanceCurrency}>SOL</span></div>
                                <div className={styles.balanceIdr}>Sekitar Rp {balanceIdr.toLocaleString('id-ID')}</div>
                                <div className={styles.balanceUsd}>Sekitar ${(wallet.balance * solPrice).toFixed(2)} USD</div>
                            </div>
                            <div className={styles.walletIconBox}>
                                <div style={{ fontSize: 36 }}><SolanaLogo size={28} /></div>
                                <div className={styles.phantomLabel}>Phantom</div>
                                <div className={styles.netLabel}>Testnet</div>
                            </div>
                        </div>
                        <div className={styles.walletAddrRow}>
                            <span className={styles.walletAddr}>{wallet.publicKey}</span>
                            <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(wallet.publicKey)} aria-label="Salin alamat wallet"><IconCopy /></button>
                        </div>
                        <div className={styles.balanceActions}>
                            <button className={styles.actionBtn} onClick={() => setTab('send')}><IconSend /> Kirim</button>
                            <button className={styles.actionBtn} onClick={() => setTab('receive')}><IconReceive /> Terima</button>
                            <a href={getExplorerAddressUrl(wallet.publicKey)} target="_blank" rel="noreferrer" className={styles.actionBtn}><IconExplorer /> Explorer</a>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        {['overview', 'send', 'receive', 'history'].map(t => (
                            <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                                {t === 'overview' ? <><IconChart /> Ringkasan</> : t === 'send' ? <><IconSend /> Kirim</> : t === 'receive' ? <><IconReceive /> Terima</> : <><IconHistory /> Riwayat</>}
                            </button>
                        ))}
                    </div>

                    {/* Overview */}
                    {tab === 'overview' && (
                        <div className={styles.statsGrid}>
                            {[
                                { l: 'Saldo SOL', v: `${wallet.balance.toFixed(4)} SOL`, c: '#c084fc', bg: 'rgba(147,51,234,0.1)' },
                                { l: 'Nilai IDR', v: `Rp ${(balanceIdr / 1000000).toFixed(2)} Jt`, c: '#4A7C28', bg: 'rgba(74,124,40,0.1)' },
                                { l: 'Total Tx', v: txHistory.length.toString(), c: '#00D4FF', bg: 'rgba(0,212,255,0.1)' },
                                { l: 'Jaringan', v: 'Solana Testnet', c: '#F5A623', bg: 'rgba(245,166,35,0.1)' },
                            ].map((s, i) => (
                                <div key={i} className={styles.overviewCard} style={{ background: s.bg, borderColor: s.c + '33' }}>
                                    <div className={styles.overviewVal} style={{ color: s.c }}>{s.v}</div>
                                    <div className={styles.overviewLabel}>{s.l}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Send */}
                    {tab === 'send' && (
                        <div className={styles.sendCard}>
                            <h3 className={styles.cardTitle}>Kirim SOL</h3>
                            <div className={styles.sendForm}>
                                <div className={styles.sendField}>
                                    <label>Alamat Tujuan (Solana)</label>
                                    <input value={sendForm.to} onChange={e => setSendForm(p => ({ ...p, to: e.target.value }))} placeholder="Masukkan alamat wallet Solana..." className={styles.sendInput} />
                                </div>
                                <div className={styles.sendField}>
                                    <label>Jumlah (SOL) - Saldo: {wallet.balance.toFixed(4)} SOL</label>
                                    <input type="number" step="0.001" value={sendForm.amount} onChange={e => setSendForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className={styles.sendInput} />
                                </div>
                                {sendResult && (
                                    <div className={styles.sendSuccess}>
                                        Berhasil. Signature: <code>{sendResult.signature.slice(0, 20)}...</code>{' '}
                                        <a href={sendResult.explorerUrl} target="_blank" rel="noopener noreferrer">Lihat Explorer</a>
                                    </div>
                                )}
                                <button className={styles.sendBtn} onClick={handleSend} disabled={sending}>
                                    {sending ? 'Memproses...' : <><IconSend /> Kirim SOL</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Receive */}
                    {tab === 'receive' && (
                        <div className={styles.receiveCard}>
                            <h3 className={styles.cardTitle}>Terima SOL</h3>
                            <p className={styles.receiveDesc}>Bagikan QR atau alamat wallet ini ke pengirim. Pastikan pengirim memakai jaringan Solana.</p>
                            <div className={styles.qrPlaceholder}>
                                <div className={styles.receiveQrBox}>
                                    {receiveQr
                                        ? <img src={receiveQr} alt="QR alamat wallet Solana" className={styles.receiveQrImage} />
                                        : <div className={styles.qrLoading}>Membuat QR...</div>}
                                </div>
                            </div>
                            <div className={styles.addrBox}>
                                <span className={styles.addrLabel}>Alamat Wallet Solana</span>
                                <code className={styles.fullAddr}>{wallet.publicKey}</code>
                                <button className={styles.copyFullBtn} onClick={() => { navigator.clipboard.writeText(wallet.publicKey); alert('Alamat disalin!'); }}><IconCopy /> Salin Alamat</button>
                            </div>
                        </div>
                    )}

                    {/* History */}
                    {tab === 'history' && (
                        <div className={styles.historyCard}>
                            <h3 className={styles.cardTitle}>Riwayat Transaksi</h3>
                            <div className={styles.txList}>
                                {txHistory.map((tx, i) => (
                                    <div key={i} className={styles.txRow}>
                                        <div className={`${styles.txType} ${tx.type === 'Masuk' ? styles.incoming : styles.outgoing}`}>{tx.type === 'Masuk' ? <IconReceive /> : <IconSend />}</div>
                                        <div className={styles.txInfo}>
                                            <div className={styles.txDesc}>{tx.desc}</div>
                                            <div className={styles.txMeta}>
                                                {tx.explorerUrl
                                                    ? <a className={styles.txHash} href={tx.explorerUrl} target="_blank" rel="noopener noreferrer">{tx.hash}</a>
                                                    : <span className={styles.txHash}>{tx.hash}</span>}
                                                <span>{tx.time}</span>
                                            </div>
                                        </div>
                                        <div className={styles.txRight}>
                                            <div className={`${styles.txAmount} ${tx.amount >= 0 ? styles.amountIn : styles.amountOut}`}>
                                                {tx.amount >= 0 ? '+' : ''}Rp {Math.abs(tx.amount).toLocaleString()}
                                            </div>
                                            <span className={`${styles.badge} ${styles['badge' + tx.status]}`}>{tx.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
