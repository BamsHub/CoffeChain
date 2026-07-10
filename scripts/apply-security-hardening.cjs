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
    const connectionString = [process.env.DATABASE_URL, process.env.DIRECT_URL, process.env.SUPABASE_DB_URL, values.DIRECT_URL, values.DATABASE_URL]
        .find(Boolean);
    if (!connectionString) throw new Error('DATABASE_URL atau DIRECT_URL Supabase tidak ditemukan');
    return connectionString;
}

async function main() {
    const sql = fs.readFileSync(path.join(process.cwd(), 'supabase_security_hardening.sql'), 'utf8');
    const client = new Client({ connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
        await client.query(sql);
        console.log('Database security hardening selesai.');
    } finally {
        await client.end();
    }
}

main().catch(error => {
    console.error(`Security hardening gagal: ${error.code || error.name}: ${error.message}`);
    process.exit(1);
});
