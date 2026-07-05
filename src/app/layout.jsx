import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Analytics } from '@vercel/analytics/react';
import WhatsAppFloat from '@/components/WhatsAppFloat';

export const metadata = {
    title: 'CoffeeChain — Blockchain Industri Kopi',
    description: 'Platform blockchain untuk membantu petani kopi dalam transaksi yang transparan dan adil',
};

export default function RootLayout({ children }) {
    return (
        <html lang="id">
            <head>
                {/* Anti-flash script: apply theme before React hydration */}
                <script dangerouslySetInnerHTML={{
                    __html: `
                        try {
                            var t = localStorage.getItem('cc_theme') || 'dark';
                            document.documentElement.setAttribute('data-theme', t);
                        } catch(e) {}
                    `
                }} />
                {/* Google Fonts: Space Grotesk + Inter */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
            </head>
            <body>
                <AuthProvider>
                    <ThemeProvider>
                        <main id="main-content" aria-label="Konten utama">
                            {children}
                        </main>
                        <Analytics />
                        <WhatsAppFloat />
                    </ThemeProvider>
                </AuthProvider>
            </body>
        </html>
    );
}

