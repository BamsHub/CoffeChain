/**
 * Script untuk membuat skema tabel via PostgreSQL connection string
 * dan langsung memanggil script migrasi data REST API.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CONNECTION_STRING = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function runSQLAndMigrate() {
    if (!CONNECTION_STRING) {
        throw new Error('Set DATABASE_URL atau SUPABASE_DB_URL sebelum menjalankan migrasi.');
    }
    console.log('🔌 Connecting to Supabase PostgreSQL db...');
    const client = new Client({
        connectionString: CONNECTION_STRING,
    });

    try {
        await client.connect();
        console.log('✅ Connected successfully!');

        // Membaca file SQL schema
        const sqlPath = path.join(__dirname, 'supabase_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📜 Executing schema.sql to create tables and RLS policies...');
        await client.query(sql);
        console.log('✅ Base schema successfully applied!\n');

    } catch (err) {
        console.error('❌ Error executing SQL:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }

    console.log('====================================');
    console.log('🚀 Proceeding to data migration...');
    
    // Jalankan script migrate data (yang sebelumnya sudah ditambahkan logic retry error 404)
    const migrationProc = spawn('node', ['migrate_to_supabase.js'], { stdio: 'inherit' });
    
    migrationProc.on('close', (code) => {
        if (code === 0) {
            console.log('\n🎉 ALL DONE! Migrasi database + data sukses total!');
        } else {
            console.error('\n⚠️ Data migration process exited with code', code);
        }
    });
}

runSQLAndMigrate();
