import fs from 'fs';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

// Supabase config (ambil dari env local)
const SUPABASE_URL = 'https://yjdauinnnilqjfwhytis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZGF1aW5ubmlscWpmd2h5dGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjczMTEsImV4cCI6MjA4OTMwMzMxMX0.YCN-_xyGDBJ3tl-udY5d8m-thDX8BI41C344G11jvB4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const connection = new Connection('https://api.testnet.solana.com', 'confirmed');
const MEMO_SIGNER_PUBKEY = new PublicKey('5NgY9MPpHiUAZz8GmerbfzSdKeXf91FAXUGEm9t6S2h3');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log('🔄 MENUNGGU SALDO SOL MASUK KE DOMPET SERVER...');
    console.log(`Silakan transfer 0.05 atau max 1 SOL testnet ke: ${MEMO_SIGNER_PUBKEY.toBase58()}`);
    console.log('Mengecek otomatis setiap 5 detik...\n');

    let balance = 0;
    while (balance === 0) {
        try {
            balance = await connection.getBalance(MEMO_SIGNER_PUBKEY);
            const sol = balance / LAMPORTS_PER_SOL;
            if (sol > 0) {
                console.log(`\n🎉 Hore! Saldo berhasil masuk: ${sol} SOL`);
                break;
            }
            process.stdout.write('⏳ Menunggu saldo... \r');
            await delay(5000);
        } catch (e) {
            await delay(5000);
        }
    }

    console.log('\n🚀 Memulai re-verifikasi pendaftaran Kopi ke Blockchain Solana...\n');
    
    // 1. Ambil semua product 
    const res = await fetch('http://localhost:3002/api/public/products?limit=100');
    const data = await res.json();
    const products = data.data;

    // 2. Hapus yang pending dari trace (karena akan digenerate ulang supaya di-sign)
    const { data: oldTraces } = await supabase.from('coffee_traces').select('*').eq('status', 'pending');
    if (oldTraces && oldTraces.length > 0) {
        console.log(`🗑️ Menghapus ${oldTraces.length} cache pending lama...`);
        for (const t of oldTraces) {
            await supabase.from('coffee_traces').delete().eq('id', t.id);
        }
    }

    let successCount = 0;

    for (const p of products) {
        console.log(`⏳ Memproses: ${p.name} (${p.id})...`);
        
        const payload = {
            productId: p.id,
            name: p.name,
            origin: p.origin || 'Tidak diketahui',
            variety: p.variety || 'Mix',
            grade: p.grade || 'Komersial',
            weight: p.weight?.[0] || 0,
            farmer: 'Koperasi CoffeeChain',
            harvest: new Date().toISOString(),
            process: p.roast || 'Green Bean',
            roast: p.roast || 'Raw',
            cert: p.tags?.join(', ') || 'N/A',
            description: p.description || ''
        };

        try {
            const regRes = await fetch('http://localhost:3002/api/coffee-trace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const regData = await regRes.json();
            
            if (regData.success) {
                if (!regData.isPending) {
                    console.log(`   ✅ VERIFIED! Coffee ID: ${regData.data?.coffeeId || regData.coffeeId}`);
                    console.log(`   🔗 Hash: ${regData.data?.txSignature || regData.txSignature}`);
                    successCount++;
                } else {
                    console.log(`   ⚠️ Masih pending, periksa error backend.`);
                }
            } else {
                console.error(`   ❌ Gagal mendaftar: ${JSON.stringify(regData)}`);
            }
        } catch (err) {
            console.error(`   ❌ Error HTTP: ${err.message}`);
        }
        await delay(2000); // 2 detik jeda menghindari solana rate limit
    }

    console.log('\n=======================================');
    console.log('🎉 PROSES SELESAI 🎉');
    console.log(`Total produk berhasil On-Chain: ${successCount}`);
    console.log('=======================================');
}

run();
