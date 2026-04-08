import fs from 'fs';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log('🚀 Memulai pendaftaran otomatis ke Blockchain Solana...');
    
    try {
        // Ambil semua produk dari local API
        const res = await fetch('http://localhost:3002/api/public/products?limit=100');
        const data = await res.json();
        
        if (!data.success) {
            throw new Error('Gagal memuat produk dari API lokal');
        }

        const products = data.data;
        console.log(`📦 Ditemukan ${products.length} produk di database.`);

        let successCount = 0;
        let pendingCount = 0;
        let skipCount = 0;

        for (const p of products) {
            console.log(`\n⏳ Memproses: ${p.name} (${p.id})...`);
            
            if (p.coffeeId) {
                console.log(`   ⏭️ Sudah memiliki Coffee ID: ${p.coffeeId}. Melewati...`);
                skipCount++;
                continue;
            }

            // Daftarkan ke trace API
            const payload = {
                productId: p.id,
                name: p.name,
                origin: p.origin || 'Tidak diketahui',
                variety: p.variety || 'Mix',
                grade: p.grade || 'Komersial',
                weight: p.weight?.[0] || 0,
                farmer: 'Koperasi CoffeeChain', // fallback
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
                    const status = regData.isPending ? 'PENDING (SOL Kosong)' : 'VERIFIED (On-Chain)';
                    console.log(`   ✅ Berhasil terdaftar! Coffee ID: ${regData.data.coffeeId}`);
                    console.log(`   🔗 Hash / Status: ${regData.isPending ? 'Pending' : regData.data.txSignature}`);
                    
                    if (regData.isPending) pendingCount++;
                    else successCount++;
                } else {
                    console.error(`   ❌ Gagal mendaftar: ${regData.message}`);
                }
            } catch (err) {
                console.error(`   ❌ Error HTTP: ${err.message}`);
            }
            
            // Beri jeda 1 detik per produk agar tidak spam API
            await delay(1000);
        }

        console.log('\n=======================================');
        console.log('🎉 PROSES SELESAI 🎉');
        console.log(`Total produk: ${products.length}`);
        console.log(`Dilewati (sudah ada API ID): ${skipCount}`);
        console.log(`Berhasil dikirim ke backend (Pending Solana): ${pendingCount}`);
        console.log(`Berhasil diverifikasi di Blockchain: ${successCount}`);
        console.log('=======================================');

    } catch (e) {
        console.error('Terjadi kesalahan fatal:', e.message);
    }
}

run();
