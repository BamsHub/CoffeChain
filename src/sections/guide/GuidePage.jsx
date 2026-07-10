'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText, LogIn, MailCheck, MessageSquareWarning, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const registerSteps = [
    { icon: UserPlus, title: 'Isi data petani', text: 'Masukkan nama, email, wilayah, dan password minimal 8 karakter pada formulir pendaftaran.' },
    { icon: MailCheck, title: 'Verifikasi email', text: 'Buka tautan verifikasi yang dikirim ke email agar akun petani aktif.' },
    { icon: LogIn, title: 'Masuk ke CoffeeChain', text: 'Gunakan akun yang sudah aktif untuk mengakses dashboard dan layanan petani.' },
];

const ticketSteps = [
    { icon: LogIn, title: 'Masuk sebagai petani', text: 'Tiket hanya dapat dibuat oleh akun petani yang sudah terdaftar dan aktif.' },
    { icon: FileText, title: 'Lengkapi detail masalah', text: 'Pilih kategori, prioritas, subjek, nomor HP, dan jelaskan masalah minimal 10 karakter.' },
    { icon: CheckCircle2, title: 'Kirim tiket ke admin', text: 'Admin menerima tiket di Pesan Pengaduan dan dapat memberi catatan penanganan.' },
];

function StepList({ steps }) {
    return (
        <ol style={{ display: 'grid', gap: 12, padding: 0, margin: 0, listStyle: 'none' }}>
            {steps.map(({ icon: Icon, title, text }, index) => (
                <li key={title} style={{ display: 'grid', gridTemplateColumns: '34px 1fr', gap: 11, alignItems: 'start' }}>
                    <div aria-hidden="true" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'rgba(126,212,74,0.12)', border: '1px solid rgba(126,212,74,0.28)', color: '#84e068', fontSize: 12, fontWeight: 900 }}>{index + 1}</div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--color-text)', fontSize: 14, fontWeight: 900 }}><Icon size={15} aria-hidden="true" />{title}</div>
                        <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6 }}>{text}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

export default function GuidePage() {
    const { user, loading } = useAuth();
    const isFarmer = user?.role === 'farmer';
    const button = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 40, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 900, textDecoration: 'none' };
    const panel = { padding: 'clamp(18px,3vw,26px)', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg-card)' };

    return (
        <main style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: 'clamp(24px,5vw,64px) 16px' }}>
            <div style={{ maxWidth: 980, margin: '0 auto' }}>
                <Link href="/" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontSize: 13, fontWeight: 800 }}>Kembali ke Beranda</Link>
                <div style={{ margin: '18px 0 30px', maxWidth: 680 }}>
                    <div style={{ color: 'var(--color-primary-light)', fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>Panduan Petani</div>
                    <h1 style={{ margin: '8px 0 10px', fontSize: 'clamp(28px,5vw,42px)', lineHeight: 1.12, letterSpacing: 0 }}>Daftar dan Minta Bantuan</h1>
                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 15, lineHeight: 1.7 }}>Ikuti alur ini untuk memperoleh akun petani yang terverifikasi dan mengirim pengaduan dengan aman ke admin CoffeeChain.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    <section style={panel}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#84e068', marginBottom: 14 }}><UserPlus size={20} aria-hidden="true" /><strong>1. Daftar sebagai Petani</strong></div>
                        <StepList steps={registerSteps} />
                        <Link href={isFarmer ? '/dashboard' : '/register'} style={{ ...button, marginTop: 20, background: 'linear-gradient(135deg,#4A7C28,#7ED44A)', color: '#102d1f' }}>{isFarmer ? 'Buka Dashboard' : 'Daftar Petani'}<ArrowRight size={16} aria-hidden="true" /></Link>
                    </section>

                    <section style={panel}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#84e068', marginBottom: 14 }}><MessageSquareWarning size={20} aria-hidden="true" /><strong>2. Buat Tiket Pengaduan</strong></div>
                        <StepList steps={ticketSteps} />
                        {!loading && isFarmer && <Link href="/contact" style={{ ...button, marginTop: 20, background: 'linear-gradient(135deg,#4A7C28,#7ED44A)', color: '#102d1f' }}>Buat Tiket Pengaduan<ArrowRight size={16} aria-hidden="true" /></Link>}
                        {!loading && !isFarmer && <Link href={user ? '/dashboard' : '/login'} style={{ ...button, marginTop: 20, border: '1px solid var(--color-border)', color: 'var(--color-text)', background: 'var(--color-bg-card2)' }}>{user ? 'Gunakan Akun Petani' : 'Masuk sebagai Petani'}<ArrowRight size={16} aria-hidden="true" /></Link>}
                    </section>
                </div>

                <section style={{ ...panel, marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(126,212,74,0.06)' }}>
                    <CheckCircle2 size={18} color="#84e068" aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 1 }} />
                    <div><strong style={{ fontSize: 13 }}>Keamanan tiket</strong><p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6 }}>Tiket terkait dengan identitas petani yang sedang masuk. Jangan sertakan password, seed phrase, private key, atau kode OTP di dalam pesan.</p></div>
                </section>
            </div>
        </main>
    );
}
