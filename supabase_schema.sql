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
  email_verified BOOLEAN DEFAULT true,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS verification_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_email ON verification_tokens(email);

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
  stock_per_unit JSONB,
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
  subtotal_price BIGINT,
  ppn_rate NUMERIC(6,5) DEFAULT 0,
  ppn_amount BIGINT DEFAULT 0,
  solana_trace_fee BIGINT DEFAULT 0,
  payment_method TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  sol_amount NUMERIC,
  payment_currency TEXT DEFAULT 'IDR',
  wallet_address TEXT,
  coffee_id TEXT,
  source TEXT,
  recipient_name TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_province TEXT,
  shipping_postal TEXT,
  shipping_phone TEXT,
  virtual_account TEXT,
  tx_signature TEXT,
  solana_network_fee_lamports BIGINT,
  solana_trace_status TEXT DEFAULT 'pending',
  solana_trace_error TEXT,
  solana_trace_lock_id TEXT,
  solana_trace_started_at TIMESTAMPTZ,
  solana_traced_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_email       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_phone       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sol_amount        NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_price    BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ppn_rate          NUMERIC(6,5) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ppn_amount        BIGINT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS solana_trace_fee  BIGINT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_currency  TEXT DEFAULT 'IDR';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wallet_address    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coffee_id         TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source            TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address  TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_province TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_postal   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS solana_network_fee_lamports BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS solana_trace_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS solana_trace_error TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS solana_trace_lock_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS solana_trace_started_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS solana_traced_at TIMESTAMPTZ;
UPDATE orders
SET
  subtotal_price = COALESCE(subtotal_price, total_price),
  solana_trace_status = CASE
    WHEN tx_signature IS NOT NULL THEN 'confirmed'
    ELSE COALESCE(solana_trace_status, 'pending')
  END
WHERE subtotal_price IS NULL OR solana_trace_status IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_coffee_id ON orders(coffee_id);

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

-- DASHBOARD SETTINGS
CREATE TABLE IF NOT EXISTS dashboard_settings (
  id TEXT PRIMARY KEY,
  daily_transaction_target INTEGER NOT NULL DEFAULT 10 CHECK (daily_transaction_target >= 0),
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO dashboard_settings (id, daily_transaction_target)
VALUES ('default', 10)
ON CONFLICT (id) DO NOTHING;

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

-- â”€â”€ CONTACT TICKETS â”€â”€
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  category TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'high', 'urgent')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed')),
  admin_notes TEXT,
  replied_at TIMESTAMPTZ,
  replied_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_sender ON contact_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_category ON contact_messages(category);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);

-- â”€â”€ IPFS ASSET OWNERSHIP â”€â”€

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
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "contact_messages_service_role_all" ON contact_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE contact_messages FROM anon, authenticated;
GRANT ALL ON TABLE contact_messages TO service_role;

-- PRODUCTION PIPELINE
CREATE TABLE IF NOT EXISTS production_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  origin TEXT,
  variety TEXT,
  grade TEXT,
  weight_kg NUMERIC,
  farmer_id TEXT,
  farmer_name TEXT,
  current_stage INTEGER DEFAULT 1,
  coffee_id TEXT,
  product_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_stage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES production_batches(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  stage_name TEXT,
  data JSONB,
  photo_url TEXT,
  tx_signature TEXT,
  explorer_url TEXT,
  logged_by TEXT,
  logged_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ipfs_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id TEXT NOT NULL,
  owner_role TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  batch_id UUID REFERENCES production_batches(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 6),
  cid TEXT NOT NULL,
  ipfs_uri TEXT NOT NULL,
  gateway_url TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  pinned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ipfs_assets_owner_cid ON ipfs_assets(owner_id, cid);
CREATE INDEX IF NOT EXISTS idx_ipfs_assets_owner ON ipfs_assets(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ipfs_assets_batch ON ipfs_assets(batch_id);

CREATE INDEX IF NOT EXISTS idx_production_batches_farmer_id ON production_batches(farmer_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_stage     ON production_batches(current_stage);
CREATE INDEX IF NOT EXISTS idx_production_stage_logs_batch  ON production_stage_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_production_stage_logs_stage  ON production_stage_logs(stage);

ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_stage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipfs_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification_tokens_service_role_all" ON verification_tokens;
DROP POLICY IF EXISTS "production_batches_service_role_all" ON production_batches;
DROP POLICY IF EXISTS "production_stage_logs_service_role_all" ON production_stage_logs;
DROP POLICY IF EXISTS "ipfs_assets_service_role_all" ON ipfs_assets;

CREATE POLICY "verification_tokens_service_role_all" ON verification_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "production_batches_service_role_all" ON production_batches FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "production_stage_logs_service_role_all" ON production_stage_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ipfs_assets_service_role_all" ON ipfs_assets FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE ipfs_assets FROM anon, authenticated;
GRANT ALL ON TABLE ipfs_assets TO service_role;

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
