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
