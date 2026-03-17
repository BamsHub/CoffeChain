const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58'); // bs58 biasanya ada di '@solana/web3.js' dependencies

const farmer = Keypair.generate();
const koperasi = Keypair.generate();

console.log('FARMER_PUB:', farmer.publicKey.toBase58());
console.log('FARMER_PRIV:', bs58.encode(farmer.secretKey));
console.log('KOPERASI_PUB:', koperasi.publicKey.toBase58());
console.log('KOPERASI_PRIV:', bs58.encode(koperasi.secretKey));
