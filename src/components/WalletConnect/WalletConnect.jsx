'use client';

import { useState, useEffect } from 'react';
import { connectPhantom, disconnectPhantom, getSolBalance, shortenAddress, isPhantomInstalled } from '@/lib/phantom';
import { getExplorerAddressUrl } from '@/lib/contractConfig';
import styles from './WalletConnect.module.css';

const SolanaLogo = ({ size = 18 }) => (
    <img src="/solana-logo.png" alt="Solana" width={size} height={size} style={{ display: 'block', objectFit: 'contain' }} />
);

export default function WalletConnect({ onConnect, onDisconnect }) {
    const [walletState, setWalletState] = useState({
        connected: false,
        publicKey: null,
        balance: 0,
        loading: false,
    });
    const [showMenu, setShowMenu] = useState(false);

    // Cek apakah sudah connected sebelumnya (auto-connect)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const checkConnection = async () => {
            try {
                if (window.solana && window.solana.isConnected && window.solana.publicKey) {
                    const publicKey = window.solana.publicKey.toString();
                    const balance = await getSolBalance(publicKey);
                    setWalletState({ connected: true, publicKey, balance, loading: false });
                    onConnect?.({ publicKey, balance });
                }
            } catch { /* ignore */ }
        };
        checkConnection();

        // Listen untuk account change
        if (window.solana) {
            window.solana.on('accountChanged', (newKey) => {
                if (newKey) {
                    setWalletState(prev => ({ ...prev, publicKey: newKey.toString() }));
                } else {
                    handleDisconnect();
                }
            });
        }
    }, []);

    const handleConnect = async () => {
        if (!isPhantomInstalled()) {
            window.open('https://phantom.app/', '_blank');
            return;
        }
        setWalletState(prev => ({ ...prev, loading: true }));
        try {
            const { publicKey } = await connectPhantom();
            const balance = await getSolBalance(publicKey);
            setWalletState({ connected: true, publicKey, balance, loading: false });
            onConnect?.({ publicKey, balance });
        } catch (err) {
            setWalletState(prev => ({ ...prev, loading: false }));
            alert(err.message);
        }
    };

    const handleDisconnect = async () => {
        await disconnectPhantom();
        setWalletState({ connected: false, publicKey: null, balance: 0, loading: false });
        setShowMenu(false);
        onDisconnect?.();
    };

    if (!walletState.connected) {
        return (
            <button
                className={styles.connectBtn}
                onClick={handleConnect}
                disabled={walletState.loading}
            >
                {walletState.loading ? (
                    <span className={styles.spinner} />
                ) : (
                    <SolanaLogo size={16} />
                )}
                {walletState.loading ? 'Menghubungkan...' : 'Hubungkan Phantom'}
            </button>
        );
    }

    return (
        <div className={styles.walletWrapper}>
            <button className={styles.walletBtn} onClick={() => setShowMenu(!showMenu)}>
                <div className={styles.phantomIcon}><SolanaLogo /></div>
                <div className={styles.walletInfo}>
                    <span className={styles.walletAddr}>{shortenAddress(walletState.publicKey)}</span>
                    <span className={styles.walletBal}>{walletState.balance.toFixed(3)} SOL</span>
                </div>
                <div className={styles.connDot} />
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>

            {showMenu && (
                <div className={styles.dropdownMenu}>
                    <div className={styles.dropdownHeader}>
                        <div className={styles.dropdownIcon}><SolanaLogo size={28} /></div>
                        <div>
                            <div className={styles.dropdownName}>Phantom Wallet</div>
                            <div className={styles.dropdownAddr}>{walletState.publicKey}</div>
                        </div>
                    </div>
                    <div className={styles.dropdownBalance}>
                        <span>Saldo:</span>
                        <span className={styles.balValue}>{walletState.balance.toFixed(4)} SOL</span>
                    </div>
                    <div className={styles.dropdownActions}>
                        <a
                            href={getExplorerAddressUrl(walletState.publicKey)}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.dropdownItem}
                        >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Lihat di Explorer
                        </a>
                        <button className={`${styles.dropdownItem} ${styles.disconnectItem}`} onClick={handleDisconnect}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Putuskan Sambungan
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
