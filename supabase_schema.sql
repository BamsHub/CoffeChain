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
  submitted_by TEXT,
  submitted_by_name TEXT,
  submitted_by_role TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'published',
  approved_by TEXT,
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  coffee_id TEXT,               -- Link ke coffee_traces.coffee_id
  payment_wallet TEXT,          -- Wallet petani untuk routing pembayaran
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe ALTER TABLE (run if table already exists)
ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by      TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by_role TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_at      TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'published';
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by       TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by_name  TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rejected_reason   TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS coffee_id         TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS payment_wallet    TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_submitted_by ON products(submitted_by);
CREATE INDEX IF NOT EXISTS idx_products_coffee_id    ON products(coffee_id);
CREATE INDEX IF NOT EXISTS idx_products_status       ON products(status);

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
  type TEXT DEFAULT 'transfer',         -- transfer | product_approval | blockchain_verify
  farmer TEXT,
  farmer_id TEXT,
  location TEXT,
  weight NUMERIC,
  variety TEXT,
  grade TEXT,
  amount BIGINT DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  block TEXT,
  wallet_from TEXT,
  wallet_to TEXT,
  note TEXT,
  product_id TEXT,                       -- FK ke products.id
  product_name TEXT,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe ALTER for existing transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type         TEXT DEFAULT 'transfer';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS farmer_id    TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product_id   TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS approved_by  TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_transactions_type       ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_farmer_id  ON transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);

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

-- ── RLS POLICIES ────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE market ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (avoids duplicate errors)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow anon read all" ON users;
  DROP POLICY IF EXISTS "Allow anon write all" ON users;
  DROP POLICY IF EXISTS "Allow anon read all" ON products;
  DROP POLICY IF EXISTS "Allow anon write all" ON products;
  DROP POLICY IF EXISTS "Allow anon read all" ON orders;
  DROP POLICY IF EXISTS "Allow anon write all" ON orders;
  DROP POLICY IF EXISTS "Allow anon read all" ON transactions;
  DROP POLICY IF EXISTS "Allow anon write all" ON transactions;
  DROP POLICY IF EXISTS "Allow anon read all" ON farmers;
  DROP POLICY IF EXISTS "Allow anon write all" ON farmers;
  DROP POLICY IF EXISTS "Allow anon read all" ON market;
  DROP POLICY IF EXISTS "Allow anon write all" ON market;
  DROP POLICY IF EXISTS "Allow anon read all" ON markets;
  DROP POLICY IF EXISTS "Allow anon write all" ON markets;
  DROP POLICY IF EXISTS "Allow anon read all" ON notifications;
  DROP POLICY IF EXISTS "Allow anon write all" ON notifications;
  DROP POLICY IF EXISTS "Allow anon read all" ON sessions;
  DROP POLICY IF EXISTS "Allow anon write all" ON sessions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Read policies (anyone can read)
CREATE POLICY "Allow anon read all" ON users      FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON products   FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON orders     FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON farmers    FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON market     FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON markets    FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow anon read all" ON sessions   FOR SELECT USING (true);

-- Write policies (service role / anon can write — for dev mode)
CREATE POLICY "Allow anon write all" ON users      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON products   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON orders     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON farmers    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON market     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON markets    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon write all" ON sessions   FOR ALL USING (true) WITH CHECK (true);

-- ── SALES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variety     TEXT DEFAULT 'Arabika',
  grade       TEXT DEFAULT 'Grade 1',
  quantity_kg NUMERIC(10,2) DEFAULT 0,
  price_per_kg BIGINT DEFAULT 0,
  total_price BIGINT NOT NULL,
  buyer_name  TEXT,
  payment_method TEXT DEFAULT 'transfer',
  status      TEXT DEFAULT 'pending',
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_user_id    ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Farmer reads own sales" ON sales;
  DROP POLICY IF EXISTS "Farmer inserts own sales" ON sales;
  DROP POLICY IF EXISTS "Farmer updates own sales" ON sales;
  DROP POLICY IF EXISTS "Farmer deletes own sales" ON sales;
  DROP POLICY IF EXISTS "Service role full access on sales" ON sales;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow service role full access" ON sales FOR ALL USING (true) WITH CHECK (true);

-- ── COFFEE TRACES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coffee_traces (
  id TEXT PRIMARY KEY,
  coffee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  origin TEXT,
  variety TEXT,
  grade TEXT,
  weight_kg NUMERIC,
  farmer_name TEXT,
  farmer_id TEXT,
  harvest_date TEXT,
  process_method TEXT,
  roast_level TEXT,
  certification TEXT,
  description TEXT,
  tx_signature TEXT,
  explorer_url TEXT,
  status TEXT DEFAULT 'registered',
  registered_by TEXT,
  product_id TEXT,               -- FK ke products.id
  payment_wallet TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE coffee_traces ADD COLUMN IF NOT EXISTS product_id    TEXT;
ALTER TABLE coffee_traces ADD COLUMN IF NOT EXISTS payment_wallet TEXT;
ALTER TABLE coffee_traces ADD COLUMN IF NOT EXISTS explorer_url  TEXT;

CREATE INDEX IF NOT EXISTS idx_coffee_traces_coffee_id  ON coffee_traces(coffee_id);
CREATE INDEX IF NOT EXISTS idx_coffee_traces_product_id ON coffee_traces(product_id);
CREATE INDEX IF NOT EXISTS idx_coffee_traces_status     ON coffee_traces(status);

ALTER TABLE coffee_traces ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all read coffee_traces"  ON coffee_traces;
  DROP POLICY IF EXISTS "Allow all write coffee_traces" ON coffee_traces;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow all read coffee_traces"  ON coffee_traces FOR SELECT USING (true);
CREATE POLICY "Allow all write coffee_traces" ON coffee_traces FOR ALL   USING (true) WITH CHECK (true);
