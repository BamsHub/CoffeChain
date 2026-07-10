-- ================================================================
-- CoffeeChain — Contact Messages Table
-- Jalankan di Supabase SQL Editor (Dashboard > SQL Editor)
-- ================================================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT,
  name TEXT,
  phone TEXT,
  category TEXT NOT NULL,
  urgency TEXT DEFAULT 'normal',
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  admin_notes TEXT,
  replied_at TIMESTAMPTZ,
  replied_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk filter status dan kategori
CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_category ON contact_messages(category);
CREATE INDEX IF NOT EXISTS idx_contact_created ON contact_messages(created_at DESC);

-- RLS (Row Level Security) - disable agar API bisa akses
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations via service role (backend)
DROP POLICY IF EXISTS "service_role_all" ON contact_messages;
DROP POLICY IF EXISTS "contact_messages_service_role_all" ON contact_messages;
CREATE POLICY "contact_messages_service_role_all" ON contact_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE contact_messages FROM anon, authenticated;
GRANT ALL ON TABLE contact_messages TO service_role;
