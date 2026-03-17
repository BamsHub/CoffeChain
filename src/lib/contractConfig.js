// Konfigurasi Smart Contract CoffeeChain
// File ini akan OTOMATIS diperbarui oleh contracts/deploy.js setelah deploy

// Jika sudah deploy, ganti IS_CONTRACT_DEPLOYED = true dan isi COFFEE_PROGRAM_ID
export const IS_CONTRACT_DEPLOYED = false;
export const COFFEE_PROGRAM_ID = "CoffW1234567890PLACEHOLDER_REPLACE_AFTER_DEPLOY";

// Store wallet yang menerima pembayaran (sama untuk SOL maupun smart contract)
export const STORE_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

// Network
export const SOLANA_NETWORK = "https://api.devnet.solana.com";
export const DEPLOY_NETWORK = "devnet";

// Kurs SOL/IDR (demo devnet)
export const SOL_PER_IDR = 1 / 2_000_000; // 1 SOL = Rp 2.000.000

// Gas Fee settings — MINIMUM possible
// 1 microLamport = sangat murah, prioritas rendah tapi masih diproses di devnet
export const PRIORITY_FEE_MICROLAMPORTS = 1; // ~0 rupiah extra
// Batas compute units — program kita ringan, set 50.000 (jauh di bawah default 200.000)
export const COMPUTE_UNIT_LIMIT = 50_000;
