// Konfigurasi Smart Contract & Wallet CoffeeChain
// ================================================

// Farmer Wallet (shared) — semua pembayaran masuk ke sini
// Wallet Testnet milik @BamsProject
export const FARMER_WALLET = "E5NKiUEJGX8qh9PMxPpA9XWzuiGR9MvEErMtCr5KjiUs";

// Store wallet = farmer wallet (1 wallet untuk semua petani)
export const STORE_WALLET = FARMER_WALLET;

// Solana Memo Program ID (built-in, tidak perlu deploy)
export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

// Memo Signer Public Key (server-side, untuk register kopi ke blockchain)
export const MEMO_SIGNER_PUBLIC = "5NgY9MPpHiUAZz8GmerbfzSdKeXf91FAXUGEm9t6S2h3";

// Smart Contract (belum di-deploy, placeholder)
export const IS_CONTRACT_DEPLOYED = false;
export const COFFEE_PROGRAM_ID = "CoffW1234567890PLACEHOLDER_REPLACE_AFTER_DEPLOY";

// Network
export const SOLANA_NETWORK = "https://api.testnet.solana.com";
export const DEPLOY_NETWORK = "testnet";

// Kurs SOL/IDR (demo testnet)
export const SOL_PER_IDR = 1 / 2_000_000; // 1 SOL = Rp 2.000.000

// Solana Explorer URL
export const EXPLORER_URL = "https://explorer.solana.com";
export const getExplorerTxUrl = (signature) =>
    `${EXPLORER_URL}/tx/${signature}?cluster=${DEPLOY_NETWORK}`;
export const getExplorerAddressUrl = (address) =>
    `${EXPLORER_URL}/address/${address}?cluster=${DEPLOY_NETWORK}`;
export const normalizeExplorerUrl = (url) => {
    if (!url || typeof url !== "string") return url;
    try {
        const parsed = new URL(url);
        if (parsed.hostname !== "explorer.solana.com") return url;
        parsed.searchParams.set("cluster", DEPLOY_NETWORK);
        return parsed.toString();
    } catch {
        return url.replace(/([?&]cluster=)[^&]+/, `$1${DEPLOY_NETWORK}`);
    }
};
