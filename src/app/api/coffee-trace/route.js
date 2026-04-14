// Node.js runtime required for @solana/web3.js compatibility
export const runtime = 'nodejs';

import { readDb, addItem, updateItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { SOLANA_NETWORK, MEMO_PROGRAM_ID, MEMO_SIGNER_PUBLIC, getExplorerTxUrl } from '@/lib/contractConfig';

/**
 * Coffee Trace API — Register & Query coffee on Solana blockchain
 * POST /api/coffee-trace  → Register kopi baru + kirim Memo TX ke Solana
 * GET  /api/coffee-trace  → List semua atau cari by ?coffeeId=CF-XXXX
 */

function generateCoffeeId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'CF-';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { productId, name, origin, variety, grade, weightKg, farmerName, farmerId,
                harvestDate, processMethod, roastLevel, certification, description,
                registeredBy, paymentWallet } = body;

        if (!name || !origin) {
            return Response.json({ success: false, message: 'Nama dan asal kopi wajib diisi' }, { status: 400 });
        }

        // Generate unique Coffee ID
        const coffeeId = generateCoffeeId();

        // Build memo content for Solana blockchain
        const memoData = JSON.stringify({
            type: 'COFFEE_TRACE',
            id: coffeeId,
            name, origin, variety: variety || '', grade: grade || '',
            weight: weightKg || 0, farmer: farmerName || '',
            harvest: harvestDate || '', process: processMethod || '',
            roast: roastLevel || '', cert: certification || '',
            ts: new Date().toISOString(),
        });

        let txSignature = null;
        let explorerUrl = null;

        // Send Memo TX to Solana Devnet
        try {
            const secretKeyEnv = process.env.MEMO_SIGNER_SECRET_KEY;
            if (!secretKeyEnv) {
                throw new Error('MEMO_SIGNER_SECRET_KEY not configured');
            }

            const secretArray = JSON.parse(secretKeyEnv);
            const signer = Keypair.fromSecretKey(Uint8Array.from(secretArray));
            const connection = new Connection(SOLANA_NETWORK, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000,
            });
            const memoProgramId = new PublicKey(MEMO_PROGRAM_ID);

            const memoInstruction = new TransactionInstruction({
                keys: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }],
                programId: memoProgramId,
                data: new TextEncoder().encode(memoData),
            });

            // Get blockhash WITH lastValidBlockHeight for proper confirmation
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            const tx = new Transaction({
                recentBlockhash: blockhash,
                feePayer: signer.publicKey,
                lastValidBlockHeight,
            });
            tx.add(memoInstruction);
            tx.sign(signer);

            // Send with skipPreflight for faster submission on devnet
            txSignature = await connection.sendRawTransaction(tx.serialize(), {
                skipPreflight: false,
                maxRetries: 5,
                preflightCommitment: 'confirmed',
            });

            console.log('[coffee-trace] TX sent:', txSignature);

            // Use modern confirmTransaction API with blockhash strategy
            const confirmation = await connection.confirmTransaction({
                signature: txSignature,
                blockhash,
                lastValidBlockHeight,
            }, 'confirmed');

            if (confirmation.value?.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            explorerUrl = getExplorerTxUrl(txSignature);
            console.log('[coffee-trace] TX confirmed:', txSignature);
        } catch (solErr) {
            console.error('[coffee-trace] Solana memo TX failed:', solErr?.message);
            // If we got a signature but confirmation timed out, still save it
            // The tx may have landed on-chain even if confirmation tracking failed
            if (txSignature) {
                console.log('[coffee-trace] TX signature obtained despite error, saving:', txSignature);
                explorerUrl = getExplorerTxUrl(txSignature);
            }
        }

        const trace = {
            id: uuidv4(),
            coffeeId,
            name,
            origin: origin || null,
            variety: variety || null,
            grade: grade || null,
            weightKg: weightKg || null,
            farmerName: farmerName || null,
            farmerId: farmerId || null,
            harvestDate: harvestDate || null,
            processMethod: processMethod || null,
            roastLevel: roastLevel || null,
            certification: certification || null,
            description: description || null,
            txSignature,
            explorerUrl,
            status: txSignature ? 'verified' : 'registered',
            registeredBy: registeredBy || null,
            createdAt: new Date().toISOString(),
        };

        await addItem('coffee_traces', trace);

        if (productId) {
            try {
                const updateData = { coffeeId };
                if (paymentWallet) updateData.paymentWallet = paymentWallet;
                await updateItem('products', productId, updateData);
            } catch (e) {
                console.error('[coffee-trace] Failed to attach coffeeId/wallet to product:', e.message);
            }
        }

        return Response.json({
            success: true,
            message: txSignature
                ? `Kopi ${coffeeId} berhasil didaftarkan ke blockchain Solana!`
                : `Kopi ${coffeeId} gagal didaftarkan ke blockchain. Pastikan wallet memiliki SOL untuk gas fee.`,
            data: trace,
        }, { status: 201 });

    } catch (err) {
        console.error('[coffee-trace] Error:', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const coffeeId = searchParams.get('coffeeId');

        const db = await readDb('coffee_traces');
        let items = db.items || [];

        if (coffeeId) {
            items = items.filter(t => t.coffeeId === coffeeId || t.id === coffeeId);
        }

        return Response.json({
            success: true,
            data: items,
            total: items.length,
        });
    } catch (err) {
        console.error('[coffee-trace] GET error:', err);
        return Response.json({ success: false, message: 'Server error' }, { status: 500 });
    }
}
