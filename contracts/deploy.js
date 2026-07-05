#!/usr/bin/env node
/**
 * Deploy Script: CoffeeChain Smart Contract ke Solana Devnet
 * ---------------------------------------------------------------------------
 * Jalankan setelah Solana CLI + Anchor terinstall:
 *   node contracts/deploy.js
 * 
 * Atau manual:
 *   cd contracts
 *   anchor build
 *   anchor deploy --provider.cluster devnet
 * ---------------------------------------------------------------------------
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONTRACTS_DIR = path.join(__dirname);
const IDL_OUTPUT = path.join(__dirname, 'idl', 'coffee_payment.js');
const FRONTEND_CONFIG = path.join(__dirname, '..', 'src', 'lib', 'contractConfig.js');

function run(cmd, cwd = CONTRACTS_DIR) {
    console.log(`\n▶ ${cmd}`);
    return execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

async function main() {
    console.log('🚀 CoffeeChain Smart Contract — Deploy ke Solana Devnet');
    console.log('━'.repeat(60));

    // 1. Set Solana ke devnet
    run('solana config set --url devnet');

    // 2. Tampilkan wallet address
    run('solana address');

    // 3. Airdrop SOL untuk gas deployment (devnet only)
    console.log('\n💧 Airdrop SOL untuk deploy...');
    try { run('solana airdrop 2'); } catch { console.log('Airdrop gagal, pastikan ada SOL di wallet'); }

    // 4. Build program
    console.log('\n🔨 Building Anchor program...');
    run('anchor build');

    // 5. Ambil Program ID dari keypair
    const keypairPath = path.join(CONTRACTS_DIR, 'target', 'deploy', 'coffee_payment-keypair.json');
    const programId = execSync(
        `solana address -k ${keypairPath}`,
        { cwd: CONTRACTS_DIR }
    ).toString().trim();

    console.log(`\n📋 Program ID: ${programId}`);

    // 6. Update declare_id! di lib.rs
    const libRsPath = path.join(CONTRACTS_DIR, 'programs', 'coffee-payment', 'src', 'lib.rs');
    let libRs = fs.readFileSync(libRsPath, 'utf-8');
    libRs = libRs.replace(
        /declare_id!\(".*?"\)/,
        `declare_id!("${programId}")`
    );
    fs.writeFileSync(libRsPath, libRs);

    // 7. Update Anchor.toml
    const anchorToml = path.join(CONTRACTS_DIR, 'Anchor.toml');
    let toml = fs.readFileSync(anchorToml, 'utf-8');
    toml = toml.replace(/coffee_payment = ".*?"/g, `coffee_payment = "${programId}"`);
    fs.writeFileSync(anchorToml, toml);

    // 8. Rebuild dengan ID yang benar
    run('anchor build');

    // 9. Deploy
    console.log('\n🚀 Deploying ke Solana Devnet...');
    run('anchor deploy --provider.cluster devnet');

    // 10. Update IDL file frontend
    let idlJs = fs.readFileSync(IDL_OUTPUT, 'utf-8');
    idlJs = idlJs.replace(
        /COFFEE_PAYMENT_PROGRAM_ID = ".*?"/,
        `COFFEE_PAYMENT_PROGRAM_ID = "${programId}"`
    );
    fs.writeFileSync(IDL_OUTPUT, idlJs);

    // 11. Update contractConfig.js di frontend
    const configContent = `// Auto-generated oleh deploy.js — Jangan edit manual
export const COFFEE_PROGRAM_ID = "${programId}";
export const STORE_WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";
export const IS_CONTRACT_DEPLOYED = true;
export const DEPLOY_NETWORK = "devnet";
export const DEPLOY_DATE = "${new Date().toISOString()}";
`;
    fs.mkdirSync(path.dirname(FRONTEND_CONFIG), { recursive: true });
    fs.writeFileSync(FRONTEND_CONFIG, configContent);

    console.log('\n✅ Deploy berhasil!');
    console.log(`📋 Program ID: ${programId}`);
    console.log(`🔗 Explorer: https://explorer.solana.com/address/${programId}?cluster=devnet`);
    console.log(`📄 IDL updated: ${IDL_OUTPUT}`);
    console.log(`⚙️  Config: ${FRONTEND_CONFIG}`);
    console.log('\n💡 Selanjutnya: restart Next.js dev server untuk load config baru');
}

main().catch(err => {
    console.error('❌ Deploy gagal:', err.message);
    process.exit(1);
});
