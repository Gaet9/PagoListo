-- Refuerzo OAuth MP: tokens solo service_role (idempotente tras GAE-24).

REVOKE ALL ON public.negocio_mercadopago_oauth FROM authenticated;
REVOKE ALL ON public.negocio_mercadopago_oauth FROM anon;
REVOKE ALL ON public.negocio_mercadopago_oauth FROM PUBLIC;

GRANT ALL ON public.negocio_mercadopago_oauth TO service_role;

ALTER TABLE public.negocio_mercadopago_oauth ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS negocio_mercadopago_oauth_select_owner ON public.negocio_mercadopago_oauth;
DROP POLICY IF EXISTS negocio_mercadopago_oauth_insert_owner ON public.negocio_mercadopago_oauth;
DROP POLICY IF EXISTS negocio_mercadopago_oauth_update_owner ON public.negocio_mercadopago_oauth;
DROP POLICY IF EXISTS negocio_mercadopago_oauth_delete_owner ON public.negocio_mercadopago_oauth;

COMMENT ON TABLE public.negocio_mercadopago_oauth IS
  'Credenciales OAuth MP por negocio. Solo API server con service_role; sin SELECT para authenticated/anon.';
