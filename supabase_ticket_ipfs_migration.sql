-- CoffeeChain: ticketing and owner-scoped IPFS assets
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT,
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
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS sender_id TEXT;
CREATE INDEX IF NOT EXISTS idx_contact_messages_sender ON contact_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_category ON contact_messages(category);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);

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
ALTER TABLE ipfs_assets DROP CONSTRAINT IF EXISTS ipfs_assets_cid_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ipfs_assets_owner_cid ON ipfs_assets(owner_id, cid);
CREATE INDEX IF NOT EXISTS idx_ipfs_assets_owner ON ipfs_assets(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ipfs_assets_batch ON ipfs_assets(batch_id);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipfs_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON contact_messages;
DROP POLICY IF EXISTS "contact_messages_service_role_all" ON contact_messages;
DROP POLICY IF EXISTS "ipfs_assets_service_role_all" ON ipfs_assets;
CREATE POLICY "contact_messages_service_role_all" ON contact_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "ipfs_assets_service_role_all" ON ipfs_assets FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON TABLE contact_messages FROM anon, authenticated;
REVOKE ALL ON TABLE ipfs_assets FROM anon, authenticated;
GRANT ALL ON TABLE contact_messages TO service_role;
GRANT ALL ON TABLE ipfs_assets TO service_role;
NOTIFY pgrst, 'reload schema';
