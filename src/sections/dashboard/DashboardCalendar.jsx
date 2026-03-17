'use client';

import { useState } from 'react';
import styles from './DashboardCalendar.module.css';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MIN_YEAR = 1900;
const MAX_YEAR = 2050;

export default function DashboardCalendar({ onDateSelect }) {
    const today = new Date();
    const [view, setView] = useState('days'); // days | months | years
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(today);
    const [yearPage, setYearPage] = useState(Math.floor((today.getFullYear() - MIN_YEAR) / 20));

    function getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    function getFirstDayOfMonth(year, month) {
        return new Date(year, month, 1).getDay();
    }

    function isToday(y, m, d) {
        return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
    }

    function isSelected(y, m, d) {
        return selectedDate &&
            y === selectedDate.getFullYear() &&
            m === selectedDate.getMonth() &&
            d === selectedDate.getDate();
    }

    function selectDate(d) {
        const date = new Date(currentYear, currentMonth, d);
        setSelectedDate(date);
        onDateSelect?.(date);
    }

    function prevMonth() {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => Math.max(MIN_YEAR, y - 1)); }
        else setCurrentMonth(m => m - 1);
    }

    function nextMonth() {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => Math.min(MAX_YEAR, y + 1)); }
        else setCurrentMonth(m => m + 1);
    }

    // Build days grid
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const prevDays = getDaysInMonth(currentYear, currentMonth - 1);
    const total = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    const cells = [];
    for (let i = 0; i < total; i++) {
        if (i < firstDay) cells.push({ day: prevDays - firstDay + i + 1, type: 'prev' });
        else if (i >= firstDay + daysInMonth) cells.push({ day: i - firstDay - daysInMonth + 1, type: 'next' });
        else cells.push({ day: i - firstDay + 1, type: 'current' });
    }

    // Year grid — 20 years per page
    const yearStart = MIN_YEAR + yearPage * 20;
    const years = Array.from({ length: 20 }, (_, i) => yearStart + i).filter(y => y <= MAX_YEAR);

    return (
        <div className={styles.calendar}>
            {/* Navigation Header */}
            <div className={styles.calHeader}>
                <button className={styles.navBtn} onClick={view === 'days' ? prevMonth : () => setYearPage(p => Math.max(0, p - 1))} disabled={view === 'years' && yearPage === 0}>
                    ‹
                </button>
                <div className={styles.calTitle}>
                    {view === 'days' && (
                        <>
                            <button className={styles.titleBtn} onClick={() => setView('months')}>{MONTHS[currentMonth]}</button>
                            <button className={styles.titleBtn} onClick={() => setView('years')}>{currentYear}</button>
                        </>
                    )}
                    {view === 'months' && (
                        <button className={styles.titleBtn} onClick={() => setView('years')}>{currentYear}</button>
                    )}
                    {view === 'years' && (
                        <span className={styles.titleText}>{yearStart} — {Math.min(yearStart + 19, MAX_YEAR)}</span>
                    )}
                </div>
                <button className={styles.navBtn} onClick={view === 'days' ? nextMonth : () => setYearPage(p => p + 1)} disabled={view === 'years' && yearStart + 20 > MAX_YEAR}>
                    ›
                </button>
            </div>

            {/* Days View */}
            {view === 'days' && (
                <>
                    <div className={styles.dayNames}>
                        {DAYS.map(d => <span key={d} className={styles.dayName}>{d}</span>)}
                    </div>
                    <div className={styles.dayGrid}>
                        {cells.map((cell, i) => (
                            <button
                                key={i}
                                className={`${styles.dayCell} ${cell.type !== 'current' ? styles.otherMonth : ''} ${cell.type === 'current' && isToday(currentYear, currentMonth, cell.day) ? styles.today : ''} ${cell.type === 'current' && isSelected(currentYear, currentMonth, cell.day) ? styles.selected : ''}`}
                                onClick={() => cell.type === 'current' && selectDate(cell.day)}
                                tabIndex={cell.type !== 'current' ? -1 : 0}
                            >
                                {cell.day}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Months View */}
            {view === 'months' && (
                <div className={styles.monthGrid}>
                    {MONTHS.map((m, i) => (
                        <button
                            key={m}
                            className={`${styles.monthCell} ${i === currentMonth ? styles.selected : ''}`}
                            onClick={() => { setCurrentMonth(i); setView('days'); }}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            )}

            {/* Years View */}
            {view === 'years' && (
                <div className={styles.yearGrid}>
                    {years.map(y => (
                        <button
                            key={y}
                            className={`${styles.yearCell} ${y === currentYear ? styles.selected : ''} ${y === today.getFullYear() ? styles.today : ''}`}
                            onClick={() => { setCurrentYear(y); setView('months'); }}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            )}

            {/* Selected Date Display */}
            {selectedDate && view === 'days' && (
                <div className={styles.selectedDisplay}>
                    <span className={styles.selectedLabel}>Pilihan:</span>
                    <span className={styles.selectedVal}>
                        {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            )}
        </div>
    );
}
