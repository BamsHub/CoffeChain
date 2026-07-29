-- ================================================================
-- CoffeeChain production pipeline RLS + reviewer visibility
--
-- Safe to run multiple times in Supabase SQL Editor.
--
-- Important architecture note:
-- - Browser writes remain blocked.
-- - Next.js Route Handlers use service_role and therefore MUST still verify
--   the CoffeeChain JWT, role, and row ownership.
-- - These authenticated SELECT policies are defense-in-depth for a future
--   Supabase Auth client. Authorization claims must come from trusted
--   app_metadata / a Custom Access Token Hook, never user_metadata.
-- ================================================================

BEGIN;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_stage_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.coffeechain_actor_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'app_user_id',
    auth.jwt() ->> 'app_user_id',
    auth.jwt() ->> 'userId',
    auth.uid()::TEXT
  )
$$;

CREATE OR REPLACE FUNCTION public.coffeechain_actor_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'user_role',
    auth.jwt() ->> 'user_role'
  )
$$;

REVOKE ALL ON FUNCTION public.coffeechain_actor_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.coffeechain_actor_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.coffeechain_actor_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.coffeechain_actor_role() TO authenticated, service_role;

DROP POLICY IF EXISTS "Allow anon read all" ON public.products;
DROP POLICY IF EXISTS "Allow anon write all" ON public.products;
DROP POLICY IF EXISTS "products_service_role_all" ON public.products;
DROP POLICY IF EXISTS "pipeline_products_authenticated_read" ON public.products;

DROP POLICY IF EXISTS "production_batches_service_role_all" ON public.production_batches;
DROP POLICY IF EXISTS "pipeline_batches_authenticated_read" ON public.production_batches;
DROP POLICY IF EXISTS "Allow anon read all" ON public.production_batches;
DROP POLICY IF EXISTS "Allow anon write all" ON public.production_batches;
DROP POLICY IF EXISTS "Allow all read production_batches" ON public.production_batches;
DROP POLICY IF EXISTS "Allow all write production_batches" ON public.production_batches;

DROP POLICY IF EXISTS "production_stage_logs_service_role_all" ON public.production_stage_logs;
DROP POLICY IF EXISTS "pipeline_stage_logs_authenticated_read" ON public.production_stage_logs;
DROP POLICY IF EXISTS "Allow anon read all" ON public.production_stage_logs;
DROP POLICY IF EXISTS "Allow anon write all" ON public.production_stage_logs;
DROP POLICY IF EXISTS "Allow all read production_stage_logs" ON public.production_stage_logs;
DROP POLICY IF EXISTS "Allow all write production_stage_logs" ON public.production_stage_logs;

CREATE POLICY "products_service_role_all"
ON public.products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "production_batches_service_role_all"
ON public.production_batches
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "production_stage_logs_service_role_all"
ON public.production_stage_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Reviewer roles may inspect every row. Farmers only see rows they own.
CREATE POLICY "pipeline_products_authenticated_read"
ON public.products
FOR SELECT
TO authenticated
USING (
  (SELECT public.coffeechain_actor_role()) IN ('koperasi', 'developer', 'admin')
  OR submitted_by = (SELECT public.coffeechain_actor_id())
);

CREATE POLICY "pipeline_batches_authenticated_read"
ON public.production_batches
FOR SELECT
TO authenticated
USING (
  (SELECT public.coffeechain_actor_role()) IN ('koperasi', 'developer', 'admin')
  OR farmer_id = (SELECT public.coffeechain_actor_id())
);

CREATE POLICY "pipeline_stage_logs_authenticated_read"
ON public.production_stage_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.production_batches AS batch
    WHERE batch.id = production_stage_logs.batch_id
      AND (
        (SELECT public.coffeechain_actor_role()) IN ('koperasi', 'developer', 'admin')
        OR batch.farmer_id = (SELECT public.coffeechain_actor_id())
      )
  )
);

REVOKE ALL ON TABLE public.products FROM anon;
REVOKE ALL ON TABLE public.production_batches FROM anon;
REVOKE ALL ON TABLE public.production_stage_logs FROM anon;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.products FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.production_batches FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.production_stage_logs FROM authenticated;
GRANT SELECT ON TABLE public.products TO authenticated;
GRANT SELECT ON TABLE public.production_batches TO authenticated;
GRANT SELECT ON TABLE public.production_stage_logs TO authenticated;

GRANT ALL ON TABLE public.products TO service_role;
GRANT ALL ON TABLE public.production_batches TO service_role;
GRANT ALL ON TABLE public.production_stage_logs TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
