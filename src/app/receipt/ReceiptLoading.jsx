import styles from './receipt-loading.module.css';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const IconLock = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 14v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
);

export default function ReceiptLoading({ fullPage = false }) {
    return (
        <section
            className={`${styles.shell} ${fullPage ? styles.fullPage : ''}`}
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Receipt transaksi sedang dimuat"
        >
            <div className={styles.glow} aria-hidden="true" />
            <Card className={styles.card}>
                <CardContent className={styles.cardContent}>
                <Badge variant="outline" className={styles.eyebrow}>
                    <span className={styles.liveDot} />
                    CoffeeChain Secure Receipt
                </Badge>

                <div className={styles.visual} aria-hidden="true">
                    <span className={`${styles.orbit} ${styles.orbitOuter}`} />
                    <span className={`${styles.orbit} ${styles.orbitInner}`} />
                    <span className={`${styles.node} ${styles.nodeOne}`} />
                    <span className={`${styles.node} ${styles.nodeTwo}`} />
                    <span className={`${styles.node} ${styles.nodeThree}`} />
                    <div className={styles.bean}>
                        <span />
                    </div>
                </div>

                <h1 className={styles.title}>Tunggu sebentar</h1>
                <p className={styles.description}>
                    Kami sedang menyiapkan receipt transaksi Anda dan memeriksa bukti pembayarannya.
                </p>

                <Progress
                    value={42}
                    className={styles.progressTrack}
                    aria-label="Receipt sedang diproses"
                />

                <div className={styles.steps} aria-hidden="true">
                    <div className={styles.step}>
                        <span className={styles.stepDot}>1</span>
                        <span>Memverifikasi order</span>
                        <Skeleton className={styles.stepPulse} />
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepDot}>2</span>
                        <span>Membaca status pembayaran</span>
                        <Skeleton className={styles.stepPulse} />
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepDot}>3</span>
                        <span>Menyiapkan bukti Solana</span>
                        <Skeleton className={styles.stepPulse} />
                    </div>
                </div>

                <div className={styles.securityNote}>
                    <IconLock />
                    Koneksi aman · data pembayaran dan signature tidak diubah
                </div>
                </CardContent>
            </Card>
        </section>
    );
}
