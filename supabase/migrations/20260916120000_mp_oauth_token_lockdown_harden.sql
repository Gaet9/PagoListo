-- GAE-8 / GAE-24: OAuth tokens must never be readable via PostgREST (anon/authenticated).
-- Defense in depth: drop owner policies, revoke table privileges, RLS on with no client policies.
-- Server API routes keep using service_role (BYPASSRLS).

DROP POLICY IF EXISTS negocio_mercadopago_oauth_select_owner ON public.negocio_mercadopago_oauth;
DROP POLICY IF EXISTS negocio_mercadopago_oauth_insert_owner ON public.negocio_mercadopago_oauth;
DROP POLICY IF EXISTS negocio_mercadopago_oauth_update_owner ON public.negocio_mercadopago_oauth;
DROP POLICY IF EXISTS negocio_mercadopago_oauth_delete_owner ON public.negocio_mercadopago_oauth;

REVOKE ALL ON TABLE public.negocio_mercadopago_oauth FROM PUBLIC;
REVOKE ALL ON TABLE public.negocio_mercadopago_oauth FROM anon;
REVOKE ALL ON TABLE public.negocio_mercadopago_oauth FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.negocio_mercadopago_oauth TO service_role;

ALTER TABLE public.negocio_mercadopago_oauth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negocio_mercadopago_oauth FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE public.negocio_mercadopago_oauth IS
  'Credenciales OAuth MP por negocio. Solo API server con service_role; sin políticas ni GRANT para authenticated/anon.';

-- Fail migration apply if lockdown did not take (regression guard for prod drift).
DO $$
DECLARE
  pol_count integer;
  client_grant_count integer;
BEGIN
  SELECT count(*)::integer
  INTO pol_count
  FROM pg_policy
  WHERE polrelid = 'public.negocio_mercadopago_oauth'::regclass;

  IF pol_count > 0 THEN
    RAISE EXCEPTION 'negocio_mercadopago_oauth: expected 0 RLS policies for clients, found %', pol_count;
  END IF;

  SELECT count(*)::integer
  INTO client_grant_count
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = 'negocio_mercadopago_oauth'
    AND grantee IN ('anon', 'authenticated')
    AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

  IF client_grant_count > 0 THEN
    RAISE EXCEPTION 'negocio_mercadopago_oauth: anon/authenticated must not have DML grants, found %', client_grant_count;
  END IF;
END
$$;
