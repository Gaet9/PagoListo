-- Abono SaaS PagoListo (Checkout Pro con token global) + estado de suscripción por usuario.

CREATE TABLE public.suscripciones_usuario (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive',
  plan_code text,
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suscripciones_usuario_status_check CHECK (
    status = ANY (
      ARRAY['inactive'::text, 'active'::text, 'past_due'::text, 'canceled'::text]
    )
  )
);

COMMENT ON TABLE public.suscripciones_usuario IS 'Suscripción SaaS del usuario a PagoListo; escritura vía service_role (webhook).';

ALTER TABLE public.suscripciones_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY suscripciones_usuario_select_own ON public.suscripciones_usuario
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.suscripciones_usuario TO authenticated;
GRANT ALL ON public.suscripciones_usuario TO service_role;
REVOKE ALL ON public.suscripciones_usuario FROM anon;

CREATE TABLE public.mp_saas_abono_intentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  plan_code text NOT NULL,
  expected_total_ars numeric NOT NULL,
  mp_preference_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  mp_payment_id text
);

CREATE INDEX mp_saas_abono_intentos_usuario_id_idx ON public.mp_saas_abono_intentos (usuario_id);
CREATE INDEX mp_saas_abono_intentos_mp_preference_id_idx ON public.mp_saas_abono_intentos (mp_preference_id);

CREATE UNIQUE INDEX mp_saas_abono_intentos_mp_payment_id_uniq
  ON public.mp_saas_abono_intentos (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

COMMENT ON TABLE public.mp_saas_abono_intentos IS 'Intento de abono SaaS; se consume al activar suscripción en webhook.';

GRANT ALL ON public.mp_saas_abono_intentos TO service_role;
REVOKE ALL ON public.mp_saas_abono_intentos FROM authenticated;
REVOKE ALL ON public.mp_saas_abono_intentos FROM anon;

ALTER TABLE public.mp_saas_abono_intentos ENABLE ROW LEVEL SECURITY;
