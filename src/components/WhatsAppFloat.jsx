'use client';

import { useState, useEffect } from 'react';

const WHATSAPP_NUMBER = '6287857417132';
const DEFAULT_MESSAGE = 'Halo CoffeeChain, saya ingin bertanya tentang...';

export default function WhatsAppFloat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState(DEFAULT_MESSAGE);
    const [pulse, setPulse] = useState(true);

    // Show button after a short delay for smooth entrance
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 1500);
        // Stop pulse after 10s
        const pulseTimer = setTimeout(() => setPulse(false), 10000);
        return () => { clearTimeout(timer); clearTimeout(pulseTimer); };
    }, []);

    const handleSend = () => {
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank');
        setIsOpen(false);
    };

    if (!isVisible) return null;

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9998,
                        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)',
                        animation: 'waFadeIn 0.2s ease',
                    }}
                />
            )}

            {/* Chat Popup */}
            {isOpen && (
                <div style={styles.popup}>
                    {/* Header */}
                    <div style={styles.popupHeader}>
                        <div style={styles.popupHeaderLeft}>
                            <div style={styles.avatar}></div>
                            <div>
                                <div style={styles.popupName}>CoffeeChain Support</div>
                                <div style={styles.popupStatus}>
                                    <span style={styles.onlineDot} />
                                    Online — Biasa membalas dalam 5 menit
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={styles.closeBtn}>✕</button>
                    </div>

                    {/* Body */}
                    <div style={styles.popupBody}>
                        <div style={styles.chatBubble}>
                            <div style={styles.chatBubbleText}>
                                Halo!  Ada yang bisa kami bantu?
                                <br /><br />
                                Silakan ketik pesan Anda di bawah, lalu klik kirim untuk chat via WhatsApp.
                            </div>
                            <div style={styles.chatTime}>Sekarang</div>
                        </div>
                    </div>

                    {/* Input */}
                    <div style={styles.popupFooter}>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ketik pesan Anda..."
                            style={styles.chatInput}
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                            }}
                        />
                        <button onClick={handleSend} style={styles.sendBtn} title="Kirim via WhatsApp">
                            ➤
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => { setIsOpen(!isOpen); setPulse(false); }}
                style={{
                    ...styles.fab,
                    ...(isOpen ? styles.fabOpen : {}),
                }}
                title="Chat via WhatsApp"
                aria-label="WhatsApp"
            >
                {/* Pulse ring */}
                {pulse && !isOpen && <span style={styles.pulseRing} />}

                <span style={{ ...styles.fabIcon, ...(isOpen ? styles.fabIconOpen : {}) }}>
                    {isOpen ? '✕' : ''}
                </span>
            </button>

            {/* Tooltip */}
            {!isOpen && (
                <div style={styles.tooltip}>
                    Ada pertanyaan?
                </div>
            )}

            {/* Keyframe animations */}
            <style>{`
                @keyframes waFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes waSlideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes waFabIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
                @keyframes waPulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }
                @keyframes waTooltipIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
        </>
    );
}

const styles = {
    /* FAB */
    fab: {
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        width: 60, height: 60, borderRadius: '50%',
        background: 'linear-gradient(135deg, #25D366, #128C7E)',
        border: 'none', cursor: 'pointer',
        boxShadow: '0 4px 24px rgba(37, 211, 102, 0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: 'waFabIn 0.4s ease both',
    },
    fabOpen: {
        background: 'linear-gradient(135deg, #555, #333)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        transform: 'rotate(90deg)',
    },
    fabIcon: {
        fontSize: 28, transition: 'transform 0.3s ease', lineHeight: 1,
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
    },
    fabIconOpen: { transform: 'rotate(90deg)', fontSize: 20, color: '#fff' },

    pulseRing: {
        position: 'absolute', inset: -4,
        borderRadius: '50%', border: '3px solid #25D366',
        animation: 'waPulse 1.5s ease-out infinite',
        pointerEvents: 'none',
    },

    tooltip: {
        position: 'fixed', bottom: 36, right: 96, zIndex: 9999,
        padding: '8px 16px', borderRadius: 10,
        background: 'var(--color-bg-card, #1a1a2e)',
        color: 'var(--color-text, #fff)',
        border: '1px solid var(--color-border, #333)',
        fontSize: 13, fontWeight: 500,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        animation: 'waTooltipIn 0.5s ease 2s both',
        whiteSpace: 'nowrap', pointerEvents: 'none',
    },

    /* Popup */
    popup: {
        position: 'fixed', bottom: 96, right: 24, zIndex: 9999,
        width: 360, maxWidth: 'calc(100vw - 48px)',
        borderRadius: 16, overflow: 'hidden',
        background: 'var(--color-bg-card, #1a1a2e)',
        border: '1px solid var(--color-border, #333)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.4)',
        animation: 'waSlideUp 0.3s ease both',
        display: 'flex', flexDirection: 'column',
    },

    popupHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 18px',
        background: 'linear-gradient(135deg, #25D366, #128C7E)',
        color: '#fff',
    },
    popupHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12 },
    avatar: {
        width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
    },
    popupName: { fontSize: 14, fontWeight: 700 },
    popupStatus: { fontSize: 11, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 },
    onlineDot: { width: 7, height: 7, borderRadius: '50%', background: '#7CFC00', display: 'inline-block' },
    closeBtn: {
        width: 30, height: 30, borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)', border: 'none',
        color: '#fff', fontSize: 14, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s ease',
    },

    popupBody: {
        padding: 18, minHeight: 120,
        background: 'var(--color-bg, #0f0f1a)',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
    },
    chatBubble: {
        maxWidth: '85%',
        padding: '12px 16px', borderRadius: '4px 14px 14px 14px',
        background: 'var(--color-bg-card2, #1e1e36)',
        border: '1px solid var(--color-border, #333)',
        fontSize: 14, lineHeight: 1.6,
        color: 'var(--color-text, #e0e0e0)',
    },
    chatBubbleText: {},
    chatTime: { fontSize: 10, color: 'var(--color-text-muted, #888)', marginTop: 6, textAlign: 'right' },

    popupFooter: {
        display: 'flex', alignItems: 'flex-end', gap: 8,
        padding: '12px 14px',
        borderTop: '1px solid var(--color-border, #333)',
        background: 'var(--color-bg-card, #1a1a2e)',
    },
    chatInput: {
        flex: 1, padding: '10px 14px', borderRadius: 12,
        border: '1px solid var(--color-border, #333)',
        background: 'var(--color-input-bg, #111)',
        color: 'var(--color-text, #e0e0e0)',
        fontSize: 14, outline: 'none', resize: 'none',
        fontFamily: 'inherit', lineHeight: 1.5,
    },
    sendBtn: {
        width: 42, height: 42, borderRadius: '50%',
        background: 'linear-gradient(135deg, #25D366, #128C7E)',
        border: 'none', color: '#fff', fontSize: 18,
        cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s ease', flexShrink: 0,
        boxShadow: '0 2px 12px rgba(37, 211, 102, 0.3)',
    },
};
