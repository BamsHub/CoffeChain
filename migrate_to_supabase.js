/**
 * CoffeeChain Full Migration Script
 * Cara kerja: 
 * 1. Buat function exec_sql di Supabase via anon REST (jika ada akses)
 * 2. Langsung insert data ke setiap tabel
 * 3. Jika tabel tidak ada, tampilkan SQL untuk buat manual
 */

const SUPABASE_URL = 'https://yjdauinnnilqjfwhytis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZGF1aW5ubmlscWpmd2h5dGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjczMTEsImV4cCI6MjA4OTMwMzMxMX0.YCN-_xyGDBJ3tl-udY5d8m-thDX8BI41C344G11jvB4';

const fs = require('fs');
const path = require('path');

const HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'apikey': SUPABASE_KEY,
    'Prefer': 'resolution=merge-duplicates,return=minimal',
};

function readJSON(filename) {
    const p = path.join(__dirname, 'data', filename);
    if (!fs.existsSync(p)) { console.log(`⚠️ ${filename} not found`); return []; }
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return raw.items || [];
}

const sanitize = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === undefined ? null : v]));

async function upsert(table, rows) {
    if (!rows || rows.length === 0) { console.log(`  ⏭️ [${table}] no data`); return true; }
    
    // Pastikan semua object memiliki keys yang sama persis untuk bulk insert (ubah undefined jadi null)
    const sanitizedRows = rows.map(sanitize);

    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(sanitizedRows),
    });
    const body = await res.text();
    if (!res.ok) {
        if (body.includes('relation') && body.includes('does not exist')) {
            console.error(`  ❌ [${table}] Tabel belum ada! Jalankan SQL schema dulu.`);
            return false;
        }
        console.error(`  ❌ [${table}] ${res.status}: ${body.slice(0, 200)}`);
        return false;
    }
    console.log(`  ✅ [${table}] ${rows.length} rows`);
    return true;
}

async function checkTableExists(table) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?limit=1`;
    const res = await fetch(url, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    return res.ok;
}

async function main() {
    console.log('\n🚀 CoffeeChain → Supabase Migration\n' + '='.repeat(40));

    // Cek koneksi dulu
    console.log('\n🔍 Checking Supabase connection...');
    const tablesOk = {};
    for (const t of ['users', 'products', 'orders', 'transactions', 'farmers', 'market', 'markets']) {
        tablesOk[t] = await checkTableExists(t);
        console.log(`  ${tablesOk[t] ? '✅' : '❌'} [${t}] ${tablesOk[t] ? 'exists' : 'NOT FOUND'}`);
    }

    const missingTables = Object.entries(tablesOk).filter(([,v]) => !v).map(([k]) => k);
    if (missingTables.length > 0) {
        console.log(`\n❗ Tables missing: ${missingTables.join(', ')}`);
        console.log('📋 Buka Supabase SQL Editor dan jalankan supabase_schema.sql');
        console.log('   URL: https://supabase.com/dashboard/project/yjdauinnnilqjfwhytis/sql/new');
        return;
    }

    console.log('\n📦 Migrating data...\n');

    // USERS
    console.log('👤 Users:');
    const users = readJSON('users.json').map(u => ({
        id: u.id, name: u.name, email: u.email, password: u.password,
        role: u.role || 'farmer', region: u.region, wallet: u.wallet,
        avatar: u.avatar, bio: u.bio, location: u.location, phone: u.phone,
        language: u.language || 'Indonesia', photo_base64: u.photoBase64,
        active: u.active !== false,
        created_at: u.createdAt || new Date().toISOString(),
        last_login: u.lastLogin,
    }));
    await upsert('users', users);

    // PRODUCTS
    console.log('☕ Products:');
    const products = readJSON('products.json').map(p => ({
        id: p.id, name: p.name, origin: p.origin, grade: p.grade,
        variety: p.variety, roast: p.roast,
        weight: p.weight, price_per_unit: p.pricePerUnit,
        description: p.description, image: p.image, tags: p.tags,
        stock: p.stock || 0, rating: p.rating || 4.5, sold: p.sold || 0,
    }));
    await upsert('products', products);

    // ORDERS
    console.log('📦 Orders:');
    const orders = readJSON('orders.json').map(o => ({
        id: o.id, order_id: o.orderId, user_id: o.userId || 'guest',
        user_name: o.userName || 'Guest', product_id: o.productId,
        product_name: o.productName, weight: Number(o.weight) || 0,
        quantity: o.quantity || 1, total_price: o.totalPrice || 0,
        payment_method: o.paymentMethod, virtual_account: o.virtualAccount,
        tx_signature: o.txSignature, status: o.status || 'pending',
        created_at: o.createdAt, expires_at: o.expiresAt, paid_at: o.paidAt,
    }));
    await upsert('orders', orders);

    // TRANSACTIONS
    console.log('💸 Transactions:');
    const txs = readJSON('transactions.json').map(t => ({
        id: t.id, hash: t.hash, farmer: t.farmer, location: t.location,
        weight: Number(t.weight) || 0, variety: t.variety, grade: t.grade,
        amount: Number(t.amount) || 0, status: t.status || 'Pending',
        timestamp: t.timestamp, block: t.block,
        wallet_from: t.walletFrom, wallet_to: t.walletTo, note: t.note,
    }));
    await upsert('transactions', txs);

    // FARMERS
    console.log('🌱 Farmers:');
    const farmers = readJSON('farmers.json').map(f => ({
        id: f.id, name: f.name, location: f.location,
        altitude: f.altitude ? Number(f.altitude) : null,
        area: f.area ? Number(f.area) : null,
        variety: f.variety, certification: f.certification,
        phone: f.phone, join_date: f.joinDate, active: f.active !== false,
        wallet: f.wallet,
        total_harvest: f.totalHarvest ? Number(f.totalHarvest) : 0,
        last_harvest: f.lastHarvest,
    }));
    await upsert('farmers', farmers);

    // MARKET
    console.log('📈 Market prices:');
    const rawMarket = readJSON('market.json');
    if (rawMarket.length > 0) {
        const market = rawMarket.map((m, i) => ({
            id: m.id || `mkt-${i+1}`,
            variety: m.variety || m.name || `Variety ${i+1}`,
            price_per_kg: m.pricePerKg || m.price || 0,
            change_percent: m.changePercent || m.change || 0,
            updated_at: m.updatedAt || new Date().toISOString(),
        }));
        await upsert('market', market);
    }

    // MARKETS
    console.log('🏪 Markets:');
    const rawMarkets = readJSON('markets.json');
    if (rawMarkets.length > 0) {
        const markets = rawMarkets.map(m => ({
            id: m.id, name: m.name, location: m.location, type: m.type,
            contact: m.contact,
            capacity: m.capacity ? Number(m.capacity) : null,
            description: m.description,
            rating: m.rating ? Number(m.rating) : null,
            active: m.active !== false,
        }));
        await upsert('markets', markets);
    }

    console.log('\n' + '='.repeat(40));
    console.log('✨ Migration complete!\n');
}

main().catch(e => {
    console.error('Fatal:', e.message);
    process.exit(1);
});
