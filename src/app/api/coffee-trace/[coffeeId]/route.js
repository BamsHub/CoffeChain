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

        const [productsDb, batchesDb, logsDb] = await Promise.all([
            readDb('products'),
            readDb('production_batches'),
            readDb('production_stage_logs'),
        ]);
        const product = productsDb.items.find(item =>
            item.id === trace.productId ||
            item.coffeeId === trace.coffeeId ||
            item.coffeeId === coffeeId
        ) || null;
        const batch = batchesDb.items.find(item =>
            item.productId === product?.id ||
            item.productId === trace.productId ||
            item.coffeeId === trace.coffeeId ||
            item.coffeeId === coffeeId
        ) || null;
        const pipelineLogs = batch
            ? logsDb.items
                .filter(item => item.batchId === batch.id)
                .sort((a, b) => Number(a.stage) - Number(b.stage))
            : [];

        return Response.json({
            success: true,
            data: {
                ...trace,
                product,
                pipeline: {
                    batch,
                    logs: pipelineLogs,
                },
                explorerUrl: trace.txSignature ? getExplorerTxUrl(trace.txSignature) : null,
                blockchainVerified: !!trace.txSignature,
            },
        });
    } catch (err) {
        console.error('[coffee-trace] Detail error:', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
