const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadDatabaseUrl() {
    const envPath = path.join(process.cwd(), '.env.production.local');
    const values = Object.fromEntries(fs.readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .filter(value => /^(DATABASE_URL|DIRECT_URL)=/.test(value))
        .map(value => {
            const [key, ...rest] = value.split('=');
            return [key, rest.join('=').trim().replace(/^"|"$/g, '')];
        }));
    const candidates = [process.env.DATABASE_URL, process.env.DIRECT_URL, process.env.SUPABASE_DB_URL, values.DIRECT_URL, values.DATABASE_URL]
        .filter(Boolean);
    const reachableCandidate = candidates.find(value => {
        try {
            const hostname = new URL(value).hostname;
            return hostname !== 'localhost' && hostname !== '127.0.0.1';
        } catch {
            return false;
        }
    });
    if (reachableCandidate) return reachableCandidate;

    throw new Error('DATABASE_URL atau DIRECT_URL Supabase tidak ditemukan');
}

async function main() {
    const sql = fs.readFileSync(path.join(process.cwd(), 'supabase_ticket_ipfs_migration.sql'), 'utf8');
    const client = new Client({
        connectionString: loadDatabaseUrl(),
        ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    try {
        await client.query(sql);
        const { rows } = await client.query(`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename IN ('contact_messages', 'ipfs_assets')
            ORDER BY tablename
        `);
        console.log(`Migrasi selesai: ${rows.map(row => row.tablename).join(', ')}`);
    } finally {
        await client.end();
    }
}

main().catch(error => {
    const details = [error.name, error.code, error.message, ...(error.errors || []).map(item => item.message || item.code)]
        .filter(Boolean)
        .join(' | ');
    console.error(`Migrasi gagal: ${details || 'error koneksi tanpa detail'}`);
    process.exit(1);
});
