'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, ROLE_LABELS, ROLE_NAV } from '@/context/AuthContext';
import styles from './Sidebar.module.css';

const ALL_NAV = [
    {
        id: 'dashboard', label: 'Dashboard', href: '/dashboard',
        icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.9" /><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.5" /><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.5" /><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.9" /></svg>,
    },
    {
        id: 'transactions', label: 'Transaksi', href: '/transactions',
        icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M7 16L3 12m0 0l4-4M3 12h18M17 8l4 4m0 0l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    },
    {
        id: 'farmers', label: 'Petani', href: '/farmers',
        icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M17 20H7a4 4 0 01-4-4v-1a4 4 0 014-4h10a4 4 0 014 4v1a4 4 0 01-4 4z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" /></svg>,
    },
    {
        id: 'wallet', label: 'Dompet', href: '/wallet',
        icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2" /><path d="M16 3H8l-2 4h12l-2-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="17" cy="14" r="1" fill="currentColor" /></svg>,
    },
    {
        id: 'integrations', label: 'Manajemen API', href: '/integrations',
        icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    },
    {
        // exact: true — jangan aktif saat sub-route /products/... sedang dibuka
        id: 'products', label: 'Kelola Produk', href: '/products', exact: true,
        icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" stroke="currentColor" strokeWidth="2"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="2"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/></svg>,
    },
    {
        id: 'coffee-register', label: 'Register Kopi', href: '/coffee-register',
        icon: <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
];


export default function Sidebar({ collapsed, onToggle }) {
    const pathname = usePathname();
    const { user } = useAuth();

    const role = user?.role || 'farmer';
    const allowedNav = ROLE_NAV[role] || ROLE_NAV.farmer;
    const visibleItems = ALL_NAV.filter(item => allowedNav.includes(item.id));
    const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.farmer;

    return (
        <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
            {/* Logo */}
            <div className={styles.logo}>
                <div className={styles.logoIcon}>
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                        <circle cx="16" cy="16" r="14" fill="currentColor" opacity="0.15" />
                        <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6z" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M12 16c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="16" cy="16" r="2" fill="currentColor" />
                        <path d="M16 10v2M16 20v2M10 16h2M20 16h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </div>
                {!collapsed && (
                    <div className={styles.logoText}>
                        <span className={styles.logoName}>CoffeeChain</span>
                        <span className={styles.logoTagline}>Blockchain Kopi</span>
                    </div>
                )}
            </div>

            {/* Role Badge */}
            {!collapsed && user && (
                <div className={styles.roleBadge} style={{ background: roleInfo.bg, borderColor: roleInfo.color + '44' }}>
                    <span style={{fontWeight:700,fontSize:13,lineHeight:1}}>{user.name.substring(0,2).toUpperCase()}</span>
                    <div>
                        <div className={styles.roleUser}>{user.name}</div>
                        <div className={styles.roleLabel} style={{ color: roleInfo.color }}>{roleInfo.label}</div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className={styles.nav}>
                <div className={styles.navSection}>
                    {!collapsed && <span className={styles.navLabel}>Menu Utama</span>}
                    {visibleItems.map((item) => {
                        const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                title={collapsed ? item.label : undefined}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                {!collapsed && <span className={styles.navText}>{item.label}</span>}
                                {isActive && !collapsed && <span className={styles.activeIndicator} />}
                            </Link>
                        );
                    })}

                    {/* Admin section — developer & koperasi */}
                    {(role === 'developer' || role === 'koperasi') && (
                        <>
                            {!collapsed && <span className={styles.navLabel} style={{ marginTop: 12 }}>Admin Panel</span>}
                            <Link href="/integrations" className={`${styles.navItem} ${pathname === '/integrations' ? styles.active : ''}`} title={collapsed ? 'Manajemen API' : undefined}>
                                <span className={styles.navIcon}>
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </span>
                                {!collapsed && <span className={styles.navText}>Manajemen API</span>}
                            </Link>
                            <Link href="/products" className={`${styles.navItem} ${pathname === '/products' ? styles.active : ''}`} title={collapsed ? 'Kelola Produk' : undefined}>
                                <span className={styles.navIcon}>
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="2"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/></svg>
                                </span>
                                {!collapsed && <span className={styles.navText}>Kelola Produk</span>}
                            </Link>
                            <Link href="/coffee-register" className={`${styles.navItem} ${pathname === '/coffee-register' ? styles.active : ''}`} title={collapsed ? 'Register Kopi' : undefined}>
                                <span className={styles.navIcon}>
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </span>
                                {!collapsed && <span className={styles.navText}>Register Kopi</span>}
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* Back to Landing Page — always visible */}
            <div style={{ padding: collapsed ? '8px 10px' : '8px 12px', borderTop: '1px solid rgba(74,124,40,0.12)' }}>
                <Link
                    href="/"
                    title="Lihat Landing Page"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: collapsed ? '10px 8px' : '10px 12px',
                        borderRadius: 9,
                        background: 'linear-gradient(135deg,rgba(74,124,40,0.12),rgba(126,212,74,0.06))',
                        border: '1px solid rgba(126,212,74,0.22)',
                        color: '#7ED44A',
                        textDecoration: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        transition: 'background 0.15s',
                    }}
                >
                    {/* Home / store icon */}
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {!collapsed && <span>Lihat Landing Page</span>}
                </Link>
            </div>

            {/* Bottom Section */}
            {!collapsed && (
                <div className={styles.sidebarBottom}>
                    <div className={styles.networkStatus}>
                        <span className={styles.networkDot} />
                        <span className={styles.networkText}>Mainnet Aktif</span>
                    </div>
                    <div className={styles.blockInfo}>
                        <span className={styles.blockLabel}>Block #</span>
                        <span className={styles.blockNum}>18,293,041</span>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button className={styles.toggleBtn} onClick={onToggle}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path d={collapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        </aside>
    );
}
