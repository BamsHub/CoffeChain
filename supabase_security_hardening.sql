-- CoffeeChain: keep database access behind authenticated server routes.
-- All browser-facing access goes through Next.js API handlers using service_role.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'products', 'orders', 'transactions', 'farmers', 'market', 'markets',
    'notifications', 'sessions', 'verification_tokens', 'contact_messages',
    'production_batches', 'production_stage_logs', 'ipfs_assets', 'sales', 'coffee_traces',
    'dashboard_settings'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    END IF;
  END LOOP;
END $$;

-- Pipeline reads may be granted to authenticated Supabase Auth sessions by
-- fix_production_rls.sql. Writes remain server-only.
GRANT SELECT ON TABLE public.products TO authenticated;
GRANT SELECT ON TABLE public.production_batches TO authenticated;
GRANT SELECT ON TABLE public.production_stage_logs TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.products FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.production_batches FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.production_stage_logs FROM authenticated;

NOTIFY pgrst, 'reload schema';
