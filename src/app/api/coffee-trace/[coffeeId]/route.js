export const runtime = 'nodejs';
import { readDb } from '@/lib/db';
import { getExplorerTxUrl } from '@/lib/contractConfig';

export async function GET(request, { params }) {
    try {
        const { coffeeId } = await params;
        const db = await readDb('coffee_traces');
        const trace = db.items.find(t =>
            t.coffeeId === coffeeId || t.coffeeId === coffeeId.toUpperCase() || t.id === coffeeId
        );

        if (!trace) {
            return Response.json({
                success: false,
                message: `Kopi dengan ID "${coffeeId}" tidak ditemukan di sistem kami`,
            }, { status: 404 });
        }

        return Response.json({
            success: true,
            data: {
                ...trace,
                explorerUrl: trace.txSignature ? getExplorerTxUrl(trace.txSignature) : null,
                blockchainVerified: !!trace.txSignature,
            },
        });
    } catch (err) {
        console.error('[coffee-trace] Detail error:', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
