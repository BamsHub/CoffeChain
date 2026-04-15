-- ================================================================
-- CoffeeChain — Schema Migration (Run in Supabase SQL Editor)
-- Adds all missing columns to existing tables
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ================================================================

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
CREATE INDEX IF NOT EXISTS idx_coffee_traces_product_id ON coffee_traces(product_id);

-- Refresh Supabase schema cache
NOTIFY pgrst, 'reload schema';
