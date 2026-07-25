import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import {
    MEMO_PROGRAM_ID,
    PINNED_MEMO_SIGNER_PUBLIC,
    SOLANA_NETWORK,
    getExplorerTxUrl,
} from '@/lib/contractConfig';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function decodeBase58(value) {
    let numericValue = 0n;
    for (const character of value) {
        const digit = BASE58_ALPHABET.indexOf(character);
        if (digit < 0) throw new Error('Data instruction Solana bukan base58 yang valid');
        numericValue = (numericValue * 58n) + BigInt(digit);
    }

    let hex = numericValue.toString(16);
    if (hex.length % 2) hex = `0${hex}`;
    const body = numericValue === 0n ? Buffer.alloc(0) : Buffer.from(hex, 'hex');
    const leadingZeroes = value.match(/^1+/)?.[0].length || 0;
    return Buffer.concat([Buffer.alloc(leadingZeroes), body]);
}

export function isValidSolanaSignature(signature) {
    if (typeof signature !== 'string' || !signature) return false;
    try {
        return decodeBase58(signature).length === 64;
    } catch {
        return false;
    }
}

function toMemoText(memoData) {
    const rawMemo = typeof memoData === 'string' ? memoData : JSON.stringify(memoData);
    const memoBuffer = Buffer.from(rawMemo, 'utf8');
    return memoBuffer.length > 560
        ? memoBuffer.subarray(0, 560).toString('utf8').replace(/\uFFFD+$/u, '')
        : rawMemo;
}

function getConnection() {
    return new Connection(process.env.SOLANA_RPC_URL || SOLANA_NETWORK, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
    });
}

function getSigner() {
    const secretKeyEnv = process.env.MEMO_SIGNER_SECRET_KEY;
    if (!secretKeyEnv) {
        throw new Error('MEMO_SIGNER_SECRET_KEY belum dikonfigurasi di environment server');
    }

    let signer;
    try {
        const secretArray = JSON.parse(secretKeyEnv);
        if (!Array.isArray(secretArray) || secretArray.length !== 64) {
            throw new Error('secret key harus berupa array JSON berisi 64 byte');
        }
        signer = Keypair.fromSecretKey(Uint8Array.from(secretArray));
    } catch (error) {
        throw new Error(`MEMO_SIGNER_SECRET_KEY tidak valid: ${error.message}`);
    }

    const expectedPublicKey = process.env.MEMO_SIGNER_PUBLIC_KEY;
    const actualPublicKey = signer.publicKey.toBase58();
    if (actualPublicKey !== PINNED_MEMO_SIGNER_PUBLIC) {
        throw new Error(
            `Wallet server terkunci ke ${PINNED_MEMO_SIGNER_PUBLIC}; secret key saat ini menghasilkan ${actualPublicKey}`,
        );
    }
    if (expectedPublicKey && expectedPublicKey !== actualPublicKey) {
        throw new Error(`MEMO_SIGNER_PUBLIC_KEY tidak cocok dengan secret key (seharusnya ${actualPublicKey})`);
    }

    return signer;
}

async function ensureBalance(connection, publicKey) {
    const balance = await connection.getBalance(publicKey);
    const minimumBalance = 0.00002 * LAMPORTS_PER_SOL;
    if (balance < minimumBalance) {
        throw new Error(
            `Saldo wallet pencatat ${publicKey.toBase58()} tidak cukup (${balance / LAMPORTS_PER_SOL} SOL testnet)`,
        );
    }
}

export async function getServerMemoStatus() {
    const signer = getSigner();
    const connection = getConnection();
    const balance = await connection.getBalance(signer.publicKey);
    return {
        signer: signer.publicKey.toBase58(),
        balanceSol: balance / LAMPORTS_PER_SOL,
        ready: balance >= 0.00002 * LAMPORTS_PER_SOL,
    };
}

export async function getConfirmedSolanaSignatures(signatures) {
    const uniqueSignatures = [...new Set((signatures || []).filter(isValidSolanaSignature))];
    const confirmed = new Set();
    if (!uniqueSignatures.length) return confirmed;

    const connection = getConnection();
    for (let index = 0; index < uniqueSignatures.length; index += 100) {
        const chunk = uniqueSignatures.slice(index, index + 100);
        const { value } = await connection.getSignatureStatuses(chunk, {
            searchTransactionHistory: true,
        });
        value.forEach((status, statusIndex) => {
            if (status && !status.err && ['confirmed', 'finalized'].includes(status.confirmationStatus)) {
                confirmed.add(chunk[statusIndex]);
            }
        });
    }
    return confirmed;
}

async function waitForConfirmation(connection, signature, lastValidBlockHeight) {
    const deadline = Date.now() + 45000;
    let lastRpcError = null;

    while (Date.now() < deadline) {
        try {
            const { value } = await connection.getSignatureStatuses([signature], {
                searchTransactionHistory: true,
            });
            const status = value[0];

            if (status?.err) {
                throw new Error(`TX gagal on-chain: ${JSON.stringify(status.err)}`);
            }
            if (status && ['confirmed', 'finalized'].includes(status.confirmationStatus)) {
                return status;
            }

            const currentBlockHeight = await connection.getBlockHeight('confirmed');
            if (currentBlockHeight > lastValidBlockHeight) {
                throw new Error(`TX kedaluwarsa sebelum dikonfirmasi: ${signature}`);
            }
            lastRpcError = null;
        } catch (error) {
            if (error.message?.startsWith('TX gagal') || error.message?.startsWith('TX kedaluwarsa')) throw error;
            lastRpcError = error;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(
        `Konfirmasi Solana timeout untuk signature ${signature}${lastRpcError ? `: ${lastRpcError.message}` : ''}`,
    );
}

async function getConfirmedTransaction(connection, signature) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const transaction = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        }).catch(() => null);
        if (transaction) return transaction;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return null;
}

export async function verifySolanaTransaction(signature, expectedSigner, expectedMemo) {
    if (!signature || typeof signature !== 'string') {
        throw new Error('Signature Solana wajib diisi');
    }

    const connection = getConnection();
    let transaction = null;
    for (let attempt = 0; attempt < 10 && !transaction; attempt += 1) {
        try {
            transaction = await connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });
        } catch (error) {
            if (attempt === 9) throw error;
        }
        if (!transaction) await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!transaction) throw new Error('Transaksi belum ditemukan pada Solana Testnet');
    if (transaction.meta?.err) {
        throw new Error(`Transaksi Solana gagal: ${JSON.stringify(transaction.meta.err)}`);
    }

    const message = transaction.transaction.message;
    const accountKeys = message.staticAccountKeys || message.accountKeys || [];
    const instructions = message.compiledInstructions || message.instructions || [];
    const memoInstruction = instructions.find(instruction => (
        accountKeys[instruction.programIdIndex]?.toBase58() === MEMO_PROGRAM_ID
    ));
    if (!memoInstruction) throw new Error('Signature bukan transaksi Memo CoffeeChain');

    if (expectedMemo) {
        const memoBytes = typeof memoInstruction.data === 'string'
            ? decodeBase58(memoInstruction.data)
            : Buffer.from(memoInstruction.data);
        const actualMemo = memoBytes.toString('utf8');
        if (actualMemo !== toMemoText(expectedMemo)) {
            throw new Error('Isi Memo Solana tidak cocok dengan hash traceability produk');
        }
    }

    if (expectedSigner) {
        const signerCount = message.header?.numRequiredSignatures || 0;
        const signerAddresses = accountKeys
            .slice(0, signerCount)
            .map(key => key.toBase58());
        if (!signerAddresses.includes(expectedSigner)) {
            throw new Error('Wallet Phantom bukan signer transaksi Solana tersebut');
        }
    }

    return { slot: transaction.slot, blockTime: transaction.blockTime };
}

export async function sendServerMemoTx(memoData) {
    const signer = getSigner();
    const connection = getConnection();
    await ensureBalance(connection, signer.publicKey);

    const memoText = toMemoText(memoData);
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

    const estimatedFee = await connection
        .getFeeForMessage(tx.compileMessage(), 'confirmed')
        .catch(() => ({ value: null }));
    const txSignature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 5,
    });

    const confirmation = await waitForConfirmation(connection, txSignature, lastValidBlockHeight);
    const confirmedTransaction = await getConfirmedTransaction(connection, txSignature);
    const networkFeeLamports = confirmedTransaction?.meta?.fee ?? estimatedFee.value ?? null;

    return {
        txSignature,
        explorerUrl: getExplorerTxUrl(txSignature),
        signer: signer.publicKey.toBase58(),
        slot: confirmation.slot,
        confirmationStatus: confirmation.confirmationStatus,
        networkFeeLamports,
        networkFeeSol: networkFeeLamports == null ? null : networkFeeLamports / LAMPORTS_PER_SOL,
    };
}
