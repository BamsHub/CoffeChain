'use client';

import { useState, useEffect } from 'react';
import { connectPhantom, disconnectPhantom, getSolBalance, shortenAddress, isPhantomInstalled } from '@/lib/phantom';
import { simulateCoffeeTransaction } from '@/lib/solana';
import styles from './WalletPage.module.css';

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

    useEffect(() => {
        if (typeof window === 'undefined' || !window.solana?.isConnected) return;
        const pk = window.solana.publicKey?.toString();
        if (pk) {
            getSolBalance(pk).then(bal => setWallet({ connected: true, publicKey: pk, balance: bal }));
        }
    }, []);

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
            // Simulasi transaksi blockchain
            const result = await simulateCoffeeTransaction(wallet.publicKey, 0, 0, 'Transfer SOL');
            setSendResult({ success: true, signature: result.signature });
            setTxHistory(prev => [{
                type: 'Keluar',
                desc: `Transfer SOL ke ${sendForm.to.slice(0, 8)}...`,
                amount: -Number(sendForm.amount),
                hash: `0x${result.signature.slice(0, 4)}...${result.signature.slice(-4)}`,
                time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                status: 'Confirmed',
            }, ...prev]);
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
                        <span className={styles.phantomEmoji}>👻</span>
                        {loading ? 'Menghubungkan...' : 'Hubungkan Phantom Wallet'}
                    </button>
                ) : (
                    <button className={styles.disconnectBtn} onClick={handleDisconnect}>Putuskan Sambungan</button>
                )}
            </div>

            {/* Not Connected */}
            {!wallet.connected && (
                <div className={styles.notConnected}>
                    <div className={styles.phantomLogo}>👻</div>
                    <h2 className={styles.ncTitle}>Phantom Wallet Belum Terhubung</h2>
                    <p className={styles.ncDesc}>Hubungkan Phantom wallet Solana untuk mengakses saldo, mengirim transaksi, dan melihat riwayat aktivitas blockchain kopi kamu.</p>
                    <div className={styles.ncFeatures}>
                        <div className={styles.ncFeature}><span>🔗</span> Transaksi on-chain Solana</div>
                        <div className={styles.ncFeature}><span>🔐</span> Tanda tangan transaksi kopi</div>
                        <div className={styles.ncFeature}><span>📊</span> Riwayat transaksi lengkap</div>
                        <div className={styles.ncFeature}><span>💸</span> Kirim/terima SOL</div>
                    </div>
                    {!isPhantomInstalled() && (
                        <div className={styles.installNote}>
                            💡 Phantom belum terinstall.
                            <a href="https://phantom.app/" target="_blank" rel="noreferrer" className={styles.installLink}> Download disini →</a>
                        </div>
                    )}
                    <button className={styles.connectPhantomBtn} onClick={handleConnect} disabled={loading}>
                        <span>👻</span> {loading ? 'Menghubungkan...' : 'Hubungkan Phantom'}
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
                                <div className={styles.balanceIdr}>≈ Rp {balanceIdr.toLocaleString('id-ID')}</div>
                                <div className={styles.balanceUsd}>≈ ${(wallet.balance * solPrice).toFixed(2)} USD</div>
                            </div>
                            <div className={styles.walletIconBox}>
                                <div style={{ fontSize: 36 }}>👻</div>
                                <div className={styles.phantomLabel}>Phantom</div>
                                <div className={styles.netLabel}>Devnet</div>
                            </div>
                        </div>
                        <div className={styles.walletAddrRow}>
                            <span className={styles.walletAddr}>{wallet.publicKey}</span>
                            <button className={styles.copyBtn} onClick={() => navigator.clipboard.writeText(wallet.publicKey)}>📋</button>
                        </div>
                        <div className={styles.balanceActions}>
                            <button className={styles.actionBtn} onClick={() => setTab('send')}>⬆ Kirim</button>
                            <button className={styles.actionBtn} onClick={() => setTab('receive')}>⬇ Terima</button>
                            <a href={`https://explorer.solana.com/address/${wallet.publicKey}?cluster=devnet`} target="_blank" rel="noreferrer" className={styles.actionBtn}>🔍 Explorer</a>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className={styles.tabs}>
                        {['overview', 'send', 'receive', 'history'].map(t => (
                            <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                                {t === 'overview' ? '📊 Ringkasan' : t === 'send' ? '⬆ Kirim' : t === 'receive' ? '⬇ Terima' : '📋 Riwayat'}
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
                                { l: 'Jaringan', v: 'Solana Devnet', c: '#F5A623', bg: 'rgba(245,166,35,0.1)' },
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
                                    <label>Jumlah (SOL) — Saldo: {wallet.balance.toFixed(4)} SOL</label>
                                    <input type="number" step="0.001" value={sendForm.amount} onChange={e => setSendForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className={styles.sendInput} />
                                </div>
                                {sendResult && <div className={styles.sendSuccess}>✅ Berhasil! Signature: <code>{sendResult.signature.slice(0, 20)}...</code></div>}
                                <button className={styles.sendBtn} onClick={handleSend} disabled={sending}>
                                    {sending ? '⏳ Memproses...' : '⬆ Kirim SOL'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Receive */}
                    {tab === 'receive' && (
                        <div className={styles.receiveCard}>
                            <h3 className={styles.cardTitle}>Terima SOL</h3>
                            <p className={styles.receiveDesc}>Bagikan alamat wallet di bawah untuk menerima SOL dari pengirim</p>
                            <div className={styles.qrPlaceholder}>
                                <div className={styles.qrBox}>📱<br />QR Code<br /><small>(gunakan Phantom app)</small></div>
                            </div>
                            <div className={styles.addrBox}>
                                <code className={styles.fullAddr}>{wallet.publicKey}</code>
                                <button className={styles.copyFullBtn} onClick={() => { navigator.clipboard.writeText(wallet.publicKey); alert('Alamat disalin!'); }}>Salin Alamat</button>
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
                                        <div className={`${styles.txType} ${tx.type === 'Masuk' ? styles.incoming : styles.outgoing}`}>{tx.type === 'Masuk' ? '⬇' : '⬆'}</div>
                                        <div className={styles.txInfo}>
                                            <div className={styles.txDesc}>{tx.desc}</div>
                                            <div className={styles.txMeta}><span className={styles.txHash}>{tx.hash}</span><span>• {tx.time}</span></div>
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
