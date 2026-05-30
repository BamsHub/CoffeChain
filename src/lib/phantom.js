/**
 * Phantom Wallet helper - interaksi langsung dengan window.solana
 * Tanpa dependency @solana/wallet-adapter untuk kompatibilitas React 19
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Solana Testnet connection untuk testing
export const connection = new Connection('https://api.testnet.solana.com', 'confirmed');

// Mainnet untuk production
// export const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

/** Cek apakah Phantom terinstall di browser */
export function isPhantomInstalled() {
    if (typeof window === 'undefined') return false;
    return !!(window.solana && window.solana.isPhantom);
}

/** Connect ke Phantom wallet */
export async function connectPhantom() {
    if (!isPhantomInstalled()) {
        throw new Error('Phantom wallet tidak terinstall. Download di https://phantom.app');
    }
    try {
        const response = await window.solana.connect();
        const publicKey = response.publicKey.toString();
        return { publicKey, connected: true };
    } catch (err) {
        if (err.code === 4001) throw new Error('Pengguna menolak koneksi');
        throw err;
    }
}

/** Disconnect dari Phantom */
export async function disconnectPhantom() {
    if (typeof window !== 'undefined' && window.solana) {
        await window.solana.disconnect();
    }
}

/** Get balance SOL dari wallet */
export async function getSolBalance(publicKey) {
    try {
        const pk = new PublicKey(publicKey);
        const lamports = await connection.getBalance(pk);
        return lamports / LAMPORTS_PER_SOL;
    } catch {
        return 0;
    }
}

/** Sign dan kirim transaksi transfer SOL */
export async function sendSolTransaction(fromPublicKey, toAddress, amountSol) {
    if (!window.solana) throw new Error('Phantom tidak terhubung');
    const from = new PublicKey(fromPublicKey);
    const to = new PublicKey(toAddress);
    const lamports = amountSol * LAMPORTS_PER_SOL;

    const { blockhash } = await connection.getLatestBlockhash();
    const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: from,
    }).add(
        SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports })
    );

    const signed = await window.solana.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
}

/** Sign pesan untuk verifikasi identitas petani */
export async function signMessage(message) {
    if (!window.solana) throw new Error('Phantom tidak terhubung');
    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
    return {
        signature: Buffer.from(signedMessage.signature).toString('hex'),
        publicKey: signedMessage.publicKey.toString(),
    };
}

/** Format SOL address untuk display */
export function shortenAddress(address, chars = 4) {
    if (!address) return '';
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Get SOL ke Rupiah (estimasi dari harga pasar) */
export function solToRupiah(sol, solPriceUSD = 150, usdToIdr = 16000) {
    return sol * solPriceUSD * usdToIdr;
}

/** Konversi Rupiah ke SOL (1 SOL = Rp 2.000.000 di devnet demo) */
export function rupiahToSol(rupiah, ratePerSol = 2_000_000) {
    return rupiah / ratePerSol;
}

const MEMO_PROGRAM_ID_STR = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

/**
 * Kirim Memo transaction ke Solana menggunakan Phantom Wallet (client-side signing).
 * User membayar gas fee sendiri dari wallet mereka.
 * @param {string} walletPublicKey - Public key wallet Phantom yang terhubung
 * @param {string} memoText - Data trace yang akan ditulis ke blockchain (max 560 karakter)
 * @returns {Promise<string>} txSignature
 */
export async function sendMemoWithPhantom(walletPublicKey, memoText) {
    if (typeof window === 'undefined' || !window.solana) {
        throw new Error('Phantom Wallet tidak terhubung');
    }

    const feePayer = new PublicKey(walletPublicKey);
    const memoProgramId = new PublicKey(MEMO_PROGRAM_ID_STR);
    const memoEncoded = Buffer.from(memoText.slice(0, 560), 'utf8');

    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    const tx = new Transaction({
        recentBlockhash: blockhash,
        feePayer,
    });

    // Tambah memo instruction
    tx.add(new (await import('@solana/web3.js')).TransactionInstruction({
        keys: [{ pubkey: feePayer, isSigner: true, isWritable: false }],
        programId: memoProgramId,
        data: memoEncoded,
    }));

    // Minta Phantom untuk sign
    const signed = await window.solana.signTransaction(tx);

    // Kirim ke Solana
    const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
    });

    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
}

/**
 * Kirim SOL menggunakan Phantom Wallet dengan prioritas fee minimal
 * Cocok untuk devnet dan testnet
 */
export async function sendSolPayment(fromPublicKey, toAddress, amountSol) {
    return sendSolTransaction(fromPublicKey, toAddress, amountSol);
}
