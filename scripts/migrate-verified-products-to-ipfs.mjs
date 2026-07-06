import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import PinataSDK from '@pinata/sdk';
import { createClient } from '@supabase/supabase-js';
import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';

const args = process.argv.slice(2);
const execute = args.includes('--execute');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? Math.max(1, Number(args[limitIndex + 1]) || 1) : null;
const envFiles = [];
for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--env' && args[index + 1]) envFiles.push(args[index + 1]);
}
if (!envFiles.length) envFiles.push('.env.local');

for (const envFile of envFiles) {
    const fullPath = path.resolve(envFile);
    if (!fs.existsSync(fullPath)) throw new Error(`Env file tidak ditemukan: ${fullPath}`);
    for (const line of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*=/.test(line)) continue;
        const separator = line.indexOf('=');
        const key = line.slice(0, separator);
        let value = line.slice(separator + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        if (value && !process.env[key]) process.env[key] = value;
    }
}

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'MEMO_SIGNER_SECRET_KEY'];
for (const key of required) if (!process.env[key]) throw new Error(`${key} belum dikonfigurasi`);
if (!process.env.PINATA_JWT && !(process.env.PINATA_API_KEY && process.env.PINATA_API_SECRET)) {
    throw new Error('Kredensial Pinata belum dikonfigurasi');
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});
const pinata = new PinataSDK(process.env.PINATA_JWT
    ? { pinataJWTKey: process.env.PINATA_JWT }
    : { pinataApiKey: process.env.PINATA_API_KEY, pinataSecretApiKey: process.env.PINATA_API_SECRET });
const gatewayBase = (process.env.IPFS_GATEWAY_URL || process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs').replace(/\/+$/, '');
const gatewayUrl = cid => `${gatewayBase.endsWith('/ipfs') ? gatewayBase : `${gatewayBase}/ipfs`}/${cid}`;
const sha256 = value => createHash('sha256').update(value).digest('hex');

function sortValue(value) {
    if (Array.isArray(value)) return value.map(sortValue);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce((result, key) => {
        if (value[key] !== undefined) result[key] = sortValue(value[key]);
        return result;
    }, {});
}

function stableStringify(value) {
    return JSON.stringify(sortValue(value));
}

function taggedCid(tags, prefix) {
    return (Array.isArray(tags) ? tags : []).map(String).find(tag => tag.startsWith(prefix))?.slice(prefix.length) || null;
}

function urlCid(value) {
    if (!value) return null;
    if (value.startsWith('ipfs://')) return value.slice(7).split(/[/?#]/)[0];
    return value.match(/\/ipfs\/([^/?#]+)/i)?.[1] || null;
}

async function pinImage(product) {
    const existing = taggedCid(product.tags, 'ipfs-image:') || urlCid(product.image);
    if (existing) return { cid: existing, gatewayUrl: gatewayUrl(existing), originalUrl: product.image, sha256: null, reused: true };

    const response = await fetch(product.image, { redirect: 'follow' });
    if (!response.ok) throw new Error(`download foto gagal (${response.status})`);
    const contentType = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    if (!contentType.startsWith('image/')) throw new Error(`URL bukan gambar (${contentType})`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const extension = { 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[contentType] || 'jpg';
    const stream = Readable.from(buffer);
    stream.path = `${product.id}.${extension}`;
    const pinned = await pinata.pinFileToIPFS(stream, {
        pinataMetadata: { name: `${product.id}-verified-product`, keyvalues: { productId: product.id, coffeeId: product.coffee_id } },
        pinataOptions: { cidVersion: 1 },
    });
    return {
        cid: pinned.IpfsHash,
        gatewayUrl: gatewayUrl(pinned.IpfsHash),
        originalUrl: product.image,
        sha256: sha256(buffer),
        reused: false,
    };
}

async function sendProofMemo(memo) {
    const connection = new Connection('https://api.testnet.solana.com', 'confirmed');
    const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.MEMO_SIGNER_SECRET_KEY)));
    const balance = await connection.getBalance(signer.publicKey);
    if (balance < 0.005 * LAMPORTS_PER_SOL) {
        console.log(`[migration] Saldo signer ${signer.publicKey.toBase58()} rendah; meminta airdrop Testnet...`);
        const airdropSignature = await connection.requestAirdrop(signer.publicKey, LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSignature, 'confirmed');
    }
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const instruction = new TransactionInstruction({
        keys: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }],
        programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
        data: Buffer.from(JSON.stringify(memo), 'utf8'),
    });
    const transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = signer.publicKey;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
        instruction,
    );
    transaction.sign(signer);
    const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, maxRetries: 5 });
    const confirmation = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
    if (confirmation.value.err) throw new Error(`Solana TX gagal: ${JSON.stringify(confirmation.value.err)}`);
    return signature;
}

const { data: products, error: productError } = await supabase
    .from('products')
    .select('*')
    .not('coffee_id', 'is', null)
    .order('created_at', { ascending: true });
if (productError) throw productError;

const allPending = (products || []).filter(product => !taggedCid(product.tags, 'ipfs-metadata:'));
const pending = limit ? allPending.slice(0, limit) : allPending;
console.log(`[migration] Produk terverifikasi: ${products.length}; perlu migrasi: ${pending.length}; mode: ${execute ? 'EXECUTE' : 'DRY-RUN'}`);
if (!execute) {
    for (const product of pending) console.log(`[dry-run] ${product.id} | ${product.coffee_id} | ${product.name}`);
}

let succeeded = 0;
let failed = 0;
for (const product of execute ? pending : []) {
    try {
        console.log(`[migration] ${succeeded + failed + 1}/${pending.length} ${product.name}`);
        const { data: traceRows } = await supabase
            .from('coffee_traces')
            .select('*')
            .eq('coffee_id', product.coffee_id)
            .order('created_at', { ascending: false })
            .limit(1);
        const trace = traceRows?.[0] || null;
        const image = await pinImage(product);
        const manifest = {
            schema: 'coffeechain.product.v2',
            coffeeId: product.coffee_id,
            productId: product.id,
            product: {
                name: product.name,
                origin: product.origin,
                variety: product.variety,
                grade: product.grade,
                roast: product.roast,
                weight: product.weight,
                pricePerUnit: product.price_per_unit,
                stock: product.stock,
                description: product.description,
                status: product.status,
            },
            trace: trace ? {
                farmerName: trace.farmer_name,
                harvestDate: trace.harvest_date,
                processMethod: trace.process_method,
                certification: trace.certification,
                previousTxSignature: trace.tx_signature,
            } : null,
            image: {
                cid: image.cid,
                uri: `ipfs://${image.cid}`,
                gatewayUrl: image.gatewayUrl,
                originalUrl: image.originalUrl,
                sha256: image.sha256,
            },
            migratedAt: new Date().toISOString(),
        };
        const contentHash = sha256(stableStringify(manifest));
        const metadataPin = await pinata.pinJSONToIPFS(manifest, {
            pinataMetadata: { name: `coffeechain-${product.coffee_id}-${product.id}` },
            pinataOptions: { cidVersion: 1 },
        });
        const memo = {
            v: 2,
            type: 'coffee-proof',
            id: product.coffee_id,
            pid: product.id,
            cid: metadataPin.IpfsHash,
            sha256: contentHash,
        };
        const signature = await sendProofMemo(memo);
        const retainedTags = (Array.isArray(product.tags) ? product.tags : []).filter(tag => {
            const value = String(tag);
            return !value.startsWith('ipfs-image:') && !value.startsWith('ipfs-metadata:') && !value.startsWith('offchain-proof:');
        });
        const tags = [...retainedTags, `ipfs-image:${image.cid}`, `ipfs-metadata:${metadataPin.IpfsHash}`, `offchain-proof:${signature}`];
        const { error: updateError } = await supabase.from('products').update({ image: image.gatewayUrl, tags }).eq('id', product.id);
        if (updateError) throw updateError;
        const { error: transactionError } = await supabase.from('transactions').insert({
            id: `off-${Date.now().toString(36)}-${String(product.id).slice(-5)}`,
            hash: signature,
            type: 'offchain_migration',
            farmer: product.submitted_by_name || 'CoffeeChain',
            amount: 0,
            status: 'Confirmed',
            timestamp: new Date().toISOString(),
            note: `Metadata IPFS ${metadataPin.IpfsHash}; SHA-256 ${contentHash}`,
            product_id: product.id,
            product_name: product.name,
        });
        if (transactionError) console.warn(`[migration] log transaksi gagal: ${transactionError.message}`);
        succeeded += 1;
        console.log(`[ok] ${product.id} image=${image.cid} metadata=${metadataPin.IpfsHash} tx=${signature}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
        failed += 1;
        console.error(`[failed] ${product.id}: ${error.message}`);
    }
}

console.log(`[migration] selesai: ${succeeded} berhasil, ${failed} gagal`);
if (failed) process.exitCode = 1;
