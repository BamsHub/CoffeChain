import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';

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
            </head>
            <body>
                <AuthProvider>
                    <ThemeProvider>
                        <main id="main-content" aria-label="Konten utama">
                            {children}
                        </main>
                    </ThemeProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
