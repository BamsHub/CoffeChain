-- ================================================================
-- CoffeeChain production tables RLS hardening
-- Fixes Supabase Advisor: "RLS Disabled in Public"
--
-- Safe to run multiple times.
-- App routes use SUPABASE_SERVICE_ROLE_KEY through server APIs, so these
-- policies block direct anon/authenticated browser access without breaking
-- the existing server-side production workflow.
-- ================================================================

ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_stage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_batches_service_role_all" ON public.production_batches;
DROP POLICY IF EXISTS "production_stage_logs_service_role_all" ON public.production_stage_logs;
DROP POLICY IF EXISTS "Allow anon read all" ON public.production_batches;
DROP POLICY IF EXISTS "Allow anon write all" ON public.production_batches;
DROP POLICY IF EXISTS "Allow all read production_batches" ON public.production_batches;
DROP POLICY IF EXISTS "Allow all write production_batches" ON public.production_batches;
DROP POLICY IF EXISTS "Allow anon read all" ON public.production_stage_logs;
DROP POLICY IF EXISTS "Allow anon write all" ON public.production_stage_logs;
DROP POLICY IF EXISTS "Allow all read production_stage_logs" ON public.production_stage_logs;
DROP POLICY IF EXISTS "Allow all write production_stage_logs" ON public.production_stage_logs;

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

REVOKE ALL ON TABLE public.production_batches FROM anon, authenticated;
REVOKE ALL ON TABLE public.production_stage_logs FROM anon, authenticated;

GRANT ALL ON TABLE public.production_batches TO service_role;
GRANT ALL ON TABLE public.production_stage_logs TO service_role;

NOTIFY pgrst, 'reload schema';
