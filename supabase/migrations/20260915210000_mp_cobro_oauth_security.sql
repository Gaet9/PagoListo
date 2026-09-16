-- GAE-24: OAuth tokens must not be readable from the browser (authenticated JWT).
-- All reads/writes go through API routes with service_role.

REVOKE ALL ON TABLE public.negocio_mercadopago_oauth FROM PUBLIC;
REVOKE ALL ON TABLE public.negocio_mercadopago_oauth FROM anon;
REVOKE ALL ON TABLE public.negocio_mercadopago_oauth FROM authenticated;

DROP POLICY IF EXISTS negocio_mercadopago_oauth_select_owner ON public.negocio_mercadopago_oauth;
DROP POLICY IF EXISTS negocio_mercadopago_oauth_insert_owner ON public.negocio_mercadopago_oauth;
DROP POLICY IF EXISTS negocio_mercadopago_oauth_update_owner ON public.negocio_mercadopago_oauth;
DROP POLICY IF EXISTS negocio_mercadopago_oauth_delete_owner ON public.negocio_mercadopago_oauth;

-- Monto acordado con MP al crear la preferencia (anti-tampering en webhook).
ALTER TABLE public.mp_cobro_intentos
  ADD COLUMN IF NOT EXISTS expected_total_ars numeric(14, 2);

COMMENT ON COLUMN public.mp_cobro_intentos.expected_total_ars IS
  'Total ARS enviado a Mercado Pago al crear la preferencia; el webhook valida transaction_amount.';
