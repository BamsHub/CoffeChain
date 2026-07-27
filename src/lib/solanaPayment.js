import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SOLANA_NETWORK, STORE_WALLET } from '@/lib/contractConfig';

function publicKeyText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value.toBase58 === 'function') return value.toBase58();
    return String(value);
}

function signerAddressesFrom(message) {
    return (message.accountKeys || [])
        .filter(key => key?.signer)
        .map(key => publicKeyText(key?.pubkey || key));
}

function matchingSystemTransfers(message, expectedSigner, receiverWallet) {
    return (message.instructions || [])
        .filter(instruction => (
            instruction?.program === 'system'
            && instruction?.parsed?.type === 'transfer'
            && publicKeyText(instruction.parsed.info?.source) === expectedSigner
            && publicKeyText(instruction.parsed.info?.destination) === receiverWallet
        ))
        .map(instruction => Number(instruction.parsed.info?.lamports || 0))
        .filter(lamports => Number.isSafeInteger(lamports) && lamports > 0);
}

async function loadParsedTransaction(connection, txSignature) {
    let lastError = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
            const transaction = await connection.getParsedTransaction(txSignature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });
            if (transaction) return transaction;
            lastError = null;
        } catch (error) {
            lastError = error;
        }
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
    if (lastError) throw lastError;
    return null;
}

/**
 * Verifikasi transfer SOL Phantom berdasarkan instruction System Program.
 * Perubahan saldo bersih tidak dipakai sebagai nominal transfer karena fee jaringan
 * dibebankan ke fee payer dan menghasilkan nilai negatif pada self-transfer.
 */
export async function verifySolanaPaymentTransaction({
    txSignature,
    expectedLamports,
    expectedSigner,
    receiverWallet = STORE_WALLET,
}) {
    if (!txSignature || typeof txSignature !== 'string') {
        return { ok: false, message: 'Signature transaksi Solana tidak valid' };
    }
    if (!expectedSigner || typeof expectedSigner !== 'string') {
        return { ok: false, message: 'Wallet pembeli tidak ditemukan' };
    }
    if (expectedSigner === receiverWallet) {
        return {
            ok: false,
            message: 'Wallet pembeli sama dengan wallet penerima CoffeeChain. Gunakan wallet pembeli lain agar SOL benar-benar berpindah.',
        };
    }
    if (!Number.isSafeInteger(expectedLamports) || expectedLamports <= 0) {
        return { ok: false, message: 'Jumlah tagihan SOL tidak valid' };
    }

    const connection = new Connection(process.env.SOLANA_RPC_URL || SOLANA_NETWORK, 'confirmed');
    let tx;
    try {
        tx = await loadParsedTransaction(connection, txSignature);
    } catch {
        return {
            ok: false,
            message: 'RPC Solana Testnet sedang sibuk. Transaksi belum dapat diperiksa, silakan coba konfirmasi lagi.',
        };
    }

    if (!tx) return { ok: false, message: 'Transaksi tidak ditemukan di Solana Testnet atau belum confirmed' };
    if (tx.meta?.err) return { ok: false, message: 'Transaksi Solana gagal / dibatalkan' };

    const signerAddresses = signerAddressesFrom(tx.transaction.message);
    if (!signerAddresses.includes(expectedSigner)) {
        return { ok: false, message: 'Wallet pembeli bukan signer transaksi Solana tersebut' };
    }

    const transfers = matchingSystemTransfers(
        tx.transaction.message,
        expectedSigner,
        receiverWallet,
    );
    if (!transfers.length) {
        return {
            ok: false,
            message: `Transaksi tidak mengirim SOL dari wallet pembeli ke wallet CoffeeChain ${receiverWallet}`,
        };
    }

    const receivedLamports = transfers.reduce((total, lamports) => total + lamports, 0);
    if (Math.abs(receivedLamports - expectedLamports) > 1) {
        return {
            ok: false,
            message: `Jumlah SOL dikirim (${(receivedLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL) tidak sesuai tagihan `
                + `(${(expectedLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL)`,
        };
    }

    return {
        ok: true,
        receivedLamports,
        receivedSol: receivedLamports / LAMPORTS_PER_SOL,
        networkFeeLamports: tx.meta?.fee ?? null,
        slot: tx.slot,
    };
}
