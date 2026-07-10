-- ================================================================
-- CoffeeChain — Schema Migration (Run in Supabase SQL Editor)
-- Adds all missing columns to existing tables
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PRODUCTS: Add missing columns
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

-- USERS: email verification columns used by custom register flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- VERIFICATION TOKENS: custom email verification flow
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

-- ORDERS: fields used by Midtrans checkout/status flow
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_email       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_phone       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sol_amount        NUMERIC;
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
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_coffee_id ON orders(coffee_id);

-- PRODUCTION PIPELINE: batch + proof-upload audit trail
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

CREATE INDEX IF NOT EXISTS idx_production_batches_farmer_id ON production_batches(farmer_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_stage     ON production_batches(current_stage);
CREATE INDEX IF NOT EXISTS idx_production_stage_logs_batch  ON production_stage_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_production_stage_logs_stage  ON production_stage_logs(stage);

-- TRANSACTIONS: Add missing columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type         TEXT DEFAULT 'transfer';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS farmer_id    TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product_id   TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS approved_by  TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();

-- COFFEE_TRACES: Add missing columns
ALTER TABLE coffee_traces ADD COLUMN IF NOT EXISTS product_id    TEXT;
ALTER TABLE coffee_traces ADD COLUMN IF NOT EXISTS payment_wallet TEXT;
ALTER TABLE coffee_traces ADD COLUMN IF NOT EXISTS explorer_url   TEXT;
ALTER TABLE coffee_traces ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT NOW();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_submitted_by  ON products(submitted_by);
CREATE INDEX IF NOT EXISTS idx_products_coffee_id     ON products(coffee_id);
CREATE INDEX IF NOT EXISTS idx_products_status        ON products(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);

-- DASHBOARD SETTINGS: target transaksi harian yang dipakai sebagai pembanding grafik
CREATE TABLE IF NOT EXISTS dashboard_settings (
  id TEXT PRIMARY KEY,
  daily_transaction_target INTEGER NOT NULL DEFAULT 10 CHECK (daily_transaction_target >= 0),
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO dashboard_settings (id, daily_transaction_target)
VALUES ('default', 10)
ON CONFLICT (id) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_coffee_traces_product_id ON coffee_traces(product_id);

ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_stage_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "verification_tokens_service_role_all" ON verification_tokens;
  DROP POLICY IF EXISTS "production_batches_service_role_all" ON production_batches;
  DROP POLICY IF EXISTS "production_stage_logs_service_role_all" ON production_stage_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "verification_tokens_service_role_all"
ON verification_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "production_batches_service_role_all"
ON production_batches
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "production_stage_logs_service_role_all"
ON production_stage_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT ALL ON TABLE verification_tokens TO service_role;
GRANT ALL ON TABLE production_batches TO service_role;
GRANT ALL ON TABLE production_stage_logs TO service_role;

-- Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';
