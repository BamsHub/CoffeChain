export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel: allow up to 60s for Solana TX

import { readDb, addItem, updateItem } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import {
    Connection, Keypair, PublicKey, LAMPORTS_PER_SOL,
    Transaction, TransactionInstruction,
    ComputeBudgetProgram,
} from '@solana/web3.js';
import { SOLANA_NETWORK, MEMO_PROGRAM_ID, getExplorerTxUrl } from '@/lib/contractConfig';

function generateCoffeeId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'CF-';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

function getConnection() {
    return new Connection(SOLANA_NETWORK, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
    });
}

function getSigner() {
    const secretKeyEnv = process.env.MEMO_SIGNER_SECRET_KEY;
    if (!secretKeyEnv) throw new Error('MEMO_SIGNER_SECRET_KEY not configured');
    const secretArray = JSON.parse(secretKeyEnv);
    return Keypair.fromSecretKey(Uint8Array.from(secretArray));
}

async function ensureBalance(connection, publicKey) {
    const balance = await connection.getBalance(publicKey);
    console.log(`[coffee-trace] Wallet ${publicKey.toBase58()} balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    if (balance < 0.005 * LAMPORTS_PER_SOL) {
        console.log('[coffee-trace] Balance low, requesting devnet airdrop...');
        try {
            const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig, 'confirmed');
            const newBalance = await connection.getBalance(publicKey);
            console.log(`[coffee-trace] Airdrop success! New balance: ${newBalance / LAMPORTS_PER_SOL} SOL`);
        } catch (e) {
            console.warn('[coffee-trace] Airdrop failed (may have been rate-limited):', e.message);
            if (balance === 0) throw new Error('Wallet has 0 SOL and airdrop failed');
        }
    }
}

async function sendMemoTx(memoData) {
    const signer = getSigner();
    const connection = getConnection();

    await ensureBalance(connection, signer.publicKey);

    const memoProgramId = new PublicKey(MEMO_PROGRAM_ID);
    const memoText = memoData.length > 560 ? memoData.slice(0, 557) + '...' : memoData;
    const memoEncoded = Buffer.from(memoText, 'utf8');

    const memoInstruction = new TransactionInstruction({
        keys: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }],
        programId: memoProgramId,
        data: memoEncoded,
    });

    const computeUnitPrice = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000,
    });
    const computeUnitLimit = ComputeBudgetProgram.setComputeUnitLimit({
        units: 200000,
    });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = signer.publicKey;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.add(computeUnitPrice, computeUnitLimit, memoInstruction);
    tx.sign(signer);

    const txSignature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 5,
    });

    console.log('[coffee-trace] TX submitted:', txSignature);

    const confirmation = await Promise.race([
        connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, 'confirmed'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('confirmation timeout 20s')), 20000)),
    ]);

    if (confirmation?.value?.err) {
        throw new Error(`TX failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('[coffee-trace] TX confirmed on Solana:', txSignature);
    return { txSignature, explorerUrl: getExplorerTxUrl(txSignature) };
}

export async function POST(request) {
    try {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '') || new URL(request.url).searchParams.get('token');
        const session = await verifyToken(token);
        if (!session) {
            return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            productId, name, origin, variety, grade, weightKg,
            farmerName, farmerId, harvestDate, processMethod, roastLevel,
            certification, description, registeredBy, paymentWallet,
            // ── Phantom-signed TX: jika disediakan, skip server wallet ──
            phantomTxSignature, phantomWalletAddress,
        } = body;

        // Security check: if role is farmer, verify ownership of product or matching farmerId
        if (session.role === 'farmer') {
            if (productId) {
                const { data: product, error: checkErr } = await supabaseAdmin
                    .from('products')
                    .select('submitted_by')
                    .eq('id', productId)
                    .maybeSingle();
                if (checkErr || !product) {
                    return Response.json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
                }
                if (product.submitted_by !== session.userId) {
                    return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
                }
            } else if (farmerId && farmerId !== session.userId) {
                return Response.json({ success: false, message: 'Forbidden' }, { status: 403 });
            }
        }

        if (!name || !origin) {
            return Response.json({ success: false, message: 'Nama dan asal kopi wajib diisi' }, { status: 400 });
        }

        let coffeeId;
        let resolvedProductId = productId || null;

        if (productId) {
            try {
                const { data: product } = await supabaseAdmin
                    .from('products')
                    .select('id, coffee_id')
                    .eq('id', productId)
                    .single();

                if (product?.coffee_id) {
                    coffeeId = product.coffee_id;
                } else {
                    coffeeId = generateCoffeeId();
                }
            } catch (productLookupErr) {
                console.warn('[coffee-trace] Product lookup failed, generating new ID:', productLookupErr.message);
                coffeeId = generateCoffeeId();
            }
        } else {
            coffeeId = generateCoffeeId();
        }

        const memoData = JSON.stringify({
            v: 1,
            type: 'coffee-inventory',
            id: coffeeId,
            pid: resolvedProductId || '',
            n: name.slice(0, 30),
            o: (origin || '').slice(0, 20),
            var: (variety || '').slice(0, 15),
            g: grade || '',
            r: (roastLevel || '').slice(0, 10),
            ts: Math.floor(Date.now() / 1000),
        });

        let txSignature = null;
        let explorerUrl = null;
        let txError = null;

        if (phantomTxSignature) {
            // ── Phantom sudah sign & kirim TX di client-side ──
            txSignature = phantomTxSignature;
            explorerUrl = getExplorerTxUrl(phantomTxSignature);
            console.log('[coffee-trace] Using Phantom-signed TX:', phantomTxSignature);
        } else {
            // ── Fallback: gunakan server wallet ──
            try {
                const result = await sendMemoTx(memoData);
                txSignature = result.txSignature;
                explorerUrl = result.explorerUrl;
            } catch (solErr) {
                txError = solErr?.message || 'Unknown Solana error';
                console.error('[coffee-trace] Solana TX failed:', txError);
            }
        }

        const isVerified = txSignature !== null;

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
            status: isVerified ? 'verified' : 'registered',
            registeredBy: registeredBy || null,
            productId: resolvedProductId,
            paymentWallet: paymentWallet || null,
            createdAt: new Date().toISOString(),
        };

        // Save trace to DB — if coffee_traces table doesn't exist yet, log and continue
        // (coffeeId is still attached to product below, so registration succeeds regardless)
        try {
            await addItem('coffee_traces', trace);
        } catch (insertErr) {
            if (insertErr.message?.includes('column') || insertErr.message?.includes('schema')) {
                console.warn('[coffee-trace] Retrying insert without optional columns:', insertErr.message);
                try {
                    const { productId: _pid, paymentWallet: _pw, ...baseTrace } = trace;
                    await addItem('coffee_traces', baseTrace);
                } catch (retryErr) {
                    console.warn('[coffee-trace] Retry insert also failed:', retryErr.message);
                }
            } else {
                // Table may not exist yet — log but do NOT crash (coffeeId still attached to product below)
                console.warn('[coffee-trace] Could not save to coffee_traces (table may not exist):', insertErr.message);
            }
        }

        if (productId) {
            try {
                const updateData = { coffeeId, status: 'published' };
                if (paymentWallet) updateData.paymentWallet = paymentWallet;
                await updateItem('products', productId, updateData);
            } catch (e) {
                console.error('[coffee-trace] Failed to attach coffeeId to product:', e.message);
            }
        }

        return Response.json({
            success: true,
            verified: isVerified,
            message: isVerified
                ? `Kopi ${coffeeId} berhasil diverifikasi di Solana! Gas fee telah dipotong.`
                : `Kopi ${coffeeId} tersimpan tapi gagal ke blockchain: ${txError}`,
            data: trace,
        }, { status: 201 });

    } catch (err) {
        console.error('[coffee-trace] Error:', err);
        return Response.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
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
