// One-time migration endpoint — run once via GET /api/migrate
// DELETE this file after running!
export const runtime = 'nodejs';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    const results = [];

    const migrations = [
        // PRODUCTS
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by      TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by_name TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_by_role TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS submitted_at      TIMESTAMPTZ DEFAULT NOW()`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'published'`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by       TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_by_name  TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS rejected_reason   TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS coffee_id         TEXT`,
        `ALTER TABLE products ADD COLUMN IF NOT EXISTS payment_wallet    TEXT`,
        // TRANSACTIONS
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type         TEXT DEFAULT 'transfer'`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS farmer_id    TEXT`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product_id   TEXT`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product_name TEXT`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS approved_by  TEXT`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW()`,
        // COFFEE_TRACES
        `ALTER TABLE coffee_traces ADD COLUMN IF NOT EXISTS product_id    TEXT`,
        `ALTER TABLE coffee_traces ADD COLUMN IF NOT EXISTS payment_wallet TEXT`,
        `ALTER TABLE coffee_traces ADD COLUMN IF NOT EXISTS explorer_url   TEXT`,
        // INDEXES
        `CREATE INDEX IF NOT EXISTS idx_products_status         ON products(status)`,
        `CREATE INDEX IF NOT EXISTS idx_products_coffee_id      ON products(coffee_id)`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_type       ON transactions(type)`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id)`,
        `CREATE INDEX IF NOT EXISTS idx_coffee_traces_product_id ON coffee_traces(product_id)`,
    ];

    for (const sql of migrations) {
        try {
            const { error } = await supabaseAdmin.rpc('exec_sql', { query: sql }).single();
            results.push({ sql: sql.slice(0, 60), ok: !error, error: error?.message });
        } catch (e) {
            results.push({ sql: sql.slice(0, 60), ok: false, error: e.message });
        }
    }

    const allOk = results.every(r => r.ok);
    return Response.json({ success: allOk, results });
}
