'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_LABELS } from '@/context/AuthContext';
import WalletConnect from '@/components/WalletConnect/WalletConnect';
import styles from './Header.module.css';

const IconCart = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 6h15l-1.5 8h-12L6 3H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="20" r="1.5" fill="currentColor" />
        <circle cx="18" cy="20" r="1.5" fill="currentColor" />
    </svg>
);

const IconPayment = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 10h18M8 15h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const IconTrend = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 17l6-6 4 4 6-8M15 7h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconInfo = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const IconCheck = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconAlert = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 8v5M12 17h.01M10.3 4.9L2.9 18a2 2 0 001.7 3h14.8a2 2 0 001.7-3L13.7 4.9a2 2 0 00-3.4 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const IconBell = ({ size = 16 }) => (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function Header({ sidebarCollapsed, onWalletConnect, onWalletDisconnect }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifMenu, setShowNotifMenu] = useState(false);
    const [walletPublicKey, setWalletPublicKey] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef(null);
    const userMenuRef = useRef(null);

    const roleInfo = user ? (ROLE_LABELS[user.role] || ROLE_LABELS.farmer) : null;

    function handleConnect({ publicKey }) {
        setWalletPublicKey(publicKey);
        onWalletConnect?.({ publicKey });
    }
    function handleDisconnect() {
        setWalletPublicKey(null);
        onWalletDisconnect?.();
    }

    // Fetch notifications
    async function fetchNotifications() {
        if (!user) return;
        try {
            const res = await fetch(`/api/notifications?userId=${user.id}`);
            const data = await res.json();
            if (data.success) {
                setNotifications(data.data || []);
                setUnreadCount((data.data || []).filter(n => !n.read).length);
            }
        } catch { }
    }

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [user]);

    // Close menus on outside click
    useEffect(() => {
        function handleClick(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifMenu(false);
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    async function markAllRead() {
        if (!user) return;
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markAllRead: true, userId: user.id }),
        });
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }

    async function markOneRead(id) {
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }

    function timeAgo(dateStr) {
        const diff = (Date.now() - new Date(dateStr)) / 1000;
        if (diff < 60) return 'baru saja';
        if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
        return `${Math.floor(diff / 86400)} hari lalu`;
    }

    function confirmLogout() {
        if (!window.confirm('Anda yakin ingin keluar?')) return;
        setShowUserMenu(false);
        logout();
    }

    const typeIcon = {
        product_added: <IconCart />,
        payment: <IconPayment />,
        price: <IconTrend />,
        info: <IconInfo />,
        success: <IconCheck />,
        warning: <IconAlert />,
    };

    return (
        <header className={styles.header} style={{ left: sidebarCollapsed ? '68px' : '260px' }}>
            {/* Left - Logo & Search */}
            <div className={styles.left}>
                {sidebarCollapsed && (
                    <img 
                        src="/coffeechain-logo-20260528.png" 
                        alt="CoffeeChain" 
                        width="30" 
                        height="30" 
                        style={{ borderRadius: 6, flexShrink: 0, marginRight: 12 }} 
                    />
                )}
                <div className={styles.searchBox}>
                    <svg className={styles.searchIcon} width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input type="text" placeholder="Cari transaksi, petani, batch..." className={styles.searchInput} />
                    <kbd className={styles.searchKbd}>Ctrl K</kbd>
                </div>
            </div>

            {/* Right */}
            <div className={styles.right}>
                {/* Phantom Wallet */}
                <WalletConnect onConnect={handleConnect} onDisconnect={handleDisconnect} />

                {/* Notifications */}
                <div className={styles.notifWrapper} ref={notifRef}>
                    <button className={styles.iconBtn} onClick={() => { setShowNotifMenu(v => !v); if (!showNotifMenu) fetchNotifications(); }}>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                    </button>

                    {showNotifMenu && (
                        <div className={styles.notifDropdown}>
                            <div className={styles.notifHeader}>
                                <span className={styles.notifTitle}><svg style={{verticalAlign:'middle',marginRight:6}} width='16' height='16' fill='none' viewBox='0 0 24 24'><path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0' stroke='currentColor' strokeWidth='2' strokeLinecap='round'/></svg> Notifikasi</span>
                                {unreadCount > 0 && (
                                    <button className={styles.markAllBtn} onClick={markAllRead}>Tandai semua dibaca</button>
                                )}
                            </div>
                            <div className={styles.notifList}>
                                {notifications.length === 0 ? (
                                    <div className={styles.notifEmpty}>
                                        <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><svg width="32" height="32" fill="none" viewBox="0 0 24 24"><path d="M13.73 21a2 2 0 01-3.46 0M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M1 1l22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
                                        <span>Belum ada notifikasi</span>
                                    </div>
                                ) : (
                                    notifications.slice(0, 10).map(n => (
                                        <div
                                            key={n.id}
                                            className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ''}`}
                                            onClick={() => markOneRead(n.id)}
                                        >
                                            <div className={styles.notifItemIcon}>{typeIcon[n.type] || <IconBell />}</div>
                                            <div className={styles.notifItemBody}>
                                                <div className={styles.notifItemTitle}>{n.title}</div>
                                                <div className={styles.notifItemMsg}>{n.message}</div>
                                                <div className={styles.notifItemTime}>{timeAgo(n.createdAt)} - {n.actorName}</div>
                                            </div>
                                            {!n.read && <div className={styles.notifDot} />}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile with Dropdown */}
                <div className={styles.profileWrapper} ref={userMenuRef}>
                    <button className={styles.profile} onClick={() => setShowUserMenu(!showUserMenu)}>
                        <div
                            className={styles.profileAvatar}
                            style={roleInfo ? { background: roleInfo.bg, borderColor: roleInfo.color + '44' } : {}}
                        >
                            {user?.photoBase64
                                ? <img src={user.photoBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                : (walletPublicKey ? 'P' : (user?.avatar || 'BK'))
                            }
                        </div>
                        <div className={styles.profileInfo}>
                            <span className={styles.profileName}>
                                {walletPublicKey
                                    ? `${walletPublicKey.slice(0, 6)}...${walletPublicKey.slice(-4)}`
                                    : (user?.name?.split(' ')[0] || 'Guest')}
                            </span>
                            <span className={styles.profileRole} style={roleInfo ? { color: roleInfo.color } : {}}>
                                {roleInfo ? roleInfo.label : 'Guest'}
                            </span>
                        </div>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                            <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>

                    {showUserMenu && user && (
                        <div className={styles.userMenu}>
                            <div className={styles.userMenuHeader}>
                                <div className={styles.menuAvatar} style={{ background: roleInfo?.bg, overflow: 'hidden' }}>
                                    {user.photoBase64
                                        ? <img src={user.photoBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : user.avatar
                                    }
                                </div>
                                <div>
                                    <div className={styles.menuName}>{user.name}</div>
                                    <div className={styles.menuEmail}>{user.email}</div>
                                    <span className={styles.menuRoleBadge} style={{ background: roleInfo?.bg, color: roleInfo?.color }}>
                                        {roleInfo?.label}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.menuDivider} />
                            <button className={styles.menuItem} onClick={() => { setShowUserMenu(false); router.push('/profile'); }}>
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" /></svg>
                                Profil Saya
                            </button>
                            <button className={styles.menuItem} onClick={() => { setShowUserMenu(false); router.push('/profile?tab=preferences'); }}>
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4" stroke="currentColor" strokeWidth="2" /></svg>
                                Pengaturan
                            </button>
                            <div className={styles.menuDivider} />
                            <button className={`${styles.menuItem} ${styles.logoutItem}`} onClick={confirmLogout}>
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                Keluar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
