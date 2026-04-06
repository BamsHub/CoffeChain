-- ================================================================
-- CoffeeChain Database Schema for Supabase
-- Project: yjdauinnnilqjfwhytis
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS ──────────────────────────────────────────────────────
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

-- ── PRODUCTS ───────────────────────────────────────────────────
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
  submitted_by TEXT,          -- user.id petani yang mengajukan produk ini
  submitted_by_name TEXT,
  submitted_by_role TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'published',   -- pending | published | rejected
  approved_by TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jika tabel sudah ada, tambahkan kolom submitted_by secara aman:
ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by      TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by_role TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_at      TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'published';
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by       TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by_name  TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejected_reason   TEXT;

-- Index agar query petani cepat
CREATE INDEX IF NOT EXISTS idx_products_submitted_by ON products(submitted_by);

-- ── ORDERS ─────────────────────────────────────────────────────
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

-- ── TRANSACTIONS ───────────────────────────────────────────────
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

-- ── FARMERS ────────────────────────────────────────────────────
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

-- ── MARKET (Harga Pasar) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS market (
  id TEXT PRIMARY KEY,
  variety TEXT NOT NULL,
  price_per_kg BIGINT,
  change_percent NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MARKETS (Pasar Kopi) ───────────────────────────────────────
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

-- ── NOTIFICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SESSIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- ── RLS POLICIES (Row Level Security) ─────────────────────────
-- Mengaktifkan RLS di semua tabel
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE market ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: anon bisa baca semua (untuk dev mode)
CREATE POLICY "Allow anon read all" ON users FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON products FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON farmers FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON market FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON markets FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON sessions FOR SELECT USING (true);

-- Policy: anon bisa insert/update/delete (untuk dev mode)
CREATE POLICY "Allow anon write all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON farmers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON market FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON markets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- ================================================================
-- SALES TABLE — Per-Farmer Sales Dashboard
-- Setiap petani hanya bisa melihat/mengelola data penjualannya sendiri.
-- Database dipisah dari orders (landing page) agar tidak tabrakan.
-- ================================================================

CREATE TABLE IF NOT EXISTS sales (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL,            -- references users.id (custom auth)
  product_name TEXT NOT NULL,
  variety     TEXT DEFAULT 'Arabika',
  grade       TEXT DEFAULT 'Grade 1',
  quantity_kg NUMERIC(10,2) DEFAULT 0,  -- berat yang dijual (kg)
  price_per_kg BIGINT DEFAULT 0,        -- harga per kg (Rp)
  total_price BIGINT NOT NULL,          -- quantity_kg * price_per_kg
  buyer_name  TEXT,
  payment_method TEXT DEFAULT 'transfer',  -- transfer | cash | qr
  status      TEXT DEFAULT 'pending',   -- pending | paid | cancelled
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index: query petani tertentu lebih cepat
CREATE INDEX IF NOT EXISTS idx_sales_user_id   ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);

-- ── RLS untuk tabel sales ──────────────────────────────────────
-- Row Level Security: setiap petani HANYA melihat baris miliknya.
-- Catatan: RLS ini berlaku saat pakai Supabase Auth (auth.uid()).
-- Aplikasi ini juga filter di sisi API route menggunakan token custom.
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Petani baca data sendiri saja
CREATE POLICY "Farmer reads own sales"
  ON sales FOR SELECT
  USING (auth.uid()::text = user_id);

-- Petani hanya bisa insert baris untuk dirinya sendiri
CREATE POLICY "Farmer inserts own sales"
  ON sales FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Petani update data sendiri
CREATE POLICY "Farmer updates own sales"
  ON sales FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Petani hapus data sendiri (opsional)
CREATE POLICY "Farmer deletes own sales"
  ON sales FOR DELETE
  USING (auth.uid()::text = user_id);

-- Service role (admin) bisa akses semua (digunakan oleh API Next.js)
CREATE POLICY "Service role full access on sales"
  ON sales FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- COFFEE TRACES — Blockchain Traceability Records
-- Setiap kopi yang diregistrasi tercatat on-chain via Solana Memo
-- ================================================================

CREATE TABLE IF NOT EXISTS coffee_traces (
  id TEXT PRIMARY KEY,
  coffee_id TEXT UNIQUE NOT NULL,      -- "CF-XXXX" unique ID kopi
  name TEXT NOT NULL,
  origin TEXT,
  variety TEXT,
  grade TEXT,
  weight_kg NUMERIC,
  farmer_name TEXT,
  farmer_id TEXT,
  harvest_date TEXT,
  process_method TEXT,                 -- washed, natural, honey
  roast_level TEXT,
  certification TEXT,
  description TEXT,
  tx_signature TEXT,                   -- Solana Memo TX hash
  explorer_url TEXT,
  status TEXT DEFAULT 'registered',    -- registered | verified | sold
  registered_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_coffee_traces_coffee_id ON coffee_traces(coffee_id);
CREATE INDEX IF NOT EXISTS idx_coffee_traces_status ON coffee_traces(status);

-- RLS
ALTER TABLE coffee_traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read coffee_traces" ON coffee_traces FOR SELECT USING (true);
CREATE POLICY "Allow all write coffee_traces" ON coffee_traces FOR ALL USING (true) WITH CHECK (true);

-- Tambah kolom coffee_id ke products (untuk link trace)
ALTER TABLE products ADD COLUMN IF NOT EXISTS coffee_id TEXT;
