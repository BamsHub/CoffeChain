/**
 * CoffeeChain Smart Contract — Solana Program Interface
 *
 * Program ID akan di-deploy ke Solana Devnet menggunakan Anchor framework.
 * File ini berisi interface untuk berinteraksi dengan smart contract on-chain.
 *
 * Untuk deploy program:
 * 1. Install Anchor: cargo install --git https://github.com/coral-xyz/anchor anchor-cli
 * 2. solana config set --url devnet
 * 3. anchor build && anchor deploy
 */

import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';

// Program ID setelah deploy (placeholder - ganti dengan hasil anchor deploy)
export const COFFEE_CHAIN_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

// Instruction discriminators (8 bytes pertama dari sha256 hash nama instruksi)
export const INSTRUCTIONS = {
    REGISTER_FARMER: 0,
    RECORD_TRANSACTION: 1,
    VERIFY_BATCH: 2,
    CERTIFY_FARMER: 3,
};

/**
 * Instruction: Register Farmer ke blockchain
 * Farmer baru mendaftarkan diri dengan data identitas
 */
export function createRegisterFarmerInstruction(farmerPublicKey, farmerId, farmerName, region) {
    const data = Buffer.alloc(256);
    data.writeUInt8(INSTRUCTIONS.REGISTER_FARMER, 0);
    // Encode string data sebagai buffer (simplified encoding)
    const nameBuffer = Buffer.from(farmerName, 'utf8');
    const regionBuffer = Buffer.from(region, 'utf8');
    nameBuffer.copy(data, 8);
    regionBuffer.copy(data, 8 + 64);

    return new TransactionInstruction({
        programId: COFFEE_CHAIN_PROGRAM_ID,
        keys: [
            { pubkey: new PublicKey(farmerPublicKey), isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
    });
}

/**
 * Instruction: Record Coffee Transaction on-chain
 * Mencatat transaksi jual-beli kopi secara immutable di blockchain
 */
export function createCoffeeTransactionInstruction(
    farmerPublicKey,
    buyerPublicKey,
    weightKg,
    pricePerKg,
    coffeeVariety,
    batchId
) {
    const data = Buffer.alloc(128);
    data.writeUInt8(INSTRUCTIONS.RECORD_TRANSACTION, 0);
    data.writeFloatLE(weightKg, 8);
    data.writeFloatLE(pricePerKg, 12);
    data.writeUInt32LE(Date.now() / 1000, 16); // unix timestamp
    const varietyBuffer = Buffer.from(coffeeVariety, 'utf8');
    varietyBuffer.copy(data, 20);

    return new TransactionInstruction({
        programId: COFFEE_CHAIN_PROGRAM_ID,
        keys: [
            { pubkey: new PublicKey(farmerPublicKey), isSigner: true, isWritable: false },
            { pubkey: new PublicKey(buyerPublicKey), isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
    });
}

/**
 * Verify Batch on-chain
 * Operator koperasi memverifikasi batch kopi sudah diterima
 */
export function createVerifyBatchInstruction(operatorPublicKey, batchId) {
    const data = Buffer.alloc(64);
    data.writeUInt8(INSTRUCTIONS.VERIFY_BATCH, 0);
    Buffer.from(batchId, 'utf8').copy(data, 8);
    return new TransactionInstruction({
        programId: COFFEE_CHAIN_PROGRAM_ID,
        keys: [
            { pubkey: new PublicKey(operatorPublicKey), isSigner: true, isWritable: true },
        ],
        data,
    });
}

/**
 * Simulasi kirim transaksi ke blockchain (devnet/mainnet)
 * Untuk production, gunakan sendCoffeeTransaction() yang sesungguhnya
 */
export async function simulateCoffeeTransaction(farmerPubKey, weightKg, pricePerKg, variety) {
    // Simulasi delay seperti transaksi blockchain nyata
    await new Promise(resolve => setTimeout(resolve, 1500));
    const fakeSignature = Array(64).fill(0).map(() =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return {
        signature: fakeSignature,
        blockTime: Math.floor(Date.now() / 1000),
        slot: 18293040 + Math.floor(Math.random() * 1000),
        confirmationStatus: 'confirmed',
    };
}
