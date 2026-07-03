import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import { MEMO_PROGRAM_ID, SOLANA_NETWORK, getExplorerTxUrl } from '@/lib/contractConfig';

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
    if (balance < 0.005 * LAMPORTS_PER_SOL) {
        try {
            const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig, 'confirmed');
        } catch (error) {
            if (balance === 0) throw new Error(`Wallet has 0 SOL and airdrop failed: ${error.message}`);
        }
    }
}

export async function sendServerMemoTx(memoData) {
    const signer = getSigner();
    const connection = getConnection();
    await ensureBalance(connection, signer.publicKey);

    const memoText = memoData.length > 560 ? `${memoData.slice(0, 557)}...` : memoData;
    const memoInstruction = new TransactionInstruction({
        keys: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }],
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(memoText, 'utf8'),
    });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = signer.publicKey;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        memoInstruction,
    );
    tx.sign(signer);

    const txSignature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 5,
    });

    const confirmation = await Promise.race([
        connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, 'confirmed'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('confirmation timeout 20s')), 20000)),
    ]);

    if (confirmation?.value?.err) {
        throw new Error(`TX failed on-chain: ${JSON.stringify(confirmation.value.err)}`);
    }

    return { txSignature, explorerUrl: getExplorerTxUrl(txSignature), signer: signer.publicKey.toBase58() };
}
