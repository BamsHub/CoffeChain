'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar/Sidebar';
import Header from '@/components/Header/Header';
import { useAuth } from '@/context/AuthContext';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [walletPublicKey, setWalletPublicKey] = useState(null);
    const { user, loading } = useAuth();
    const router = useRouter();

    // Auth guard — redirect ke /login jika tidak ada session
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    // Loading state saat hydrating auth
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#060f07', flexDirection: 'column', gap: 16,
            }}>
                <div style={{
                    width: 44, height: 44, border: '3px solid rgba(74,124,40,0.2)',
                    borderTopColor: '#7ED44A', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Memuat CoffeeChain...</p>
            </div>
        );
    }

    // Jika tidak login, render null sementara redirect
    if (!user) return null;

    // Clone children dengan props walletPublicKey + user
    const childrenWithProps = typeof children === 'object'
        ? { ...children, props: { ...children.props, walletPublicKey, user } }
        : children;

    return (
        <div className={styles.wrapper}>
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            <div
                className={styles.main}
                style={{ marginLeft: sidebarCollapsed ? '68px' : '260px' }}
            >
                <Header
                    sidebarCollapsed={sidebarCollapsed}
                    onWalletConnect={({ publicKey }) => setWalletPublicKey(publicKey)}
                    onWalletDisconnect={() => setWalletPublicKey(null)}
                />
                <main className={styles.content}>
                    {childrenWithProps}
                </main>
            </div>
        </div>
    );
}
