-- Conexión Mercado Pago por negocio (OAuth) + estados (CSRF).
-- Guarda credenciales del vendedor (access/refresh) por negocio y permite iniciar/cerrar el linking.

CREATE TABLE public.negocio_mercadopago_oauth (
  negocio_id uuid PRIMARY KEY REFERENCES public.negocios (id) ON DELETE CASCADE,
  mp_user_id bigint,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  mp_public_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX negocio_mercadopago_oauth_mp_user_id_idx
  ON public.negocio_mercadopago_oauth (mp_user_id)
  WHERE mp_user_id IS NOT NULL;

COMMENT ON TABLE public.negocio_mercadopago_oauth IS 'Credenciales OAuth de Mercado Pago por negocio (tokens del vendedor).';
COMMENT ON COLUMN public.negocio_mercadopago_oauth.mp_user_id IS 'Collector/user_id de Mercado Pago del negocio vinculado.';
COMMENT ON COLUMN public.negocio_mercadopago_oauth.access_token IS 'Access token del vendedor (OAuth authorization_code).';
COMMENT ON COLUMN public.negocio_mercadopago_oauth.refresh_token IS 'Refresh token del vendedor (offline_access).';
COMMENT ON COLUMN public.negocio_mercadopago_oauth.expires_at IS 'Expiración estimada del access_token (si se provee).';

CREATE OR REPLACE FUNCTION public.tg_negocio_mercadopago_oauth_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_negocio_mercadopago_oauth_set_updated_at
  BEFORE UPDATE ON public.negocio_mercadopago_oauth
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_negocio_mercadopago_oauth_set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.negocio_mercadopago_oauth TO authenticated;
GRANT ALL ON public.negocio_mercadopago_oauth TO service_role;

ALTER TABLE public.negocio_mercadopago_oauth ENABLE ROW LEVEL SECURITY;

-- Solo el propietario del negocio puede ver / conectar / actualizar.
CREATE POLICY negocio_mercadopago_oauth_select_owner
  ON public.negocio_mercadopago_oauth
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.negocios n
      WHERE n.id = negocio_mercadopago_oauth.negocio_id
        AND n.propietario_id = (SELECT auth.uid())
    )
  );

CREATE POLICY negocio_mercadopago_oauth_insert_owner
  ON public.negocio_mercadopago_oauth
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.negocios n
      WHERE n.id = negocio_mercadopago_oauth.negocio_id
        AND n.propietario_id = (SELECT auth.uid())
    )
  );

CREATE POLICY negocio_mercadopago_oauth_update_owner
  ON public.negocio_mercadopago_oauth
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.negocios n
      WHERE n.id = negocio_mercadopago_oauth.negocio_id
        AND n.propietario_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.negocios n
      WHERE n.id = negocio_mercadopago_oauth.negocio_id
        AND n.propietario_id = (SELECT auth.uid())
    )
  );

CREATE POLICY negocio_mercadopago_oauth_delete_owner
  ON public.negocio_mercadopago_oauth
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.negocios n
      WHERE n.id = negocio_mercadopago_oauth.negocio_id
        AND n.propietario_id = (SELECT auth.uid())
    )
  );

-- Tabla de estados OAuth (evita CSRF y permite asociar un code a negocio/usuario).
CREATE TABLE public.mp_oauth_states (
  state text PRIMARY KEY,
  negocio_id uuid NOT NULL REFERENCES public.negocios (id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  redirect_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX mp_oauth_states_expires_at_idx ON public.mp_oauth_states (expires_at);
CREATE INDEX mp_oauth_states_negocio_id_idx ON public.mp_oauth_states (negocio_id);

COMMENT ON TABLE public.mp_oauth_states IS 'Estados temporales para iniciar OAuth Mercado Pago (CSRF). Solo server/service_role debería leer/escribir.';

GRANT ALL ON public.mp_oauth_states TO service_role;
REVOKE ALL ON public.mp_oauth_states FROM authenticated;
REVOKE ALL ON public.mp_oauth_states FROM anon;

ALTER TABLE public.mp_oauth_states ENABLE ROW LEVEL SECURITY;

-- Sin policies para authenticated/anon: acceso solo service_role.

