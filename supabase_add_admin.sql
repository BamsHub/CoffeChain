-- ================================================================
-- Tambahkan Akun Admin ke Supabase
-- Jalankan di Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================================
-- Email: admin@coffeechain.io
-- Password: admin123
-- Role: admin

INSERT INTO users (id, name, email, password, role, region, avatar, active, email_verified, created_at)
VALUES (
  'user-admin',
  'Admin CoffeeChain',
  'admin@coffeechain.io',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'admin',
  'Jakarta',
  'AC',
  true,
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  active = EXCLUDED.active,
  email_verified = EXCLUDED.email_verified;
