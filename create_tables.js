/**
 * Step 1: Buat tabel di Supabase menggunakan SQL via REST API
 * Run: node create_tables.js
 */

const SUPABASE_URL = 'https://yjdauinnnilqjfwhytis.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZGF1aW5ubmlscWpmd2h5dGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjczMTEsImV4cCI6MjA4OTMwMzMxMX0.YCN-_xyGDBJ3tl-udY5d8m-thDX8BI41C344G11jvB4';

const SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'farmer',
  region TEXT,
  wallet TEXT,
  avatar TEXT,
  bio TEXT,
  location TEXT,
  phone TEXT,
  language TEXT DEFAULT 'Indonesia',
  photo_base64 TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT,
  grade TEXT,
  variety TEXT,
  roast TEXT,
  weight JSONB,
  price_per_unit JSONB,
  description TEXT,
  image TEXT,
  tags JSONB,
  stock INTEGER DEFAULT 0,
  rating NUMERIC(3,1) DEFAULT 4.5,
  sold INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  user_name TEXT,
  product_id TEXT,
  product_name TEXT,
  weight INTEGER,
  quantity INTEGER DEFAULT 1,
  total_price BIGINT,
  payment_method TEXT,
  virtual_account TEXT,
  tx_signature TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  hash TEXT,
  farmer TEXT,
  location TEXT,
  weight NUMERIC,
  variety TEXT,
  grade TEXT,
  amount BIGINT,
  status TEXT DEFAULT 'Pending',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  block TEXT,
  wallet_from TEXT,
  wallet_to TEXT,
  note TEXT
);

CREATE TABLE IF NOT EXISTS farmers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  altitude INTEGER,
  area NUMERIC,
  variety TEXT,
  certification TEXT,
  phone TEXT,
  join_date TEXT,
  active BOOLEAN DEFAULT true,
  wallet TEXT,
  total_harvest NUMERIC DEFAULT 0,
  last_harvest TEXT
);

CREATE TABLE IF NOT EXISTS market (
  id TEXT PRIMARY KEY,
  variety TEXT NOT NULL,
  price_per_kg BIGINT,
  change_percent NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  type TEXT,
  contact TEXT,
  capacity BIGINT,
  description TEXT,
  rating NUMERIC(3,1),
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
`;

async function createTables() {
    console.log('🔧 Creating Supabase tables via SQL...');
    
    // Supabase SQL API endpoint
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({ query: SQL }),
    });
    
    if (!res.ok) {
        const text = await res.text();
        console.log('Direct SQL not available, trying pg REST:', res.status);
        console.log(text.slice(0, 300));
        
        // Try alternative: use supabase-js style table creation via management API
        return false;
    }
    
    console.log('✅ Tables created!');
    return true;
}

createTables().then(ok => {
    if (!ok) {
        console.log('\n📋 INSTRUCTIONS:');
        console.log('Buka https://supabase.com/dashboard/project/yjdauinnnilqjfwhytis/sql/new');
        console.log('Copy isi file supabase_schema.sql dan jalankan di SQL Editor Supabase');
        console.log('Kemudian jalankan: node migrate_to_supabase.js');
    }
});
