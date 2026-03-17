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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
