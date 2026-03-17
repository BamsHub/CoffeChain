'use client';

import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

// Gunakan useLayoutEffect di client, fallback ke useEffect di server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark');
    const [mounted, setMounted] = useState(false);

    useIsomorphicLayoutEffect(() => {
        // Baca localStorage dengan cepat sebelum paint pertama
        const saved = localStorage.getItem('cc_theme') || 'dark';
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
        setMounted(true);
    }, []);

    function toggleTheme() {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('cc_theme', next);
            document.documentElement.setAttribute('data-theme', next);
            return next;
        });
    }

    // Render children selalu — theme akan diterapkan via CSS attribute selector
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
