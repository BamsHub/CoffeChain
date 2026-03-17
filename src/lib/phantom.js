/**
 * Phantom Wallet helper - interaksi langsung dengan window.solana
 * Tanpa dependency @solana/wallet-adapter untuk kompatibilitas React 19
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Solana Devnet connection untuk testing
export const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

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
