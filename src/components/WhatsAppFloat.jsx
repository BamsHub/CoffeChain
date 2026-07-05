'use client';

import { useState, useEffect } from 'react';

const WHATSAPP_NUMBER = '6287857417132';
const DEFAULT_MESSAGE = 'Halo CoffeeChain, saya ingin bertanya tentang...';

const CoffeeIcon = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7.5 5.5c4.8-3.8 10.9-.8 10.9 5.4 0 5.7-5 9.4-9.6 6.8C4 15 3.7 8.6 7.5 5.5Z" fill="currentColor" opacity=".92" />
        <path d="M7.2 17.5c2.6-1.4 4.6-3.5 5.8-6.1 1.1-2.2 2.4-4 4.2-5.3" stroke="#128C7E" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

const ChatIcon = ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.571-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.81 11.81 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413"/>
    </svg>
);

const CloseIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="m6 6 12 12M18 6 6 18" />
    </svg>
);

const SendIcon = () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" />
    </svg>
);

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
                            <div style={styles.avatar}><CoffeeIcon /></div>
                            <div>
                                <div style={styles.popupName}>CoffeeChain Support</div>
                                <div style={styles.popupStatus}>
                                    <span style={styles.onlineDot} />
                                    Online — Biasa membalas dalam 5 menit
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={styles.closeBtn} aria-label="Tutup chat"><CloseIcon size={16} /></button>
                    </div>

                    {/* Body */}
                    <div style={styles.popupBody}>
                        <div style={styles.chatBubble}>
                            <div style={styles.chatBubbleText}>
                                Halo! Ada yang bisa kami bantu?
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
                            <SendIcon />
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
                    {isOpen ? <CloseIcon size={20} /> : <ChatIcon />}
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
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
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
