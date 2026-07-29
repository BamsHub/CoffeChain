-- CoffeeChain farmer identity-verification workflow
-- Run once in Supabase Dashboard > SQL Editor.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS farmer_verification_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS farmer_verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS farmer_verified_by TEXT,
    ADD COLUMN IF NOT EXISTS farmer_verified_by_name TEXT,
    ADD COLUMN IF NOT EXISTS farmer_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS farmer_category TEXT DEFAULT 'legacy',
    ADD COLUMN IF NOT EXISTS farmer_community_name TEXT,
    ADD COLUMN IF NOT EXISTS province TEXT,
    ADD COLUMN IF NOT EXISTS regency TEXT,
    ADD COLUMN IF NOT EXISTS district TEXT,
    ADD COLUMN IF NOT EXISTS village TEXT,
    ADD COLUMN IF NOT EXISTS farmer_declaration_at TIMESTAMPTZ;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_farmer_verification_status_check;

ALTER TABLE users
    ADD CONSTRAINT users_farmer_verification_status_check
    CHECK (farmer_verification_status IN ('pending', 'verified', 'rejected'));

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_farmer_category_check;

ALTER TABLE users
    ADD CONSTRAINT users_farmer_category_check
    CHECK (farmer_category IN ('legacy', 'individual', 'farmer_group', 'cooperative_member'));

-- Preserve existing active accounts. New farmer registrations are explicitly
-- created with status "pending" by the registration API.
UPDATE users
SET
    farmer_verification_status = 'verified',
    farmer_verified_at = COALESCE(farmer_verified_at, email_verified_at, created_at)
WHERE
    role = 'farmer'
    AND active = TRUE
    AND COALESCE(email_verified, TRUE) = TRUE
    AND (
        farmer_verification_status IS NULL
        OR farmer_verification_status = 'pending'
    );

UPDATE users
SET farmer_verification_status = 'verified'
WHERE role <> 'farmer' AND farmer_verification_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_users_farmer_verification_status
    ON users(farmer_verification_status)
    WHERE role = 'farmer';
