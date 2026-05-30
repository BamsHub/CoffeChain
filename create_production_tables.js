const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error('Set DATABASE_URL or SUPABASE_DB_URL before running this script.');
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  origin text,
  variety text,
  grade text,
  weight_kg numeric,
  farmer_id text,
  farmer_name text,
  current_stage integer DEFAULT 1,
  coffee_id text,
  product_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS production_stage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES production_batches(id) ON DELETE CASCADE,
  stage integer NOT NULL,
  stage_name text,
  data jsonb,
  photo_url text,
  tx_signature text,
  explorer_url text,
  logged_by text,
  logged_by_name text,
  created_at timestamptz DEFAULT now()
);
`;

client.connect()
    .then(() => client.query(sql))
    .then(() => { console.log('Tables created OK'); client.end(); })
    .catch(e => { console.error('Error:', e.message); client.end(); });
